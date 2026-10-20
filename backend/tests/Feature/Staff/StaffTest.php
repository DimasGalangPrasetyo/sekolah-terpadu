<?php

namespace Tests\Feature\Staff;

use App\Models\AcademicYear;
use App\Models\Asset;
use App\Models\AssetCategory;
use App\Models\AuditLog;
use App\Models\Location;
use App\Models\Staff;
use App\Models\StaffUnitAssignment;
use App\Models\Unit;
use App\Models\User;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\SchoolFixtures;
use Tests\TestCase;

class StaffTest extends TestCase
{
    use RefreshDatabase, SchoolFixtures;

    private User $tu;

    private AcademicYear $year;

    private Unit $sd;

    private Unit $smp;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CoreSeeder::class);
        $this->tu = $this->actAs('admin_tu_keuangan');
        $this->year = $this->makeYear();
        $this->sd = Unit::where('code', 'SD')->firstOrFail();
        $this->smp = Unit::where('code', 'SMP')->firstOrFail();
    }

    private function payload(array $override = []): array
    {
        return array_merge([
            'nip' => '198501012010011001',
            'nuptk' => '1234567890123456',
            'name' => 'Budi Setiawan, S.Pd.',
            'gender' => 'L',
            'birth_place' => 'Bandung',
            'birth_date' => '1985-01-01',
            'phone' => '081234567890',
            'email' => 'budi@sekolah.sch.id',
            'address' => 'Jl. Merdeka No. 10 Bandung',
            'position' => 'Guru Matematika',
            'employment_status' => 'permanent',
            'join_date' => '2015-07-01',
            'education' => 'S1 Pendidikan Matematika',
            'is_teacher' => true,
            'is_active' => true,
            'assignments' => [
                [
                    'unit_id' => $this->sd->id,
                    'role_title' => 'Guru Kelas SD',
                    'start_date' => '2026-07-01',
                    'end_date' => '2027-06-30',
                ],
            ],
        ], $override);
    }

    public function test_daftar_staf_dengan_filter_q_unit_is_teacher_is_active(): void
    {
        $guruSd = Staff::create([
            'name' => 'Ahmad Dahlan',
            'nip' => '111222',
            'gender' => 'L',
            'position' => 'Guru Agama',
            'employment_status' => 'permanent',
            'is_teacher' => true,
            'is_active' => true,
        ]);
        StaffUnitAssignment::create([
            'staff_id' => $guruSd->id,
            'unit_id' => $this->sd->id,
            'role_title' => 'Guru Agama',
        ]);

        $tuSmp = Staff::create([
            'name' => 'Dewi Sartika',
            'nip' => '333444',
            'gender' => 'P',
            'position' => 'Staf Tata Usaha',
            'employment_status' => 'contract',
            'is_teacher' => false,
            'is_active' => true,
        ]);
        StaffUnitAssignment::create([
            'staff_id' => $tuSmp->id,
            'unit_id' => $this->smp->id,
            'role_title' => 'Tata Usaha',
        ]);

        $nonaktif = Staff::create([
            'name' => 'Chairil Anwar',
            'nip' => '555666',
            'gender' => 'L',
            'position' => 'Pustakawan',
            'employment_status' => 'honorary',
            'is_teacher' => false,
            'is_active' => false,
        ]);

        $names = fn (string $query) => collect(
            $this->actingAs($this->tu)->getJson("/api/v1/staff?$query")->assertOk()->json('data')
        )->pluck('name')->all();

        $this->assertSame(['Ahmad Dahlan', 'Chairil Anwar', 'Dewi Sartika'], $names(''));
        $this->assertSame(['Ahmad Dahlan'], $names('q=ahmad'));
        $this->assertSame(['Dewi Sartika'], $names('q=333444'));
        $this->assertSame(['Ahmad Dahlan'], $names('unit=SD'));
        $this->assertSame(['Dewi Sartika'], $names('unit=SMP'));
        $this->assertSame(['Ahmad Dahlan'], $names('is_teacher=1'));
        $this->assertSame(['Chairil Anwar', 'Dewi Sartika'], $names('is_teacher=0'));
        $this->assertSame(['Ahmad Dahlan', 'Dewi Sartika'], $names('is_active=1'));
        $this->assertSame(['Chairil Anwar'], $names('is_active=0'));
        $this->assertSame(['Dewi Sartika'], $names('employment_status=contract'));
    }

    public function test_buat_staf_dengan_penugasan_unit(): void
    {
        $response = $this->actingAs($this->tu)->postJson('/api/v1/staff', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.name', 'Budi Setiawan, S.Pd.')
            ->assertJsonPath('data.nip', '198501012010011001')
            ->assertJsonPath('data.position', 'Guru Matematika')
            ->assertJsonPath('data.is_teacher', true)
            ->assertJsonPath('data.is_active', true)
            ->assertJsonCount(1, 'data.assignments')
            ->assertJsonPath('data.assignments.0.unit.code', 'SD');

        $staff = Staff::where('nip', '198501012010011001')->firstOrFail();
        $this->assertSame(1, $staff->unitAssignments()->count());
        $this->assertSame('Guru Kelas SD', $staff->unitAssignments()->first()->role_title);
    }

    public function test_validasi_kolom_wajib_dan_aturan_penugasan(): void
    {
        $this->actingAs($this->tu)->postJson('/api/v1/staff', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'gender', 'position', 'employment_status']);

        $this->actingAs($this->tu)->postJson('/api/v1/staff', $this->payload([
            'assignments' => [
                ['role_title' => 'Guru'], // unit_id missing
            ],
        ]))->assertStatus(422)->assertJsonValidationErrors('assignments.0.unit_id');

        $this->actingAs($this->tu)->postJson('/api/v1/staff', $this->payload([
            'birth_date' => now()->addDay()->toDateString(),
        ]))->assertStatus(422)->assertJsonValidationErrors('birth_date');
    }

    public function test_tanggal_selesai_penugasan_harus_setelah_atau_sama_dengan_tanggal_mulai(): void
    {
        $this->actingAs($this->tu)->postJson('/api/v1/staff', $this->payload([
            'assignments' => [
                [
                    'unit_id' => $this->sd->id,
                    'role_title' => 'Guru Kelas',
                    'start_date' => '2026-08-01',
                    'end_date' => '2026-07-01',
                ],
            ],
        ]))->assertStatus(422)->assertJsonValidationErrors('assignments.0.end_date');
    }

    public function test_nip_dan_nuptk_harus_unik_kecuali_diri_sendiri_saat_ubah(): void
    {
        $staff1 = Staff::create($this->payload(['nip' => '111', 'nuptk' => '222']));

        $this->actingAs($this->tu)->postJson('/api/v1/staff', $this->payload(['nip' => '111', 'nuptk' => '222']))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['nip', 'nuptk']);

        // Mengubah diri sendiri dengan NIP/NUPTK yang sama diperbolehkan
        $this->actingAs($this->tu)->putJson("/api/v1/staff/{$staff1->id}", $this->payload(['nip' => '111', 'nuptk' => '222']))
            ->assertOk();
    }

    public function test_ubah_staf_dan_sinkronisasi_penugasan(): void
    {
        $staff = Staff::create($this->payload());
        $assignment = StaffUnitAssignment::create([
            'staff_id' => $staff->id,
            'unit_id' => $this->sd->id,
            'role_title' => 'Peran Awal',
        ]);

        $this->actingAs($this->tu)->putJson("/api/v1/staff/{$staff->id}", [
            'name' => 'Budi Setiawan, M.Pd.',
            'gender' => 'L',
            'position' => 'Kepala Lab',
            'employment_status' => 'permanent',
            'assignments' => [
                [
                    'id' => $assignment->id,
                    'unit_id' => $this->sd->id,
                    'role_title' => 'Peran Diperbarui',
                ],
                [
                    'unit_id' => $this->smp->id,
                    'role_title' => 'Peran Tambahan',
                ],
            ],
        ])->assertOk()->assertJsonPath('data.name', 'Budi Setiawan, M.Pd.')->assertJsonCount(2, 'data.assignments');

        $this->assertSame(2, $staff->unitAssignments()->count());
        $this->assertSame('Peran Diperbarui', $staff->unitAssignments()->where('id', $assignment->id)->value('role_title'));
        $this->assertTrue($staff->unitAssignments()->where('unit_id', $this->smp->id)->exists());
    }

    public function test_hapus_staf_berhasil_soft_delete(): void
    {
        $staff = Staff::create($this->payload());
        StaffUnitAssignment::create([
            'staff_id' => $staff->id,
            'unit_id' => $this->sd->id,
            'role_title' => 'Guru',
        ]);

        $this->actingAs($this->tu)->deleteJson("/api/v1/staff/{$staff->id}")
            ->assertNoContent();

        $this->assertSoftDeleted('staff', ['id' => $staff->id]);
        $this->assertSame(0, StaffUnitAssignment::where('staff_id', $staff->id)->count());
    }

    public function test_hapus_ditolak_409_bila_punya_akun_pengguna(): void
    {
        $staff = Staff::create($this->payload());
        User::factory()->create([
            'staff_id' => $staff->id,
            'username' => 'budi_user',
        ]);

        $this->actingAs($this->tu)->deleteJson("/api/v1/staff/{$staff->id}")
            ->assertStatus(409);

        $this->assertNull(Staff::withTrashed()->find($staff->id)->deleted_at);
    }

    public function test_hapus_ditolak_409_bila_menjadi_wali_kelas(): void
    {
        $staff = Staff::create($this->payload());
        $this->makeClassroom('SD', '1', '1A', $this->year, $staff);

        $this->actingAs($this->tu)->deleteJson("/api/v1/staff/{$staff->id}")
            ->assertStatus(409);

        $this->assertNull(Staff::withTrashed()->find($staff->id)->deleted_at);
    }

    public function test_hapus_ditolak_409_bila_penanggung_jawab_aset(): void
    {
        $staff = Staff::create($this->payload());
        $cat = AssetCategory::firstOrCreate(['code' => 'ELK'], ['name' => 'Elektronik']);
        $loc = Location::firstOrCreate(['name' => 'Ruang Guru'], ['unit_id' => $this->sd->id]);

        Asset::create([
            'code' => 'AST-UJI-001',
            'name' => 'Proyektor Ruang Guru',
            'asset_category_id' => $cat->id,
            'unit_id' => $this->sd->id,
            'location_id' => $loc->id,
            'quantity' => 1,
            'unit_label' => 'unit',
            'responsible_staff_id' => $staff->id,
            'item_condition' => 'good',
            'status' => 'active',
        ]);

        $this->actingAs($this->tu)->deleteJson("/api/v1/staff/{$staff->id}")
            ->assertStatus(409);

        $this->assertNull(Staff::withTrashed()->find($staff->id)->deleted_at);
    }

    public function test_hapus_ditolak_409_bila_kepala_unit(): void
    {
        $staff = Staff::create($this->payload());
        $this->sd->update(['head_staff_id' => $staff->id]);

        $this->actingAs($this->tu)->deleteJson("/api/v1/staff/{$staff->id}")
            ->assertStatus(409);

        $this->assertNull(Staff::withTrashed()->find($staff->id)->deleted_at);
    }

    public function test_nonaktifkan_ditolak_422_bila_wali_kelas_pada_tahun_aktif(): void
    {
        $staff = Staff::create($this->payload());
        $this->makeClassroom('SD', '1', '1A', $this->year, $staff);

        $this->actingAs($this->tu)->postJson("/api/v1/staff/{$staff->id}/deactivate")
            ->assertStatus(422)
            ->assertJsonValidationErrors('is_active');

        $this->assertTrue($staff->fresh()->is_active);
    }

    public function test_nonaktifkan_dan_aktifkan_berhasil_bila_bukan_wali_kelas(): void
    {
        $staff = Staff::create($this->payload());

        $this->actingAs($this->tu)->postJson("/api/v1/staff/{$staff->id}/deactivate")
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->assertFalse($staff->fresh()->is_active);

        $this->actingAs($this->tu)->postJson("/api/v1/staff/{$staff->id}/activate")
            ->assertOk()
            ->assertJsonPath('data.is_active', true);

        $this->assertTrue($staff->fresh()->is_active);
    }

    public function test_staff_resource_has_account_dan_homerooms_benar(): void
    {
        $staff = Staff::create($this->payload());
        User::factory()->create([
            'staff_id' => $staff->id,
            'username' => 'budiguru',
        ]);
        $room = $this->makeClassroom('SD', '1', '1A', $this->year, $staff);

        $this->actingAs($this->tu)->getJson("/api/v1/staff/{$staff->id}")
            ->assertOk()
            ->assertJsonPath('data.has_account', true)
            ->assertJsonPath('data.account_username', 'budiguru')
            ->assertJsonCount(1, 'data.homerooms')
            ->assertJsonPath('data.homerooms.0.id', $room->id)
            ->assertJsonPath('data.homerooms.0.name', '1A')
            ->assertJsonPath('data.homerooms.0.unit', 'SD');
    }

    public function test_guru_403_akses_staf(): void
    {
        $guru = $this->actAs('guru');
        $staff = Staff::create($this->payload());

        $this->actingAs($guru)->getJson('/api/v1/staff')->assertStatus(403);
        $this->actingAs($guru)->getJson("/api/v1/staff/{$staff->id}")->assertStatus(403);
        $this->actingAs($guru)->postJson('/api/v1/staff', $this->payload())->assertStatus(403);
        $this->actingAs($guru)->putJson("/api/v1/staff/{$staff->id}", $this->payload())->assertStatus(403);
        $this->actingAs($guru)->deleteJson("/api/v1/staff/{$staff->id}")->assertStatus(403);
    }

    public function test_superadmin_boleh_baca_tetapi_403_menulis(): void
    {
        $sa = $this->actAs('superadmin');
        $staff = Staff::create($this->payload());

        $this->actingAs($sa)->getJson('/api/v1/staff')->assertOk();
        $this->actingAs($sa)->getJson("/api/v1/staff/{$staff->id}")->assertOk();

        $this->actingAs($sa)->postJson('/api/v1/staff', $this->payload())->assertStatus(403);
        $this->actingAs($sa)->putJson("/api/v1/staff/{$staff->id}", $this->payload())->assertStatus(403);
        $this->actingAs($sa)->deleteJson("/api/v1/staff/{$staff->id}")->assertStatus(403);
        $this->actingAs($sa)->postJson("/api/v1/staff/{$staff->id}/deactivate")->assertStatus(403);
        $this->actingAs($sa)->postJson("/api/v1/staff/{$staff->id}/activate")->assertStatus(403);
    }

    public function test_audit_log_staf_tanpa_data_pribadi(): void
    {
        $this->actingAs($this->tu)->postJson('/api/v1/staff', $this->payload([
            'address' => 'Jl. Pribadi No. 99',
            'phone' => '089988776655',
            'email' => 'pribadi@example.com',
            'birth_date' => '1990-05-15',
            'birth_place' => 'Surabaya',
        ]))->assertCreated();

        $staff = Staff::where('email', 'pribadi@example.com')->firstOrFail();
        $log = AuditLog::where('event', 'created')
            ->where('auditable_type', Staff::class)
            ->where('auditable_id', $staff->id)
            ->firstOrFail();

        $this->assertArrayHasKey('name', $log->new_values);
        $this->assertArrayNotHasKey('address', $log->new_values);
        $this->assertArrayNotHasKey('phone', $log->new_values);
        $this->assertArrayNotHasKey('email', $log->new_values);
        $this->assertArrayNotHasKey('birth_date', $log->new_values);
        $this->assertArrayNotHasKey('birth_place', $log->new_values);
    }

    public function test_belum_login_401(): void
    {
        $this->getJson('/api/v1/staff')->assertStatus(401);
    }
}
