<?php

namespace App\Services;

use App\Enums\EnrollmentStatus;
use App\Enums\InvoiceStatus;
use App\Enums\RecordStatus;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\StudentEnrollment;
use App\Models\Unit;
use Carbon\Carbon;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Laporan keuangan (hanya baca). Semua angka bilangan bulat rupiah dan hanya menghitung data berstatus valid.
 * Pembayaran siswa dihitung per unit lewat alokasinya ke tagihan; kas dihitung menurut unit transaksinya
 * (tanpa unit = "Umum"). Pembayaran siswa tidak disalin ke kas, jadi tidak ada penghitungan ganda.
 */
class FinanceReportService
{
    private const MAX_ROWS = 5000;

    private const MAX_RANGE_DAYS = 366;

    public function summary(string $from, string $to, ?string $unit): array
    {
        $this->assertRange($from, $to);
        $filter = $this->unitFilter($unit);

        $payments = $this->scopePaymentUnit(
            DB::table('payment_allocations as pa')
                ->join('payments as p', 'p.id', '=', 'pa.payment_id')
                ->join('invoices as i', 'i.id', '=', 'pa.invoice_id')
                ->where('p.status', RecordStatus::Valid->value)
                ->whereDate('p.payment_date', '>=', $from)
                ->whereDate('p.payment_date', '<=', $to),
            $filter
        )
            ->selectRaw('i.unit_id as unit_id, SUM(pa.amount) as total, COUNT(DISTINCT p.id) as cnt')
            ->groupBy('i.unit_id')
            ->get()
            ->keyBy('unit_id');

        $cash = $this->scopeCashUnit(
            DB::table('cash_transactions')
                ->where('status', RecordStatus::Valid->value)
                ->whereDate('transaction_date', '>=', $from)
                ->whereDate('transaction_date', '<=', $to),
            $filter
        )
            ->selectRaw('unit_id, type, SUM(amount) as total, COUNT(*) as cnt')
            ->groupBy('unit_id', 'type')
            ->get();

        $cashMap = [];
        foreach ($cash as $row) {
            $cashMap[($row->unit_id ?? 'null').'|'.$row->type] = $row;
        }

        $rows = [];
        if ($filter['mode'] !== 'none') {
            foreach (Unit::orderBy('id')->get(['id', 'code', 'name']) as $u) {
                if ($filter['mode'] === 'unit' && $u->id !== $filter['id']) {
                    continue;
                }
                $rows[] = $this->summaryRow(
                    $u->code,
                    $u->name,
                    $payments->get($u->id),
                    $cashMap[$u->id.'|income'] ?? null,
                    $cashMap[$u->id.'|expense'] ?? null,
                );
            }
        }
        if ($filter['mode'] !== 'unit') {
            $rows[] = $this->summaryRow('UMUM', 'Umum (tanpa unit)', null, $cashMap['null|income'] ?? null, $cashMap['null|expense'] ?? null);
        }

        $total = ['student_payments' => 0, 'student_payment_count' => 0, 'other_income' => 0, 'other_income_count' => 0,
            'total_income' => 0, 'expense' => 0, 'expense_count' => 0, 'balance' => 0];
        foreach ($rows as $r) {
            foreach ($total as $k => $v) {
                $total[$k] = $v + $r[$k];
            }
        }

        return [
            'period' => ['from' => $from, 'to' => $to],
            'unit' => $this->unitLabel($filter, $unit),
            'rows' => $rows,
            'total' => $total,
            'generated_at' => now()->toIso8601String(),
        ];
    }

