<?php

namespace Tests\Feature\Finance;

use App\Enums\CashType;
use App\Models\CashCategory;
use App\Models\CashTransaction;
use App\Models\User;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CashFixtures;
use Tests\Concerns\SchoolFixtures;
use Tests\TestCase;

class CashCategoryTest extends TestCase
{
    use CashFixtures, RefreshDatabase, SchoolFixtures;

    private User $tu;

    private User $superadmin;

    private User $guru;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CoreSeeder::class);
        $this->tu = $this->actAs('admin_tu_keuangan');
        $this->superadmin = $this->actAs('superadmin');
        $this->guru = $this->actAs('guru');
    }

    public function test_belum_login_mengembalikan_401(): void
    {
        $this->getJson('/api/v1/cash-categories')->assertUnauthorized();
        $this->postJson('/api/v1/cash-categories', [
            'name' => 'Kategori Baru',
            'type' => 'income',
        ])->assertUnauthorized();
    }

    public function test_daftar_dan_filter_type_serta_aktif(): void
    {
        CashCategory::create(['name' => 'Infaq Aktif', 'type' => 'income', 'is_active' => true]);
        CashCategory::create(['name' => 'Infaq Nonaktif', 'type' => 'income', 'is_active' => false]);
        CashCategory::create(['name' => 'Bensin Aktif', 'type' => 'expense', 'is_active' => true]);
        CashCategory::create(['name' => 'Bensin Nonaktif', 'type' => 'expense', 'is_active' => false]);

        $resAll = $this->actingAs($this->tu)->getJson('/api/v1/cash-categories');
        $resAll->assertOk();
        $this->assertGreaterThanOrEqual(4, count($resAll->json('data')));

        $resIncome = $this->actingAs($this->tu)->getJson('/api/v1/cash-categories?type=income');
        $resIncome->assertOk();
        foreach ($resIncome->json('data') as $cat) {
            $this->assertSame('income', $cat['type']);
        }

        $resExpense = $this->actingAs($this->tu)->getJson('/api/v1/cash-categories?type=expense');
        $resExpense->assertOk();
        foreach ($resExpense->json('data') as $cat) {
            $this->assertSame('expense', $cat['type']);
        }

        $resActive = $this->actingAs($this->tu)->getJson('/api/v1/cash-categories?is_active=1');
        $resActive->assertOk();
        $namesActive = collect($resActive->json('data'))->pluck('name');
        $this->assertTrue($namesActive->contains('Infaq Aktif'));
        $this->assertFalse($namesActive->contains('Infaq Nonaktif'));

        $resInactive = $this->actingAs($this->tu)->getJson('/api/v1/cash-categories?is_active=0');
        $resInactive->assertOk();
        $namesInactive = collect($resInactive->json('data'))->pluck('name');
        $this->assertFalse($namesInactive->contains('Infaq Aktif'));
        $this->assertTrue($namesInactive->contains('Infaq Nonaktif'));
    }

    public function test_buat_kategori_kas_berhasil(): void
    {
        $payload = [
            'name' => 'Sponsorship Perusahaan',
            'type' => 'income',
        ];

        $res = $this->actingAs($this->tu)->postJson('/api/v1/cash-categories', $payload);
        $res->assertCreated()
            ->assertJsonPath('data.name', 'Sponsorship Perusahaan')
            ->assertJsonPath('data.type', 'income')
            ->assertJsonPath('data.is_active', true);

        $this->assertDatabaseHas('cash_categories', [
            'name' => 'Sponsorship Perusahaan',
            'type' => 'income',
            'is_active' => true,
        ]);
    }

    public function test_nama_duplikat_pada_jenis_sama_ditolak(): void
    {
        CashCategory::create(['name' => 'Sumbangan Alumni', 'type' => 'income', 'is_active' => true]);

        $res = $this->actingAs($this->tu)->postJson('/api/v1/cash-categories', [
            'name' => 'Sumbangan Alumni',
            'type' => 'income',
        ]);

        $res->assertUnprocessable()->assertJsonValidationErrors(['name']);
    }

    public function test_nama_sama_beda_jenis_diperbolehkan(): void
    {
        CashCategory::create(['name' => 'Penyesuaian Saldo', 'type' => 'income', 'is_active' => true]);

        $res = $this->actingAs($this->tu)->postJson('/api/v1/cash-categories', [
            'name' => 'Penyesuaian Saldo',
            'type' => 'expense',
        ]);

        $res->assertCreated()
            ->assertJsonPath('data.name', 'Penyesuaian Saldo')
            ->assertJsonPath('data.type', 'expense');
    }

    public function test_ubah_nama_kategori_berhasil(): void
    {
        $cat = CashCategory::create(['name' => 'Nama Lama', 'type' => 'expense', 'is_active' => true]);

        $res = $this->actingAs($this->tu)->putJson("/api/v1/cash-categories/{$cat->id}", [
            'name' => 'Nama Baru Yang Tepat',
        ]);

        $res->assertOk()->assertJsonPath('data.name', 'Nama Baru Yang Tepat');
        $this->assertDatabaseHas('cash_categories', [
            'id' => $cat->id,
            'name' => 'Nama Baru Yang Tepat',
            'type' => 'expense',
        ]);
    }

    public function test_ubah_type_ditolak(): void
    {
        $cat = CashCategory::create(['name' => 'Kategori Tetap', 'type' => 'income', 'is_active' => true]);

        $res = $this->actingAs($this->tu)->putJson("/api/v1/cash-categories/{$cat->id}", [
            'name' => 'Kategori Tetap',
            'type' => 'expense',
        ]);

        $res->assertUnprocessable()->assertJsonValidationErrors(['type']);
    }

    public function test_nonaktifkan_dan_aktifkan_kategori(): void
    {
        $cat = CashCategory::create(['name' => 'Kategori Toggle', 'type' => 'expense', 'is_active' => true]);

        $resDeact = $this->actingAs($this->tu)->postJson("/api/v1/cash-categories/{$cat->id}/deactivate");
        $resDeact->assertOk()->assertJsonPath('data.is_active', false);
        $this->assertFalse((bool) $cat->fresh()->is_active);

        $resAct = $this->actingAs($this->tu)->postJson("/api/v1/cash-categories/{$cat->id}/activate");
        $resAct->assertOk()->assertJsonPath('data.is_active', true);
        $this->assertTrue((bool) $cat->fresh()->is_active);
    }

    public function test_hapus_kategori_tanpa_transaksi_berhasil(): void
    {
        $cat = CashCategory::create(['name' => 'Kategori Mau Dihapus', 'type' => 'income', 'is_active' => true]);

        $res = $this->actingAs($this->tu)->deleteJson("/api/v1/cash-categories/{$cat->id}");
        $res->assertNoContent();
        $this->assertDatabaseMissing('cash_categories', ['id' => $cat->id]);
    }

    public function test_hapus_kategori_bertransaksi_ditolak_409(): void
    {
        $cat = CashCategory::create(['name' => 'Kategori Punya Transaksi', 'type' => 'expense', 'is_active' => true]);
        CashTransaction::create([
            'number' => 'KAS/2026/11/0001',
            'transaction_date' => now()->toDateString(),
            'type' => CashType::Expense,
            'cash_category_id' => $cat->id,
            'amount' => 100000,
            'description' => 'Uji coba transaksi',
            'created_by' => $this->tu->id,
        ]);

        $res = $this->actingAs($this->tu)->deleteJson("/api/v1/cash-categories/{$cat->id}");
        $res->assertStatus(409);
        $this->assertDatabaseHas('cash_categories', ['id' => $cat->id]);
    }

    public function test_izin_akses_kategori(): void
    {
        $cat = CashCategory::first();

        // Guru 403 untuk baca maupun tulis
        $this->actingAs($this->guru)->getJson('/api/v1/cash-categories')->assertForbidden();
        $this->actingAs($this->guru)->postJson('/api/v1/cash-categories', ['name' => 'Test Guru', 'type' => 'income'])->assertForbidden();

        // Superadmin boleh baca, tetapi 403 saat menulis
        $this->actingAs($this->superadmin)->getJson('/api/v1/cash-categories')->assertOk();
        $this->actingAs($this->superadmin)->postJson('/api/v1/cash-categories', ['name' => 'Test SA', 'type' => 'income'])->assertForbidden();
        $this->actingAs($this->superadmin)->putJson("/api/v1/cash-categories/{$cat->id}", ['name' => 'Ganti SA'])->assertForbidden();
        $this->actingAs($this->superadmin)->deleteJson("/api/v1/cash-categories/{$cat->id}")->assertForbidden();

        // Admin TU Keuangan boleh baca dan tulis
        $this->actingAs($this->tu)->getJson('/api/v1/cash-categories')->assertOk();
    }
}
