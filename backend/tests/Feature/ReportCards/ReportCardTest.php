<?php

namespace Tests\Feature\ReportCards;

use App\Models\AcademicYear;
use App\Models\AuditLog;
use App\Models\Classroom;
use App\Models\ReportCard;
use App\Models\Staff;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\ReportFixtures;
use Tests\Concerns\SchoolFixtures;
use Tests\TestCase;

class ReportCardTest extends TestCase
{
    use RefreshDatabase, ReportFixtures, SchoolFixtures;

    private User $tu;

    private AcademicYear $year;

    private Staff $teacher;

    private Classroom $room;

    private Student $student;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CoreSeeder::class);
        $this->tu = $this->actAs('admin_tu_keuangan');
        $this->year = $this->makeYear();
        $this->teacher = $this->teacher('Bu Wali');
        $this->room = $this->makeClassroom('SD', '1', '1A', $this->year, $this->teacher);
        $this->student = $this->makeStudent(['name' => 'Ahmad Fauzi'], $this->room);
        $this->makeTemplate('SD');
    }

    private function guru(?Staff $staff = null): User
    {
        return $this->actAs('guru', ['staff_id' => ($staff ?? $this->teacher)->id]);
    }

    private function openCard(User $as, ?Student $student = null)
    {
        return $this->actingAs($as)->postJson('/api/v1/report-cards', ['student_id' => ($student ?? $this->student)->id]);
    }

    public function test_membuka_rapor_membuat_draft_terisi_dari_template(): void
    {
        $response = $this->openCard($this->tu)->assertCreated()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.student.name', 'Ahmad Fauzi')
            ->assertJsonPath('data.classroom.name', '1A')
            ->assertJsonPath('data.semester.name', 'ganjil')
            ->assertJsonPath('data.template.name', 'Rapor Generik');

        $rows = $response->json('data.answers.subjects');
        $this->assertSame(['Matematika', 'Bahasa Indonesia'], array_column($rows, 'subject'));
        $this->assertSame('Bu Wali', $response->json('data.answers.signature.Wali Kelas'));
        $this->assertTrue((bool) \App\Models\ReportTemplate::first()->is_locked, 'template terpakai harus terkunci');
    }

    public function test_membuka_dua_kali_mengembalikan_rapor_yang_sama(): void
    {
        $first = $this->openCard($this->tu)->assertCreated()->json('data.id');
        $second = $this->openCard($this->tu)->assertOk()->json('data.id');

        $this->assertSame($first, $second);
        $this->assertSame(1, ReportCard::count());
    }

    public function test_siswa_tk_atau_tanpa_rombel_ditolak(): void
    {
        $tkRoom = $this->makeClassroom('TK', 'A', 'TK A', $this->year);
        $tkStudent = $this->makeStudent(['name' => 'Anak TK'], $tkRoom);
        $unplaced = $this->makeStudent(['name' => 'Belum Ditempatkan']);

        $this->openCard($this->tu, $tkStudent)->assertStatus(422)->assertJsonValidationErrors('student_id');
        $this->openCard($this->tu, $unplaced)->assertStatus(422)->assertJsonValidationErrors('student_id');
    }

    public function test_tanpa_template_aktif_ditolak(): void
    {
        \App\Models\ReportTemplate::query()->update(['is_active' => false]);

        $this->openCard($this->tu)->assertStatus(422)->assertJsonValidationErrors('student_id');
    }

    public function test_guru_hanya_boleh_membuka_rapor_siswa_di_rombelnya(): void
    {
        $other = $this->makeClassroom('SD', '2', '2A', $this->year, $this->teacher('Bu Lain'));
        $otherStudent = $this->makeStudent(['name' => 'Siswa Kelas Lain'], $other);

        $guru = $this->guru();
        $this->openCard($guru)->assertCreated();
        $this->openCard($guru, $otherStudent)->assertStatus(403);
    }

    public function test_isian_disimpan_dan_autosave_tidak_menulis_audit(): void
    {
        $id = $this->openCard($this->tu)->json('data.id');
        $before = AuditLog::count();

        $this->actingAs($this->tu)->putJson("/api/v1/report-cards/{$id}", ['data' => [
            'subjects' => [
                ['subject' => 'Matematika', 'score' => '90', 'note' => 'Sangat baik'],
                ['subject' => 'Bahasa Indonesia', 'score' => '85', 'note' => ''],
            ],
            'extra' => [['name' => 'Pramuka', 'note' => 'Aktif']],
            'attendance' => ['sick' => '2', 'permit' => 1],
            'homeroom_note' => 'Pertahankan prestasi.',
        ]])->assertOk()
            ->assertJsonPath('data.answers.subjects.0.score', '90')
            ->assertJsonPath('data.answers.attendance.permit', '1');

        $this->assertSame($before, AuditLog::count(), 'autosave tidak boleh menimbulkan catatan audit');
    }

    public function test_isian_tidak_sesuai_template_ditolak(): void
    {
        $id = $this->openCard($this->tu)->json('data.id');
        $put = fn (array $data) => $this->actingAs($this->tu)->putJson("/api/v1/report-cards/{$id}", ['data' => $data]);

        $put(['bagian_asing' => 'x'])->assertStatus(422)->assertJsonValidationErrors('data.bagian_asing');
        $put(['subjects' => [['subject' => 'A', 'kolom_asing' => 'x']]])->assertStatus(422);
        $put(['attendance' => ['sick' => 'banyak']])->assertStatus(422)->assertJsonValidationErrors('data.attendance.sick');
        $put(['homeroom_note' => str_repeat('a', 51)])->assertStatus(422)->assertJsonValidationErrors('data.homeroom_note');
        $put(['signature' => ['Presiden' => 'X']])->assertStatus(422);
    }

    public function test_rapor_final_tidak_bisa_diubah_oleh_siapa_pun(): void
    {
        $id = $this->openCard($this->tu)->json('data.id');
        $this->actingAs($this->tu)->postJson("/api/v1/report-cards/{$id}/finalize")->assertOk()->assertJsonPath('data.status', 'final');

        $this->actingAs($this->tu)->putJson("/api/v1/report-cards/{$id}", ['data' => []])->assertStatus(403);
        $this->actingAs($this->guru())->putJson("/api/v1/report-cards/{$id}", ['data' => []])->assertStatus(403);
        $this->assertDatabaseHas('audit_logs', ['event' => 'report_card_finalized', 'auditable_id' => $id]);
    }

    public function test_guru_bisa_mengisi_dan_memfinalkan_rapor_rombelnya(): void
    {
        $guru = $this->guru();
        $id = $this->openCard($guru)->json('data.id');

        $this->actingAs($guru)->putJson("/api/v1/report-cards/{$id}", ['data' => ['homeroom_note' => 'Baik']])->assertOk();
        $this->actingAs($guru)->postJson("/api/v1/report-cards/{$id}/finalize")->assertOk();
    }

    public function test_hanya_tu_yang_bisa_membuka_kunci_dengan_alasan(): void
    {
        $id = $this->openCard($this->tu)->json('data.id');
        $this->actingAs($this->tu)->postJson("/api/v1/report-cards/{$id}/finalize")->assertOk();

        $this->actingAs($this->guru())->postJson("/api/v1/report-cards/{$id}/unlock", ['reason' => 'Salah ketik'])->assertStatus(403);
        $this->actingAs($this->tu)->postJson("/api/v1/report-cards/{$id}/unlock", [])->assertStatus(422)->assertJsonValidationErrors('reason');

        $this->actingAs($this->tu)->postJson("/api/v1/report-cards/{$id}/unlock", ['reason' => 'Salah ketik nilai'])
            ->assertOk()->assertJsonPath('data.status', 'draft');
        $this->assertDatabaseHas('audit_logs', ['event' => 'report_card_unlocked', 'auditable_id' => $id]);
    }

    public function test_membuka_kunci_rapor_yang_belum_final_ditolak(): void
    {
        $id = $this->openCard($this->tu)->json('data.id');

        $this->actingAs($this->tu)->postJson("/api/v1/report-cards/{$id}/unlock", ['reason' => 'x'])->assertStatus(403);
    }

    public function test_guru_tidak_bisa_melihat_rapor_rombel_lain(): void
    {
        $id = $this->openCard($this->tu)->json('data.id');
        $stranger = $this->guru($this->teacher('Bu Lain'));

        $this->actingAs($stranger)->getJson("/api/v1/report-cards/{$id}")->assertStatus(403);
        $this->actingAs($this->guru())->getJson("/api/v1/report-cards/{$id}")->assertOk()->assertJsonPath('data.editable', true);
    }

    public function test_pencetakan_dicatat_di_audit(): void
    {
        $id = $this->openCard($this->tu)->json('data.id');

        $this->actingAs($this->tu)->postJson("/api/v1/report-cards/{$id}/printed")->assertNoContent();
        $this->assertDatabaseHas('audit_logs', ['event' => 'report_card_printed', 'auditable_id' => $id]);
    }

    public function test_daftar_rombel_hanya_sd_smp_dan_guru_hanya_rombelnya(): void
    {
        $this->makeClassroom('TK', 'A', 'TK A', $this->year);
        $this->makeClassroom('SMP', '7', '7A', $this->year);

        $tuRooms = collect($this->actingAs($this->tu)->getJson('/api/v1/report-cards/classrooms')->assertOk()->json('data'))->pluck('name')->all();
        $this->assertEqualsCanonicalizing(['1A', '7A'], $tuRooms);

        $guruRooms = collect($this->actingAs($this->guru())->getJson('/api/v1/report-cards/classrooms')->assertOk()->json('data'))->pluck('name')->all();
        $this->assertSame(['1A'], $guruRooms);
    }

    public function test_daftar_siswa_rombel_menampilkan_status_rapor_dan_hitungan(): void
    {
        $second = $this->makeStudent(['name' => 'Budi Santoso'], $this->room);
        $this->makeStudent(['name' => 'Citra Dewi'], $this->room);

        $first = $this->openCard($this->tu)->json('data.id');
        $this->actingAs($this->tu)->postJson("/api/v1/report-cards/{$first}/finalize")->assertOk();
        $this->openCard($this->tu, $second)->assertCreated();

        $response = $this->actingAs($this->tu)->getJson("/api/v1/report-cards?classroom_id={$this->room->id}")->assertOk()
            ->assertJsonPath('meta.counts.total', 3)
            ->assertJsonPath('meta.counts.final', 1)
            ->assertJsonPath('meta.counts.draft', 1);

        $rows = collect($response->json('data'))->keyBy(fn ($r) => $r['student']['name']);
        $this->assertSame('final', $rows['Ahmad Fauzi']['report_card']['status']);
        $this->assertSame('draft', $rows['Budi Santoso']['report_card']['status']);
        $this->assertNull($rows['Citra Dewi']['report_card']);
    }

    public function test_cetak_sekaligus_hanya_memuat_rapor_final(): void
    {
        $second = $this->makeStudent(['name' => 'Budi Santoso'], $this->room);
        $final = $this->openCard($this->tu)->json('data.id');
        $this->actingAs($this->tu)->postJson("/api/v1/report-cards/{$final}/finalize")->assertOk();
        $this->openCard($this->tu, $second)->assertCreated();

        $this->actingAs($this->tu)->getJson("/api/v1/report-cards/batch?classroom_id={$this->room->id}")
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.student.name', 'Ahmad Fauzi');
    }

    public function test_pengguna_tanpa_izin_rapor_ditolak(): void
    {
        $super = $this->actAs('superadmin');

        $this->getJson('/api/v1/report-cards/classrooms')->assertStatus(401);
        $this->actingAs($super)->getJson('/api/v1/report-cards/classrooms')->assertStatus(403);
    }
}
