<?php

namespace App\Services;

use App\Enums\InvoiceStatus;
use App\Enums\RecordStatus;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Pembayaran: satu pembayaran milik satu siswa, dialokasikan penuh ke satu atau beberapa tagihannya.
 * Tidak ada kelebihan bayar/deposit. Pembayaran yang sudah dicatat tidak diedit; koreksi lewat void + catat ulang.
 * Urutan kunci baris (hindari deadlock): siswa → tagihan berurut id; void: pembayaran → tagihan berurut id.
 */
class PaymentService
{
    public function __construct(
        private readonly InvoiceService $invoices,
        private readonly DocumentNumberService $numbers,
    ) {}

    /**
     * @param  array{student_id:int, payment_date:string, method:string, amount?:?int, reference?:?string, notes?:?string, allocations?:?array<int, array{invoice_id:int, amount:int}>}  $data
     */
    public function record(array $data, User $by): Payment
    {
        return DB::transaction(function () use ($data, $by) {
            $student = Student::whereKey($data['student_id'])->lockForUpdate()->firstOrFail();

            [$plan, $total] = ! empty($data['allocations'])
                ? $this->planExplicit($student, $data)
                : $this->planAutomatic($student, $data);

            $payment = Payment::create([
                'receipt_number' => $this->numbers->next('KWT', now()),
                'student_id' => $student->id,
                'payment_date' => $data['payment_date'],
                'method' => $data['method'],
                'amount' => $total,
                'reference' => $data['reference'] ?? null,
                'notes' => $data['notes'] ?? null,
                'received_by' => $by->id,
                'status' => RecordStatus::Valid,
            ]);

            foreach ($plan as [$invoice, $amount]) {
                $payment->allocations()->create(['invoice_id' => $invoice->id, 'amount' => $amount]);

                $paid = (int) $invoice->paid_amount + $amount;
                $invoice->update([
                    'paid_amount' => $paid,
                    'status' => $this->invoices->statusFor((int) $invoice->total_amount, $paid),
                ]);
            }

            return $payment->load(['student', 'receiver', 'allocations.invoice']);
        });
    }

    /** Membatalkan pembayaran: nominal dikembalikan ke tagihan terkait, status tagihan dihitung ulang. */
    public function void(Payment $payment, string $reason, User $by): Payment
    {
        return DB::transaction(function () use ($payment, $reason, $by) {
            $locked = Payment::whereKey($payment->id)->lockForUpdate()->firstOrFail();

            if ($locked->status === RecordStatus::Void) {
                abort(409, 'Pembayaran ini sudah dibatalkan.');
            }

            $allocations = $locked->allocations()->get();
            $invoices = Invoice::whereIn('id', $allocations->pluck('invoice_id'))
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            foreach ($allocations as $allocation) {
                $invoice = $invoices->get($allocation->invoice_id);
                if (! $invoice) {
                    continue;
                }

                $paid = max(0, (int) $invoice->paid_amount - (int) $allocation->amount);
                $invoice->update([
                    'paid_amount' => $paid,
                    'status' => $this->invoices->statusFor((int) $invoice->total_amount, $paid),
                ]);
                $invoices->put($invoice->id, $invoice);
            }

            $locked->update([
                'status' => RecordStatus::Void,
                'voided_at' => now(),
                'voided_by' => $by->id,
                'void_reason' => $reason,
            ]);

            return $locked->fresh(['student', 'receiver', 'allocations.invoice']);
        });
    }

    /**
     * Tagihan yang masih terbuka milik siswa, urut jatuh tempo terlama (tanpa jatuh tempo paling akhir), lalu id.
     *
     * @return Collection<int, Invoice>
     */
    public function openInvoices(int $studentId, bool $lock = false): Collection
    {
        $query = Invoice::where('student_id', $studentId)
            ->whereIn('status', [InvoiceStatus::Unpaid->value, InvoiceStatus::Partial->value])
            ->orderByRaw('CASE WHEN due_date IS NULL THEN 1 ELSE 0 END')
            ->orderBy('due_date')
            ->orderBy('id');

        if ($lock) {
            $query->lockForUpdate();
        }

        return $query->get();
    }

    /**
     * Alokasi yang ditentukan penginput.
     *
     * @return array{0: list<array{0: Invoice, 1: int}>, 1: int}
     */
    private function planExplicit(Student $student, array $data): array
    {
        $requested = array_values($data['allocations']);

        $invoices = Invoice::whereIn('id', array_column($requested, 'invoice_id'))
            ->orderBy('id')
            ->lockForUpdate()
            ->get()
            ->keyBy('id');

        $plan = [];
        $sum = 0;
        foreach ($requested as $i => $row) {
            $invoice = $invoices->get((int) $row['invoice_id']);

            if (! $invoice || (int) $invoice->student_id !== (int) $student->id) {
                $this->fail("allocations.$i.invoice_id", 'Tagihan ini bukan milik siswa yang dipilih.');
            }
            if (! in_array($invoice->status, [InvoiceStatus::Unpaid, InvoiceStatus::Partial], true)) {
                $this->fail("allocations.$i.invoice_id", "Tagihan {$invoice->number} sudah lunas atau dibatalkan.");
            }

            $outstanding = (int) $invoice->total_amount - (int) $invoice->paid_amount;
            $amount = (int) $row['amount'];
            if ($amount > $outstanding) {
                $this->fail("allocations.$i.amount", 'Nominal melebihi sisa tagihan ('.$this->rupiah($outstanding).').');
            }

            $plan[] = [$invoice, $amount];
            $sum += $amount;
        }

        if (isset($data['amount']) && (int) $data['amount'] !== $sum) {
            $this->fail('amount', 'Total pembayaran harus sama dengan jumlah alokasi ('.$this->rupiah($sum).').');
        }

        return [$plan, $sum];
    }

    /**
     * Alokasi otomatis ke tagihan terlama sampai nominal habis. Kelebihan bayar ditolak.
     *
     * @return array{0: list<array{0: Invoice, 1: int}>, 1: int}
     */
    private function planAutomatic(Student $student, array $data): array
    {
        $total = (int) ($data['amount'] ?? 0);
        if ($total < 1) {
            $this->fail('amount', 'Isi nominal pembayaran atau pilih tagihan yang dibayar.');
        }

        $remaining = $total;
        $plan = [];
        foreach ($this->openInvoices($student->id, lock: true) as $invoice) {
            if ($remaining <= 0) {
                break;
            }
            $outstanding = (int) $invoice->total_amount - (int) $invoice->paid_amount;
            if ($outstanding <= 0) {
                continue;
            }

            $take = min($outstanding, $remaining);
            $plan[] = [$invoice, $take];
            $remaining -= $take;
        }

        if ($remaining > 0) {
            $open = $total - $remaining;
            $this->fail('amount', 'Nominal melebihi total tagihan yang belum dibayar ('.$this->rupiah($open).'). Kelebihan bayar tidak diterima.');
        }

        return [$plan, $total];
    }

    private function fail(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => [$message]]);
    }

    private function rupiah(int $amount): string
    {
        return 'Rp '.number_format($amount, 0, ',', '.');
    }
}
