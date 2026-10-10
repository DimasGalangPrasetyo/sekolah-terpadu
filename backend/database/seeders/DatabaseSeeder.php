<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Data inti saja (peran, unit, referensi, akun superadmin).
     * Data dummy: php artisan db:seed --class=DummyDataSeeder (hanya lingkungan local).
     */
    public function run(): void
    {
        $this->call(CoreSeeder::class);
    }
}
