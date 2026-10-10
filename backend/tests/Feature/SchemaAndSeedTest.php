<?php

namespace Tests\Feature;

use App\Models\Classroom;
use App\Models\Student;
use App\Models\StudentEnrollment;
use App\Models\Unit;
use App\Models\User;
use Database\Seeders\CoreSeeder;
use Database\Seeders\DummyDataSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class SchemaAndSeedTest extends TestCase
{
    use RefreshDatabase;

    public function test_semua_tabel_inti_ada(): void
    {
        $tables = [
            'users', 'staff', 'units', 'academic_years', 'semesters', 'grade_levels', 'subjects', 'classrooms',
            'students', 'guardians', 'student_enrollments', 'student_status_logs', 'staff_unit_assignments',
            'report_templates', 'report_cards',
            'fee_types', 'fee_rates', 'student_discounts', 'invoices', 'invoice_items',
            'payments', 'payment_allocations', 'cash_categories', 'cash_transactions',
            'asset_categories', 'locations', 'assets', 'asset_movements',
            'audit_logs', 'settings', 'school_profiles', 'number_sequences',
            'roles', 'permissions', 'sessions',
        ];

        foreach ($tables as $table) {
            $this->assertTrue(Schema::hasTable($table), "Tabel {$table} tidak ada");
        }
    }

    public function test_core_seeder_membuat_peran_unit_dan_superadmin(): void
    {
        $this->seed(CoreSeeder::class);

        $this->assertSame(3, Unit::count());
        $this->assertFalse((bool) Unit::where('code', 'TK')->value('has_report_card'));
        $this->assertTrue((bool) Unit::where('code', 'SD')->value('has_report_card'));

        $admin = User::where('username', 'superadmin')->firstOrFail();
        $this->assertTrue($admin->hasRole('superadmin'));
        $this->assertTrue($admin->can('users.manage'));
        $this->assertFalse($admin->can('finance.manage'), 'superadmin hanya melihat data operasional');
        $this->assertTrue($admin->must_change_password);
    }

    public function test_matriks_permission_per_peran(): void
    {
        $this->seed(CoreSeeder::class);

        $guru = User::factory()->create();
        $guru->assignRole('guru');
        $this->assertTrue($guru->can('reportcards.fill'));
        $this->assertFalse($guru->can('students.manage'));
        $this->assertFalse($guru->can('finance.view'));

        $tu = User::factory()->create();
        $tu->assignRole('admin_tu_keuangan');
        $this->assertTrue($tu->can('finance.manage'));
        $this->assertTrue($tu->can('reportcards.unlock'));
        $this->assertFalse($tu->can('users.manage'));
    }

    public function test_data_dummy_konsisten(): void
    {
        $this->seed(DummyDataSeeder::class);

        $this->assertSame(11, Classroom::count());
        $this->assertSame(75, Student::count());
        $this->assertSame(75, StudentEnrollment::count());

        $student = Student::with('enrollments')->first();
        $this->assertCount(1, $student->enrollments);
        $this->assertCount(2, $student->guardians);

        $classroom = Classroom::whereHas('unit', fn ($q) => $q->where('code', 'SD'))->first();
        $this->assertNotNull($classroom->homeroom_staff_id);
    }

    public function test_satu_siswa_hanya_satu_enrollment_per_tahun_ajaran(): void
    {
        $this->seed(DummyDataSeeder::class);

        $existing = StudentEnrollment::first();
        $other = Classroom::where('id', '!=', $existing->classroom_id)->first();

        $this->expectException(QueryException::class);

        StudentEnrollment::create([
            'student_id' => $existing->student_id,
            'classroom_id' => $other->id,
            'academic_year_id' => $existing->academic_year_id,
            'status' => 'active',
        ]);
    }
}
