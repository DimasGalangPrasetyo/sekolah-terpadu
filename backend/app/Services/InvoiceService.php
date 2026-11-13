<?php

namespace App\Services;

use App\Enums\DiscountType;
use App\Enums\EnrollmentStatus;
use App\Enums\FeeCategory;
use App\Enums\InvoiceKind;
use App\Enums\InvoiceStatus;
use App\Enums\RecordStatus;
use App\Enums\StudentStatus;
use App\Models\AcademicYear;
use App\Models\FeeType;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\PaymentAllocation;
use App\Models\Student;
use App\Models\StudentDiscount;
use App\Models\StudentEnrollment;
use App\Models\Unit;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Tagihan: generate SPP bulanan massal (idempoten), tagihan manual, dan void.
 * Semua uang bilangan bulat rupiah. Nominal tagihan yang sudah terbit tidak diedit; koreksi lewat void + tagihan baru.
 */
class InvoiceService
{
    public function __construct(
        private readonly AcademicContext $context,
        private readonly FeeService $fees,
        private readonly DocumentNumberService $numbers,
    ) {}

    /** Status mengikuti pembayaran: total 0 (diskon 100%) langsung dianggap lunas. */
    public function statusFor(int $total, int $paid): InvoiceStatus
    {
        if ($paid >= $total) {
            return InvoiceStatus::Paid;
        }

        return $paid > 0 ? InvoiceStatus::Partial : InvoiceStatus::Unpaid;
    }

    /**
     * Generate tagihan bulanan untuk satu unit dan bulan. Aman dijalankan berulang.
     *
     * @param  array{unit_id:int, month:string, academic_year_id?:?int, due_date?:?string, student_ids?:?array<int>, dry_run?:bool}  $data
     * @return array<string, mixed>
     */
    public function generateMonthly(array $data, User $by): array
    {
        $unit = Unit::findOrFail($data['unit_id']);
        $year = $this->resolveYear($data['academic_year_id'] ?? null);
        $month = Carbon::createFromFormat('!Y-m', $data['month'])->startOfMonth();

        $first = Carbon::parse($year->start_date)->startOfMonth();
        $last = Carbon::parse($year->end_date)->startOfMonth();
        if ($month->lt($first) || $month->gt($last)) {
            throw ValidationException::withMessages(['month' => ["Bulan di luar tahun ajaran {$year->name}."]]);
        }

        $due = ! empty($data['due_date'])
            ? Carbon::parse($data['due_date'])->startOfDay()
            : $month->copy()->day(10);

        $feeTypes = FeeType::where('is_active', true)
            ->where('category', FeeCategory::Monthly->value)
            ->orderBy('id')
            ->get();
        if ($feeTypes->isEmpty()) {
            throw ValidationException::withMessages(['month' => ['Belum ada jenis biaya bulanan yang aktif.']]);
        }

        $enrollmentScope = fn ($q) => $q
            ->where('academic_year_id', $year->id)
            ->where('status', EnrollmentStatus::Active->value)
            ->whereHas('classroom', fn ($c) => $c->where('unit_id', $unit->id));

        $students = Student::query()
            ->where('status', StudentStatus::Active->value)
            ->whereHas('enrollments', $enrollmentScope)
            ->with(['enrollments' => fn ($q) => $enrollmentScope($q)->with('classroom')])
            ->when(! empty($data['student_ids']), fn ($q) => $q->whereIn('id', $data['student_ids']))
            ->orderBy('name')
            ->get();

        $discounts = StudentDiscount::where('academic_year_id', $year->id)
            ->where('is_active', true)
            ->whereIn('student_id', $students->pluck('id'))
            ->get()
            ->groupBy('student_id');

        $result = [
            'dry_run' => (bool) ($data['dry_run'] ?? false),
            'period' => $month->format('Y-m'),
            'unit' => ['id' => $unit->id, 'code' => $unit->code],
            'eligible' => $students->count(),
            'created' => 0,
            'skipped_existing' => 0,
            'skipped_no_rate' => 0,
            'skipped_no_rate_students' => [],
            'total_amount' => 0,
        ];

        // Pratinjau: seluruh proses dijalankan di dalam transaksi lalu dibatalkan (nomor dan audit ikut batal).
        $preview = $result['dry_run'];
        if ($preview) {
            DB::beginTransaction();
        }

        try {
            foreach ($students as $student) {
                $classroom = $student->enrollments->first()?->classroom;
                if (! $classroom) {
                    continue;
                }

                $exists = Invoice::where('student_id', $student->id)
                    ->where('kind', InvoiceKind::Monthly->value)
                    ->whereDate('active_period', $month->toDateString())
                    ->exists();
                if ($exists) {
                    $result['skipped_existing']++;

                    continue;
                }

                $lines = [];
                foreach ($feeTypes as $type) {
                    $rate = $this->fees->resolveRate($type, $unit->id, $classroom->grade_level_id, $year->id);
                    if ($rate !== null) {
                        $lines[] = [
                            'fee_type' => $type,
                            'description' => $type->name.' '.$month->format('m/Y'),
                            'quantity' => 1,
                            'unit_price' => (int) $rate->amount,
                        ];
                    }
                }

                if ($lines === []) {
                    $result['skipped_no_rate']++;
                    if (count($result['skipped_no_rate_students']) < 50) {
                        $result['skipped_no_rate_students'][] = ['id' => $student->id, 'nis' => $student->nis, 'name' => $student->name];
                    }

                    continue;
                }

                $items = $this->priceLines($lines, $discounts->get($student->id, collect()));

                try {
                    $invoice = $this->persist([
                        'student_id' => $student->id,
                        'unit_id' => $unit->id,
                        'academic_year_id' => $year->id,
                        'kind' => InvoiceKind::Monthly,
                        'period_month' => $month->copy(),
                        'active_period' => $month->copy(),
                        'due_date' => $due->copy(),
                    ], $items, $by);
                    $result['created']++;
                    $result['total_amount'] += (int) $invoice->total_amount;
                } catch (UniqueConstraintViolationException) {
                    // Dibuat bersamaan oleh proses lain; batas unik database yang menang.
                    $result['skipped_existing']++;
                }
            }
        } finally {
            if ($preview) {
                DB::rollBack();
            }
        }

        return $result;
    }

