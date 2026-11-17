<?php

namespace Tests\Feature\Finance;

use App\Enums\InvoiceStatus;
use App\Enums\RecordStatus;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\FinanceFixtures;
use Tests\Concerns\InvoiceFixtures;
use Tests\Concerns\PaymentFixtures;
use Tests\Concerns\SchoolFixtures;
use Tests\TestCase;

class PaymentVoidTest extends TestCase
{
    use FinanceFixtures, InvoiceFixtures, PaymentFixtures, RefreshDatabase, SchoolFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpInvoiceContext();
        $this->sppRate(300000);
    }

    private function voidPayment(int $id, string $reason = 'Salah catat nominal', $user = null)
    {
        return $this->actingAs($user ?? $this->tu)->postJson("/api/v1/payments/$id/void", ['reason' => $reason]);
    }

    public function test_void_mengembalikan_nominal_ke_semua_tagihan_terkait(): void
    {
        $andi = $this->sdStudent('Andi');
        $sep = $this->sppInvoice($andi, '2026-09');
        $okt = $this->sppInvoice($andi, '2026-10');

        $id = $this->payAs($this->tu, ['student_id' => $andi->id, 'amount' => 500000])->assertCreated()->json('data.id');
        $this->assertSame(InvoiceStatus::Paid, $sep->refresh()->status);

        $this->voidPayment($id)->assertOk()
            ->assertJsonPath('data.status', 'void')
            ->assertJsonPath('data.void_reason', 'Salah catat nominal');

        $this->assertSame(InvoiceStatus::Unpaid, $sep->refresh()->status);
        $this->assertSame(0, $sep->paid_amount);
        $this->assertSame(InvoiceStatus::Unpaid, $okt->refresh()->status);
        $this->assertSame(0, $okt->paid_amount);

        $payment = Payment::findOrFail($id);
        $this->assertSame(RecordStatus::Void, $payment->status);
        $this->assertNotNull($payment->voided_at);
        $this->assertSame($this->tu->id, (int) $payment->voided_by);
        $this->assertSame(2, PaymentAllocation::where('payment_id', $id)->count()); // riwayat alokasi tetap ada
    }

    public function test_void_hanya_mengurangi_bagian_pembayaran_itu(): void
    {
        $andi = $this->sdStudent('Andi');
        $invoice = $this->sppInvoice($andi, '2026-10');

        $this->payInvoice($invoice, 100000)->assertCreated();
        $kedua = $this->payInvoice($invoice, 200000)->assertCreated()->json('data.id');
        $this->assertSame(InvoiceStatus::Paid, $invoice->refresh()->status);

        $this->voidPayment($kedua)->assertOk();

        $invoice->refresh();
        $this->assertSame(100000, $invoice->paid_amount);
        $this->assertSame(InvoiceStatus::Partial, $invoice->status);
    }

    public function test_void_dua_kali_ditolak(): void
    {
        $andi = $this->sdStudent('Andi');
        $id = $this->payInvoice($this->sppInvoice($andi, '2026-10'), 100000)->assertCreated()->json('data.id');

        $this->voidPayment($id)->assertOk();
        $this->voidPayment($id)->assertStatus(409);
    }

    public function test_void_wajib_alasan(): void
    {
        $andi = $this->sdStudent('Andi');
        $id = $this->payInvoice($this->sppInvoice($andi, '2026-10'), 100000)->assertCreated()->json('data.id');

        $this->actingAs($this->tu)->postJson("/api/v1/payments/$id/void", [])
            ->assertStatus(422)->assertJsonValidationErrors(['reason']);
        $this->voidPayment($id, 'abc')->assertStatus(422)->assertJsonValidationErrors(['reason']);
        $this->assertSame(RecordStatus::Valid, Payment::findOrFail($id)->status);
    }

    public function test_tagihan_baru_bisa_dibatalkan_setelah_pembayarannya_dibatalkan(): void
    {
        $andi = $this->sdStudent('Andi');
        $invoice = $this->sppInvoice($andi, '2026-10');
        $paymentId = $this->payInvoice($invoice, 100000)->assertCreated()->json('data.id');

        $this->actingAs($this->tu)->postJson("/api/v1/invoices/{$invoice->id}/void", ['reason' => 'Salah tarif'])->assertStatus(409);

        $this->voidPayment($paymentId)->assertOk();

        $this->actingAs($this->tu)->postJson("/api/v1/invoices/{$invoice->id}/void", ['reason' => 'Salah tarif'])->assertOk();
        $this->assertSame(InvoiceStatus::Void, Invoice::findOrFail($invoice->id)->status);
    }

    public function test_bisa_bayar_lagi_setelah_void_dan_nomor_kwitansi_tidak_dipakai_ulang(): void
    {
        $andi = $this->sdStudent('Andi');
        $invoice = $this->sppInvoice($andi, '2026-10');

        $pertama = $this->payInvoice($invoice, 300000)->assertCreated();
        $nomorPertama = $pertama->json('data.receipt_number');
        $this->voidPayment($pertama->json('data.id'))->assertOk();

        $kedua = $this->payInvoice($invoice->refresh(), 300000)->assertCreated();
        $this->assertNotSame($nomorPertama, $kedua->json('data.receipt_number'));
        $this->assertStringEndsWith('/0002', $kedua->json('data.receipt_number'));
        $this->assertSame(InvoiceStatus::Paid, $invoice->refresh()->status);
    }

    public function test_izin_void_pembayaran(): void
    {
        $this->postJson('/api/v1/payments/1/void', ['reason' => 'Salah catat nominal'])->assertStatus(401);

        $andi = $this->sdStudent('Andi');
        $id = $this->payInvoice($this->sppInvoice($andi, '2026-10'), 100000)->assertCreated()->json('data.id');

        $this->voidPayment($id, 'Salah catat nominal', $this->guru)->assertStatus(403);
        $this->voidPayment($id, 'Salah catat nominal', $this->superadmin)->assertStatus(403);
        $this->assertSame(RecordStatus::Valid, Payment::findOrFail($id)->status);
    }
}
