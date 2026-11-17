<?php

namespace Tests\Feature\Finance;

use App\Enums\InvoiceStatus;
use App\Models\AuditLog;
use App\Models\FeeType;
use App\Models\Invoice;
use App\Models\NumberSequence;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\FinanceFixtures;
use Tests\Concerns\InvoiceFixtures;
use Tests\Concerns\PaymentFixtures;
use Tests\Concerns\SchoolFixtures;
use Tests\TestCase;

class PaymentRecordTest extends TestCase
{
    use FinanceFixtures, InvoiceFixtures, PaymentFixtures, RefreshDatabase, SchoolFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpInvoiceContext();
        $this->sppRate(300000);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_bayar_penuh_satu_tagihan(): void
    {
        $andi = $this->sdStudent('Andi');
        $invoice = $this->sppInvoice($andi, '2026-10');

        $this->payInvoice($invoice, 300000, ['reference' => null, 'notes' => 'Dibayar ibu'])->assertCreated()
            ->assertJsonPath('data.amount', 300000)
            ->assertJsonPath('data.status', 'valid')
            ->assertJsonPath('data.method', 'cash')
            ->assertJsonPath('data.student.name', 'Andi')
            ->assertJsonPath('data.received_by.name', $this->tu->name)
            ->assertJsonPath('data.allocations.0.amount', 300000)
            ->assertJsonPath('data.allocations.0.invoice.number', $invoice->number);

        $payment = Payment::firstOrFail();
        $this->assertMatchesRegularExpression('#^KWT/\d{4}/\d{2}/\d{4}$#', $payment->receipt_number);
        $this->assertSame($this->tu->id, (int) $payment->received_by);
        $this->assertSame(300000, $payment->amount);

        $invoice->refresh();
        $this->assertSame(300000, $invoice->paid_amount);
        $this->assertSame(InvoiceStatus::Paid, $invoice->status);

        $this->assertSame(1, AuditLog::where('event', 'created')->where('auditable_type', $payment->getMorphClass())->count());
    }

    public function test_bayar_sebagian_lalu_dilunasi(): void
    {
        $andi = $this->sdStudent('Andi');
        $invoice = $this->sppInvoice($andi, '2026-10');

        $this->payInvoice($invoice, 100000)->assertCreated();
        $invoice->refresh();
        $this->assertSame(100000, $invoice->paid_amount);
        $this->assertSame(InvoiceStatus::Partial, $invoice->status);

        $this->payInvoice($invoice, 200000)->assertCreated();
        $invoice->refresh();
        $this->assertSame(300000, $invoice->paid_amount);
        $this->assertSame(InvoiceStatus::Paid, $invoice->status);

        $this->assertSame(2, Payment::count());
    }

    public function test_alokasi_otomatis_ke_tagihan_terlama_dulu(): void
    {
        $andi = $this->sdStudent('Andi');
        $sep = $this->sppInvoice($andi, '2026-09');
        $okt = $this->sppInvoice($andi, '2026-10');
        $nov = $this->sppInvoice($andi, '2026-11');

        $this->payAs($this->tu, ['student_id' => $andi->id, 'amount' => 500000])->assertCreated()
            ->assertJsonPath('data.amount', 500000)
            ->assertJsonCount(2, 'data.allocations');

        $this->assertSame([300000, 200000], PaymentAllocation::orderBy('id')->pluck('amount')->map(fn ($v) => (int) $v)->all());

        $this->assertSame(InvoiceStatus::Paid, $sep->refresh()->status);
        $this->assertSame(InvoiceStatus::Partial, $okt->refresh()->status);
        $this->assertSame(200000, $okt->paid_amount);
        $this->assertSame(InvoiceStatus::Unpaid, $nov->refresh()->status);
        $this->assertSame(0, $nov->paid_amount);
    }