    /**
     * Tagihan manual (non-bulanan): uang pangkal, seragam, kegiatan, dst.
     *
     * @param  array{student_id:int, academic_year_id?:?int, due_date?:?string, notes?:?string, items:array<int, array<string, mixed>>}  $data
     */
    public function createManual(array $data, User $by): Invoice
    {
        $year = $this->resolveYear($data['academic_year_id'] ?? null);

        return DB::transaction(function () use ($data, $year, $by) {
            // Kunci baris siswa agar dua tagihan manual bersamaan untuk siswa yang sama berjalan berurutan.
            $student = Student::whereKey($data['student_id'])->lockForUpdate()->firstOrFail();

            if ($student->status !== StudentStatus::Active) {
                throw ValidationException::withMessages(['student_id' => ['Hanya siswa berstatus aktif yang dapat ditagih.']]);
            }

            $enrollment = StudentEnrollment::with('classroom')
                ->where('student_id', $student->id)
                ->where('academic_year_id', $year->id)
                ->where('status', EnrollmentStatus::Active->value)
                ->first();
            if (! $enrollment || ! $enrollment->classroom) {
                throw ValidationException::withMessages(['student_id' => ['Siswa belum punya rombel aktif di tahun ajaran ini.']]);
            }
            $classroom = $enrollment->classroom;

            $types = FeeType::whereIn('id', array_column($data['items'], 'fee_type_id'))->get()->keyBy('id');

            $lines = [];
            foreach ($data['items'] as $i => $row) {
                $type = $types->get((int) $row['fee_type_id']);
                $field = "items.$i.fee_type_id";

                if (! $type || ! $type->is_active) {
                    throw ValidationException::withMessages([$field => ['Jenis biaya tidak aktif.']]);
                }
                if ($type->category === FeeCategory::Monthly) {
                    throw ValidationException::withMessages([$field => ['Biaya bulanan dibuat lewat "Buat tagihan bulanan", bukan tagihan manual.']]);
                }
                if (in_array($type->category, [FeeCategory::OneTime, FeeCategory::Annual], true)
                    && $this->hasActiveItem($student->id, $year->id, $type->id)) {
                    throw ValidationException::withMessages([$field => ["Tagihan {$type->name} untuk siswa ini di tahun ajaran ini sudah ada."]]);
                }

                $price = $row['unit_price'] ?? null;
                if ($price === null) {
                    $rate = $this->fees->resolveRate($type, $classroom->unit_id, $classroom->grade_level_id, $year->id);
                    if ($rate === null) {
                        throw ValidationException::withMessages(["items.$i.unit_price" => ["Tarif {$type->name} belum diatur. Isi nominal secara manual atau atur tarifnya dulu."]]);
                    }
                    $price = (int) $rate->amount;
                }

                $lines[] = [
                    'fee_type' => $type,
                    'description' => $row['description'] ?? $type->name,
                    'quantity' => (int) ($row['quantity'] ?? 1),
                    'unit_price' => (int) $price,
                ];
            }

            $discounts = StudentDiscount::where('student_id', $student->id)
                ->where('academic_year_id', $year->id)
                ->where('is_active', true)
                ->get();

            $invoice = $this->persist([
                'student_id' => $student->id,
                'unit_id' => $classroom->unit_id,
                'academic_year_id' => $year->id,
                'kind' => InvoiceKind::OneTime,
                'period_month' => null,
                'active_period' => null,
                'due_date' => ! empty($data['due_date']) ? Carbon::parse($data['due_date'])->startOfDay() : null,
                'notes' => $data['notes'] ?? null,
            ], $this->priceLines($lines, $discounts), $by);

            return $invoice->load(['student', 'unit', 'academicYear', 'items.feeType']);
        });
    }

