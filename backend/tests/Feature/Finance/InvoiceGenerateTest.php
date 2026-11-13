<?php

namespace Tests\Feature\Finance;

use App\Enums\DiscountType;
use App\Enums\InvoiceKind;
use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\NumberSequence;
use Carbon\Carbon;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\FinanceFixtures;
use Tests\Concerns\InvoiceFixtures;
use Tests\Concerns\SchoolFixtures;
use Tests\TestCase;

class InvoiceGenerateTest extends TestCase
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

    public function test_generate_membuat_tagihan_bulanan(): void
    {
        $this->sppRate(300000);
        $andi = $this->sdStudent('Andi');
        $this->sdStudent('Budi');

        $this->generateAs($this->tu)->assertOk()
            ->assertJsonPath('data.created', 2)
            ->assertJsonPath('data.skipped_existing', 0)
            ->assertJsonPath('data.skipped_no_rate', 0)
            ->assertJsonPath('data.total_amount', 600000)
            ->assertJsonPath('data.period', '2026-10');

        $this->assertSame(2, Invoice::count());
        $this->assertCount(2, Invoice::pluck('number')->unique());

        $invoice = Invoice::where('student_id', $andi->id)->firstOrFail();
        $this->assertSame(InvoiceKind::Monthly, $invoice->kind);
        $this->assertSame(InvoiceStatus::Unpaid, $invoice->status);
        $this->assertSame(300000, $invoice->total_amount);
        $this->assertSame(0, $invoice->paid_amount);
        $this->assertSame('2026-10-10', $invoice->due_date->toDateString());
        $this->assertSame('2026-10', $invoice->period_month->format('Y-m'));
        $this->assertSame($this->tu->id, (int) $invoice->created_by);
        $this->assertMatchesRegularExpression('#^INV/\d{4}/\d{2}/\d{4}$#', $invoice->number);

        $this->assertCount(1, $invoice->items);
        $item = $invoice->items->first();
        $this->assertEquals(300000, $item->unit_price);
        $this->assertEquals(0, $item->discount_amount);
        $this->assertEquals(300000, $item->subtotal);
        $this->assertEquals($this->spp->id, $item->fee_type_id);
    }

    public function test_generate_idempoten(): void
    {
        $this->sppRate(300000);
        $this->sdStudent('Andi');
        $this->sdStudent('Budi');

        $this->generateAs($this->tu)->assertOk()->assertJsonPath('data.created', 2);
        $this->generateAs($this->tu)->assertOk()
            ->assertJsonPath('data.created', 0)
            ->assertJsonPath('data.skipped_existing', 2);

        $this->assertSame(2, Invoice::count());
        $this->assertSame(2, InvoiceItem::count());
    }

    public function test_dry_run_tidak_menyimpan_apa_pun(): void
    {
        $this->sppRate(300000);
        $this->sdStudent('Andi');

        $this->generateAs($this->tu, ['dry_run' => true])->assertOk()
            ->assertJsonPath('data.dry_run', true)
            ->assertJsonPath('data.created', 1)
            ->assertJsonPath('data.total_amount', 300000);

        $this->assertSame(0, Invoice::count());
        $this->assertSame(0, InvoiceItem::count());
        $this->assertSame(0, NumberSequence::count());

        // Setelah pratinjau, generate sungguhan tetap membuat tagihan dan nomornya mulai dari 0001.
        $this->generateAs($this->tu)->assertOk()->assertJsonPath('data.created', 1);
        $this->assertStringEndsWith('/0001', Invoice::firstOrFail()->number);
    }

    public function test_tanpa_tarif_dilewati_dan_dilaporkan(): void
    {
        $this->sppRate(300000); // hanya SD
        $this->smpStudent('Citra');

        $this->generateAs($this->tu, ['unit_id' => $this->unitSmp->id])->assertOk()
            ->assertJsonPath('data.created', 0)
            ->assertJsonPath('data.skipped_no_rate', 1)
            ->assertJsonPath('data.skipped_no_rate_students.0.name', 'Citra');

        $this->assertSame(0, Invoice::count());
    }

    public function test_tarif_tingkat_spesifik_menang_atas_tarif_semua_tingkat(): void
    {
        $this->sppRate(300000);
        $this->sppRate(350000, $this->sdGradeId('1'));
        $kelas1 = $this->sdStudent('Andi', '1');
        $kelas2 = $this->sdStudent('Budi', '2');

        $this->generateAs($this->tu)->assertOk()->assertJsonPath('data.created', 2);

        $this->assertSame(350000, Invoice::where('student_id', $kelas1->id)->firstOrFail()->total_amount);
        $this->assertSame(300000, Invoice::where('student_id', $kelas2->id)->firstOrFail()->total_amount);
    }

    public function test_diskon_persen_nominal_dan_lunas_otomatis(): void
    {
        $this->sppRate(300000);
        $persen = $this->sdStudent('Persen');
        $nominal = $this->sdStudent('Nominal');
        $gratis = $this->sdStudent('Gratis');
        $melebihi = $this->sdStudent('Melebihi');

        $this->makeDiscount(['student_id' => $persen->id, 'type' => DiscountType::Percent, 'value' => 20]);
        $this->makeDiscount(['student_id' => $nominal->id, 'fee_type_id' => $this->spp->id, 'type' => DiscountType::Fixed, 'value' => 50000]);
        $this->makeDiscount(['student_id' => $gratis->id, 'type' => DiscountType::Percent, 'value' => 100]);
        $this->makeDiscount(['student_id' => $melebihi->id, 'type' => DiscountType::Fixed, 'value' => 500000]);

        $this->generateAs($this->tu)->assertOk()->assertJsonPath('data.created', 4);

        $inv = fn ($s) => Invoice::where('student_id', $s->id)->with('items')->firstOrFail();

        $this->assertSame(240000, $inv($persen)->total_amount);
        $this->assertEquals(60000, $inv($persen)->items->first()->discount_amount);
        $this->assertEquals(300000, $inv($persen)->items->first()->unit_price);

        $this->assertSame(250000, $inv($nominal)->total_amount);

        // Diskon 100% atau nominal melebihi harga: potongan dibatasi harga, total 0, langsung lunas.
        $this->assertSame(0, $inv($gratis)->total_amount);
        $this->assertSame(InvoiceStatus::Paid, $inv($gratis)->status);
        $this->assertSame(0, $inv($melebihi)->total_amount);
        $this->assertEquals(300000, $inv($melebihi)->items->first()->discount_amount);
        $this->assertSame(InvoiceStatus::Paid, $inv($melebihi)->status);
    }

    public function test_diskon_persen_dibulatkan_ke_bawah(): void
    {
        $this->sppRate(333333);
        $siswa = $this->sdStudent('Andi');
        $this->makeDiscount(['student_id' => $siswa->id, 'type' => DiscountType::Percent, 'value' => 10]);

        $this->generateAs($this->tu)->assertOk();

        $invoice = Invoice::where('student_id', $siswa->id)->with('items')->firstOrFail();
        $this->assertEquals(33333, $invoice->items->first()->discount_amount);
        $this->assertSame(300000, $invoice->total_amount);
    }

    public function test_diskon_khusus_jenis_biaya_menang_atas_diskon_umum_dan_tidak_ditumpuk(): void
    {
        $this->sppRate(300000);
        $siswa = $this->sdStudent('Andi');
        $this->makeDiscount(['student_id' => $siswa->id, 'fee_type_id' => null, 'type' => DiscountType::Percent, 'value' => 50]);
        $this->makeDiscount(['student_id' => $siswa->id, 'fee_type_id' => $this->spp->id, 'type' => DiscountType::Fixed, 'value' => 10000]);

        $this->generateAs($this->tu)->assertOk();

        $this->assertSame(290000, Invoice::where('student_id', $siswa->id)->firstOrFail()->total_amount);
    }

    public function test_diskon_nonaktif_diabaikan(): void
    {
        $this->sppRate(300000);
        $siswa = $this->sdStudent('Andi');
        $this->makeDiscount(['student_id' => $siswa->id, 'type' => DiscountType::Percent, 'value' => 50, 'is_active' => false]);

        $this->generateAs($this->tu)->assertOk();

        $this->assertSame(300000, Invoice::where('student_id', $siswa->id)->firstOrFail()->total_amount);
    }

    public function test_hanya_siswa_aktif_pada_unit_yang_dipilih(): void
    {
        $this->sppRate(300000);
        $this->sdStudent('Andi');
        $keluar = $this->sdStudent('Budi');
        $keluar->update(['status' => 'inactive']);
        $this->smpStudent('Citra');

        $this->generateAs($this->tu)->assertOk()
            ->assertJsonPath('data.eligible', 1)
            ->assertJsonPath('data.created', 1);
    }

    public function test_filter_student_ids(): void
    {
        $this->sppRate(300000);
        $andi = $this->sdStudent('Andi');
        $this->sdStudent('Budi');

        $this->generateAs($this->tu, ['student_ids' => [$andi->id]])->assertOk()
            ->assertJsonPath('data.eligible', 1)
            ->assertJsonPath('data.created', 1);

        $this->assertSame([$andi->id], Invoice::pluck('student_id')->map(fn ($id) => (int) $id)->all());
    }

    public function test_jatuh_tempo_bisa_ditentukan(): void
    {
        $this->sppRate(300000);
        $this->sdStudent('Andi');

        $this->generateAs($this->tu, ['due_date' => '2026-10-25'])->assertOk();

        $this->assertSame('2026-10-25', Invoice::firstOrFail()->due_date->toDateString());
    }

    public function test_bulan_di_luar_tahun_ajaran_ditolak(): void
    {
        $this->sppRate(300000);
        $this->sdStudent('Andi');

        $this->generateAs($this->tu, ['month' => '2026-06'])->assertStatus(422)->assertJsonValidationErrors(['month']);
        $this->generateAs($this->tu, ['month' => '2027-07'])->assertStatus(422)->assertJsonValidationErrors(['month']);
        $this->generateAs($this->tu, ['month' => '2026-07'])->assertOk();
        $this->generateAs($this->tu, ['month' => '2027-06'])->assertOk();
    }

    public function test_format_bulan_salah_ditolak(): void
    {
        $this->generateAs($this->tu, ['month' => 'Oktober'])->assertStatus(422)->assertJsonValidationErrors(['month']);
        $this->generateAs($this->tu, ['month' => null])->assertStatus(422)->assertJsonValidationErrors(['month']);
    }

    public function test_bisa_generate_ulang_setelah_tagihan_di_void(): void
    {
        $this->sppRate(300000);
        $andi = $this->sdStudent('Andi');
        $this->sdStudent('Budi');

        $this->generateAs($this->tu)->assertOk()->assertJsonPath('data.created', 2);

        $invoice = Invoice::where('student_id', $andi->id)->firstOrFail();
        $this->actingAs($this->tu)->postJson("/api/v1/invoices/{$invoice->id}/void", ['reason' => 'Salah tarif'])->assertOk();

        $this->generateAs($this->tu)->assertOk()
            ->assertJsonPath('data.created', 1)
            ->assertJsonPath('data.skipped_existing', 1);

        $this->assertSame(2, Invoice::where('student_id', $andi->id)->count());
        $this->assertSame(1, Invoice::where('student_id', $andi->id)->where('status', '!=', 'void')->count());
    }

    public function test_batas_unik_database_mencegah_tagihan_bulanan_ganda(): void
    {
        $siswa = $this->sdStudent('Andi');
        $bulan = Carbon::parse('2026-10-01');
        $nomor = 0;

        $buat = function (?Carbon $aktif, string $status) use ($siswa, $bulan, &$nomor) {
            return Invoice::create([
                'number' => 'TES/'.(++$nomor),
                'student_id' => $siswa->id,
                'unit_id' => $this->unitSd->id,
                'academic_year_id' => $this->year->id,
                'kind' => InvoiceKind::Monthly,
                'period_month' => $bulan->copy(),
                'active_period' => $aktif?->copy(),
                'due_date' => $bulan->copy()->day(10),
                'total_amount' => 100000,
                'paid_amount' => 0,
                'status' => $status,
                'created_by' => $this->tu->id,
            ]);
        };

        $buat($bulan, 'unpaid');
        $buat(null, 'void'); // tagihan yang sudah di-void tidak memblokir
        $buat(null, 'void');
        $this->assertSame(3, Invoice::count());

        $this->expectException(UniqueConstraintViolationException::class);
        $buat($bulan, 'unpaid');
    }

    public function test_izin_generate(): void
    {
        $this->postJson('/api/v1/invoices/generate', ['unit_id' => $this->unitSd->id, 'month' => '2026-10'])->assertStatus(401);

        $this->generateAs($this->guru)->assertStatus(403);
        $this->generateAs($this->superadmin)->assertStatus(403);
        $this->generateAs($this->tu)->assertOk();
    }
}
