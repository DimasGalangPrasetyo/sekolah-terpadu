<?php

namespace Tests\Feature\Inventory;

use App\Models\Asset;
use App\Models\AssetCategory;
use App\Models\AssetMovement;
use App\Models\Location;
use App\Models\Unit;
use App\Models\User;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\SchoolFixtures;
use Tests\TestCase;

class LocationTest extends TestCase
{
    use RefreshDatabase, SchoolFixtures;

    private User $tu;

    private Unit $sd;

    private Unit $smp;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CoreSeeder::class);
        $this->tu = $this->actAs('admin_tu_keuangan');
        $this->sd = Unit::where('code', 'SD')->firstOrFail();
        $this->smp = Unit::where('code', 'SMP')->firstOrFail();
    }

    public function test_crud_lokasi_dan_filter_unit(): void
    {
        $locSd = Location::create(['name' => 'Kelas 1 SD', 'unit_id' => $this->sd->id]);
        $locSmp = Location::create(['name' => 'Lab IPA SMP', 'unit_id' => $this->smp->id]);
        $locShared = Location::create(['name' => 'Aula Bersama', 'unit_id' => null]);

        // 1. Ambil semua lokasi
        $resAll = $this->actingAs($this->tu)->getJson('/api/v1/locations')->assertOk();
        $this->assertCount(3, $resAll->json('data'));

        // 2. Filter unit SD
        $resSd = $this->actingAs($this->tu)->getJson('/api/v1/locations?unit=SD')->assertOk();
        $this->assertCount(1, $resSd->json('data'));
        $this->assertSame($locSd->id, $resSd->json('data.0.id'));

        // 3. Filter unit bersama (shared)
        $resShared = $this->actingAs($this->tu)->getJson('/api/v1/locations?unit=shared')->assertOk();
        $this->assertCount(1, $resShared->json('data'));
        $this->assertSame($locShared->id, $resShared->json('data.0.id'));

        // 4. Buat lokasi baru
        $created = $this->actingAs($this->tu)->postJson('/api/v1/locations', [
            'name' => 'Perpustakaan Pusat',
            'unit_id' => null,
            'description' => 'Lantai 2 gedung utama',
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Perpustakaan Pusat');

        $locId = $created->json('data.id');

        // 5. Ubah lokasi
        $this->actingAs($this->tu)->putJson("/api/v1/locations/{$locId}", [
            'name' => 'Perpustakaan Bersama',
            'unit_id' => null,
            'description' => 'Lantai 2 & 3',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Perpustakaan Bersama');
    }

    public function test_hapus_lokasi_ditolak_409_bila_dipakai_aset_atau_riwayat(): void
    {
        $cat = AssetCategory::firstOrCreate(['code' => 'FRN'], ['name' => 'Furnitur']);
        $locAset = Location::create(['name' => 'Ruang Server']);
        $locMove = Location::create(['name' => 'Gudang Lama']);
        $locTarget = Location::create(['name' => 'Gudang Baru']);

        $asset = Asset::create([
            'code' => 'AST-LOC-01',
            'name' => 'Server Rack',
            'asset_category_id' => $cat->id,
            'location_id' => $locAset->id,
            'quantity' => 1,
            'item_condition' => 'good',
            'status' => 'active',
        ]);

        AssetMovement::create([
            'asset_id' => $asset->id,
            'type' => 'move',
            'from_location_id' => $locMove->id,
            'to_location_id' => $locTarget->id,
            'moved_at' => now()->toDateString(),
            'created_by' => $this->tu->id,
        ]);

        // Ditolak karena dipakai aset
        $this->actingAs($this->tu)->deleteJson("/api/v1/locations/{$locAset->id}")
            ->assertStatus(409);

        // Ditolak karena dipakai riwayat perpindahan (from_location)
        $this->actingAs($this->tu)->deleteJson("/api/v1/locations/{$locMove->id}")
            ->assertStatus(409);

        // Ditolak karena dipakai riwayat perpindahan (to_location)
        $this->actingAs($this->tu)->deleteJson("/api/v1/locations/{$locTarget->id}")
            ->assertStatus(409);
    }

    public function test_hapus_lokasi_berhasil_bila_tidak_dipakai(): void
    {
        $loc = Location::create(['name' => 'Ruang Kosong']);

        $this->actingAs($this->tu)->deleteJson("/api/v1/locations/{$loc->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('locations', ['id' => $loc->id]);
    }
}
