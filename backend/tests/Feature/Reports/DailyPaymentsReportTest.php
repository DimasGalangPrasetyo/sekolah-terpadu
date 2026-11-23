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

class DailyPaymentsReportTest extends TestCase
{
    use CashFixtures, FinanceFixtures, FinanceReportFixtures, InvoiceFixtures, PaymentFixtures, RefreshDatabase, SchoolFixtures;

    private const HARI = '2026-10-05';

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpInvoiceContext();
        $this->sppRate(300000);
        $this->smpRate(400000);
    }

    /** @return array{andi: int, budi: int, dedi: int} id pembayaran pada tanggal HARI */
    private function seedHari(): array
    {
        $andi = $this->sdStudent('Andi');
        $budi = $this->sdStudent('Budi');
        $dedi = $this->sdStudent('Dedi');

        $ids = [
            'andi' => $this->payOn($this->sppInvoice($andi, '2026-10'), 300000, self::HARI, 'cash'),
            'budi' => $this->payOn($this->sppInvoice($budi, '2026-10'), 100000, self::HARI, 'transfer'),
            'dedi' => $this->payOn($this->sppInvoice($dedi, '2026-10'), 50000, self::HARI, 'cash'),
        ];
        // Pembayaran di hari lain tidak boleh ikut.
        $this->payOn($this->sppInvoice($andi, '2026-11'), 100000, '2026-10-06', 'cash');

        return $ids;
    }

    public function test_laporan_kasir_harian_dengan_total_per_metode(): void
    {
        $this->seedHari();

        $this->report('daily-payments', ['date' => self::HARI])->assertOk()
            ->assertJsonPath('data.date', self::HARI)
            ->assertJsonPath('data.count', 3)
            ->assertJsonPath('data.by_method.cash', 350000)
            ->assertJsonPath('data.by_method.transfer', 100000)
            ->assertJsonPath('data.by_method.other', 0)
            ->assertJsonPath('data.total', 450000)
            ->assertJsonPath('data.payments.0.student.name', 'Andi')
            ->assertJsonPath('data.payments.0.method', 'cash')
            ->assertJsonPath('data.payments.0.amount', 300000)
            ->assertJsonPath('data.payments.0.received_by', $this->tu->name)
            ->assertJsonPath('data.payments.1.method', 'transfer')
            ->assertJsonPath('data.voided_count', 0)
            ->assertJsonPath('data.voided_amount', 0);
    }

    public function test_pembayaran_void_dipisah_dan_tidak_dihitung(): void
    {
        $ids = $this->seedHari();
        $this->actingAs($this->tu)->postJson("/api/v1/payments/{$ids['budi']}/void", ['reason' => 'Salah catat nominal'])->assertOk();

        $this->report('daily-payments', ['date' => self::HARI])->assertOk()
            ->assertJsonPath('data.count', 2)
            ->assertJsonPath('data.by_method.transfer', 0)
            ->assertJsonPath('data.total', 350000)
            ->assertJsonPath('data.voided_count', 1)
            ->assertJsonPath('data.voided_amount', 100000)
            ->assertJsonPath('data.voided.0.student.name', 'Budi')
            ->assertJsonPath('data.voided.0.void_reason', 'Salah catat nominal');
    }

    public function test_filter_unit(): void
    {
        $this->seedHari();
        $citra = $this->smpStudent('Citra');
        $this->payOn($this->smpInvoice($citra, '2026-10'), 200000, self::HARI, 'cash');

        $this->report('daily-payments', ['date' => self::HARI])->assertOk()
            ->assertJsonPath('data.count', 4)
            ->assertJsonPath('data.total', 650000);

        $this->report('daily-payments', ['date' => self::HARI, 'unit' => 'SMP'])->assertOk()
            ->assertJsonPath('data.unit', 'SMP')
            ->assertJsonPath('data.count', 1)
            ->assertJsonPath('data.total', 200000)
            ->assertJsonPath('data.payments.0.student.name', 'Citra');

        $this->report('daily-payments', ['date' => self::HARI, 'unit' => 'SD'])->assertOk()
            ->assertJsonPath('data.count', 3)
            ->assertJsonPath('data.total', 450000);

        $this->report('daily-payments', ['date' => self::HARI, 'unit' => 'none'])->assertOk()
            ->assertJsonPath('data.count', 0)
            ->assertJsonPath('data.total', 0);

        $this->report('daily-payments', ['date' => self::HARI, 'unit' => 'XYZ'])
            ->assertStatus(422)->assertJsonValidationErrors(['unit']);
    }

    public function test_hari_tanpa_pembayaran_mengembalikan_laporan_kosong(): void
    {
        $this->seedHari();

        $this->report('daily-payments', ['date' => '2026-10-20'])->assertOk()
            ->assertJsonPath('data.count', 0)
            ->assertJsonPath('data.total', 0)
            ->assertJsonCount(0, 'data.payments')
            ->assertJsonCount(0, 'data.voided');
    }

    public function test_validasi_tanggal(): void
    {
        $this->report('daily-payments')->assertStatus(422)->assertJsonValidationErrors(['date']);
        $this->report('daily-payments', ['date' => '5 Oktober'])->assertStatus(422)->assertJsonValidationErrors(['date']);
    }

    public function test_izin_laporan_kasir_harian(): void
    {
        $this->getJson('/api/v1/reports/finance/daily-payments?date=2026-10-05')->assertStatus(401);

        $this->report('daily-payments', ['date' => self::HARI], $this->guru)->assertStatus(403);
        $this->report('daily-payments', ['date' => self::HARI], $this->superadmin)->assertOk();
        $this->report('daily-payments', ['date' => self::HARI], $this->tu)->assertOk();
    }
}
