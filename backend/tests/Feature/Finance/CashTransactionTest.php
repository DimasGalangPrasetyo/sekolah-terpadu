<?php

namespace Tests\Feature\Finance;

use App\Enums\CashType;
use App\Enums\RecordStatus;
use App\Models\AuditLog;
use App\Models\CashCategory;
use App\Models\CashTransaction;
use App\Models\Unit;
use App\Models\User;
use Carbon\Carbon;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CashFixtures;
use Tests\Concerns\SchoolFixtures;
use Tests\TestCase;

class CashTransactionTest extends TestCase
{
    use CashFixtures, RefreshDatabase, SchoolFixtures;

    private User $tu;

    private User $superadmin;

    private User $guru;

    private CashCategory $donasiCat;

    private CashCategory $operasionalCat;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CoreSeeder::class);
        $this->tu = $this->actAs('admin_tu_keuangan');
        $this->superadmin = $this->actAs('superadmin');
        $this->guru = $this->actAs('guru');

        $this->donasiCat = CashCategory::where('name', 'Donasi')->firstOrFail();
        $this->operasionalCat = CashCategory::where('name', 'Operasional')->firstOrFail();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_belum_login_mengembalikan_401(): void
    {
        $this->getJson('/api/v1/cash-transactions')->assertUnauthorized();
        $this->getJson('/api/v1/cash-transactions/summary')->assertUnauthorized();
        $this->postJson('/api/v1/cash-transactions', [
            'transaction_date' => now()->toDateString(),
            'cash_category_id' => $this->donasiCat->id,
            'amount' => 100000,
            'description' => 'Test 401',
        ])->assertUnauthorized();
        $this->postJson('/api/v1/cash-transactions/1/void', [
            'reason' => 'Salah input nominal',
        ])->assertUnauthorized();
    }

    public function test_catat_kas_masuk_berhasil_dan_type_otomatis_income(): void
    {
        $res = $this->actingAs($this->tu)->postJson('/api/v1/cash-transactions', [
            'transaction_date' => now()->toDateString(),
            'cash_category_id' => $this->donasiCat->id,
            'amount' => 1500000,
            'description' => 'Donasi hamba Allah untuk renovasi',
        ]);

        $res->assertCreated()
            ->assertJsonPath('data.type', 'income')
            ->assertJsonPath('data.amount', 1500000)
            ->assertJsonPath('data.status', 'valid')
            ->assertJsonPath('data.category.id', $this->donasiCat->id)
            ->assertJsonPath('data.category.name', 'Donasi')
            ->assertJsonPath('data.created_by.id', $this->tu->id)
            ->assertJsonPath('data.unit', null);

        $tx = CashTransaction::firstOrFail();
        $this->assertMatchesRegularExpression('#^KAS/\d{4}/\d{2}/\d{4}$#', $tx->number);
        $this->assertSame(CashType::Income, $tx->type);
        $this->assertSame(1500000, (int) $tx->amount);
        $this->assertSame(RecordStatus::Valid, $tx->status);
    }

    public function test_catat_kas_keluar_berhasil_dan_type_otomatis_expense(): void
    {
        $res = $this->actingAs($this->tu)->postJson('/api/v1/cash-transactions', [
            'transaction_date' => now()->toDateString(),
            'cash_category_id' => $this->operasionalCat->id,
            'amount' => 750000,
            'description' => 'Pembelian sabun cuci dan perlengkapan kebersihan',
        ]);

        $res->assertCreated()
            ->assertJsonPath('data.type', 'expense')
            ->assertJsonPath('data.amount', 750000)
            ->assertJsonPath('data.category.name', 'Operasional');

        $tx = CashTransaction::firstOrFail();
        $this->assertSame(CashType::Expense, $tx->type);
    }

    public function test_nomor_transaksi_berurutan_dan_unik(): void
    {
        $res1 = $this->actingAs($this->tu)->postJson('/api/v1/cash-transactions', [
            'transaction_date' => now()->toDateString(),
            'cash_category_id' => $this->donasiCat->id,
            'amount' => 100000,
            'description' => 'Transaksi pertama',
        ])->assertCreated();

        $res2 = $this->actingAs($this->tu)->postJson('/api/v1/cash-transactions', [
            'transaction_date' => now()->toDateString(),
            'cash_category_id' => $this->operasionalCat->id,
            'amount' => 50000,
            'description' => 'Transaksi kedua',
        ])->assertCreated();

        $num1 = $res1->json('data.number');
        $num2 = $res2->json('data.number');

        $this->assertNotSame($num1, $num2);
        $this->assertStringEndsWith('/0001', $num1);
        $this->assertStringEndsWith('/0002', $num2);
    }

    public function test_unit_id_kosong_menjadi_kas_umum(): void
    {
        $res = $this->actingAs($this->tu)->postJson('/api/v1/cash-transactions', [
            'transaction_date' => now()->toDateString(),
            'cash_category_id' => $this->donasiCat->id,
            'amount' => 200000,
            'description' => 'Kas umum yayasan',
            'unit_id' => null,
        ]);

        $res->assertCreated()->assertJsonPath('data.unit', null);
        $tx = CashTransaction::firstOrFail();
        $this->assertNull($tx->unit_id);
    }

    public function test_unit_id_spesifik(): void
    {
        $sd = Unit::where('code', 'SD')->firstOrFail();

        $res = $this->actingAs($this->tu)->postJson('/api/v1/cash-transactions', [
            'transaction_date' => now()->toDateString(),
            'cash_category_id' => $this->operasionalCat->id,
            'unit_id' => $sd->id,
            'amount' => 300000,
            'description' => 'Operasional khusus SD',
        ]);

        $res->assertCreated()
            ->assertJsonPath('data.unit.id', $sd->id)
            ->assertJsonPath('data.unit.code', 'SD');

        $tx = CashTransaction::firstOrFail();
        $this->assertSame($sd->id, (int) $tx->unit_id);
    }

    public function test_kategori_nonaktif_ditolak(): void
    {
        $inactiveCat = CashCategory::create(['name' => 'Kategori Lama Mati', 'type' => 'income', 'is_active' => false]);

        $res = $this->actingAs($this->tu)->postJson('/api/v1/cash-transactions', [
            'transaction_date' => now()->toDateString(),
            'cash_category_id' => $inactiveCat->id,
            'amount' => 100000,
            'description' => 'Mencoba pakai kategori nonaktif',
        ]);

        $res->assertUnprocessable()->assertJsonValidationErrors(['cash_category_id']);
    }

    public function test_tanggal_masa_depan_ditolak_dan_hari_ini_wib_diterima(): void
    {
        // 14 Nov 2026 18:30:00 UTC = 15 Nov 2026 01:30:00 WIB
        Carbon::setTestNow(Carbon::parse('2026-11-14 18:30:00', 'UTC')->setTimezone('Asia/Jakarta'));

        // Tanggal 2026-11-15 diterima karena merupakan hari ini di WIB
        $resToday = $this->actingAs($this->tu)->postJson('/api/v1/cash-transactions', [
            'transaction_date' => '2026-11-15',
            'cash_category_id' => $this->donasiCat->id,
            'amount' => 100000,
            'description' => 'Transaksi hari ini WIB',
        ]);
        $resToday->assertCreated();

        // Tanggal 2026-11-16 ditolak (masa depan)
        $resFuture = $this->actingAs($this->tu)->postJson('/api/v1/cash-transactions', [
            'transaction_date' => '2026-11-16',
            'cash_category_id' => $this->donasiCat->id,
            'amount' => 100000,
            'description' => 'Transaksi besok',
        ]);
        $resFuture->assertUnprocessable()->assertJsonValidationErrors(['transaction_date']);
    }

    public function test_validasi_amount_minimal_1(): void
    {
        $resZero = $this->actingAs($this->tu)->postJson('/api/v1/cash-transactions', [
            'transaction_date' => now()->toDateString(),
            'cash_category_id' => $this->donasiCat->id,
            'amount' => 0,
            'description' => 'Nominal 0',
        ]);
        $resZero->assertUnprocessable()->assertJsonValidationErrors(['amount']);

        $resNeg = $this->actingAs($this->tu)->postJson('/api/v1/cash-transactions', [
            'transaction_date' => now()->toDateString(),
            'cash_category_id' => $this->donasiCat->id,
            'amount' => -50000,
            'description' => 'Nominal negatif',
        ]);
        $resNeg->assertUnprocessable()->assertJsonValidationErrors(['amount']);
    }

    public function test_validasi_deskripsi_wajib_dan_maksimal_255(): void
    {
        $resEmpty = $this->actingAs($this->tu)->postJson('/api/v1/cash-transactions', [
            'transaction_date' => now()->toDateString(),
            'cash_category_id' => $this->donasiCat->id,
            'amount' => 100000,
            'description' => '',
        ]);
        $resEmpty->assertUnprocessable()->assertJsonValidationErrors(['description']);

        $resLong = $this->actingAs($this->tu)->postJson('/api/v1/cash-transactions', [
            'transaction_date' => now()->toDateString(),
            'cash_category_id' => $this->donasiCat->id,
            'amount' => 100000,
            'description' => str_repeat('a', 256),
        ]);
        $resLong->assertUnprocessable()->assertJsonValidationErrors(['description']);
    }

    public function test_unit_tidak_ada_ditolak(): void
    {
        $res = $this->actingAs($this->tu)->postJson('/api/v1/cash-transactions', [
            'transaction_date' => now()->toDateString(),
            'cash_category_id' => $this->donasiCat->id,
            'unit_id' => 999999,
            'amount' => 100000,
            'description' => 'Unit palsu',
        ]);

        $res->assertUnprocessable()->assertJsonValidationErrors(['unit_id']);
    }

    public function test_audit_log_created_tercatat(): void
    {
        $this->actingAs($this->tu)->postJson('/api/v1/cash-transactions', [
            'transaction_date' => now()->toDateString(),
            'cash_category_id' => $this->donasiCat->id,
            'amount' => 100000,
            'description' => 'Uji audit log',
        ])->assertCreated();

        $tx = CashTransaction::firstOrFail();
        $this->assertSame(
            1,
            AuditLog::where('event', 'created')
                ->where('auditable_type', $tx->getMorphClass())
                ->where('auditable_id', $tx->id)
                ->count()
        );
    }

    public function test_daftar_dan_filter_transaksi(): void
    {
        $sd = Unit::where('code', 'SD')->firstOrFail();
        $smp = Unit::where('code', 'SMP')->firstOrFail();

        // 1. Kas masuk umum
        $this->actingAs($this->tu)->postJson('/api/v1/cash-transactions', [
            'transaction_date' => '2026-11-01',
            'cash_category_id' => $this->donasiCat->id,
            'amount' => 1000000,
            'description' => 'Sumbangan Donasi Awal',
        ])->assertCreated();

        // 2. Kas keluar SD
        $this->actingAs($this->tu)->postJson('/api/v1/cash-transactions', [
            'transaction_date' => '2026-11-05',
            'cash_category_id' => $this->operasionalCat->id,
            'unit_id' => $sd->id,
            'amount' => 250000,
            'description' => 'Operasional Listrik SD',
        ])->assertCreated();

        // 3. Kas keluar SMP
        $this->actingAs($this->tu)->postJson('/api/v1/cash-transactions', [
            'transaction_date' => '2026-11-10',
            'cash_category_id' => $this->operasionalCat->id,
            'unit_id' => $smp->id,
            'amount' => 350000,
            'description' => 'Operasional ATK SMP',
        ])->assertCreated();

        // Filter type
        $resType = $this->actingAs($this->tu)->getJson('/api/v1/cash-transactions?type=income');
        $resType->assertOk()->assertJsonCount(1, 'data');

        // Filter kategori
        $resCat = $this->actingAs($this->tu)->getJson("/api/v1/cash-transactions?cash_category_id={$this->operasionalCat->id}");
        $resCat->assertOk()->assertJsonCount(2, 'data');

        // Filter unit=SD
        $resSD = $this->actingAs($this->tu)->getJson('/api/v1/cash-transactions?unit=SD');
        $resSD->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.unit.code', 'SD');

        // Filter unit=none (kas umum)
        $resNone = $this->actingAs($this->tu)->getJson('/api/v1/cash-transactions?unit=none');
        $resNone->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.unit', null);

        // Filter tanggal
        $resDate = $this->actingAs($this->tu)->getJson('/api/v1/cash-transactions?date_from=2026-11-04&date_to=2026-11-06');
        $resDate->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.amount', 250000);

        // Filter pencarian q (nomor atau keterangan)
        $resQ = $this->actingAs($this->tu)->getJson('/api/v1/cash-transactions?q=Listrik');
        $resQ->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_per_page_dibatasi_maksimal_100(): void
    {
        $res = $this->actingAs($this->tu)->getJson('/api/v1/cash-transactions?per_page=1000');
        $res->assertOk()->assertJsonPath('meta.per_page', 100);
    }

    public function test_detail_transaksi_memuat_relasi(): void
    {
        $sd = Unit::where('code', 'SD')->firstOrFail();
        $resCreate = $this->actingAs($this->tu)->postJson('/api/v1/cash-transactions', [
            'transaction_date' => now()->toDateString(),
            'cash_category_id' => $this->operasionalCat->id,
            'unit_id' => $sd->id,
            'amount' => 500000,
            'description' => 'Detail test',
        ])->assertCreated();

        $id = $resCreate->json('data.id');
        $resDetail = $this->actingAs($this->tu)->getJson("/api/v1/cash-transactions/{$id}");
        $resDetail->assertOk()
            ->assertJsonPath('data.category.name', 'Operasional')
            ->assertJsonPath('data.unit.code', 'SD')
            ->assertJsonPath('data.created_by.name', $this->tu->name);
    }

    public function test_summary_menghitung_income_expense_balance_dari_valid_saja(): void
    {
        // 1. Pemasukan valid: 1.000.000
        $this->actingAs($this->tu)->postJson('/api/v1/cash-transactions', [
            'transaction_date' => '2026-11-01',
            'cash_category_id' => $this->donasiCat->id,
            'amount' => 1000000,
            'description' => 'Donasi',
        ])->assertCreated();

        // 2. Pengeluaran valid: 300.000
        $this->actingAs($this->tu)->postJson('/api/v1/cash-transactions', [
            'transaction_date' => '2026-11-02',
            'cash_category_id' => $this->operasionalCat->id,
            'amount' => 300000,
            'description' => 'Operasional',
        ])->assertCreated();

        // 3. Pengeluaran void: 150.000
        $resVoid = $this->actingAs($this->tu)->postJson('/api/v1/cash-transactions', [
            'transaction_date' => '2026-11-03',
            'cash_category_id' => $this->operasionalCat->id,
            'amount' => 150000,
            'description' => 'Operasional salah input',
        ])->assertCreated();
        $voidId = $resVoid->json('data.id');
        $this->actingAs($this->tu)->postJson("/api/v1/cash-transactions/{$voidId}/void", [
            'reason' => 'Salah catat nota pembelian',
        ])->assertOk();

        $resSummary = $this->actingAs($this->tu)->getJson('/api/v1/cash-transactions/summary');
        $resSummary->assertOk()
            ->assertJsonPath('data.income', 1000000)
            ->assertJsonPath('data.expense', 300000)
            ->assertJsonPath('data.balance', 700000)
            ->assertJsonPath('data.count', 2);
    }

    public function test_summary_mengikuti_filter(): void
    {
        $sd = Unit::where('code', 'SD')->firstOrFail();
        $smp = Unit::where('code', 'SMP')->firstOrFail();

        $this->actingAs($this->tu)->postJson('/api/v1/cash-transactions', [
            'transaction_date' => '2026-11-01',
            'cash_category_id' => $this->donasiCat->id,
            'unit_id' => $sd->id,
            'amount' => 500000,
            'description' => 'Donasi SD',
        ])->assertCreated();

        $this->actingAs($this->tu)->postJson('/api/v1/cash-transactions', [
            'transaction_date' => '2026-11-01',
            'cash_category_id' => $this->donasiCat->id,
            'unit_id' => $smp->id,
            'amount' => 300000,
            'description' => 'Donasi SMP',
        ])->assertCreated();

        $resSD = $this->actingAs($this->tu)->getJson('/api/v1/cash-transactions/summary?unit=SD');
        $resSD->assertOk()
            ->assertJsonPath('data.income', 500000)
            ->assertJsonPath('data.count', 1);
    }

    public function test_void_transaksi_berhasil(): void
    {
        $resCreate = $this->actingAs($this->tu)->postJson('/api/v1/cash-transactions', [
            'transaction_date' => now()->toDateString(),
            'cash_category_id' => $this->operasionalCat->id,
            'amount' => 125000,
            'description' => 'Transaksi salah',
        ])->assertCreated();

        $id = $resCreate->json('data.id');

        $resVoid = $this->actingAs($this->tu)->postJson("/api/v1/cash-transactions/{$id}/void", [
            'reason' => 'Salah input akun pengeluaran',
        ]);

        $resVoid->assertOk()
            ->assertJsonPath('data.status', 'void')
            ->assertJsonPath('data.void_reason', 'Salah input akun pengeluaran')
            ->assertJsonPath('data.voided_by.id', $this->tu->id);

        $tx = CashTransaction::findOrFail($id);
        $this->assertSame(RecordStatus::Void, $tx->status);
        $this->assertNotNull($tx->voided_at);
        $this->assertSame($this->tu->id, (int) $tx->voided_by);
        $this->assertSame('Salah input akun pengeluaran', $tx->void_reason);
    }

    public function test_void_dua_kali_mengembalikan_409(): void
    {
        $resCreate = $this->actingAs($this->tu)->postJson('/api/v1/cash-transactions', [
            'transaction_date' => now()->toDateString(),
            'cash_category_id' => $this->operasionalCat->id,
            'amount' => 100000,
            'description' => 'Double void test',
        ])->assertCreated();

        $id = $resCreate->json('data.id');

        $this->actingAs($this->tu)->postJson("/api/v1/cash-transactions/{$id}/void", [
            'reason' => 'Pembatalan pertama',
        ])->assertOk();

        $resSecond = $this->actingAs($this->tu)->postJson("/api/v1/cash-transactions/{$id}/void", [
            'reason' => 'Pembatalan kedua yang mestinya gagal',
        ]);

        $resSecond->assertStatus(409);
    }

    public function test_alasan_void_wajib_dan_minimal_5_karakter(): void
    {
        $resCreate = $this->actingAs($this->tu)->postJson('/api/v1/cash-transactions', [
            'transaction_date' => now()->toDateString(),
            'cash_category_id' => $this->operasionalCat->id,
            'amount' => 100000,
            'description' => 'Test validation void',
        ])->assertCreated();

        $id = $resCreate->json('data.id');

        $resShort = $this->actingAs($this->tu)->postJson("/api/v1/cash-transactions/{$id}/void", [
            'reason' => '1234',
        ]);
        $resShort->assertUnprocessable()->assertJsonValidationErrors(['reason']);

        $resEmpty = $this->actingAs($this->tu)->postJson("/api/v1/cash-transactions/{$id}/void", [
            'reason' => '',
        ]);
        $resEmpty->assertUnprocessable()->assertJsonValidationErrors(['reason']);
    }

    public function test_nomor_tidak_dipakai_ulang_setelah_void(): void
    {
        $res1 = $this->actingAs($this->tu)->postJson('/api/v1/cash-transactions', [
            'transaction_date' => now()->toDateString(),
            'cash_category_id' => $this->donasiCat->id,
            'amount' => 100000,
            'description' => 'Transaksi pertama',
        ])->assertCreated();

        $id1 = $res1->json('data.id');
        $num1 = $res1->json('data.number');

        $this->actingAs($this->tu)->postJson("/api/v1/cash-transactions/{$id1}/void", [
            'reason' => 'Dibatalkan segera',
        ])->assertOk();

        $res2 = $this->actingAs($this->tu)->postJson('/api/v1/cash-transactions', [
            'transaction_date' => now()->toDateString(),
            'cash_category_id' => $this->donasiCat->id,
            'amount' => 100000,
            'description' => 'Transaksi setelah void',
        ])->assertCreated();

        $num2 = $res2->json('data.number');

        $this->assertNotSame($num1, $num2);
    }

    public function test_put_dan_delete_transaksi_menghasilkan_405(): void
    {
        $resCreate = $this->actingAs($this->tu)->postJson('/api/v1/cash-transactions', [
            'transaction_date' => now()->toDateString(),
            'cash_category_id' => $this->donasiCat->id,
            'amount' => 100000,
            'description' => 'Test 405',
        ])->assertCreated();

        $id = $resCreate->json('data.id');

        $this->actingAs($this->tu)->putJson("/api/v1/cash-transactions/{$id}", [
            'amount' => 200000,
        ])->assertStatus(405);

        $this->actingAs($this->tu)->deleteJson("/api/v1/cash-transactions/{$id}")
            ->assertStatus(405);
    }

    public function test_izin_akses_transaksi(): void
    {
        $resCreate = $this->actingAs($this->tu)->postJson('/api/v1/cash-transactions', [
            'transaction_date' => now()->toDateString(),
            'cash_category_id' => $this->donasiCat->id,
            'amount' => 100000,
            'description' => 'Test permissions',
        ])->assertCreated();
        $id = $resCreate->json('data.id');

        // Guru 403 untuk semua
        $this->actingAs($this->guru)->getJson('/api/v1/cash-transactions')->assertForbidden();
        $this->actingAs($this->guru)->getJson('/api/v1/cash-transactions/summary')->assertForbidden();
        $this->actingAs($this->guru)->postJson('/api/v1/cash-transactions', [
            'transaction_date' => now()->toDateString(),
            'cash_category_id' => $this->donasiCat->id,
            'amount' => 100000,
            'description' => 'Guru coba catat',
        ])->assertForbidden();
        $this->actingAs($this->guru)->postJson("/api/v1/cash-transactions/{$id}/void", [
            'reason' => 'Guru coba void',
        ])->assertForbidden();

        // Superadmin boleh baca, 403 saat menulis
        $this->actingAs($this->superadmin)->getJson('/api/v1/cash-transactions')->assertOk();
        $this->actingAs($this->superadmin)->getJson('/api/v1/cash-transactions/summary')->assertOk();
        $this->actingAs($this->superadmin)->postJson('/api/v1/cash-transactions', [
            'transaction_date' => now()->toDateString(),
            'cash_category_id' => $this->donasiCat->id,
            'amount' => 100000,
            'description' => 'SA coba catat',
        ])->assertForbidden();
        $this->actingAs($this->superadmin)->postJson("/api/v1/cash-transactions/{$id}/void", [
            'reason' => 'SA coba void',
        ])->assertForbidden();

        // TU boleh catat dan void
        $this->actingAs($this->tu)->getJson('/api/v1/cash-transactions')->assertOk();
    }
}
