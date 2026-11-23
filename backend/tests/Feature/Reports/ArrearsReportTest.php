<?php

namespace Tests\Feature\Reports;

use App\Models\FeeType;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CashFixtures;
use Tests\Concerns\FinanceFixtures;
use Tests\Concerns\FinanceReportFixtures;
use Tests\Concerns\InvoiceFixtures;
use Tests\Concerns\PaymentFixtures;
use Tests\Concerns\SchoolFixtures;
use Tests\TestCase;

class ArrearsReportTest extends TestCase
{
    use CashFixtures, FinanceFixtures, FinanceReportFixtures, InvoiceFixtures, PaymentFixtures, RefreshDatabase, SchoolFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpInvoiceContext();
        $this->sppRate(300000);
        $this->smpRate(400000);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_tunggakan_hanya_tagihan_yang_sudah_jatuh_tempo(): void
    {
        $andi = $this->sdStudent('Andi');
        $budi = $this->sdStudent('Budi');
        $this->sppInvoice($andi, '2026-09');
        $this->sppInvoice($andi, '2026-10');
        $this->sppInvoice($andi, '2026-11');
        $this->sppInvoice($budi, '2026-10');

        $this->report('arrears', ['as_of' => '2026-10-20'])->assertOk()
            ->assertJsonPath('data.as_of', '2026-10-20')
            ->assertJsonCount(2, 'data.rows')
            ->assertJsonPath('data.rows.0.student.name', 'Andi')
            ->assertJsonPath('data.rows.0.unit', 'SD')
            ->assertJsonPath('data.rows.0.classroom', '1A')
            ->assertJsonPath('data.rows.0.invoice_count', 2)
            ->assertJsonPath('data.rows.0.outstanding', 600000)
            ->assertJsonPath('data.rows.0.oldest_due_date', '2026-09-10')
            ->assertJsonPath('data.rows.0.days_overdue', 40)
            ->assertJsonCount(2, 'data.rows.0.invoices')
            ->assertJsonPath('data.rows.0.invoices.0.period_month', '2026-09')
            ->assertJsonPath('data.rows.1.student.name', 'Budi')
            ->assertJsonPath('data.rows.1.outstanding', 300000)
            ->assertJsonPath('data.rows.1.days_overdue', 10)
            ->assertJsonPath('data.total.students', 2)
            ->assertJsonPath('data.total.invoices', 3)
            ->assertJsonPath('data.total.outstanding', 900000);
    }

    public function test_include_not_due_menyertakan_semua_tagihan_terbuka(): void
    {
        $andi = $this->sdStudent('Andi');
        $this->sppInvoice($andi, '2026-09');
        $this->sppInvoice($andi, '2026-10');
        $this->sppInvoice($andi, '2026-11');

        $this->report('arrears', ['as_of' => '2026-10-20', 'include_not_due' => 1])->assertOk()
            ->assertJsonPath('data.include_not_due', true)
            ->assertJsonPath('data.rows.0.invoice_count', 3)
            ->assertJsonPath('data.total.outstanding', 900000);
    }

    public function test_sebagian_dibayar_dihitung_sisanya_dan_lunas_serta_void_dikecualikan(): void
    {
        $andi = $this->sdStudent('Andi');
        $budi = $this->sdStudent('Budi');
        $sep = $this->sppInvoice($andi, '2026-09');
        $okt = $this->sppInvoice($andi, '2026-10');
        $nov = $this->sppInvoice($andi, '2026-11');
        $this->sppInvoice($budi, '2026-10');

        $this->payOn($sep, 100000, '2026-10-01');
        $this->payOn($okt, 300000, '2026-10-02');
        $this->actingAs($this->tu)->postJson("/api/v1/invoices/{$nov->id}/void", ['reason' => 'Salah tarif'])->assertOk();

        $this->report('arrears', ['as_of' => '2026-12-01'])->assertOk()
            ->assertJsonCount(2, 'data.rows')
            ->assertJsonPath('data.rows.0.student.name', 'Andi')
            ->assertJsonPath('data.rows.0.invoice_count', 1)
            ->assertJsonPath('data.rows.0.outstanding', 200000)
            ->assertJsonPath('data.rows.0.invoices.0.status', 'partial')
            ->assertJsonPath('data.rows.0.invoices.0.paid_amount', 100000)
            ->assertJsonPath('data.total.invoices', 2)
            ->assertJsonPath('data.total.outstanding', 500000);
    }

