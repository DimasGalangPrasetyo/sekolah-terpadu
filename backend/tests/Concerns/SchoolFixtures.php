<?php

namespace Tests\Concerns;

use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\GradeLevel;
use App\Models\Staff;
use App\Models\Student;
use App\Models\Unit;
use App\Models\User;
use App\Services\StudentService;

/** Data uji bersama: tahun ajaran, rombel, guru, siswa, dan akun berperan. */
trait SchoolFixtures
{
    protected function actAs(string $role, array $attrs = []): User
    {
        $user = User::factory()->create($attrs);
        $user->assignRole($role);

        return $user;
    }

    protected function makeYear(string $name = '2026/2027', bool $active = true): AcademicYear
    {
        $y = (int) explode('/', $name)[0];

        $year = AcademicYear::create([
            'name' => $name, 'start_date' => "$y-07-13", 'end_date' => ($y + 1).'-06-26', 'is_active' => $active,
        ]);
        $year->semesters()->create(['name' => 'ganjil', 'start_date' => "$y-07-13", 'end_date' => "$y-12-19", 'is_active' => $active]);
        $year->semesters()->create(['name' => 'genap', 'start_date' => ($y + 1).'-01-04', 'end_date' => ($y + 1).'-06-26', 'is_active' => false]);

        return $year;
    }

    protected function teacher(string $name = 'Guru Uji', array $attrs = []): Staff
    {
        return Staff::create(array_merge([
            'name' => $name, 'gender' => 'P', 'position' => 'Guru',
            'employment_status' => 'permanent', 'is_teacher' => true, 'is_active' => true,
        ], $attrs));
    }

    protected function makeClassroom(
        string $unit = 'SD',
        string $grade = '1',
        string $name = '1A',
        ?AcademicYear $year = null,
        ?Staff $homeroom = null,
    ): Classroom {
        $year ??= AcademicYear::where('is_active', true)->first() ?? $this->makeYear();
        $unitModel = Unit::where('code', $unit)->firstOrFail();
        $gradeModel = GradeLevel::where('unit_id', $unitModel->id)->where('code', $grade)->firstOrFail();

        return Classroom::create([
            'unit_id' => $unitModel->id,
            'academic_year_id' => $year->id,
            'grade_level_id' => $gradeModel->id,
            'name' => $name,
            'homeroom_staff_id' => $homeroom?->id,
            'capacity' => 30,
        ]);
    }

    protected function makeStudent(array $attrs = [], ?Classroom $classroom = null): Student
    {
        return app(StudentService::class)->create(array_merge(
            ['name' => 'Siswa Uji', 'gender' => 'L', 'guardians' => [['relation' => 'mother', 'name' => 'Ibu Uji']]],
            $attrs,
            $classroom ? ['classroom_id' => $classroom->id] : [],
        ));
    }
}