    public function test_tagihan_tanpa_jatuh_tempo_dialokasikan_paling_akhir(): void
    {
        $andi = $this->sdStudent('Andi');
        $pangkal = FeeType::where('code', 'UANG_PANGKAL')->firstOrFail();

        $manual = $this->actingAs($this->tu)->postJson('/api/v1/invoices', [
            'student_id' => $andi->id,
            'items' => [['fee_type_id' => $pangkal->id, 'unit_price' => 1000000]],
        ])->assertCreated()->json('data.id');
        $spp = $this->sppInvoice($andi, '2026-10');

        $this->payAs($this->tu, ['student_id' => $andi->id, 'amount' => 400000])->assertCreated();

        $this->assertSame(InvoiceStatus::Paid, $spp->refresh()->status);
        $this->assertSame(100000, (int) Invoice::findOrFail($manual)->paid_amount);
    }

    public function test_kelebihan_bayar_otomatis_ditolak_dan_tidak_menyisakan_data(): void
    {
        $andi = $this->sdStudent('Andi');
        $sep = $this->sppInvoice($andi, '2026-09');
        $okt = $this->sppInvoice($andi, '2026-10');

        $this->payAs($this->tu, ['student_id' => $andi->id, 'amount' => 700000])
            ->assertStatus(422)->assertJsonValidationErrors(['amount']);

        $this->assertSame(0, Payment::count());
        $this->assertSame(0, PaymentAllocation::count());
        $this->assertSame(0, $sep->refresh()->paid_amount);
        $this->assertSame(0, $okt->refresh()->paid_amount);
        $this->assertSame(0, NumberSequence::where('sequence_key', 'KWT')->count());
    }

    public function test_alokasi_eksplisit_melebihi_sisa_tagihan_ditolak(): void
    {
        $andi = $this->sdStudent('Andi');
        $invoice = $this->sppInvoice($andi, '2026-10');
        $this->payInvoice($invoice, 100000)->assertCreated();

        $this->payInvoice($invoice, 250000)->assertStatus(422)->assertJsonValidationErrors(['allocations.0.amount']);

        $this->assertSame(100000, $invoice->refresh()->paid_amount);
        $this->assertSame(1, Payment::count());
    }

    public function test_total_harus_sama_dengan_jumlah_alokasi(): void
    {
        $andi = $this->sdStudent('Andi');
        $invoice = $this->sppInvoice($andi, '2026-10');

        $this->payInvoice($invoice, 100000, ['amount' => 150000])
            ->assertStatus(422)->assertJsonValidationErrors(['amount']);

        $this->payInvoice($invoice, 100000, ['amount' => 100000])->assertCreated();
    }

    public function test_tagihan_milik_siswa_lain_ditolak(): void
    {
        $andi = $this->sdStudent('Andi');
        $budi = $this->sdStudent('Budi');
        $tagihanBudi = $this->sppInvoice($budi, '2026-10');

        $this->payAs($this->tu, [
            'student_id' => $andi->id,
            'allocations' => [['invoice_id' => $tagihanBudi->id, 'amount' => 300000]],
        ])->assertStatus(422)->assertJsonValidationErrors(['allocations.0.invoice_id']);

        $this->assertSame(0, Payment::count());
        $this->assertSame(0, $tagihanBudi->refresh()->paid_amount);
    }

    public function test_tagihan_lunas_atau_dibatalkan_tidak_bisa_dibayar(): void
    {
        $andi = $this->sdStudent('Andi');
        $lunas = $this->sppInvoice($andi, '2026-09');
        $batal = $this->sppInvoice($andi, '2026-10');
        $this->payInvoice($lunas)->assertCreated();
        $this->actingAs($this->tu)->postJson("/api/v1/invoices/{$batal->id}/void", ['reason' => 'Salah tarif'])->assertOk();

        $this->payAs($this->tu, ['student_id' => $andi->id, 'allocations' => [['invoice_id' => $lunas->id, 'amount' => 1000]]])
            ->assertStatus(422)->assertJsonValidationErrors(['allocations.0.invoice_id']);
        $this->payAs($this->tu, ['student_id' => $andi->id, 'allocations' => [['invoice_id' => $batal->id, 'amount' => 1000]]])
            ->assertStatus(422)->assertJsonValidationErrors(['allocations.0.invoice_id']);

        $this->assertSame(1, Payment::count());
    }

    public function test_tanpa_nominal_dan_tanpa_alokasi_ditolak(): void
    {
        $andi = $this->sdStudent('Andi');
        $this->sppInvoice($andi, '2026-10');

        $this->payAs($this->tu, ['student_id' => $andi->id])
            ->assertStatus(422)->assertJsonValidationErrors(['amount']);
    }

