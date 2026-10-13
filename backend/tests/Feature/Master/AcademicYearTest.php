<?php

namespace Tests\Feature\Master;

use App\Models\AcademicYear;
use App\Models\Semester;
use App\Models\User;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\SchoolFixtures;
use Tests\TestCase;

class AcademicYearTest extends TestCase
{
    use RefreshDatabase, SchoolFixtures;

    private User $tu;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CoreSeeder::class);
        $this->tu = $this->actAs('admin_tu_keuangan');
    }

    private function payload(array $override = []): array
    {
        return array_replace_recursive([
            'name' => '2027/2028',
            'start_date' => '2027-07-12',
            'end_date' => '2028-06-24',
            'semesters' => [
                ['name' => 'ganjil', 'start_date' => '2027-07-12', 'end_date' => '2027-12-18'],
                ['name' => 'genap', 'start_date' => '2028-01-03', 'end_date' => '2028-06-24'],
            ],
        ], $override);
    }

    public function test_tu_membuat_tahun_ajaran_dengan_dua_semester(): void
    {
        $this->actingAs($this->tu)->postJson('/api/v1/academic-years', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.name', '2027/2028')
            ->assertJsonPath('data.is_active', false)
            ->assertJsonCount(2, 'data.semesters')
            ->assertJsonPath('data.semesters.0.name', 'ganjil');

        $this->assertSame(2, Semester::count());
    }

    public function test_semester_di_luar_rentang_tahun_ditolak(): void
    {
        $this->actingAs($this->tu)->postJson('/api/v1/academic-years', $this->payload([
            'semesters' => [['start_date' => '2027-06-01']],
        ]))->assertStatus(422)->assertJsonValidationErrors('semesters');
    }

    public function test_semester_ganjil_harus_berakhir_sebelum_genap(): void
    {
        $this->actingAs($this->tu)->postJson('/api/v1/academic-years', $this->payload([
            'semesters' => [['end_date' => '2028-02-01']],
        ]))->assertStatus(422)->assertJsonValidationErrors('semesters');
    }

    public function test_nama_semester_tidak_boleh_kembar_dan_nama_tahun_unik(): void
    {
        $this->actingAs($this->tu)->postJson('/api/v1/academic-years', $this->payload([
            'semesters' => [1 => ['name' => 'ganjil']],
        ]))->assertStatus(422);

        $this->makeYear('2027/2028', false);
        $this->actingAs($this->tu)->postJson('/api/v1/academic-years', $this->payload())
            ->assertStatus(422)->assertJsonValidationErrors('name');
    }

    public function test_aktivasi_tahun_hanya_menyisakan_satu_tahun_dan_satu_semester_aktif(): void
    {
        $a = $this->makeYear('2026/2027', true);
        $b = $this->makeYear('2027/2028', false);

        $this->actingAs($this->tu)->postJson("/api/v1/academic-years/{$b->id}/activate")
            ->assertOk()->assertJsonPath('data.is_active', true);

        $this->assertFalse($a->fresh()->is_active);
        $this->assertSame(1, AcademicYear::where('is_active', true)->count());
        $this->assertSame(1, Semester::where('is_active', true)->count());
        $this->assertSame($b->id, (int) Semester::where('is_active', true)->value('academic_year_id'));
    }

    public function test_aktivasi_semester_mengaktifkan_tahun_induknya(): void
    {
        $this->makeYear('2026/2027', true);
        $b = $this->makeYear('2027/2028', false);
        $genap = $b->semesters()->where('name', 'genap')->firstOrFail();

        $this->actingAs($this->tu)->postJson("/api/v1/semesters/{$genap->id}/activate")->assertOk();

        $this->assertTrue($b->fresh()->is_active);
        $this->assertSame(1, AcademicYear::where('is_active', true)->count());
        $this->assertSame([$genap->id], Semester::where('is_active', true)->pluck('id')->map(fn ($id) => (int) $id)->all());
    }

    public function test_update_tahun_ajaran(): void
    {
        $year = $this->makeYear('2026/2027', true);

        $this->actingAs($this->tu)->putJson("/api/v1/academic-years/{$year->id}", [
            'name' => '2026/2027',
            'start_date' => '2026-07-13',
            'end_date' => '2027-06-30',
            'semesters' => [
                ['name' => 'ganjil', 'start_date' => '2026-07-13', 'end_date' => '2026-12-19'],
                ['name' => 'genap', 'start_date' => '2027-01-04', 'end_date' => '2027-06-30'],
            ],
        ])->assertOk()->assertJsonPath('data.end_date', '2027-06-30');

        $this->assertSame(2, $year->semesters()->count());
    }

    public function test_hapus_ditolak_bila_aktif_atau_punya_rombel_dan_berhasil_bila_kosong(): void
    {
        $active = $this->makeYear('2026/2027', true);
        $this->actingAs($this->tu)->deleteJson("/api/v1/academic-years/{$active->id}")->assertStatus(409);

        $withRoom = $this->makeYear('2027/2028', false);
        $this->makeClassroom('SD', '1', '1A', $withRoom);
        $this->actingAs($this->tu)->deleteJson("/api/v1/academic-years/{$withRoom->id}")->assertStatus(409);

        $empty = $this->makeYear('2028/2029', false);
        $this->actingAs($this->tu)->deleteJson("/api/v1/academic-years/{$empty->id}")->assertNoContent();
        $this->assertDatabaseMissing('academic_years', ['id' => $empty->id]);
        $this->assertSame(0, Semester::where('academic_year_id', $empty->id)->count());
    }

    public function test_guru_hanya_boleh_membaca(): void
    {
        $this->makeYear();
        $guru = $this->actAs('guru');

        $this->actingAs($guru)->getJson('/api/v1/academic-years')->assertOk();
        $this->actingAs($guru)->postJson('/api/v1/academic-years', $this->payload())->assertStatus(403);
    }

    public function test_konteks_akademik_aktif(): void
    {
        $this->makeYear('2026/2027', true);

        $this->actingAs($this->tu)->getJson('/api/v1/academic-context')
            ->assertOk()
            ->assertJsonPath('data.year.name', '2026/2027')
            ->assertJsonPath('data.semester.name', 'ganjil');
    }
}
