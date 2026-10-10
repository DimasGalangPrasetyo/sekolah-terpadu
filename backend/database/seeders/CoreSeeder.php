<?php

namespace Database\Seeders;

use App\Models\AssetCategory;
use App\Models\CashCategory;
use App\Models\FeeType;
use App\Models\GradeLevel;
use App\Models\SchoolProfile;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class CoreSeeder extends Seeder
{
    /** Peran dan permission sesuai docs/BACKEND.md §3. */
    private const ROLE_PERMISSIONS = [
        'superadmin' => [
            'users.manage', 'system.manage', 'audit.view',
            'master.view', 'students.view', 'staff.view', 'inventory.view',
            'finance.view', 'reports.view', 'templates.manage',
        ],
        'admin_tu_keuangan' => [
            'master.view', 'master.manage',
            'students.view', 'students.manage',
            'staff.view', 'staff.manage',
            'inventory.view', 'inventory.manage',
            'finance.view', 'finance.manage',
            'reports.view', 'templates.manage',
            'reportcards.manage', 'reportcards.unlock',
        ],
        'guru' => [
            'master.view', 'students.view', 'reportcards.fill',
        ],
    ];

    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->seedRolesAndPermissions();
        $this->seedUnitsAndGrades();
        $this->seedReferenceData();
        $this->seedSuperadmin();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    private function seedRolesAndPermissions(): void
    {
        $all = collect(self::ROLE_PERMISSIONS)->flatten()->unique();

        foreach ($all as $name) {
            Permission::findOrCreate($name, 'web');
        }

        foreach (self::ROLE_PERMISSIONS as $roleName => $permissions) {
            Role::findOrCreate($roleName, 'web')->syncPermissions($permissions);
        }
    }

    private function seedUnitsAndGrades(): void
    {
        $units = [
            'TK' => ['name' => 'Taman Kanak-kanak', 'has_report_card' => false, 'grades' => ['A' => 'Kelompok A', 'B' => 'Kelompok B']],
            'SD' => ['name' => 'Sekolah Dasar', 'has_report_card' => true, 'grades' => array_combine(range(1, 6), array_map(fn ($n) => "Kelas $n", range(1, 6)))],
            'SMP' => ['name' => 'Sekolah Menengah Pertama', 'has_report_card' => true, 'grades' => array_combine(range(7, 9), array_map(fn ($n) => "Kelas $n", range(7, 9)))],
        ];

        foreach ($units as $code => $data) {
            $unit = Unit::updateOrCreate(
                ['code' => $code],
                ['name' => $data['name'], 'has_report_card' => $data['has_report_card'], 'is_active' => true],
            );

            $order = 1;
            foreach ($data['grades'] as $gradeCode => $gradeName) {
                GradeLevel::updateOrCreate(
                    ['unit_id' => $unit->id, 'code' => (string) $gradeCode],
                    ['name' => $gradeName, 'sort_order' => $order++],
                );
            }
        }
    }

    private function seedReferenceData(): void
    {
        foreach ([
            ['SPP', 'SPP Bulanan', 'monthly'],
            ['UANG_PANGKAL', 'Uang Pangkal', 'one_time'],
            ['SERAGAM', 'Seragam', 'one_time'],
            ['KEGIATAN', 'Biaya Kegiatan', 'annual'],
        ] as [$code, $name, $category]) {
            FeeType::updateOrCreate(['code' => $code], ['name' => $name, 'category' => $category, 'is_active' => true]);
        }

        foreach ([
            ['Donasi', 'income'], ['Sumbangan', 'income'], ['Pemasukan Lain', 'income'],
            ['Operasional', 'expense'], ['Gaji dan Honor', 'expense'], ['Listrik dan Air', 'expense'],
            ['ATK', 'expense'], ['Pemeliharaan', 'expense'], ['Pengeluaran Lain', 'expense'],
        ] as [$name, $type]) {
            CashCategory::updateOrCreate(['name' => $name, 'type' => $type], ['is_active' => true]);
        }

        foreach ([
            ['FRN', 'Furnitur'], ['ELK', 'Elektronik'], ['BUK', 'Buku dan Perpustakaan'],
            ['APR', 'Alat Peraga'], ['OLR', 'Peralatan Olahraga'], ['KND', 'Kendaraan'],
        ] as [$code, $name]) {
            AssetCategory::updateOrCreate(['code' => $code], ['name' => $name]);
        }

        if (SchoolProfile::query()->doesntExist()) {
            SchoolProfile::create(['foundation_name' => 'Nama Yayasan (isi di profil sekolah)']);
        }
    }

    private function seedSuperadmin(): void
    {
        // Catatan: env() dipakai langsung karena seeder hanya dijalankan manual lewat artisan.
        $password = env('SEED_SUPERADMIN_PASSWORD') ?: Str::password(14);

        $user = User::firstOrCreate(
            ['username' => 'superadmin'],
            [
                'name' => 'Pengelola Sistem',
                'password' => $password,
                'is_active' => true,
                'must_change_password' => true,
            ],
        );

        $user->syncRoles(['superadmin']);

        if ($user->wasRecentlyCreated) {
            $this->command?->warn("Akun superadmin dibuat. Password (catat SEKARANG, hanya tampil sekali): {$password}");
        }
    }
}
