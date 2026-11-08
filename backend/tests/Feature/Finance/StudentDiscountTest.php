<?php

namespace Tests\Feature\Finance;

use App\Models\AcademicYear;
use App\Models\AuditLog;
use App\Models\StudentDiscount;
use App\Models\User;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\FinanceFixtures;
use Tests\Concerns\SchoolFixtures;
use Tests\TestCase;

class StudentDiscountTest extends TestCase
{
    use FinanceFixtures, RefreshDatabase, SchoolFixtures;

    private User $tu;

    private User $superadmin;

    private User $guru;

    private AcademicYear $year;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CoreSeeder::class);
        $this->tu = $this->actAs('admin_tu_keuangan');
        $this->superadmin = $this->actAs('superadmin');
        $this->guru = $this->actAs('guru');
        $this->year = AcademicYear::where('is_active', true)->first() ?? $this->makeYear();
    }

    public function test_buat_diskon_fixed_dan_percent(): void
    {
        $student1 = $this->makeStudent(['name' => 'Budi Fixed', 'nis' => '1001']);
        $student2 = $this->makeStudent(['name' => 'Sari Percent', 'nis' => '1002']);

        // Fixed
        $this->actingAs($this->tu)->postJson('/api/v1/student-discounts', [
            'student_id' => $student1->id,
            'academic_year_id' => $this->year->id,
            'type' => 'fixed',
            'value' => 50000,
            'reason' => 'Keringanan yayasan',
        ])->assertCreated()
            ->assertJsonPath('data.type', 'fixed')
            ->assertJsonPath('data.value', 50000)
            ->assertJsonPath('data.student.name', 'Budi Fixed')
            ->assertJsonPath('data.fee_type', null)
            ->assertJsonPath('data.is_active', true);

        // Percent
        $feeType = $this->makeFeeType();
        $this->actingAs($this->tu)->postJson('/api/v1/student-discounts', [
            'student_id' => $student2->id,
            'fee_type_id' => $feeType->id,
            'academic_year_id' => $this->year->id,
            'type' => 'percent',
            'value' => 25,
            'reason' => 'Prestasi olimpiade',
        ])->assertCreated()
            ->assertJsonPath('data.type', 'percent')
            ->assertJsonPath('data.value', 25)
            ->assertJsonPath('data.fee_type.id', $feeType->id);
    }

    public function test_percent_lebih_dari_100_ditolak(): void
    {
        $student = $this->makeStudent();

        $this->actingAs($this->tu)->postJson('/api/v1/student-discounts', [
            'student_id' => $student->id,
            'academic_year_id' => $this->year->id,
            'type' => 'percent',
            'value' => 105,
        ])->assertStatus(422)->assertJsonValidationErrors(['value']);
    }

    public function test_duplikat_aktif_ditolak(): void
    {
        $student = $this->makeStudent();

        $this->makeDiscount([
            'student_id' => $student->id,
            'fee_type_id' => null,
            'academic_year_id' => $this->year->id,
            'is_active' => true,
        ]);

        $this->actingAs($this->tu)->postJson('/api/v1/student-discounts', [
            'student_id' => $student->id,
            'fee_type_id' => null,
            'academic_year_id' => $this->year->id,
            'type' => 'fixed',
            'value' => 20000,
        ])->assertStatus(422);
    }

    public function test_duplikat_setelah_nonaktif_diperbolehkan(): void
    {
        $student = $this->makeStudent();

        // Diskon lama nonaktif
        $this->makeDiscount([
            'student_id' => $student->id,
            'fee_type_id' => null,
            'academic_year_id' => $this->year->id,
            'is_active' => false,
        ]);

        // Diskon baru dengan kombinasi yang sama boleh dibuat
        $this->actingAs($this->tu)->postJson('/api/v1/student-discounts', [
            'student_id' => $student->id,
            'fee_type_id' => null,
            'academic_year_id' => $this->year->id,
            'type' => 'fixed',
            'value' => 20000,
        ])->assertCreated();
    }

    public function test_aktifkan_kembali_yang_bentrok_ditolak(): void
    {
        $student = $this->makeStudent();

        // Satu diskon aktif
        $this->makeDiscount([
            'student_id' => $student->id,
            'fee_type_id' => null,
            'academic_year_id' => $this->year->id,
            'is_active' => true,
        ]);

        // Satu diskon nonaktif
        $inactiveDiscount = $this->makeDiscount([
            'student_id' => $student->id,
            'fee_type_id' => null,
            'academic_year_id' => $this->year->id,
            'is_active' => false,
        ]);

        // Mengaktifkan yang nonaktif harus ditolak karena bentrok
        $this->actingAs($this->tu)->postJson("/api/v1/student-discounts/{$inactiveDiscount->id}/activate")
            ->assertStatus(422);
    }

    public function test_ubah_nilai_dan_nonaktifkan(): void
    {
        $discount = $this->makeDiscount(['value' => 10]);

        $this->actingAs($this->tu)->putJson("/api/v1/student-discounts/{$discount->id}", [
            'type' => 'percent',
            'value' => 50,
            'reason' => 'Perubahan kuota',
        ])->assertOk()
            ->assertJsonPath('data.value', 50);

        $this->assertSame(50, $discount->fresh()->value);

        // Nonaktifkan
        $this->actingAs($this->tu)->postJson("/api/v1/student-discounts/{$discount->id}/deactivate")
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->assertFalse($discount->fresh()->is_active);
    }

    public function test_pencarian_q_berdasarkan_nama_atau_nis(): void
    {
        $student1 = $this->makeStudent(['name' => 'Fadhil Rahman', 'nis' => '88991']);
        $student2 = $this->makeStudent(['name' => 'Putri Ayu', 'nis' => '77332']);

        $discount1 = $this->makeDiscount(['student_id' => $student1->id, 'academic_year_id' => $this->year->id]);
        $discount2 = $this->makeDiscount(['student_id' => $student2->id, 'academic_year_id' => $this->year->id]);

        $resNama = $this->actingAs($this->tu)->getJson('/api/v1/student-discounts?q=Fadhil');
        $resNama->assertOk();
        $namaIds = collect($resNama->json('data'))->pluck('id');
        $this->assertTrue($namaIds->contains($discount1->id));
        $this->assertFalse($namaIds->contains($discount2->id));

        $resNis = $this->actingAs($this->tu)->getJson('/api/v1/student-discounts?q=77332');
        $resNis->assertOk();
        $nisIds = collect($resNis->json('data'))->pluck('id');
        $this->assertFalse($nisIds->contains($discount1->id));
        $this->assertTrue($nisIds->contains($discount2->id));
    }

    public function test_audit_tanpa_reason(): void
    {
        $student = $this->makeStudent();

        $this->actingAs($this->tu)->postJson('/api/v1/student-discounts', [
            'student_id' => $student->id,
            'academic_year_id' => $this->year->id,
            'type' => 'fixed',
            'value' => 100000,
            'reason' => 'Keluarga kurang mampu dan memiliki SKTM',
        ])->assertCreated();

        $discount = StudentDiscount::latest('id')->firstOrFail();

        $log = AuditLog::where('auditable_type', StudentDiscount::class)
            ->where('auditable_id', $discount->id)
            ->first();

        $this->assertNotNull($log);
        $this->assertArrayNotHasKey('reason', $log->new_values ?? []);

        // Saat diubah, reason juga tidak boleh masuk ke audit log
        $this->actingAs($this->tu)->putJson("/api/v1/student-discounts/{$discount->id}", [
            'type' => 'fixed',
            'value' => 120000,
            'reason' => 'Perubahan alasan rahasia keluarga',
        ])->assertOk();

        $updateLog = AuditLog::where('auditable_type', StudentDiscount::class)
            ->where('auditable_id', $discount->id)
            ->where('event', 'updated')
            ->first();

        if ($updateLog) {
            $this->assertArrayNotHasKey('reason', $updateLog->new_values ?? []);
            $this->assertArrayNotHasKey('reason', $updateLog->old_values ?? []);
        }
    }

    public function test_izin_diskon(): void
    {
        $discount = $this->makeDiscount();

        // 401
        $this->getJson('/api/v1/student-discounts')->assertStatus(401);
        $this->postJson('/api/v1/student-discounts', [])->assertStatus(401);

        // 403 guru
        $this->actingAs($this->guru)->getJson('/api/v1/student-discounts')->assertStatus(403);
        $this->actingAs($this->guru)->postJson('/api/v1/student-discounts', [])->assertStatus(403);

        // Superadmin: 200 baca, 403 tulis
        $this->actingAs($this->superadmin)->getJson('/api/v1/student-discounts')->assertStatus(200);
        $this->actingAs($this->superadmin)->postJson('/api/v1/student-discounts', [
            'student_id' => $discount->student_id,
            'academic_year_id' => $this->year->id,
            'type' => 'fixed',
            'value' => 50000,
        ])->assertStatus(403);
        $this->actingAs($this->superadmin)->putJson("/api/v1/student-discounts/{$discount->id}", [
            'type' => 'fixed',
            'value' => 60000,
        ])->assertStatus(403);
    }

    public function test_per_page_maksimal_100(): void
    {
        $this->actingAs($this->tu)->getJson('/api/v1/student-discounts?per_page=1000')
            ->assertOk()
            ->assertJsonPath('meta.per_page', 100);
    }

    public function test_buat_diskon_untuk_siswa_soft_deleted_ditolak(): void
    {
        $student = $this->makeStudent();
        $student->delete();

        $this->actingAs($this->tu)->postJson('/api/v1/student-discounts', [
            'student_id' => $student->id,
            'academic_year_id' => $this->year->id,
            'type' => 'fixed',
            'value' => 50000,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['student_id']);
    }

    public function test_ubah_value_diskon_yang_jenis_biaya_nonaktif_berhasil(): void
    {
        $feeType = $this->makeFeeType(['is_active' => true]);
        $discount = $this->makeDiscount([
            'fee_type_id' => $feeType->id,
            'value' => 20,
        ]);

        $feeType->update(['is_active' => false]);

        $this->actingAs($this->tu)->putJson("/api/v1/student-discounts/{$discount->id}", [
            'type' => 'percent',
            'value' => 35,
        ])->assertOk()
            ->assertJsonPath('data.value', 35);

        $this->assertSame(35, $discount->fresh()->value);
    }

    public function test_ganti_diskon_ke_jenis_biaya_nonaktif_ditolak(): void
    {
        $activeFeeType = $this->makeFeeType(['is_active' => true]);
        $inactiveFeeType = $this->makeFeeType(['is_active' => false]);

        $discount = $this->makeDiscount([
            'fee_type_id' => $activeFeeType->id,
            'value' => 20,
        ]);

        $this->actingAs($this->tu)->putJson("/api/v1/student-discounts/{$discount->id}", [
            'fee_type_id' => $inactiveFeeType->id,
            'type' => 'percent',
            'value' => 20,
        ])->assertStatus(422);
    }
}