    public function test_tagihan_tanpa_jatuh_tempo_ikut_dihitung(): void
    {
        $andi = $this->sdStudent('Andi');
        $pangkal = FeeType::where('code', 'UANG_PANGKAL')->firstOrFail();
        $this->actingAs($this->tu)->postJson('/api/v1/invoices', [
            'student_id' => $andi->id,
            'items' => [['fee_type_id' => $pangkal->id, 'unit_price' => 1000000]],
        ])->assertCreated();

        $this->report('arrears', ['as_of' => '2026-08-01'])->assertOk()
            ->assertJsonCount(1, 'data.rows')
            ->assertJsonPath('data.rows.0.outstanding', 1000000)
            ->assertJsonPath('data.rows.0.oldest_due_date', null)
            ->assertJsonPath('data.rows.0.days_overdue', 0)
            ->assertJsonPath('data.rows.0.invoices.0.kind', 'one_time');
    }

    public function test_rekap_per_unit_dan_filter_unit(): void
    {
        $andi = $this->sdStudent('Andi');
        $citra = $this->smpStudent('Citra');
        $this->sppInvoice($andi, '2026-10');
        $this->smpInvoice($citra, '2026-10');

        $semua = $this->report('arrears', ['as_of' => '2026-10-20'])->assertOk();
        $this->assertSame(['SD', 'SMP'], array_column($semua->json('data.by_unit'), 'unit'));
        $semua->assertJsonPath('data.by_unit.0.outstanding', 300000)
            ->assertJsonPath('data.by_unit.1.outstanding', 400000)
            ->assertJsonPath('data.total.outstanding', 700000);

        $this->report('arrears', ['as_of' => '2026-10-20', 'unit' => 'SMP'])->assertOk()
            ->assertJsonCount(1, 'data.rows')
            ->assertJsonPath('data.rows.0.student.name', 'Citra')
            ->assertJsonPath('data.total.outstanding', 400000);

        $this->report('arrears', ['as_of' => '2026-10-20', 'unit' => 'none'])->assertOk()
            ->assertJsonCount(0, 'data.rows')
            ->assertJsonPath('data.total.outstanding', 0);

        $this->report('arrears', ['unit' => 'XYZ'])->assertStatus(422)->assertJsonValidationErrors(['unit']);
    }

    public function test_tanggal_acuan_bawaan_adalah_hari_ini(): void
    {
        $andi = $this->sdStudent('Andi');
        $this->sppInvoice($andi, '2026-09');
        $this->sppInvoice($andi, '2026-11');

        Carbon::setTestNow(Carbon::parse('2026-10-20 09:00:00', 'Asia/Jakarta'));

        $this->report('arrears')->assertOk()
            ->assertJsonPath('data.as_of', '2026-10-20')
            ->assertJsonPath('data.rows.0.invoice_count', 1)
            ->assertJsonPath('data.total.outstanding', 300000);
    }

    public function test_validasi_filter(): void
    {
        $this->report('arrears', ['as_of' => 'besok'])->assertStatus(422)->assertJsonValidationErrors(['as_of']);
        $this->report('arrears', ['academic_year_id' => 99999])->assertStatus(422)->assertJsonValidationErrors(['academic_year_id']);
        $this->report('arrears', ['include_not_due' => 'mungkin'])->assertStatus(422)->assertJsonValidationErrors(['include_not_due']);
    }

    public function test_izin_laporan_tunggakan(): void
    {
        $this->getJson('/api/v1/reports/finance/arrears')->assertStatus(401);

        $this->report('arrears', [], $this->guru)->assertStatus(403);
        $this->report('arrears', [], $this->superadmin)->assertOk();
        $this->report('arrears', [], $this->tu)->assertOk();
    }
}
