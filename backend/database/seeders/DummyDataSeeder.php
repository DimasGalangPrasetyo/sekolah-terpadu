<?php

namespace Database\Seeders;

use App\Models\AcademicYear;
use App\Models\Asset;
use App\Models\AssetCategory;
use App\Models\Classroom;
use App\Models\FeeRate;
use App\Models\FeeType;
use App\Models\GradeLevel;
use App\Models\Guardian;
use App\Models\Location;
use App\Models\ReportTemplate;
use App\Models\Semester;
use App\Models\Staff;
use App\Models\StaffUnitAssignment;
use App\Models\Student;
use App\Models\StudentEnrollment;
use App\Models\Subject;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Data DUMMY untuk pengembangan dan demo. Tidak berisi data nyata.
 * Hanya berjalan di lingkungan local/testing.
 */
class DummyDataSeeder extends Seeder
{
    private const START = '2026-07-13';

    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            $this->command?->error('DummyDataSeeder hanya untuk lingkungan local/testing.');

            return;
        }

        $this->call(CoreSeeder::class);

        $faker = fake('id_ID');
        $year = $this->seedAcademicYear();
        $units = Unit::whereIn('code', ['TK', 'SD', 'SMP'])->get()->keyBy('code');

        [$tuStaff, $teachers] = $this->seedStaff($faker, $units);
        $classrooms = $this->seedClassrooms($year, $units, $teachers);
        $this->seedStudents($faker, $year, $classrooms);
        $this->seedSubjectsAndTemplates($units);
        $this->seedFeeRates($year, $units);
        $this->seedAssets($units, $tuStaff);
        $this->seedUsers($tuStaff, $classrooms);
    }

    private function seedAcademicYear(): AcademicYear
    {
        $year = AcademicYear::updateOrCreate(
            ['name' => '2026/2027'],
            ['start_date' => self::START, 'end_date' => '2027-06-26', 'is_active' => true],
        );

        Semester::updateOrCreate(
            ['academic_year_id' => $year->id, 'name' => 'ganjil'],
            ['start_date' => self::START, 'end_date' => '2026-12-19', 'is_active' => true],
        );
        Semester::updateOrCreate(
            ['academic_year_id' => $year->id, 'name' => 'genap'],
            ['start_date' => '2027-01-04', 'end_date' => '2027-06-26', 'is_active' => false],
        );

        return $year;
    }

    /** @return array{0: Staff, 1: Collection} */
    private function seedStaff($faker, $units): array
    {
        $make = function (bool $teacher, string $position) use ($faker) {
            $gender = $faker->randomElement(['L', 'P']);

            return Staff::create([
                'nuptk' => $faker->numerify('################'),
                'name' => $faker->name($gender === 'L' ? 'male' : 'female'),
                'gender' => $gender,
                'birth_place' => $faker->city(),
                'birth_date' => $faker->dateTimeBetween('-50 years', '-24 years')->format('Y-m-d'),
                'phone' => $faker->phoneNumber(),
                'address' => $faker->address(),
                'position' => $position,
                'employment_status' => $faker->randomElement(['permanent', 'honorary', 'contract']),
                'join_date' => $faker->dateTimeBetween('-10 years', '-1 year')->format('Y-m-d'),
                'education' => $faker->randomElement(['S1', 'S1', 'D3', 'S2']),
                'is_teacher' => $teacher,
                'is_active' => true,
            ]);
        };

        $tuStaff = $make(false, 'Tata Usaha dan Keuangan');
        foreach ($units as $unit) {
            StaffUnitAssignment::create(['staff_id' => $tuStaff->id, 'unit_id' => $unit->id, 'role_title' => 'Tata Usaha', 'start_date' => self::START]);
        }

        $teachers = collect(range(1, 22))->map(fn () => $make(true, 'Guru'));

        return [$tuStaff, $teachers];
    }

    /** @return Collection<int, Classroom> */
    private function seedClassrooms(AcademicYear $year, $units, $teachers)
    {
        $pool = $teachers->values()->all();
        $classrooms = collect();
        $i = 0;

        foreach (['TK', 'SD', 'SMP'] as $code) {
            $unit = $units[$code];
            foreach (GradeLevel::where('unit_id', $unit->id)->orderBy('sort_order')->get() as $grade) {
                $teacher = $pool[$i++];
                $classroom = Classroom::updateOrCreate(
                    ['unit_id' => $unit->id, 'academic_year_id' => $year->id, 'name' => $code === 'TK' ? "TK {$grade->code}" : "{$grade->code}A"],
                    ['grade_level_id' => $grade->id, 'homeroom_staff_id' => $teacher->id, 'capacity' => 30],
                );
                StaffUnitAssignment::create(['staff_id' => $teacher->id, 'unit_id' => $unit->id, 'role_title' => 'Wali Kelas', 'start_date' => self::START]);
                $classrooms->push($classroom->load('gradeLevel'));
            }
        }

        // guru yang tersisa: guru mata pelajaran di SD/SMP
        foreach (array_slice($pool, $i) as $k => $teacher) {
            StaffUnitAssignment::create(['staff_id' => $teacher->id, 'unit_id' => $units[$k % 2 ? 'SD' : 'SMP']->id, 'role_title' => 'Guru Mata Pelajaran', 'start_date' => self::START]);
        }

        return $classrooms;
    }

    private function seedStudents($faker, AcademicYear $year, $classrooms): void
    {
        for ($n = 1; $n <= 75; $n++) {
            $classroom = $classrooms[($n - 1) % $classrooms->count()];
            $unitCode = $classroom->unit->code;
            $grade = $classroom->gradeLevel->code;
            $age = $unitCode === 'TK' ? 5 : 6 + (int) $grade;
            $gender = $faker->randomElement(['L', 'P']);

            $student = Student::create([
                'nis' => sprintf('2026%03d', $n),
                'nisn' => $faker->unique()->numerify('00########'),
                'name' => $faker->name($gender === 'L' ? 'male' : 'female'),
                'gender' => $gender,
                'birth_place' => $faker->city(),
                'birth_date' => $faker->dateTimeBetween('-'.($age + 1).' years', '-'.$age.' years')->format('Y-m-d'),
                'religion' => $faker->randomElement(['Islam', 'Islam', 'Islam', 'Islam', 'Kristen']),
                'address' => $faker->address(),
                'phone' => $faker->phoneNumber(),
                'entry_date' => self::START,
                'status' => 'active',
            ]);

            StudentEnrollment::create([
                'student_id' => $student->id,
                'classroom_id' => $classroom->id,
                'academic_year_id' => $year->id,
                'status' => 'active',
                'started_at' => self::START,
            ]);

            foreach (['father' => 'male', 'mother' => 'female'] as $relation => $g) {
                Guardian::create([
                    'student_id' => $student->id,
                    'relation' => $relation,
                    'name' => $faker->name($g),
                    'occupation' => $faker->randomElement(['Wiraswasta', 'Karyawan Swasta', 'Guru', 'Petani', 'Pedagang']),
                    'phone' => $faker->phoneNumber(),
                    'is_primary_contact' => $relation === 'mother',
                ]);
            }
        }
    }

    private function seedSubjectsAndTemplates($units): void
    {
        $subjects = [
            'SD' => ['Pendidikan Agama', 'Pendidikan Pancasila', 'Bahasa Indonesia', 'Matematika', 'IPAS', 'Seni', 'PJOK', 'Bahasa Inggris'],
            'SMP' => ['Pendidikan Agama', 'PPKn', 'Bahasa Indonesia', 'Matematika', 'IPA', 'IPS', 'Bahasa Inggris', 'Informatika', 'Seni', 'PJOK', 'Prakarya'],
        ];

        foreach ($subjects as $code => $names) {
            foreach ($names as $order => $name) {
                Subject::updateOrCreate(
                    ['unit_id' => $units[$code]->id, 'name' => $name],
                    ['sort_order' => $order + 1, 'is_active' => true],
                );
            }

            ReportTemplate::updateOrCreate(
                ['unit_id' => $units[$code]->id, 'name' => 'Rapor Generik', 'version' => 1],
                ['definition' => $this->genericDefinition(), 'is_active' => true],
            );
        }
    }

    private function genericDefinition(): array
    {
        return [
            'sections' => [
                ['key' => 'identity', 'type' => 'student_identity', 'title' => 'Identitas Siswa'],
                ['key' => 'subjects', 'type' => 'table', 'title' => 'Capaian Pembelajaran', 'rows_from' => 'subjects', 'columns' => [
                    ['key' => 'subject', 'label' => 'Mata Pelajaran'],
                    ['key' => 'score', 'label' => 'Nilai'],
                    ['key' => 'note', 'label' => 'Deskripsi'],
                ]],
                ['key' => 'extra', 'type' => 'table', 'title' => 'Ekstrakurikuler', 'dynamic_rows' => true, 'columns' => [
                    ['key' => 'name', 'label' => 'Kegiatan'],
                    ['key' => 'note', 'label' => 'Keterangan'],
                ]],
                ['key' => 'attendance', 'type' => 'fields', 'title' => 'Kehadiran', 'fields' => [
                    ['key' => 'sick', 'label' => 'Sakit', 'input' => 'number'],
                    ['key' => 'permit', 'label' => 'Izin', 'input' => 'number'],
                    ['key' => 'absent', 'label' => 'Tanpa Keterangan', 'input' => 'number'],
                ]],
                ['key' => 'homeroom_note', 'type' => 'text', 'label' => 'Catatan Wali Kelas', 'input' => 'textarea', 'max_length' => 600],
                ['key' => 'signature', 'type' => 'signature', 'signers' => ['Orang Tua/Wali', 'Wali Kelas', 'Kepala Sekolah']],
            ],
        ];
    }

    private function seedFeeRates(AcademicYear $year, $units): void
    {
        $spp = ['TK' => 150000, 'SD' => 250000, 'SMP' => 350000];
        $entry = ['TK' => 1000000, 'SD' => 1500000, 'SMP' => 2000000];
        $uniform = ['TK' => 400000, 'SD' => 500000, 'SMP' => 600000];

        $types = FeeType::pluck('id', 'code');

        foreach ($units as $code => $unit) {
            foreach (GradeLevel::where('unit_id', $unit->id)->get() as $grade) {
                FeeRate::updateOrCreate(
                    ['fee_type_id' => $types['SPP'], 'unit_id' => $unit->id, 'grade_level_id' => $grade->id, 'academic_year_id' => $year->id],
                    ['amount' => $spp[$code]],
                );
            }
            FeeRate::updateOrCreate(
                ['fee_type_id' => $types['UANG_PANGKAL'], 'unit_id' => $unit->id, 'grade_level_id' => null, 'academic_year_id' => $year->id],
                ['amount' => $entry[$code]],
            );
            FeeRate::updateOrCreate(
                ['fee_type_id' => $types['SERAGAM'], 'unit_id' => $unit->id, 'grade_level_id' => null, 'academic_year_id' => $year->id],
                ['amount' => $uniform[$code]],
            );
        }
    }

    private function seedAssets($units, Staff $tuStaff): void
    {
        $locations = [];
        foreach ($units as $code => $unit) {
            foreach (['Ruang Kelas', 'Perpustakaan', 'Ruang Guru'] as $name) {
                $locations[] = Location::updateOrCreate(['unit_id' => $unit->id, 'name' => "$name $code"]);
            }
        }

        $categories = AssetCategory::pluck('id', 'code');
        $items = [
            ['Meja Siswa', 'FRN', 40], ['Kursi Siswa', 'FRN', 40], ['Papan Tulis', 'FRN', 6],
            ['Proyektor', 'ELK', 3], ['Laptop Guru', 'ELK', 5], ['Printer', 'ELK', 2],
            ['Buku Paket', 'BUK', 120], ['Globe', 'APR', 4], ['Bola Sepak', 'OLR', 6],
            ['Bola Voli', 'OLR', 4], ['Lemari Arsip', 'FRN', 3], ['Dispenser', 'ELK', 3],
        ];

        foreach ($items as $i => [$name, $cat, $qty]) {
            Asset::updateOrCreate(
                ['code' => sprintf('AST-%04d', $i + 1)],
                [
                    'name' => $name,
                    'asset_category_id' => $categories[$cat],
                    'unit_id' => $locations[$i % count($locations)]->unit_id,
                    'location_id' => $locations[$i % count($locations)]->id,
                    'quantity' => $qty,
                    'item_condition' => 'good',
                    'responsible_staff_id' => $tuStaff->id,
                    'status' => 'active',
                ],
            );
        }
    }

    private function seedUsers(Staff $tuStaff, $classrooms): void
    {
        $password = Str::password(12);
        $rows = [];

        $tu = User::updateOrCreate(
            ['username' => 'tu'],
            ['name' => $tuStaff->name, 'staff_id' => $tuStaff->id, 'password' => $password, 'is_active' => true, 'must_change_password' => false],
        );
        $tu->syncRoles(['admin_tu_keuangan']);
        $rows[] = ['tu', 'admin_tu_keuangan'];

        // dua guru wali kelas (SD dan SMP) sebagai akun contoh
        $homerooms = $classrooms->filter(fn ($c) => in_array($c->unit->code, ['SD', 'SMP']))->take(2)->values();
        foreach ($homerooms as $i => $classroom) {
            $teacher = Staff::find($classroom->homeroom_staff_id);
            $username = 'guru'.($i + 1);
            $user = User::updateOrCreate(
                ['username' => $username],
                ['name' => $teacher->name, 'staff_id' => $teacher->id, 'password' => $password, 'is_active' => true, 'must_change_password' => false],
            );
            $user->syncRoles(['guru']);
            $rows[] = [$username, "guru (wali kelas {$classroom->name})"];
        }

        $this->command?->info('Akun DUMMY dibuat. Password sama untuk semuanya: '.$password);
        $this->command?->table(['username', 'peran'], $rows);
    }
}