    public function arrears(?string $unit, ?int $academicYearId, string $asOf, bool $includeNotDue): array
    {
        $filter = $this->unitFilter($unit);

        $query = Invoice::query()
            ->with(['student' => fn ($q) => $q->withTrashed(), 'unit'])
            ->whereIn('status', [InvoiceStatus::Unpaid->value, InvoiceStatus::Partial->value]);

        if ($filter['mode'] === 'unit') {
            $query->where('unit_id', $filter['id']);
        } elseif ($filter['mode'] === 'none') {
            $query->whereRaw('1 = 0');
        }
        if ($academicYearId) {
            $query->where('academic_year_id', $academicYearId);
        }
        if (! $includeNotDue) {
            // Tagihan tanpa jatuh tempo (manual) dianggap sudah harus dibayar.
            $query->where(fn ($w) => $w->whereNull('due_date')->orWhereDate('due_date', '<', $asOf));
        }

        $invoices = $query->orderBy('id')->limit(self::MAX_ROWS + 1)->get();
        if ($invoices->count() > self::MAX_ROWS) {
            throw ValidationException::withMessages(['unit' => ['Data terlalu banyak. Persempit dengan filter unit atau tahun ajaran.']]);
        }

        $classrooms = $this->classroomNames($invoices->pluck('student_id')->unique()->values()->all());
        $asOfTs = Carbon::parse($asOf)->startOfDay()->timestamp;

        $rows = $invoices->groupBy(fn (Invoice $i) => $i->student_id.'-'.$i->unit_id)
            ->map(function (Collection $items) use ($classrooms, $asOfTs) {
                /** @var Invoice $first */
                $first = $items->first();
                $dates = $items->pluck('due_date')->filter()->map(fn ($d) => $d->toDateString())->sort()->values();
                $oldest = $dates->first();
                $daysOverdue = $oldest !== null
                    ? max(0, (int) floor(($asOfTs - Carbon::parse($oldest)->startOfDay()->timestamp) / 86400))
                    : 0;

                return [
                    'student' => $first->student ? [
                        'id' => $first->student->id,
                        'nis' => $first->student->nis,
                        'name' => $first->student->name,
                    ] : null,
                    'unit' => $first->unit?->code,
                    'classroom' => $classrooms[$first->student_id] ?? null,
                    'invoice_count' => $items->count(),
                    'outstanding' => (int) $items->sum(fn (Invoice $i) => max(0, (int) $i->total_amount - (int) $i->paid_amount)),
                    'oldest_due_date' => $oldest,
                    'days_overdue' => $daysOverdue,
                    'invoices' => $items->sortBy('id')->map(fn (Invoice $i) => [
                        'number' => $i->number,
                        'kind' => $i->kind->value,
                        'period_month' => $i->period_month?->format('Y-m'),
                        'due_date' => $i->due_date?->toDateString(),
                        'total_amount' => (int) $i->total_amount,
                        'paid_amount' => (int) $i->paid_amount,
                        'outstanding' => max(0, (int) $i->total_amount - (int) $i->paid_amount),
                        'status' => $i->status->value,
                    ])->values()->all(),
                ];
            })
            ->sortBy(fn (array $r) => ($r['unit'] ?? '').'|'.mb_strtolower($r['student']['name'] ?? ''))
            ->values();

        $byUnit = $rows->groupBy('unit')->map(fn (Collection $g, $unitCode) => [
            'unit' => $unitCode,
            'students' => $g->pluck('student.id')->unique()->count(),
            'invoices' => (int) $g->sum('invoice_count'),
            'outstanding' => (int) $g->sum('outstanding'),
        ])->sortKeys()->values();

        return [
            'as_of' => $asOf,
            'include_not_due' => $includeNotDue,
            'unit' => $this->unitLabel($filter, $unit),
            'rows' => $rows->all(),
            'by_unit' => $byUnit->all(),
            'total' => [
                'students' => $rows->pluck('student.id')->unique()->count(),
                'invoices' => (int) $rows->sum('invoice_count'),
                'outstanding' => (int) $rows->sum('outstanding'),
            ],
            'generated_at' => now()->toIso8601String(),
        ];
    }

