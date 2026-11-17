<?php

namespace Tests\Feature\Finance;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\FinanceFixtures;
use Tests\Concerns\InvoiceFixtures;
use Tests\Concerns\PaymentFixtures;
use Tests\Concerns\SchoolFixtures;
use Tests\TestCase;

class PaymentListTest extends TestCase
{
    use FinanceFixtures, InvoiceFixtures, PaymentFixtures, RefreshDatabase, SchoolFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpInvoiceContext();
        $this->sppRate(300000);
    }

    private function list(string $query = '')
    {
        return $this->actingAs($this->tu)->getJson('/api/v1/payments'.$query);
    }

    public function test_daftar_dan_filter(): void
    {
        $andi = $this->sdStudent('Andi Pratama');
        $budi = $this->sdStudent('Budi Santoso');
        $a = $this->payInvoice($this->sppInvoice($andi, '2026-10'), 300000, ['payment_date' => '2026-10-05'])->assertCreated()->json('data');
        $this->payInvoice($this->sppInvoice($budi, '2026-10'), 100000, ['payment_date' => '2026-10-20', 'method' => 'transfer', 'reference' => 'TRF-1'])->assertCreated();
        $c = $this->payInvoice($this->sppInvoice($budi, '2026-11'), 300000, ['payment_date' => '2026-11-02'])->assertCreated()->json('data.id');
        $this->actingAs($this->tu)->postJson("/api/v1/payments/$c/void", ['reason' => 'Salah catat nominal'])->assertOk();

        $this->list()->assertOk()->assertJsonCount(3, 'data');
        $this->list("?student_id={$andi->id}")->assertOk()->assertJsonCount(1, 'data');
        $this->list('?method=transfer')->assertOk()->assertJsonCount(1, 'data');
        $this->list('?status=void')->assertOk()->assertJsonCount(1, 'data');
        $this->list('?status=valid')->assertOk()->assertJsonCount(2, 'data');
        $this->list('?date_from=2026-10-10&date_to=2026-10-31')->assertOk()->assertJsonCount(1, 'data');
        $this->list('?q=Pratama')->assertOk()->assertJsonCount(1, 'data');
        $this->list('?q='.$a['receipt_number'])->assertOk()->assertJsonCount(1, 'data');
        $this->list('?q=KWT')->assertOk()->assertJsonCount(3, 'data');
        $this->list('?status=lainnya')->assertStatus(422);
        $this->list('?date_from=besok')->assertStatus(422);
    }

    public function test_per_page_dibatasi_100(): void
    {
        $this->list('?per_page=1000')->assertOk()->assertJsonPath('meta.per_page', 100);
    }

    public function test_detail_pembayaran_memuat_alokasi_dan_tagihan(): void
    {
        $andi = $this->sdStudent('Andi');
        $invoice = $this->sppInvoice($andi, '2026-10');
        $id = $this->payInvoice($invoice, 120000, ['notes' => 'Cicilan pertama'])->assertCreated()->json('data.id');

        $this->actingAs($this->tu)->getJson("/api/v1/payments/$id")->assertOk()
            ->assertJsonPath('data.notes', 'Cicilan pertama')
            ->assertJsonPath('data.student.name', 'Andi')
            ->assertJsonPath('data.allocations.0.amount', 120000)
            ->assertJsonPath('data.allocations.0.invoice.number', $invoice->number)
            ->assertJsonPath('data.allocations.0.invoice.status', 'partial');

        $this->actingAs($this->tu)->getJson('/api/v1/payments/99999')->assertStatus(404);
    }

    public function test_tagihan_terbuka_siswa_urut_terlama_dan_tanpa_yang_lunas(): void
    {
        $andi = $this->sdStudent('Andi');
        $sep = $this->sppInvoice($andi, '2026-09');
        $okt = $this->sppInvoice($andi, '2026-10');
        $nov = $this->sppInvoice($andi, '2026-11');
        $this->payInvoice($okt)->assertCreated();
        $this->payInvoice($nov, 100000)->assertCreated();

        $res = $this->actingAs($this->tu)->getJson("/api/v1/payments/open-invoices?student_id={$andi->id}")->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.number', $sep->number)
            ->assertJsonPath('data.0.outstanding', 300000)
            ->assertJsonPath('data.1.number', $nov->number)
            ->assertJsonPath('data.1.outstanding', 200000)
            ->assertJsonPath('data.1.status', 'partial');
        $this->assertSame('SD', $res->json('data.0.unit.code'));

        $this->actingAs($this->tu)->getJson('/api/v1/payments/open-invoices')->assertStatus(422);
    }

    public function test_izin_baca_pembayaran(): void
    {
        $this->getJson('/api/v1/payments')->assertStatus(401);
        $this->getJson('/api/v1/payments/1')->assertStatus(401);
        $this->getJson('/api/v1/payments/open-invoices?student_id=1')->assertStatus(401);

        $andi = $this->sdStudent('Andi');
        $id = $this->payInvoice($this->sppInvoice($andi, '2026-10'), 100000)->assertCreated()->json('data.id');

        $this->actingAs($this->guru)->getJson('/api/v1/payments')->assertStatus(403);
        $this->actingAs($this->guru)->getJson("/api/v1/payments/$id")->assertStatus(403);
        $this->actingAs($this->guru)->getJson("/api/v1/payments/open-invoices?student_id={$andi->id}")->assertStatus(403);

        $this->actingAs($this->superadmin)->getJson('/api/v1/payments')->assertOk();
        $this->actingAs($this->superadmin)->getJson("/api/v1/payments/$id")->assertOk();
    }
}
