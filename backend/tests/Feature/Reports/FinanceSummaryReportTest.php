<?php

namespace Tests\Feature\Reports;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CashFixtures;
use Tests\Concerns\FinanceFixtures;
use Tests\Concerns\FinanceReportFixtures;
use Tests\Concerns\InvoiceFixtures;
use Tests\Concerns\PaymentFixtures;
use Tests\Concerns\SchoolFixtures;
use Tests\TestCase;

class FinanceSummaryReportTest extends TestCase
{
    use CashFixtures, FinanceFixtures, FinanceReportFixtures, InvoiceFixtures, PaymentFixtures, RefreshDatabase, SchoolFixtures;

    private const OKTOBER = ['date_from' => '2026-10-01', 'date_to' => '2026-10-31'];

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpInvoiceContext();
        $this->sppRate(300000);
        $this->smpRate(400000);
    }

    public function test_ringkasan_menggabungkan_pembayaran_siswa_dan_kas_per_unit(): void
    {
        $andi = $this->sdStudent('Andi');
        $citra = $this->smpStudent('Citra');
        $this->payOn($this->sppInvoice($andi, '2026-10'), 300000, '2026-10-05');
        $this->payOn($this->smpInvoice($citra, '2026-10'), 100000, '2026-10-06', 'transfer');
        $this->cashIn(200000, '2026-10-06', 'SD');
        $this->cashOut(50000, '2026-10-07');
        $this->cashIn(70000, '2026-10-08');

        $response = $this->report('summary', self::OKTOBER)->assertOk()
            ->assertJsonPath('data.period.from', '2026-10-01')
            ->assertJsonPath('data.unit', 'all');
        $rows = $this->rowsByKey($response);

        $this->assertSame(['TK', 'SD', 'SMP', 'UMUM'], array_keys($rows));

        $this->assertSame(300000, $rows['SD']['student_payments']);
        $this->assertSame(1, $rows['SD']['student_payment_count']);
        $this->assertSame(200000, $rows['SD']['other_income']);
        $this->assertSame(0, $rows['SD']['expense']);
        $this->assertSame(500000, $rows['SD']['total_income']);
        $this->assertSame(500000, $rows['SD']['balance']);

        $this->assertSame(100000, $rows['SMP']['student_payments']);
        $this->assertSame(100000, $rows['SMP']['balance']);

        $this->assertSame(0, $rows['TK']['total_income']);
        $this->assertSame(0, $rows['TK']['balance']);

        $this->assertSame(70000, $rows['UMUM']['other_income']);
        $this->assertSame(50000, $rows['UMUM']['expense']);
        $this->assertSame(20000, $rows['UMUM']['balance']);

        $response->assertJsonPath('data.total.student_payments', 400000)
            ->assertJsonPath('data.total.other_income', 270000)
            ->assertJsonPath('data.total.total_income', 670000)
            ->assertJsonPath('data.total.expense', 50000)
            ->assertJsonPath('data.total.balance', 620000);
    }

    public function test_transaksi_dan_pembayaran_void_tidak_dihitung(): void
    {
        $andi = $this->sdStudent('Andi');
        $paymentId = $this->payOn($this->sppInvoice($andi, '2026-10'), 300000, '2026-10-05');
        $cashId = $this->cashIn(200000, '2026-10-06', 'SD');

        $this->actingAs($this->tu)->postJson("/api/v1/payments/$paymentId/void", ['reason' => 'Salah catat nominal'])->assertOk();
        $this->actingAs($this->tu)->postJson("/api/v1/cash-transactions/$cashId/void", ['reason' => 'Salah catat nominal'])->assertOk();

        $this->report('summary', self::OKTOBER)->assertOk()
            ->assertJsonPath('data.total.student_payments', 0)
            ->assertJsonPath('data.total.other_income', 0)
            ->assertJsonPath('data.total.balance', 0);
    }

    public function test_batas_periode_inklusif(): void
    {
        $this->cashIn(1000, '2026-09-30', 'SD');
        $this->cashIn(2000, '2026-10-01', 'SD');
        $this->cashIn(4000, '2026-10-31', 'SD');
        $this->cashIn(8000, '2026-11-01', 'SD');

        $rows = $this->rowsByKey($this->report('summary', self::OKTOBER)->assertOk());

        $this->assertSame(6000, $rows['SD']['other_income']);
        $this->assertSame(2, $rows['SD']['other_income_count']);
    }

    public function test_filter_unit(): void
    {
        $andi = $this->sdStudent('Andi');
        $this->payOn($this->sppInvoice($andi, '2026-10'), 300000, '2026-10-05');
        $this->cashOut(50000, '2026-10-07');

        $sd = $this->report('summary', self::OKTOBER + ['unit' => 'SD'])->assertOk()
            ->assertJsonPath('data.unit', 'SD')
            ->assertJsonCount(1, 'data.rows')
            ->assertJsonPath('data.total.balance', 300000);
        $this->assertSame('SD', $sd->json('data.rows.0.key'));

        $this->report('summary', self::OKTOBER + ['unit' => 'none'])->assertOk()
            ->assertJsonPath('data.unit', 'none')
            ->assertJsonCount(1, 'data.rows')
            ->assertJsonPath('data.rows.0.key', 'UMUM')
            ->assertJsonPath('data.total.balance', -50000);

        $this->report('summary', self::OKTOBER + ['unit' => 'XYZ'])
            ->assertStatus(422)->assertJsonValidationErrors(['unit']);
    }

    public function test_validasi_periode(): void
    {
        $this->report('summary')->assertStatus(422)->assertJsonValidationErrors(['date_from', 'date_to']);
        $this->report('summary', ['date_from' => 'kemarin', 'date_to' => '2026-10-31'])
            ->assertStatus(422)->assertJsonValidationErrors(['date_from']);
        $this->report('summary', ['date_from' => '2026-10-31', 'date_to' => '2026-10-01'])
            ->assertStatus(422)->assertJsonValidationErrors(['date_to']);

        $this->report('summary', ['date_from' => '2026-01-01', 'date_to' => '2027-01-02'])->assertOk(); // 366 hari
        $this->report('summary', ['date_from' => '2026-01-01', 'date_to' => '2027-01-03'])
            ->assertStatus(422)->assertJsonValidationErrors(['date_to']); // 367 hari
    }

    public function test_izin_laporan_ringkasan(): void
    {
        $this->getJson('/api/v1/reports/finance/summary?date_from=2026-10-01&date_to=2026-10-31')->assertStatus(401);

        $this->report('summary', self::OKTOBER, $this->guru)->assertStatus(403);
        $this->report('summary', self::OKTOBER, $this->superadmin)->assertOk();
        $this->report('summary', self::OKTOBER, $this->tu)->assertOk();
    }
}