    public function test_siswa_tanpa_tagihan_terbuka_ditolak_untuk_alokasi_otomatis(): void
    {
        $andi = $this->sdStudent('Andi');

        $this->payAs($this->tu, ['student_id' => $andi->id, 'amount' => 100000])
            ->assertStatus(422)->assertJsonValidationErrors(['amount']);
    }

    public function test_tanggal_pembayaran_mengikuti_hari_di_wib(): void
    {
        $andi = $this->sdStudent('Andi');
        $invoice = $this->sppInvoice($andi, '2026-10');

        // 14 Nov 18.30 UTC = 15 Nov 01.30 WIB, jadi "hari ini" adalah 15 November.
        Carbon::setTestNow(Carbon::parse('2026-11-14 18:30:00', 'UTC')->setTimezone('Asia/Jakarta'));

        $this->payInvoice($invoice, 100000, ['payment_date' => '2026-11-16'])
            ->assertStatus(422)->assertJsonValidationErrors(['payment_date']);
        $this->payInvoice($invoice, 100000, ['payment_date' => '2026-11-15'])
            ->assertCreated()->assertJsonPath('data.payment_date', '2026-11-15');
    }

    public function test_transfer_wajib_referensi_dan_validasi_lain(): void
    {
        $andi = $this->sdStudent('Andi');
        $sep = $this->sppInvoice($andi, '2026-09');
        $okt = $this->sppInvoice($andi, '2026-10');

        $this->payInvoice($sep, 100000, ['method' => 'transfer'])
            ->assertStatus(422)->assertJsonValidationErrors(['reference']);
        $this->payInvoice($sep, 100000, ['method' => 'transfer', 'reference' => 'TRF-001'])
            ->assertCreated()->assertJsonPath('data.reference', 'TRF-001');
        $this->payInvoice($sep, 100000, ['method' => 'cash', 'reference' => null])->assertCreated();

        $this->payInvoice($okt, 100000, ['method' => 'kartu'])
            ->assertStatus(422)->assertJsonValidationErrors(['method']);
        $this->payAs($this->tu, ['student_id' => $andi->id, 'amount' => 0])
            ->assertStatus(422)->assertJsonValidationErrors(['amount']);
        $this->payAs($this->tu, ['student_id' => $andi->id, 'allocations' => [
            ['invoice_id' => $okt->id, 'amount' => 1000],
            ['invoice_id' => $okt->id, 'amount' => 2000],
        ]])->assertStatus(422)->assertJsonValidationErrors(['allocations.1.invoice_id']);
    }

    public function test_kegagalan_di_tengah_alokasi_membatalkan_semuanya(): void
    {
        $andi = $this->sdStudent('Andi');
        $budi = $this->sdStudent('Budi');
        $milikAndi = $this->sppInvoice($andi, '2026-10');
        $milikBudi = $this->sppInvoice($budi, '2026-10');

        $this->payAs($this->tu, ['student_id' => $andi->id, 'allocations' => [
            ['invoice_id' => $milikAndi->id, 'amount' => 300000],
            ['invoice_id' => $milikBudi->id, 'amount' => 300000],
        ]])->assertStatus(422);

        $this->assertSame(0, Payment::count());
        $this->assertSame(0, $milikAndi->refresh()->paid_amount);
        $this->assertSame(InvoiceStatus::Unpaid, $milikAndi->status);
        $this->assertSame(0, NumberSequence::where('sequence_key', 'KWT')->count());
    }

    public function test_izin_catat_pembayaran(): void
    {
        $this->postJson('/api/v1/payments', ['student_id' => 1, 'payment_date' => '2026-10-01', 'method' => 'cash'])
            ->assertStatus(401);

        $andi = $this->sdStudent('Andi');
        $invoice = $this->sppInvoice($andi, '2026-10');

        $this->payInvoice($invoice, 100000, [])->assertCreated();
        foreach ([$this->guru, $this->superadmin] as $user) {
            $this->payAs($user, ['student_id' => $andi->id, 'amount' => 1000])->assertStatus(403);
        }
        $this->assertSame(1, Payment::count());
    }
}