    public function cashBook(string $from, string $to, ?string $unit): array
    {
        $this->assertRange($from, $to);
        $filter = $this->unitFilter($unit);

        $paymentRows = $this->scopePaymentUnit(
            DB::table('payment_allocations as pa')
                ->join('payments as p', 'p.id', '=', 'pa.payment_id')
                ->join('invoices as i', 'i.id', '=', 'pa.invoice_id')
                ->join('units as u', 'u.id', '=', 'i.unit_id')
                ->join('students as s', 's.id', '=', 'p.student_id')
                ->where('p.status', RecordStatus::Valid->value)
                ->whereDate('p.payment_date', '>=', $from)
                ->whereDate('p.payment_date', '<=', $to),
            $filter
        )
            ->selectRaw('p.id as id, p.receipt_number as ref, p.payment_date as tx_date, u.code as unit_code, s.name as student_name, SUM(pa.amount) as total')
            ->groupBy('p.id', 'p.receipt_number', 'p.payment_date', 'u.code', 's.name')
            ->limit(self::MAX_ROWS + 1)
            ->get();

        $cashRows = $this->scopeCashUnit(
            DB::table('cash_transactions as c')
                ->join('cash_categories as cat', 'cat.id', '=', 'c.cash_category_id')
                ->leftJoin('units as u', 'u.id', '=', 'c.unit_id')
                ->where('c.status', RecordStatus::Valid->value)
                ->whereDate('c.transaction_date', '>=', $from)
                ->whereDate('c.transaction_date', '<=', $to),
            $filter,
            'c.unit_id'
        )
            ->select('c.id', 'c.number', 'c.transaction_date as tx_date', 'c.type', 'c.amount', 'c.description', 'cat.name as category', 'u.code as unit_code')
            ->limit(self::MAX_ROWS + 1)
            ->get();

        if ($paymentRows->count() > self::MAX_ROWS || $cashRows->count() > self::MAX_ROWS) {
            throw ValidationException::withMessages(['date_to' => ['Data terlalu banyak. Persempit periode atau filter unit.']]);
        }

        $entries = [];
        foreach ($paymentRows as $r) {
            $entries[] = [
                'date' => substr((string) $r->tx_date, 0, 10), 'rank' => 0, 'id' => (int) $r->id,
                'kind' => 'student_payment', 'reference' => $r->ref,
                'description' => 'Pembayaran siswa: '.$r->student_name,
                'unit' => $r->unit_code, 'income' => (int) $r->total, 'expense' => 0,
            ];
        }
        foreach ($cashRows as $r) {
            $isIncome = $r->type === 'income';
            $entries[] = [
                'date' => substr((string) $r->tx_date, 0, 10), 'rank' => $isIncome ? 1 : 2, 'id' => (int) $r->id,
                'kind' => $isIncome ? 'cash_income' : 'cash_expense', 'reference' => $r->number,
                'description' => $r->category.' - '.$r->description,
                'unit' => $r->unit_code, 'income' => $isIncome ? (int) $r->amount : 0, 'expense' => $isIncome ? 0 : (int) $r->amount,
            ];
        }

        // Urut: tanggal, lalu penerimaan sebelum pengeluaran pada hari yang sama, lalu id.
        usort($entries, fn (array $a, array $b) => [$a['date'], $a['rank'], $a['id']] <=> [$b['date'], $b['rank'], $b['id']]);

        $opening = $this->netBefore($from, $filter);
        $balance = $opening;
        $totalIncome = 0;
        $totalExpense = 0;
        foreach ($entries as &$e) {
            $balance += $e['income'] - $e['expense'];
            $totalIncome += $e['income'];
            $totalExpense += $e['expense'];
            $e['balance'] = $balance;
            unset($e['rank'], $e['id']);
        }
        unset($e);

        return [
            'period' => ['from' => $from, 'to' => $to],
            'unit' => $this->unitLabel($filter, $unit),
            'opening_balance' => $opening,
            'entries' => $entries,
            'total_income' => $totalIncome,
            'total_expense' => $totalExpense,
            'closing_balance' => $balance,
            'generated_at' => now()->toIso8601String(),
        ];
    }

