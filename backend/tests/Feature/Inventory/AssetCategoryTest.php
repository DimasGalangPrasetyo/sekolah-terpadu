<?php

namespace Tests\Feature\Inventory;

use App\Models\Asset;
use App\Models\AssetCategory;
use App\Models\Location;
use App\Models\User;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\SchoolFixtures;
use Tests\TestCase;

class AssetCategoryTest extends TestCase
{
    use RefreshDatabase, SchoolFixtures;

    private User $tu;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CoreSeeder::class);
        $this->tu = $this->actAs('admin_tu_keuangan');
    }

    public function test_crud_kategori_aset(): void
    {
        // 1. Daftar kategori
        $this->actingAs($this->tu)->getJson('/api/v1/asset-categories')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'code', 'name']]]);

        // 2. Buat kategori baru
        $response = $this->actingAs($this->tu)->postJson('/api/v1/asset-categories', [
            'code' => 'LAB',
            'name' => 'Laboratorium',
        ])->assertCreated()
            ->assertJsonPath('data.code', 'LAB')
            ->assertJsonPath('data.name', 'Laboratorium');

        $categoryId = $response->json('data.id');

        // 3. Ubah kategori
        $this->actingAs($this->tu)->putJson("/api/v1/asset-categories/{$categoryId}", [
            'code' => 'LAB-IPA',
            'name' => 'Laboratorium IPA',
        ])->assertOk()
            ->assertJsonPath('data.code', 'LAB-IPA')
            ->assertJsonPath('data.name', 'Laboratorium IPA');

        // 4. Validasi kode unik
        $this->actingAs($this->tu)->postJson('/api/v1/asset-categories', [
            'code' => 'LAB-IPA',
            'name' => 'Duplikat Lab',
        ])->assertStatus(422)->assertJsonValidationErrors('code');
    }

    public function test_hapus_kategori_ditolak_409_bila_dipakai_aset(): void
    {
        $cat = AssetCategory::create(['code' => 'KAT1', 'name' => 'Kategori Terpakai']);
        $loc = Location::create(['name' => 'Ruang 1']);

        Asset::create([
            'code' => 'AST-KAT-01',
            'name' => 'Aset Uji',
            'asset_category_id' => $cat->id,
            'location_id' => $loc->id,
            'quantity' => 1,
            'item_condition' => 'good',
            'status' => 'active',
        ]);

        $this->actingAs($this->tu)->deleteJson("/api/v1/asset-categories/{$cat->id}")
            ->assertStatus(409);

        $this->assertDatabaseHas('asset_categories', ['id' => $cat->id]);
    }

    public function test_hapus_kategori_berhasil_bila_tidak_dipakai(): void
    {
        $cat = AssetCategory::create(['code' => 'KAT2', 'name' => 'Kategori Bebas']);

        $this->actingAs($this->tu)->deleteJson("/api/v1/asset-categories/{$cat->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('asset_categories', ['id' => $cat->id]);
    }
}
