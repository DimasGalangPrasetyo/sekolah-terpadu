<?php

namespace Tests\Feature\Finance;

use App\Models\AuditLog;
use App\Models\Payment;
use App\Models\SchoolProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\FinanceFixtures;
use Tests\Concerns\InvoiceFixtures;
use Tests\Concerns\PaymentFixtures;
use Tests\Concerns\SchoolFixtures;
use Tests\TestCase;

class ReceiptTest extends TestCase
{
    use FinanceFixtures, InvoiceFixtures, PaymentFixtures, RefreshDatabase, SchoolFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpInvoiceContext();
        $this->sppRate(300000);
    }

    public function test_data_kwitansi_lengkap_dan_dicatat_di_audit(): void
    {
        SchoolProfile::create(['foundation_name' => "Yayasan Al-Mu'min", 'address' => 'Jl. Contoh No. 1']);
        $andi = $this->sdStudent('Andi');
        $invoice = $this->sppInvoice($andi, '2026-10');
        $id = $this->payInvoice($invoice, 300000, ['payment_date' => '2026-10-05'])->assertCreated()->json('data.id');
        $payment = Payment::findOrFail($id);

        $this->actingAs($this->tu)->getJson("/api/v1/payments/$id/receipt")->assertOk()
            ->assertJsonPath('data.receipt_number', $payment->receipt_number)
            ->assertJsonPath('data.payment_date', '2026-10-05')
            ->assertJsonPath('data.amount', 300000)
            ->assertJsonPath('data.amount_in_words', 'Tiga ratus ribu rupiah')
            ->assertJsonPath('data.method_label', 'Tunai')
            ->assertJsonPath('data.status', 'valid')
            ->assertJsonPath('data.student.name', 'Andi')
            ->assertJsonPath('data.received_by', $this->tu->name)
            ->assertJsonPath('data.allocations.0.invoice_number', $invoice->number)
            ->assertJsonPath('data.allocations.0.unit', 'SD')
            ->assertJsonPath('data.allocations.0.amount', 300000)
            ->assertJsonPath('data.school.name', "Yayasan Al-Mu'min")
            ->assertJsonPath('data.school.address', 'Jl. Contoh No. 1');

        $this->assertStringContainsString('SPP', $this->actingAs($this->tu)->getJson("/api/v1/payments/$id/receipt")->json('data.allocations.0.description'));
        $this->assertSame(2, AuditLog::where('event', 'receipt_printed')->count());
    }

    public function test_kwitansi_tetap_bisa_diambil_tetapi_berstatus_void(): void
    {
        $andi = $this->sdStudent('Andi');
        $id = $this->payInvoice($this->sppInvoice($andi, '2026-10'), 100000)->assertCreated()->json('data.id');
        $this->actingAs($this->tu)->postJson("/api/v1/payments/$id/void", ['reason' => 'Salah catat nominal'])->assertOk();

        $this->actingAs($this->tu)->getJson("/api/v1/payments/$id/receipt")->assertOk()
            ->assertJsonPath('data.status', 'void')
            ->assertJsonPath('data.void_reason', 'Salah catat nominal');
    }

    public function test_nama_yayasan_bawaan_bila_profil_belum_diisi(): void
    {
        $andi = $this->sdStudent('Andi');
        $id = $this->payInvoice($this->sppInvoice($andi, '2026-10'), 100000)->assertCreated()->json('data.id');

        $this->actingAs($this->tu)->getJson("/api/v1/payments/$id/receipt")->assertOk()
            ->assertJsonPath('data.school.name', 'Nama Yayasan');
    }

    public function test_izin_kwitansi(): void
    {
        $this->getJson('/api/v1/payments/1/receipt')->assertStatus(401);

        $andi = $this->sdStudent('Andi');
        $id = $this->payInvoice($this->sppInvoice($andi, '2026-10'), 100000)->assertCreated()->json('data.id');

        $this->actingAs($this->guru)->getJson("/api/v1/payments/$id/receipt")->assertStatus(403);
        $this->actingAs($this->superadmin)->getJson("/api/v1/payments/$id/receipt")->assertOk();
    }
}
