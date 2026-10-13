<?php

namespace Tests\Feature\Students;

use App\Models\AcademicYear;
use App\Models\Invoice;
use App\Models\Student;
use App\Models\StudentEnrollment;
use App\Models\StudentStatusLog;
use App\Models\Unit;
use App\Models\User;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\SchoolFixtures;
use Tests\TestCase;

class StudentTest extends TestCase
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
        return array_merge([
            'name' => 'Andi Pratama',
            'gender' => 'L',
            'nis' => '2026999',
            'birth_date' => '2018-05-01',
            'guardians' => [
                ['relation' => 'father', 'name' => 'Pak Budi', 'phone' => '0811111'],
                ['relation' => 'mother', 'name' => 'Bu Sari'],
            ],
        ], $override);
    }

    public function test_tu_membuat_siswa_dengan_wali_dan_penempatan_kelas(): void
    {
        $room = $this->makeClassroom();

        $this->actingAs($this->tu)->postJson('/api/v1/students', $this->payload(['classroom_id' => $room->id]))
            ->assertCreated()
            ->assertJsonPath('data.name', 'Andi Pratama')
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.classroom.name', '1A')
            ->assertJsonPath('data.classroom.unit', 'SD')
            ->assertJsonCount(2, 'data.guardians');

        $student = Student::firstOrFail();
        $this->assertSame(1, StudentEnrollment::where('student_id', $student->id)->count());
        $this->assertSame(1, $student->guardians()->where('is_primary_contact', true)->count());
    }

    public function test_siswa_boleh_dibuat_tanpa_kelas(): void
    {
        $this->actingAs($this->tu)->postJson('/api/v1/students', $this->payload())
            ->assertCreated()->assertJsonPath('data.classroom', null);

        $this->assertSame(0, StudentEnrollment::count());
    }

    public function test_nis_dan_nisn_harus_unik(): void
    {
        $this->makeStudent(['nis' => '2026999', 'nisn' => '0012345678']);

        $this->actingAs($this->tu)->postJson('/api/v1/students', $this->payload(['nisn' => '0012345678']))
            ->assertStatus(422)->assertJsonValidationErrors(['nis', 'nisn']);
    }

    public function test_rombel_dari_tahun_lain_ditolak(): void
    {
        $other = $this->makeYear('2027/2028', false);
        $room = $this->makeClassroom('SD', '1', '1A', $other);

        $this->actingAs($this->tu)->postJson('/api/v1/students', $this->payload(['classroom_id' => $room->id]))
            ->assertStatus(422)->assertJsonValidationErrors('classroom_id');

        $this->assertSame(0, Student::count(), 'transaksi harus dibatalkan');
    }

    public function test_validasi_wajib_dan_tanggal_lahir(): void
    {
        $this->actingAs($this->tu)->postJson('/api/v1/students', ['guardians' => [['relation' => 'ayah-tiri']]])
            ->assertStatus(422)->assertJsonValidationErrors(['name', 'gender', 'guardians.0.relation', 'guardians.0.name']);

        $this->actingAs($this->tu)->postJson('/api/v1/students', $this->payload(['birth_date' => now()->addDay()->toDateString()]))
            ->assertStatus(422)->assertJsonValidationErrors('birth_date');
    }

    public function test_daftar_bisa_dicari_dan_difilter(): void
    {
        $sd = $this->makeClassroom('SD', '1', '1A');
        $smp = $this->makeClassroom('SMP', '7', '7A');
        $this->makeStudent(['name' => 'Ahmad Fauzi', 'nis' => '111'], $sd);
        $this->makeStudent(['name' => 'Budi Santoso', 'nis' => '222'], $smp);
        $unplaced = $this->makeStudent(['name' => 'Citra Dewi', 'nis' => '333']);
        $unplaced->update(['status' => 'inactive']);

        $names = fn (string $query) => collect($this->actingAs($this->tu)->getJson("/api/v1/students?$query")->assertOk()->json('data'))->pluck('name')->all();

        $this->assertSame(['Ahmad Fauzi', 'Budi Santoso', 'Citra Dewi'], $names(''));
        $this->assertSame(['Ahmad Fauzi'], $names('q=ahmad'));
        $this->assertSame(['Budi Santoso'], $names('q=222'));
        $this->assertSame(['Ahmad Fauzi'], $names('unit=SD'));
        $this->assertSame(['Budi Santoso'], $names('unit=SMP'));
        $this->assertSame(['Ahmad Fauzi'], $names("classroom_id={$sd->id}"));
        $this->assertSame(['Citra Dewi'], $names('status=inactive'));
        $this->assertSame(['Citra Dewi'], $names('unplaced=1'));
    }

    public function test_guru_hanya_melihat_siswa_rombel_yang_diwalikannya(): void
    {
        $guru1 = $this->teacher('Bu Satu');
        $guru2 = $this->teacher('Bu Dua');
        $room1 = $this->makeClassroom('SD', '1', '1A', $this->year, $guru1);
        $room2 = $this->makeClassroom('SD', '2', '2A', $this->year, $guru2);
        $s1 = $this->makeStudent(['name' => 'Siswa Satu'], $room1);
        $s2 = $this->makeStudent(['name' => 'Siswa Dua'], $room2);

        $guru = $this->actAs('guru', ['staff_id' => $guru1->id]);

        $names = collect($this->actingAs($guru)->getJson('/api/v1/students')->assertOk()->json('data'))->pluck('name')->all();
        $this->assertSame(['Siswa Satu'], $names);

        $this->actingAs($guru)->getJson("/api/v1/students/{$s1->id}")->assertOk();
        $this->actingAs($guru)->getJson("/api/v1/students/{$s2->id}")->assertStatus(403);
        $this->actingAs($guru)->postJson('/api/v1/students', $this->payload())->assertStatus(403);
        $this->actingAs($guru)->deleteJson("/api/v1/students/{$s1->id}")->assertStatus(403);
    }

    public function test_guru_tanpa_penugasan_tidak_melihat_siswa(): void
    {
        $this->makeStudent([], $this->makeClassroom());
        $guru = $this->actAs('guru');

        $this->actingAs($guru)->getJson('/api/v1/students')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_ubah_siswa_dan_sinkronisasi_wali(): void
    {
        $student = $this->makeStudent(['guardians' => [
            ['relation' => 'father', 'name' => 'Ayah Lama'],
            ['relation' => 'mother', 'name' => 'Ibu Lama'],
        ]]);
        $fatherId = $student->guardians()->where('relation', 'father')->value('id');

        $this->actingAs($this->tu)->putJson("/api/v1/students/{$student->id}", [
            'name' => 'Nama Baru',
            'gender' => 'L',
            'guardians' => [
                ['id' => $fatherId, 'relation' => 'father', 'name' => 'Ayah Baru', 'is_primary_contact' => true],
                ['relation' => 'guardian', 'name' => 'Paman'],
            ],
        ])->assertOk()->assertJsonPath('data.name', 'Nama Baru')->assertJsonCount(2, 'data.guardians');

        $this->assertEqualsCanonicalizing(['Ayah Baru', 'Paman'], $student->guardians()->pluck('name')->all());
        $this->assertSame($fatherId, (int) $student->guardians()->where('name', 'Ayah Baru')->value('id'), 'wali yang sama harus diperbarui, bukan dibuat ulang');
        $this->assertSame(1, $student->guardians()->where('is_primary_contact', true)->count());
    }

    public function test_hapus_siswa_ditolak_bila_punya_data_keuangan(): void
    {
        $room = $this->makeClassroom();
        $clean = $this->makeStudent(['name' => 'Bersih'], $room);
        $billed = $this->makeStudent(['name' => 'Bertagihan'], $room);

        Invoice::create([
            'number' => 'INV-UJI-1',
            'student_id' => $billed->id,
            'unit_id' => Unit::where('code', 'SD')->value('id'),
            'academic_year_id' => $this->year->id,
            'kind' => 'one_time',
            'created_by' => $this->tu->id,
        ]);

        $this->actingAs($this->tu)->deleteJson("/api/v1/students/{$billed->id}")->assertStatus(409);
        $this->assertNull(Student::withTrashed()->find($billed->id)->deleted_at);

        $this->actingAs($this->tu)->deleteJson("/api/v1/students/{$clean->id}")->assertNoContent();
        $this->assertSoftDeleted('students', ['id' => $clean->id]);
    }

    public function test_siswa_pindah_menutup_enrollment_dan_mencatat_riwayat(): void
    {
        $room = $this->makeClassroom();
        $student = $this->makeStudent([], $room);

        $this->actingAs($this->tu)->postJson("/api/v1/students/{$student->id}/status", [
            'to_status' => 'transferred', 'effective_date' => '2026-10-01',
        ])->assertStatus(422)->assertJsonValidationErrors('destination_school');

        $this->actingAs($this->tu)->postJson("/api/v1/students/{$student->id}/status", [
            'to_status' => 'transferred', 'effective_date' => '2026-10-01',
            'destination_school' => 'SDN 1 Contoh', 'reason' => 'Pindah rumah',
        ])->assertOk()->assertJsonPath('data.status', 'transferred')->assertJsonPath('data.status_logs.0.to_status', 'transferred');

        $enrollment = StudentEnrollment::where('student_id', $student->id)->firstOrFail();
        $this->assertSame('left', $enrollment->status->value);
        $this->assertSame('2026-10-01', $enrollment->ended_at->toDateString());

        $log = StudentStatusLog::where('student_id', $student->id)->firstOrFail();
        $this->assertSame('active', $log->from_status->value);
        $this->assertSame($this->tu->id, (int) $log->created_by);
    }

    public function test_lulus_menandai_enrollment_lulus_dan_status_sama_ditolak(): void
    {
        $student = $this->makeStudent([], $this->makeClassroom());

        $this->actingAs($this->tu)->postJson("/api/v1/students/{$student->id}/status", [
            'to_status' => 'active', 'effective_date' => '2027-06-20',
        ])->assertStatus(422)->assertJsonValidationErrors('to_status');

        $this->actingAs($this->tu)->postJson("/api/v1/students/{$student->id}/status", [
            'to_status' => 'graduated', 'effective_date' => '2027-06-20',
        ])->assertOk();

        $this->assertSame('graduated', StudentEnrollment::where('student_id', $student->id)->first()->status->value);
    }

    public function test_pindah_rombel_memperbarui_enrollment_yang_sama(): void
    {
        $a = $this->makeClassroom('SD', '1', '1A');
        $b = $this->makeClassroom('SD', '1', '1B');
        $student = $this->makeStudent([], $a);

        $this->actingAs($this->tu)->putJson("/api/v1/students/{$student->id}/enrollment", ['classroom_id' => $b->id])
            ->assertOk()->assertJsonPath('data.classroom.name', '1B');

        $this->assertSame(1, StudentEnrollment::where('student_id', $student->id)->count());
        $this->assertSame($b->id, (int) StudentEnrollment::where('student_id', $student->id)->value('classroom_id'));
    }

    public function test_siswa_yang_sudah_keluar_tidak_bisa_ditempatkan(): void
    {
        $room = $this->makeClassroom();
        $student = $this->makeStudent([], $room);
        $this->actingAs($this->tu)->postJson("/api/v1/students/{$student->id}/status", [
            'to_status' => 'dropped', 'effective_date' => '2026-10-01',
        ])->assertOk();

        $this->actingAs($this->tu)->putJson("/api/v1/students/{$student->id}/enrollment", ['classroom_id' => $room->id])
            ->assertStatus(422)->assertJsonValidationErrors('classroom_id');
    }

    public function test_penempatan_siswa_baru_tanpa_kelas(): void
    {
        $room = $this->makeClassroom();
        $student = $this->makeStudent();

        $this->actingAs($this->tu)->putJson("/api/v1/students/{$student->id}/enrollment", ['classroom_id' => $room->id])
            ->assertOk()->assertJsonPath('data.classroom.name', '1A');

        $this->assertSame(1, StudentEnrollment::where('student_id', $student->id)->count());
    }

    public function test_audit_log_siswa_tidak_menyimpan_alamat_dan_telepon(): void
    {
        $this->actingAs($this->tu)->postJson('/api/v1/students', $this->payload([
            'address' => 'Jl. Rahasia No. 1', 'phone' => '08123456789',
        ]))->assertCreated();

        $log = \App\Models\AuditLog::where('event', 'created')->where('auditable_type', Student::class)->firstOrFail();
        $this->assertArrayHasKey('name', $log->new_values);
        $this->assertArrayNotHasKey('address', $log->new_values);
        $this->assertArrayNotHasKey('phone', $log->new_values);
    }
}
