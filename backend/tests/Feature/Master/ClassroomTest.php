<?php

namespace Tests\Feature\Master;

use App\Models\AcademicYear;
use App\Models\GradeLevel;
use App\Models\Unit;
use App\Models\User;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\SchoolFixtures;
use Tests\TestCase;

class ClassroomTest extends TestCase
{
    use RefreshDatabase, SchoolFixtures;

    private User $tu;

    private AcademicYear $year;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CoreSeeder::class);
        $this->tu = $this->actAs('admin_tu_keuangan');
        $this->year = $this->makeYear();
    }

    private function payload(array $override = []): array
    {
        $sd = Unit::where('code', 'SD')->firstOrFail();

        return array_merge([
            'unit_id' => $sd->id,
            'academic_year_id' => $this->year->id,
            'grade_level_id' => GradeLevel::where('unit_id', $sd->id)->where('code', '1')->value('id'),
            'name' => '1A',
            'homeroom_staff_id' => null,
            'capacity' => 30,
        ], $override);
    }

    public function test_tu_membuat_rombel_dengan_wali_kelas(): void
    {
        $guru = $this->teacher('Bu Ani');

        $this->actingAs($this->tu)->postJson('/api/v1/classrooms', $this->payload(['homeroom_staff_id' => $guru->id]))
            ->assertCreated()
            ->assertJsonPath('data.name', '1A')
            ->assertJsonPath('data.unit.code', 'SD')
            ->assertJsonPath('data.homeroom.name', 'Bu Ani');
    }

    public function test_tingkat_harus_sesuai_unit(): void
    {
        $smp = Unit::where('code', 'SMP')->firstOrFail();
        $grade7 = GradeLevel::where('unit_id', $smp->id)->where('code', '7')->value('id');

        $this->actingAs($this->tu)->postJson('/api/v1/classrooms', $this->payload(['grade_level_id' => $grade7]))
            ->assertStatus(422)->assertJsonValidationErrors('grade_level_id');
    }

    public function test_nama_rombel_unik_per_unit_dan_tahun(): void
    {
        $this->actingAs($this->tu)->postJson('/api/v1/classrooms', $this->payload())->assertCreated();
        $this->actingAs($this->tu)->postJson('/api/v1/classrooms', $this->payload())
            ->assertStatus(422)->assertJsonValidationErrors('name');
    }

    public function test_satu_guru_hanya_menjadi_wali_satu_rombel_per_tahun(): void
    {
        $guru = $this->teacher();

        $this->actingAs($this->tu)->postJson('/api/v1/classrooms', $this->payload(['homeroom_staff_id' => $guru->id]))->assertCreated();
        $this->actingAs($this->tu)->postJson('/api/v1/classrooms', $this->payload(['name' => '1B', 'homeroom_staff_id' => $guru->id]))
            ->assertStatus(422)->assertJsonValidationErrors('homeroom_staff_id');
    }

    public function test_wali_kelas_harus_guru_aktif(): void
    {
        $bukanGuru = $this->teacher('Bu TU', ['is_teacher' => false]);
        $nonaktif = $this->teacher('Pak Lama', ['is_active' => false]);

        foreach ([$bukanGuru, $nonaktif] as $staff) {
            $this->actingAs($this->tu)->postJson('/api/v1/classrooms', $this->payload(['homeroom_staff_id' => $staff->id]))
                ->assertStatus(422)->assertJsonValidationErrors('homeroom_staff_id');
        }
    }

    public function test_ubah_rombel_tidak_bentrok_dengan_dirinya_sendiri(): void
    {
        $guru = $this->teacher();
        $room = $this->makeClassroom('SD', '1', '1A', $this->year, $guru);

        $this->actingAs($this->tu)->putJson("/api/v1/classrooms/{$room->id}", $this->payload([
            'homeroom_staff_id' => $guru->id, 'capacity' => 28,
        ]))->assertOk()->assertJsonPath('data.capacity', 28);
    }

    public function test_hapus_rombel_ditolak_bila_ada_siswa(): void
    {
        $room = $this->makeClassroom();
        $empty = $this->makeClassroom('SD', '2', '2A');
        $this->makeStudent([], $room);

        $this->actingAs($this->tu)->deleteJson("/api/v1/classrooms/{$room->id}")->assertStatus(409);
        $this->actingAs($this->tu)->deleteJson("/api/v1/classrooms/{$empty->id}")->assertNoContent();
    }

    public function test_daftar_rombel_memuat_jumlah_siswa_dan_bisa_difilter_unit(): void
    {
        $sd = $this->makeClassroom('SD', '1', '1A');
        $smp = $this->makeClassroom('SMP', '7', '7A');
        $this->makeStudent(['name' => 'A'], $sd);
        $this->makeStudent(['name' => 'B'], $sd);

        $all = $this->actingAs($this->tu)->getJson('/api/v1/classrooms')->assertOk()->json('data');
        $this->assertCount(2, $all);

        $this->actingAs($this->tu)->getJson('/api/v1/classrooms?unit=SD')
            ->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.students_count', 2);

        $this->assertNotNull($smp->id);
    }

    public function test_guru_tidak_boleh_mengelola_rombel_tetapi_boleh_melihat(): void
    {
        $guru = $this->actAs('guru');

        $this->actingAs($guru)->getJson('/api/v1/classrooms')->assertOk();
        $this->actingAs($guru)->postJson('/api/v1/classrooms', $this->payload())->assertStatus(403);
        $this->actingAs($guru)->getJson('/api/v1/teacher-options')->assertStatus(403);
    }

    public function test_pilihan_guru_menandai_yang_sudah_menjadi_wali(): void
    {
        $sudah = $this->teacher('Bu Sudah');
        $belum = $this->teacher('Pak Belum');
        $this->makeClassroom('SD', '1', '1A', $this->year, $sudah);

        $rows = collect($this->actingAs($this->tu)->getJson('/api/v1/teacher-options')->assertOk()->json('data'))->keyBy('name');

        $this->assertSame('1A', $rows['Bu Sudah']['homeroom_classroom']);
        $this->assertNull($rows['Pak Belum']['homeroom_classroom']);
        $this->assertNotNull($belum->id);
    }
}