    public function dailyPayments(string $date, ?string $unit): array
    {
        $filter = $this->unitFilter($unit);

        $payments = $filter['mode'] === 'none'
            ? collect()
            : Payment::with(['student' => fn ($q) => $q->withTrashed(), 'receiver', 'allocations.invoice'])
                ->whereDate('payment_date', $date)
                ->orderBy('id')
                ->get();

        $valid = [];
        $voided = [];
        $byMethod = ['cash' => 0, 'transfer' => 0, 'other' => 0];

        foreach ($payments as $payment) {
            $amount = (int) $payment->amount;
            if ($filter['mode'] === 'unit') {
                $amount = (int) $payment->allocations
                    ->filter(fn ($a) => $a->invoice && (int) $a->invoice->unit_id === $filter['id'])
                    ->sum('amount');
                if ($amount === 0) {
                    continue;
                }
            }

            $row = [
                'id' => $payment->id,
                'receipt_number' => $payment->receipt_number,
                'student' => $payment->student ? ['nis' => $payment->student->nis, 'name' => $payment->student->name] : null,
                'method' => $payment->method->value,
                'reference' => $payment->reference,
                'amount' => $amount,
                'received_by' => $payment->receiver?->name,
            ];

            if ($payment->status === RecordStatus::Void) {
                $row['void_reason'] = $payment->void_reason;
                $voided[] = $row;

                continue;
            }

            $valid[] = $row;
            $byMethod[$payment->method->value] = ($byMethod[$payment->method->value] ?? 0) + $amount;
        }

        return [
            'date' => $date,
            'unit' => $this->unitLabel($filter, $unit),
            'payments' => $valid,
            'by_method' => $byMethod,
            'total' => array_sum($byMethod),
            'count' => count($valid),
            'voided' => $voided,
            'voided_count' => count($voided),
            'voided_amount' => (int) array_sum(array_column($voided, 'amount')),
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /** Saldo bersih (penerimaan - pengeluaran) seluruh transaksi valid sebelum $date. */
    private function netBefore(string $date, array $filter): int
    {
        $payments = (int) $this->scopePaymentUnit(
            DB::table('payment_allocations as pa')
                ->join('payments as p', 'p.id', '=', 'pa.payment_id')
                ->join('invoices as i', 'i.id', '=', 'pa.invoice_id')
                ->where('p.status', RecordStatus::Valid->value)
                ->whereDate('p.payment_date', '<', $date),
            $filter
        )->sum('pa.amount');

        $cash = fn (string $type) => (int) $this->scopeCashUnit(
            DB::table('cash_transactions')
                ->where('status', RecordStatus::Valid->value)
                ->where('type', $type)
                ->whereDate('transaction_date', '<', $date),
            $filter
        )->sum('amount');

        return $payments + $cash('income') - $cash('expense');
    }

    private function summaryRow(string $key, string $name, ?object $payments, ?object $income, ?object $expense): array
    {
        $sp = (int) ($payments->total ?? 0);
        $oi = (int) ($income->total ?? 0);
        $ex = (int) ($expense->total ?? 0);

        return [
            'key' => $key,
            'name' => $name,
            'student_payments' => $sp,
            'student_payment_count' => (int) ($payments->cnt ?? 0),
            'other_income' => $oi,
            'other_income_count' => (int) ($income->cnt ?? 0),
            'total_income' => $sp + $oi,
            'expense' => $ex,
            'expense_count' => (int) ($expense->cnt ?? 0),
            'balance' => $sp + $oi - $ex,
        ];
    }

    /** @return array{mode: string, id: ?int} mode: all | none (hanya kas umum) | unit */
    private function unitFilter(?string $unit): array
    {
        if ($unit === null || $unit === '') {
            return ['mode' => 'all', 'id' => null];
        }
        if ($unit === 'none') {
            return ['mode' => 'none', 'id' => null];
        }

        $found = Unit::where('code', $unit)->first();
        if (! $found) {
            throw ValidationException::withMessages(['unit' => ['Unit tidak dikenal.']]);
        }

        return ['mode' => 'unit', 'id' => (int) $found->id];
    }

    private function unitLabel(array $filter, ?string $unit): string
    {
        return $filter['mode'] === 'all' ? 'all' : (string) $unit;
    }

    /** Pembayaran selalu milik satu unit lewat tagihannya; filter "none" berarti tidak ada pembayaran. */
    private function scopePaymentUnit(Builder $query, array $filter, string $column = 'i.unit_id'): Builder
    {
        return match ($filter['mode']) {
            'unit' => $query->where($column, $filter['id']),
            'none' => $query->whereRaw('1 = 0'),
            default => $query,
        };
    }

    private function scopeCashUnit(Builder $query, array $filter, string $column = 'unit_id'): Builder
    {
        return match ($filter['mode']) {
            'unit' => $query->where($column, $filter['id']),
            'none' => $query->whereNull($column),
            default => $query,
        };
    }

    /** @param  list<int>  $studentIds
     * @return array<int, string|null> */
    private function classroomNames(array $studentIds): array
    {
        if ($studentIds === []) {
            return [];
        }

        return StudentEnrollment::with('classroom')
            ->whereIn('student_id', $studentIds)
            ->where('status', EnrollmentStatus::Active->value)
            ->orderBy('id')
            ->get()
            ->groupBy('student_id')
            ->map(fn (Collection $e) => $e->first()->classroom?->name)
            ->all();
    }

    private function assertRange(string $from, string $to): void
    {
        $days = (Carbon::parse($to)->startOfDay()->timestamp - Carbon::parse($from)->startOfDay()->timestamp) / 86400;
        if ($days > self::MAX_RANGE_DAYS) {
            throw ValidationException::withMessages(['date_to' => ['Rentang periode maksimal '.self::MAX_RANGE_DAYS.' hari.']]);
        }
    }
}
