<?php

namespace Tests\Feature\Users;

use App\Models\Staff;
use App\Models\User;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StaffOptionsTest extends TestCase
{
    use RefreshDatabase;

    private User $super;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CoreSeeder::class);

        $this->super = User::factory()->create();
        $this->super->assignRole('superadmin');
    }

    private function staff(string $name, array $attrs = []): Staff
    {
        return Staff::create(array_merge([
            'name' => $name, 'gender' => 'L', 'position' => 'Guru',
            'employment_status' => 'permanent', 'is_teacher' => true, 'is_active' => true,
        ], $attrs));
    }

    public function test_hanya_guru_aktif_yang_belum_punya_akun(): void
    {
        $tersedia = $this->staff('Ahmad Tersedia');
        $sudahPunyaAkun = $this->staff('Budi Punya Akun');
        User::factory()->create(['staff_id' => $sudahPunyaAkun->id]);
        $this->staff('Citra Bukan Guru', ['is_teacher' => false]);
        $this->staff('Dewi Nonaktif', ['is_active' => false]);

        $names = collect($this->actingAs($this->super)->getJson('/api/v1/staff-options')->assertOk()->json('data'))->pluck('name');

        $this->assertSame([$tersedia->name], $names->all());
    }

    public function test_include_id_menyertakan_staf_yang_sudah_ditautkan(): void
    {
        $linked = $this->staff('Budi Punya Akun');
        User::factory()->create(['staff_id' => $linked->id]);
        $this->staff('Ahmad Tersedia');

        $names = collect($this->actingAs($this->super)->getJson("/api/v1/staff-options?include_id={$linked->id}")->assertOk()->json('data'))->pluck('name');

        $this->assertEqualsCanonicalizing(['Budi Punya Akun', 'Ahmad Tersedia'], $names->all());
    }

    public function test_pencarian_berdasarkan_nama(): void
    {
        $this->staff('Ahmad Fauzi');
        $this->staff('Siti Aminah');

        $this->actingAs($this->super)->getJson('/api/v1/staff-options?q=siti')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Siti Aminah');
    }

    public function test_hanya_superadmin(): void
    {
        $tu = User::factory()->create();
        $tu->assignRole('admin_tu_keuangan');

        $this->getJson('/api/v1/staff-options')->assertStatus(401);
        $this->actingAs($tu)->getJson('/api/v1/staff-options')->assertStatus(403);
    }
}
