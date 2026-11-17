<?php

namespace Tests\Concerns;

use App\Models\Invoice;
use App\Models\Student;
use App\Models\User;
use Illuminate\Testing\TestResponse;

/** Data uji pembayaran. Dipakai bersama InvoiceFixtures, FinanceFixtures, dan SchoolFixtures. */
trait PaymentFixtures
{
    /** Menerbitkan SPP bulanan (lewat generate) untuk satu siswa, lalu mengembalikan tagihannya. */
    protected function sppInvoice(Student $student, string $month): Invoice
    {
        $this->generateAs($this->tu, ['month' => $month, 'student_ids' => [$student->id]])->assertOk();

        return Invoice::where('student_id', $student->id)
            ->whereDate('period_month', $month.'-01')
            ->firstOrFail();
    }

    protected function payAs(User $user, array $payload): TestResponse
    {
        return $this->actingAs($user)->postJson('/api/v1/payments', array_merge([
            'payment_date' => now()->toDateString(),
            'method' => 'cash',
        ], $payload));
    }

    /** Membayar tagihan secara eksplisit sebesar $amount (default: seluruh sisa). */
    protected function payInvoice(Invoice $invoice, ?int $amount = null, array $extra = []): TestResponse
    {
        $amount ??= (int) $invoice->total_amount - (int) $invoice->paid_amount;

        return $this->payAs($this->tu, array_merge([
            'student_id' => $invoice->student_id,
            'allocations' => [['invoice_id' => $invoice->id, 'amount' => $amount]],
        ], $extra));
    }
}
