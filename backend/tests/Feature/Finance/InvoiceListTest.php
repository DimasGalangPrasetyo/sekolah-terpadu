<?php

namespace Tests\Feature\Finance;

use App\Models\Invoice;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\FinanceFixtures;
use Tests\Concerns\InvoiceFixtures;
use Tests\Concerns\SchoolFixtures;
use Tests\TestCase;

class InvoiceListTest extends TestCase
{
    use FinanceFixtures, InvoiceFixtures, RefreshDatabase, SchoolFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpInvoiceContext();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function list(string $query = '')
    {
        return $this->actingAs($this->tu)->getJson('/api/v1/invoices'.$query);
    }

    public function test_daftar_dan_filter(): void
    {
        $this->sppRate(300000);
        $andi = $this->sdStudent('Andi Pratama');
        $this->sdStudent('Budi Santoso');
        $this->generateAs($this->tu, ['month' => '2026-09'])->assertOk();
        $this->generateAs($this->tu, ['month' => '2026-10'])->assertOk();
        Invoice::where('student_id', $andi->id)->whereDate('period_month', '2026-09-01')
            ->update(['paid_amount' => 300000, 'status' => 'paid']);

        $this->list()->assertOk()->assertJsonCount(4, 'data');
        $this->list('?unit=SD')->assertOk()->assertJsonCount(4, 'data');
        $this->list('?unit=SMP')->assertOk()->assertJsonCount(0, 'data');
        $this->list('?period=2026-10')->assertOk()->assertJsonCount(2, 'data');
        $this->list('?status=paid')->assertOk()->assertJsonCount(1, 'data');
        $this->list('?status=unpaid')->assertOk()->assertJsonCount(3, 'data');
        $this->list('?kind=monthly')->assertOk()->assertJsonCount(4, 'data');
        $this->list('?kind=one_time')->assertOk()->assertJsonCount(0, 'data');
        $this->list('?q=Pratama')->assertOk()->assertJsonCount(2, 'data');
        $this->list("?student_id={$andi->id}")->assertOk()->assertJsonCount(2, 'data');
        $this->list('?status=bukan-status')->assertStatus(422);
        $this->list('?period=Oktober')->assertStatus(422);
    }

    public function test_filter_jatuh_tempo_terlewat(): void
    {
        $this->sppRate(300000);
        $this->sdStudent('Andi');
        Carbon::setTestNow('2026-10-20 08:00:00');
        $this->generateAs($this->tu, ['month' => '2026-09'])->assertOk();  // jatuh tempo 10 Sep: lewat
        $this->generateAs($this->tu, ['month' => '2026-11'])->assertOk();  // jatuh tempo 10 Nov: belum

        $this->list('?overdue=1')->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.period_month', '2026-09')
            ->assertJsonPath('data.0.is_overdue', true);

        $semua = $this->list()->assertOk()->json('data');
        $this->assertCount(2, $semua);
    }

    public function test_per_page_dibatasi_100(): void
    {
        $this->list('?per_page=1000')->assertOk()->assertJsonPath('meta.per_page', 100);
    }

    public function test_detail_memuat_item_dan_sisa_tagihan(): void
    {
        $this->sppRate(300000);
        $this->sdStudent('Andi');
        $this->generateAs($this->tu)->assertOk();
        $invoice = Invoice::firstOrFail();
        $invoice->update(['paid_amount' => 100000, 'status' => 'partial']);

        $this->actingAs($this->tu)->getJson("/api/v1/invoices/{$invoice->id}")->assertOk()
            ->assertJsonPath('data.number', $invoice->number)
            ->assertJsonPath('data.status', 'partial')
            ->assertJsonPath('data.total_amount', 300000)
            ->assertJsonPath('data.paid_amount', 100000)
            ->assertJsonPath('data.outstanding', 200000)
            ->assertJsonPath('data.student.name', 'Andi')
            ->assertJsonPath('data.unit.code', 'SD')
            ->assertJsonPath('data.items.0.fee_type.code', 'SPP')
            ->assertJsonPath('data.items.0.subtotal', 300000)
            ->assertJsonCount(0, 'data.allocations');
    }

    public function test_izin_baca_tagihan(): void
    {
        // Belum login: dicek paling awal, sebelum ada actingAs (actingAs bertahan sampai akhir tes).
        $this->getJson('/api/v1/invoices')->assertStatus(401);
        $this->getJson('/api/v1/invoices/1')->assertStatus(401);

        $this->sppRate(300000);
        $this->sdStudent('Andi');
        $this->generateAs($this->tu)->assertOk();
        $id = Invoice::firstOrFail()->id;

        $this->actingAs($this->guru)->getJson('/api/v1/invoices')->assertStatus(403);
        $this->actingAs($this->guru)->getJson("/api/v1/invoices/$id")->assertStatus(403);

        $this->actingAs($this->superadmin)->getJson('/api/v1/invoices')->assertOk();
        $this->actingAs($this->superadmin)->getJson("/api/v1/invoices/$id")->assertOk();
    }
}
