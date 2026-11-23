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

class CashBookReportTest extends TestCase
{
    use CashFixtures, FinanceFixtures, FinanceReportFixtures, InvoiceFixtures, PaymentFixtures, RefreshDatabase, SchoolFixtures;

    private const OKTOBER = ['date_from' => '2026-10-01', 'date_to' => '2026-10-31'];

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpInvoiceContext();
        $this->sppRate(300000);
    }

    /** Saldo awal 1.000.000 (kas SD sebelum periode), lalu tiga transaksi di Oktober. */
    private function seedOktober(): int
    {
        $this->cashIn(1000000, '2026-09-20', 'SD');
        $andi = $this->sdStudent('Andi');
        $paymentId = $this->payOn($this->sppInvoice($andi, '2026-10'), 300000, '2026-10-02');
        $this->cashIn(200000, '2026-10-05', 'SD');
        $this->cashOut(50000, '2026-10-05');

        return $paymentId;
    }

    public function test_buku_kas_gabungan_dengan_saldo_awal_dan_saldo_berjalan(): void
    {
        $this->seedOktober();

        $response = $this->report('cash-book', self::OKTOBER)->assertOk()
            ->assertJsonPath('data.unit', 'all')
            ->assertJsonPath('data.opening_balance', 1000000)
            ->assertJsonCount(3, 'data.entries')
            ->assertJsonPath('data.entries.0.kind', 'student_payment')
            ->assertJsonPath('data.entries.0.date', '2026-10-02')
            ->assertJsonPath('data.entries.0.description', 'Pembayaran siswa: Andi')
            ->assertJsonPath('data.entries.0.unit', 'SD')
            ->assertJsonPath('data.entries.0.income', 300000)
            ->assertJsonPath('data.entries.0.expense', 0)
            ->assertJsonPath('data.entries.0.balance', 1300000)
            ->assertJsonPath('data.entries.1.kind', 'cash_income')
            ->assertJsonPath('data.entries.1.balance', 1500000)
            ->assertJsonPath('data.entries.2.kind', 'cash_expense')
            ->assertJsonPath('data.entries.2.unit', null)
            ->assertJsonPath('data.entries.2.expense', 50000)
            ->assertJsonPath('data.entries.2.balance', 1450000)
            ->assertJsonPath('data.total_income', 500000)
            ->assertJsonPath('data.total_expense', 50000)
            ->assertJsonPath('data.closing_balance', 1450000);

        $this->assertMatchesRegularExpression('#^KWT/\d{4}/\d{2}/\d{4}$#', $response->json('data.entries.0.reference'));
        $this->assertMatchesRegularExpression('#^KAS/\d{4}/\d{2}/\d{4}$#', $response->json('data.entries.1.reference'));
    }

    public function test_transaksi_dan_pembayaran_void_dikecualikan(): void
    {
        $paymentId = $this->seedOktober();
        $incomeId = $this->cashIn(5000, '2026-10-10', 'SD');

        $this->actingAs($this->tu)->postJson("/api/v1/payments/$paymentId/void", ['reason' => 'Salah catat nominal'])->assertOk();
        $this->actingAs($this->tu)->postJson("/api/v1/cash-transactions/$incomeId/void", ['reason' => 'Salah catat nominal'])->assertOk();

        $this->report('cash-book', self::OKTOBER)->assertOk()
            ->assertJsonPath('data.opening_balance', 1000000)
            ->assertJsonCount(2, 'data.entries')
            ->assertJsonPath('data.entries.0.kind', 'cash_income')
            ->assertJsonPath('data.entries.0.balance', 1200000)
            ->assertJsonPath('data.closing_balance', 1150000);
    }

    public function test_filter_unit_mengubah_saldo_awal_dan_isi(): void
    {
        $this->seedOktober();

        $this->report('cash-book', self::OKTOBER + ['unit' => 'SD'])->assertOk()
            ->assertJsonPath('data.unit', 'SD')
            ->assertJsonPath('data.opening_balance', 1000000)
            ->assertJsonCount(2, 'data.entries')
            ->assertJsonPath('data.closing_balance', 1500000);

        $this->report('cash-book', self::OKTOBER + ['unit' => 'none'])->assertOk()
            ->assertJsonPath('data.opening_balance', 0)
            ->assertJsonCount(1, 'data.entries')
            ->assertJsonPath('data.entries.0.kind', 'cash_expense')
            ->assertJsonPath('data.closing_balance', -50000);

        $this->report('cash-book', self::OKTOBER + ['unit' => 'XYZ'])
            ->assertStatus(422)->assertJsonValidationErrors(['unit']);
    }

    public function test_pada_hari_yang_sama_penerimaan_didahulukan_dari_pengeluaran(): void
    {
        $this->cashOut(40000, '2026-10-05');   // dicatat lebih dulu
        $this->cashIn(100000, '2026-10-05');

        $this->report('cash-book', self::OKTOBER)->assertOk()
            ->assertJsonPath('data.entries.0.kind', 'cash_income')
            ->assertJsonPath('data.entries.0.balance', 100000)
            ->assertJsonPath('data.entries.1.kind', 'cash_expense')
            ->assertJsonPath('data.entries.1.balance', 60000);
    }

    public function test_batas_periode_inklusif_dan_transaksi_sebelumnya_masuk_saldo_awal(): void
    {
        $this->cashIn(1000, '2026-09-30');
        $this->cashIn(2000, '2026-10-01');
        $this->cashIn(4000, '2026-10-31');
        $this->cashIn(8000, '2026-11-01');

        $this->report('cash-book', self::OKTOBER)->assertOk()
            ->assertJsonPath('data.opening_balance', 1000)
            ->assertJsonCount(2, 'data.entries')
            ->assertJsonPath('data.total_income', 6000)
            ->assertJsonPath('data.closing_balance', 7000);
    }

    public function test_periode_kosong_tetap_mengembalikan_saldo_awal(): void
    {
        $this->cashIn(1000000, '2026-09-20');

        $this->report('cash-book', ['date_from' => '2026-12-01', 'date_to' => '2026-12-31'])->assertOk()
            ->assertJsonCount(0, 'data.entries')
            ->assertJsonPath('data.opening_balance', 1000000)
            ->assertJsonPath('data.closing_balance', 1000000);
    }

    public function test_validasi_periode(): void
    {
        $this->report('cash-book')->assertStatus(422)->assertJsonValidationErrors(['date_from', 'date_to']);
        $this->report('cash-book', ['date_from' => '2026-10-31', 'date_to' => '2026-10-01'])
            ->assertStatus(422)->assertJsonValidationErrors(['date_to']);
        $this->report('cash-book', ['date_from' => '2026-01-01', 'date_to' => '2027-01-03'])
            ->assertStatus(422)->assertJsonValidationErrors(['date_to']);
    }

    public function test_izin_buku_kas(): void
    {
        $this->getJson('/api/v1/reports/finance/cash-book?date_from=2026-10-01&date_to=2026-10-31')->assertStatus(401);

        $this->report('cash-book', self::OKTOBER, $this->guru)->assertStatus(403);
        $this->report('cash-book', self::OKTOBER, $this->superadmin)->assertOk();
        $this->report('cash-book', self::OKTOBER, $this->tu)->assertOk();
    }
}
