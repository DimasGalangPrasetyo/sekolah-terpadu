<?php

namespace Tests\Feature\Inventory;

use App\Models\Asset;
use App\Models\AssetCategory;
use App\Models\Location;
use App\Models\Staff;
use App\Models\Unit;
use App\Models\User;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\SchoolFixtures;
use Tests\TestCase;

class AssetTest extends TestCase
{
    use RefreshDatabase, SchoolFixtures;

    private User $tu;

    private User $guru;

    private User $superadmin;

    private Unit $sd;

    private Unit $smp;

    private AssetCategory $category;

    private Location $location;

    private Staff $staff;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CoreSeeder::class);
        $this->tu = $this->actAs('admin_tu_keuangan');
        $this->guru = $this->actAs('guru');
        $this->superadmin = $this->actAs('superadmin');
        $this->sd = Unit::where('code', 'SD')->firstOrFail();
        $this->smp = Unit::where('code', 'SMP')->firstOrFail();

        $this->category = AssetCategory::firstOrCreate(['code' => 'ELK'], ['name' => 'Elektronik']);
        $this->location = Location::create(['name' => 'Ruang Guru SD', 'unit_id' => $this->sd->id]);
        $this->staff = Staff::create([
            'name' => 'Pak Joko',
            'gender' => 'L',
            'position' => 'Koordinator Sarpras',
            'employment_status' => 'permanent',
            'is_active' => true,
        ]);
    }

    private function payload(array $override = []): array
    {
        return array_merge([
            'name' => 'Laptop Lenovo ThinkPad',
            'asset_category_id' => $this->category->id,
            'unit_id' => $this->sd->id,
            'location_id' => $this->location->id,
            'quantity' => 1,
            'unit_label' => 'unit',
            'acquisition_date' => '2026-01-15',
            'acquisition_source' => 'Dana BOS',
            'acquisition_cost' => 12500000,
            'item_condition' => 'good',
            'responsible_staff_id' => $this->staff->id,
            'status' => 'active',
            'notes' => 'Inventaris TU SD',
        ], $override);
    }

    public function test_buat_aset_dengan_kode_otomatis_dan_manual(): void
    {
        // 1. Kode otomatis (dikosongkan) -> AST- + 4 digit
        $responseAuto = $this->actingAs($this->tu)->postJson('/api/v1/assets', $this->payload(['code' => null]))
            ->assertCreated();

        $code = $responseAuto->json('data.code');
        $id = $responseAuto->json('data.id');
        $this->assertSame(sprintf('AST-%04d', $id), $code);

        // 2. Kode manual
        $responseManual = $this->actingAs($this->tu)->postJson('/api/v1/assets', $this->payload([
            'code' => 'KUS-2026-001',
            'name' => 'Proyektor Epson',
        ]))->assertCreated();

        $this->assertSame('KUS-2026-001', $responseManual->json('data.code'));
    }

    public function test_kode_aset_harus_unik_kecuali_diri_sendiri_saat_ubah(): void
    {
        $this->actingAs($this->tu)->postJson('/api/v1/assets', $this->payload(['code' => 'AST-DUPLIKAT']))
            ->assertCreated();

        // Duplikat kode baru ditolak
        $this->actingAs($this->tu)->postJson('/api/v1/assets', $this->payload(['code' => 'AST-DUPLIKAT']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('code');

        // Ubah diri sendiri dengan kode yang sama diperbolehkan
        $asset = Asset::where('code', 'AST-DUPLIKAT')->firstOrFail();
        $this->actingAs($this->tu)->putJson("/api/v1/assets/{$asset->id}", $this->payload([
            'code' => 'AST-DUPLIKAT',
            'name' => 'Nama Baru',
        ]))->assertOk();
    }

    public function test_validasi_kolom_aset(): void
    {
        // Kolom wajib kosong
        $this->actingAs($this->tu)->postJson('/api/v1/assets', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'asset_category_id', 'quantity']);

        // Quantity < 1
        $this->actingAs($this->tu)->postJson('/api/v1/assets', $this->payload(['quantity' => 0]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('quantity');

        // Kondisi tidak valid
        $this->actingAs($this->tu)->postJson('/api/v1/assets', $this->payload(['item_condition' => 'unknown']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('item_condition');

        // Penanggung jawab nonaktif
        $inactiveStaff = Staff::create([
            'name' => 'Staf Nonaktif',
            'gender' => 'L',
            'position' => 'Pustakawan',
            'employment_status' => 'honorary',
            'is_active' => false,
        ]);

        $this->actingAs($this->tu)->postJson('/api/v1/assets', $this->payload(['responsible_staff_id' => $inactiveStaff->id]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('responsible_staff_id');
    }

    public function test_ubah_aset(): void
    {
        $asset = Asset::create($this->payload(['code' => 'AST-UBAH-01']));

        $newLocation = Location::create(['name' => 'Lab Komputer', 'unit_id' => $this->sd->id]);

        $this->actingAs($this->tu)->putJson("/api/v1/assets/{$asset->id}", $this->payload([
            'name' => 'Laptop Lenovo ThinkPad Diperbarui',
            'location_id' => $newLocation->id,
            'quantity' => 2,
            'acquisition_cost' => 15000000,
        ]))->assertOk()
            ->assertJsonPath('data.name', 'Laptop Lenovo ThinkPad Diperbarui')
            ->assertJsonPath('data.location.id', $newLocation->id)
            ->assertJsonPath('data.quantity', 2)
            ->assertJsonPath('data.acquisition_cost', 15000000);
    }

    public function test_daftar_aset_dengan_semua_filter(): void
    {
        $locSmp = Location::create(['name' => 'Lab SMP', 'unit_id' => $this->smp->id]);
        $catFurnitur = AssetCategory::firstOrCreate(['code' => 'FRN'], ['name' => 'Furnitur']);

        Asset::create($this->payload([
            'code' => 'AST-SD-01',
            'name' => 'Komputer Guru SD',
            'unit_id' => $this->sd->id,
            'asset_category_id' => $this->category->id,
            'location_id' => $this->location->id,
            'item_condition' => 'good',
            'status' => 'active',
        ]));

        Asset::create($this->payload([
            'code' => 'AST-SMP-01',
            'name' => 'Meja Rapat SMP',
            'unit_id' => $this->smp->id,
            'asset_category_id' => $catFurnitur->id,
            'location_id' => $locSmp->id,
            'item_condition' => 'light_damage',
            'status' => 'active',
        ]));

        Asset::create($this->payload([
            'code' => 'AST-SHR-01',
            'name' => 'Genset Bersama',
            'unit_id' => null, // aset bersama
            'asset_category_id' => $this->category->id,
            'location_id' => $this->location->id,
            'item_condition' => 'disposed',
            'status' => 'disposed',
        ]));

        $fetchCodes = fn (string $params) => collect(
            $this->actingAs($this->tu)->getJson("/api/v1/assets?{$params}")->assertOk()->json('data')
        )->pluck('code')->all();

        // 1. Cari q
        $this->assertSame(['AST-SD-01'], $fetchCodes('q=Komputer'));
        $this->assertSame(['AST-SMP-01'], $fetchCodes('q=SMP-01'));

        // 2. Unit SD & SMP & shared
        $this->assertSame(['AST-SD-01'], $fetchCodes('unit=SD'));
        $this->assertSame(['AST-SMP-01'], $fetchCodes('unit=SMP'));
        $this->assertSame(['AST-SHR-01'], $fetchCodes('unit=shared'));

        // 3. Category
        $this->assertSame(['AST-SMP-01'], $fetchCodes("category_id={$catFurnitur->id}"));

        // 4. Location
        $this->assertSame(['AST-SMP-01'], $fetchCodes("location_id={$locSmp->id}"));

        // 5. Condition
        $this->assertSame(['AST-SMP-01'], $fetchCodes('item_condition=light_damage'));

        // 6. Status
        $this->assertSame(['AST-SHR-01'], $fetchCodes('status=disposed'));
    }

    public function test_soft_delete_aset(): void
    {
        $asset = Asset::create($this->payload(['code' => 'AST-DEL-01']));

        $this->actingAs($this->tu)->deleteJson("/api/v1/assets/{$asset->id}")
            ->assertNoContent();

        $this->assertSoftDeleted('assets', ['id' => $asset->id]);
    }

    public function test_perpindahan_lokasi_mengubah_lokasi_dan_mencatat_riwayat(): void
    {
        $asset = Asset::create($this->payload([
            'code' => 'AST-MOV-01',
            'location_id' => $this->location->id,
        ]));

        $targetLocation = Location::create(['name' => 'Gudang Pusat', 'unit_id' => null]);

        $response = $this->actingAs($this->tu)->postJson("/api/v1/assets/{$asset->id}/movements", [
            'type' => 'move',
            'to_location_id' => $targetLocation->id,
            'moved_at' => '2026-03-01',
            'notes' => 'Pindah ke gudang untuk perbaikan',
        ])->assertCreated()
            ->assertJsonPath('data.type', 'move')
            ->assertJsonPath('data.from_location_id', $this->location->id)
            ->assertJsonPath('data.to_location_id', $targetLocation->id)
            ->assertJsonPath('data.notes', 'Pindah ke gudang untuk perbaikan');

        $this->assertSame($targetLocation->id, $asset->fresh()->location_id);
    }

    public function test_ubah_kondisi_aset_mengubah_kondisi_dan_mencatat_riwayat(): void
    {
        $asset = Asset::create($this->payload([
            'code' => 'AST-CND-01',
            'item_condition' => 'good',
        ]));

        $this->actingAs($this->tu)->postJson("/api/v1/assets/{$asset->id}/movements", [
            'type' => 'condition',
            'to_condition' => 'heavy_damage',
            'moved_at' => '2026-03-05',
            'notes' => 'Layar LCD pecah',
        ])->assertCreated()
            ->assertJsonPath('data.type', 'condition')
            ->assertJsonPath('data.from_condition', 'good')
            ->assertJsonPath('data.to_condition', 'heavy_damage');

        $this->assertSame('heavy_damage', $asset->fresh()->item_condition->value);
    }

    public function test_penghapusan_aset_dispose_mengubah_status_dan_mencatat_riwayat(): void
    {
        $asset = Asset::create($this->payload([
            'code' => 'AST-DSP-01',
            'item_condition' => 'heavy_damage',
            'status' => 'active',
        ]));

        $this->actingAs($this->tu)->postJson("/api/v1/assets/{$asset->id}/movements", [
            'type' => 'dispose',
            'moved_at' => '2026-03-10',
            'notes' => 'Aset rusak total tidak bernilai ekonomis',
        ])->assertCreated()
            ->assertJsonPath('data.type', 'dispose')
            ->assertJsonPath('data.from_condition', 'heavy_damage')
            ->assertJsonPath('data.to_condition', 'disposed');

        $refreshed = $asset->fresh();
        $this->assertSame('disposed', $refreshed->status->value);
        $this->assertSame('disposed', $refreshed->item_condition->value);
    }

    public function test_aset_disposed_tidak_bisa_dipindah_atau_diubah_kondisinya(): void
    {
        $asset = Asset::create($this->payload([
            'code' => 'AST-DSP-LOCK',
            'item_condition' => 'disposed',
            'status' => 'disposed',
        ]));

        $newLoc = Location::create(['name' => 'Tempat Sampah']);

        $this->actingAs($this->tu)->postJson("/api/v1/assets/{$asset->id}/movements", [
            'type' => 'move',
            'to_location_id' => $newLoc->id,
            'moved_at' => '2026-03-11',
        ])->assertStatus(422)->assertJsonValidationErrors('status');

        $this->actingAs($this->tu)->postJson("/api/v1/assets/{$asset->id}/movements", [
            'type' => 'condition',
            'to_condition' => 'good',
            'moved_at' => '2026-03-11',
        ])->assertStatus(422)->assertJsonValidationErrors('status');
    }

    public function test_to_location_id_wajib_saat_move(): void
    {
        $asset = Asset::create($this->payload(['code' => 'AST-NOLOC']));

        $this->actingAs($this->tu)->postJson("/api/v1/assets/{$asset->id}/movements", [
            'type' => 'move',
            'moved_at' => '2026-03-12',
        ])->assertStatus(422)->assertJsonValidationErrors('to_location_id');
    }

    public function test_riwayat_movements_aset_bisa_diambil(): void
    {
        $asset = Asset::create($this->payload(['code' => 'AST-SHOW']));
        $target = Location::create(['name' => 'Ruang Baru']);

        $this->actingAs($this->tu)->postJson("/api/v1/assets/{$asset->id}/movements", [
            'type' => 'move',
            'to_location_id' => $target->id,
            'moved_at' => '2026-03-12',
        ])->assertCreated();

        // 1. Via endpoint movements
        $resMovements = $this->actingAs($this->tu)->getJson("/api/v1/assets/{$asset->id}/movements")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->assertSame('move', $resMovements->json('data.0.type'));

        // 2. Via show detail aset
        $this->actingAs($this->tu)->getJson("/api/v1/assets/{$asset->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data.movements');
    }

    public function test_guru_403_akses_inventaris(): void
    {
        $asset = Asset::create($this->payload(['code' => 'AST-GURU-BLOCKED']));

        $this->actingAs($this->guru)->getJson('/api/v1/assets')->assertStatus(403);
        $this->actingAs($this->guru)->getJson('/api/v1/asset-categories')->assertStatus(403);
        $this->actingAs($this->guru)->getJson('/api/v1/locations')->assertStatus(403);
        $this->actingAs($this->guru)->getJson("/api/v1/assets/{$asset->id}")->assertStatus(403);
        $this->actingAs($this->guru)->postJson('/api/v1/assets', $this->payload())->assertStatus(403);
        $this->actingAs($this->guru)->putJson("/api/v1/assets/{$asset->id}", $this->payload())->assertStatus(403);
        $this->actingAs($this->guru)->deleteJson("/api/v1/assets/{$asset->id}")->assertStatus(403);
        $this->actingAs($this->guru)->postJson("/api/v1/assets/{$asset->id}/movements", [
            'type' => 'dispose',
            'moved_at' => '2026-03-12',
        ])->assertStatus(403);
    }

    public function test_superadmin_boleh_baca_tetapi_403_menulis(): void
    {
        $asset = Asset::create($this->payload(['code' => 'AST-SA-READONLY']));

        // Boleh baca
        $this->actingAs($this->superadmin)->getJson('/api/v1/assets')->assertOk();
        $this->actingAs($this->superadmin)->getJson('/api/v1/asset-categories')->assertOk();
        $this->actingAs($this->superadmin)->getJson('/api/v1/locations')->assertOk();
        $this->actingAs($this->superadmin)->getJson("/api/v1/assets/{$asset->id}")->assertOk();

        // Ditolak saat menulis (403)
        $this->actingAs($this->superadmin)->postJson('/api/v1/assets', $this->payload())->assertStatus(403);
        $this->actingAs($this->superadmin)->putJson("/api/v1/assets/{$asset->id}", $this->payload())->assertStatus(403);
        $this->actingAs($this->superadmin)->deleteJson("/api/v1/assets/{$asset->id}")->assertStatus(403);
        $this->actingAs($this->superadmin)->postJson("/api/v1/assets/{$asset->id}/movements", [
            'type' => 'dispose',
            'moved_at' => '2026-03-12',
        ])->assertStatus(403);
    }

    public function test_belum_login_401(): void
    {
        $this->getJson('/api/v1/assets')->assertStatus(401);
        $this->getJson('/api/v1/asset-categories')->assertStatus(401);
        $this->getJson('/api/v1/locations')->assertStatus(401);
    }
}