    /** Membatalkan tagihan. Ditolak bila sudah ada pembayaran; batalkan pembayarannya dulu. */
    public function void(Invoice $invoice, string $reason, User $by): Invoice
    {
        return DB::transaction(function () use ($invoice, $reason, $by) {
            $locked = Invoice::whereKey($invoice->id)->lockForUpdate()->firstOrFail();

            if ($locked->status === InvoiceStatus::Void) {
                abort(409, 'Tagihan ini sudah dibatalkan.');
            }

            $hasPayments = (int) $locked->paid_amount > 0
                || PaymentAllocation::where('invoice_id', $locked->id)
                    ->whereHas('payment', fn ($q) => $q->where('status', RecordStatus::Valid->value))
                    ->exists();
            if ($hasPayments) {
                abort(409, 'Tagihan ini sudah ada pembayarannya. Batalkan pembayaran terkait terlebih dahulu.');
            }

            $locked->update([
                'status' => InvoiceStatus::Void,
                'active_period' => null,
                'voided_at' => now(),
                'voided_by' => $by->id,
                'void_reason' => $reason,
            ]);

            return $locked->fresh(['student', 'unit', 'academicYear', 'items.feeType']);
        });
    }

    /**
     * Menghitung potongan per baris. Diskon tidak ditumpuk: diskon khusus jenis biaya menang atas diskon "semua jenis biaya".
     * Persen dibulatkan ke bawah ke rupiah penuh. Diskon nominal "semua jenis biaya" dipotongkan sekali per tagihan
     * (dihabiskan berurutan antarbaris). Potongan tidak pernah melebihi harga baris.
     *
     * @param  list<array{fee_type: FeeType, description: string, quantity: int, unit_price: int}>  $lines
     * @param  Collection<int, StudentDiscount>  $discounts  diskon aktif siswa pada tahun ajaran tagihan
     * @return list<array<string, int|string>>
     */
    public function priceLines(array $lines, Collection $discounts): array
    {
        $general = $discounts->first(fn (StudentDiscount $d) => $d->fee_type_id === null);
        $generalFixedLeft = ($general !== null && $general->type === DiscountType::Fixed) ? (int) $general->value : 0;

        $rows = [];
        foreach ($lines as $line) {
            $gross = $line['unit_price'] * $line['quantity'];
            $specific = $discounts->first(
                fn (StudentDiscount $d) => $d->fee_type_id !== null && (int) $d->fee_type_id === (int) $line['fee_type']->id
            );

            $discount = 0;
            if ($specific !== null) {
                $discount = $this->discountAmount($specific, $gross);
            } elseif ($general !== null) {
                if ($general->type === DiscountType::Percent) {
                    $discount = $this->discountAmount($general, $gross);
                } else {
                    $discount = min($generalFixedLeft, $gross);
                    $generalFixedLeft -= $discount;
                }
            }

            $rows[] = [
                'fee_type_id' => (int) $line['fee_type']->id,
                'description' => $line['description'],
                'quantity' => $line['quantity'],
                'unit_price' => $line['unit_price'],
                'discount_amount' => $discount,
                'subtotal' => $gross - $discount,
            ];
        }

        return $rows;
    }

    private function discountAmount(StudentDiscount $discount, int $gross): int
    {
        $amount = $discount->type === DiscountType::Percent
            ? intdiv($gross * (int) $discount->value, 100)
            : (int) $discount->value;

        return min($amount, $gross);
    }

    private function hasActiveItem(int $studentId, int $yearId, int $feeTypeId): bool
    {
        return InvoiceItem::where('fee_type_id', $feeTypeId)
            ->whereHas('invoice', fn ($q) => $q
                ->where('student_id', $studentId)
                ->where('academic_year_id', $yearId)
                ->where('status', '!=', InvoiceStatus::Void->value))
            ->exists();
    }

    /**
     * @param  array<string, mixed>  $attrs
     * @param  list<array<string, int|string>>  $items
     */
    private function persist(array $attrs, array $items, User $by): Invoice
    {
        return DB::transaction(function () use ($attrs, $items, $by) {
            $total = (int) array_sum(array_column($items, 'subtotal'));

            $invoice = Invoice::create(array_merge($attrs, [
                'number' => $this->numbers->next('INV', now()),
                'total_amount' => $total,
                'paid_amount' => 0,
                'status' => $this->statusFor($total, 0),
                'created_by' => $by->id,
            ]));

            foreach ($items as $item) {
                $invoice->items()->create($item);
            }

            return $invoice;
        });
    }

    private function resolveYear(?int $yearId): AcademicYear
    {
        $year = $yearId ? AcademicYear::find($yearId) : $this->context->year();

        if (! $year) {
            throw ValidationException::withMessages(['academic_year_id' => ['Tahun ajaran tidak ditemukan atau belum ada tahun ajaran aktif.']]);
        }

        return $year;
    }
}
