<?php

namespace Tests\Feature\Users;

use App\Models\User;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SelfServiceGuardTest extends TestCase
{
    use RefreshDatabase;

    public function test_tidak_bisa_reset_password_akun_sendiri(): void
    {
        $this->seed(CoreSeeder::class);

        $super = User::factory()->create(['username' => 'root.admin']);
        $super->assignRole('superadmin');

        $this->actingAs($super)->postJson("/api/v1/users/{$super->id}/reset-password")
            ->assertStatus(422)
            ->assertJsonValidationErrors('user');

        $this->assertTrue(Hash::check('password-uji-123', $super->fresh()->password), 'password tidak boleh berubah');
        $this->assertFalse($super->fresh()->must_change_password);
    }

    public function test_reset_password_akun_lain_tetap_berfungsi(): void
    {
        $this->seed(CoreSeeder::class);

        $super = User::factory()->create(['username' => 'root.admin']);
        $super->assignRole('superadmin');
        $target = User::factory()->create(['username' => 'target']);
        $target->assignRole('admin_tu_keuangan');

        $this->actingAs($super)->postJson("/api/v1/users/{$target->id}/reset-password")
            ->assertOk()
            ->assertJsonStructure(['temporary_password']);
    }
}
