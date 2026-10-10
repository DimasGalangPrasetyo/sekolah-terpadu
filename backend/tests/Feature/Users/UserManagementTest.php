<?php

namespace Tests\Feature\Users;

use App\Models\AuditLog;
use App\Models\Staff;
use App\Models\User;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $super;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CoreSeeder::class);

        $this->super = User::factory()->create(['username' => 'root.admin']);
        $this->super->assignRole('superadmin');
    }

    private function teacher(array $attrs = []): Staff
    {
        return Staff::create(array_merge([
            'name' => 'Pak Guru', 'gender' => 'L', 'position' => 'Guru',
            'employment_status' => 'permanent', 'is_teacher' => true,
        ], $attrs));
    }

    private function payload(array $override = []): array
    {
        return array_merge([
            'name' => 'Staf TU Baru',
            'username' => 'tu.baru',
            'role' => 'admin_tu_keuangan',
        ], $override);
    }

    public function test_hanya_superadmin_yang_boleh_mengelola_akun(): void
    {
        $this->getJson('/api/v1/users')->assertStatus(401);

        $tu = User::factory()->create();
        $tu->assignRole('admin_tu_keuangan');
        $this->actingAs($tu)->getJson('/api/v1/users')->assertStatus(403);
        $this->actingAs($tu)->postJson('/api/v1/users', $this->payload())->assertStatus(403);

        $guru = User::factory()->create();
        $guru->assignRole('guru');
        $this->actingAs($guru)->getJson('/api/v1/users')->assertStatus(403);

        $this->actingAs($this->super)->getJson('/api/v1/users')->assertOk();
    }

    public function test_superadmin_membuat_akun_dengan_password_sementara(): void
    {
        $response = $this->actingAs($this->super)
            ->postJson('/api/v1/users', $this->payload(['username' => 'TU.Baru']))
            ->assertCreated()
            ->assertJsonPath('data.username', 'tu.baru')
            ->assertJsonPath('data.role', 'admin_tu_keuangan')
            ->assertJsonPath('data.must_change_password', true);

        $temporary = $response->json('temporary_password');
        $this->assertNotEmpty($temporary);

        $user = User::where('username', 'tu.baru')->firstOrFail();
        $this->assertTrue(Hash::check($temporary, $user->password));
        $this->assertTrue($user->hasRole('admin_tu_keuangan'));
    }

    public function test_akun_guru_wajib_ditautkan_ke_staf_guru(): void
    {
        $url = '/api/v1/users';

        $this->actingAs($this->super)->postJson($url, $this->payload(['username' => 'guru.a', 'role' => 'guru']))
            ->assertStatus(422)->assertJsonValidationErrors('staff_id');

        $bukanGuru = Staff::create(['name' => 'Bu TU', 'gender' => 'P', 'position' => 'TU', 'employment_status' => 'permanent', 'is_teacher' => false]);
        $this->actingAs($this->super)->postJson($url, $this->payload(['username' => 'guru.a', 'role' => 'guru', 'staff_id' => $bukanGuru->id]))
            ->assertStatus(422)->assertJsonValidationErrors('staff_id');

        $guru = $this->teacher();
        $this->actingAs($this->super)->postJson($url, $this->payload(['username' => 'guru.a', 'role' => 'guru', 'staff_id' => $guru->id]))
            ->assertCreated()->assertJsonPath('data.staff.id', $guru->id);
    }

    public function test_satu_staf_hanya_boleh_punya_satu_akun(): void
    {
        $guru = $this->teacher();
        $payload = $this->payload(['username' => 'guru.a', 'role' => 'guru', 'staff_id' => $guru->id]);

        $this->actingAs($this->super)->postJson('/api/v1/users', $payload)->assertCreated();
        $this->actingAs($this->super)->postJson('/api/v1/users', array_merge($payload, ['username' => 'guru.b']))
            ->assertStatus(422)->assertJsonValidationErrors('staff_id');
    }

    public function test_username_harus_unik_dan_berformat_benar(): void
    {
        $this->actingAs($this->super)->postJson('/api/v1/users', $this->payload(['username' => 'root.admin']))
            ->assertStatus(422)->assertJsonValidationErrors('username');

        $this->actingAs($this->super)->postJson('/api/v1/users', $this->payload(['username' => 'ada spasi']))
            ->assertStatus(422)->assertJsonValidationErrors('username');
    }

    public function test_reset_password_menghasilkan_password_sementara_baru(): void
    {
        $target = User::factory()->create(['username' => 'target', 'password' => 'LamaAman12345', 'must_change_password' => false]);
        $target->assignRole('admin_tu_keuangan');

        $temporary = $this->actingAs($this->super)
            ->postJson("/api/v1/users/{$target->id}/reset-password")
            ->assertOk()->json('temporary_password');

        $target->refresh();
        $this->assertTrue($target->must_change_password);
        $this->assertFalse(Hash::check('LamaAman12345', $target->password));
        $this->assertTrue(Hash::check($temporary, $target->password));
        $this->assertDatabaseHas('audit_logs', ['event' => 'password_reset', 'auditable_id' => $target->id]);
    }

    public function test_nonaktifkan_dan_aktifkan_akun(): void
    {
        $target = User::factory()->create(['username' => 'target', 'password' => 'Rahasia12345']);
        $target->assignRole('admin_tu_keuangan');

        $this->actingAs($this->super)->postJson("/api/v1/users/{$target->id}/deactivate")
            ->assertOk()->assertJsonPath('data.is_active', false);

        $this->postJson('/api/v1/auth/login', ['username' => 'target', 'password' => 'Rahasia12345'])
            ->assertStatus(422);

        $this->actingAs($this->super)->postJson("/api/v1/users/{$target->id}/activate")
            ->assertOk()->assertJsonPath('data.is_active', true);
    }

    public function test_tidak_bisa_menonaktifkan_atau_mengubah_peran_diri_sendiri(): void
    {
        $this->actingAs($this->super)->postJson("/api/v1/users/{$this->super->id}/deactivate")
            ->assertStatus(422);

        $this->actingAs($this->super)->putJson("/api/v1/users/{$this->super->id}", [
            'name' => $this->super->name, 'role' => 'admin_tu_keuangan',
        ])->assertStatus(422)->assertJsonValidationErrors('role');

        $this->assertTrue($this->super->fresh()->hasRole('superadmin'));
    }

    public function test_ubah_data_dan_peran_akun_lain(): void
    {
        $target = User::factory()->create(['username' => 'target']);
        $target->assignRole('admin_tu_keuangan');
        $guru = $this->teacher();

        $this->actingAs($this->super)->putJson("/api/v1/users/{$target->id}", [
            'name' => 'Nama Baru', 'role' => 'guru', 'staff_id' => $guru->id,
        ])->assertOk()->assertJsonPath('data.name', 'Nama Baru')->assertJsonPath('data.role', 'guru');

        $this->assertTrue($target->fresh()->hasRole('guru'));
        $this->assertFalse($target->fresh()->hasRole('admin_tu_keuangan'));
        $this->assertDatabaseHas('audit_logs', ['event' => 'role_changed', 'auditable_id' => $target->id]);
    }

    public function test_daftar_akun_bisa_dicari_dan_difilter(): void
    {
        $a = User::factory()->create(['name' => 'Ahmad Fauzi', 'username' => 'ahmad']);
        $a->assignRole('guru');
        $b = User::factory()->create(['name' => 'Budi Santoso', 'username' => 'budi']);
        $b->assignRole('admin_tu_keuangan');

        $this->actingAs($this->super)->getJson('/api/v1/users?q=ahmad')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.username', 'ahmad');

        $this->actingAs($this->super)->getJson('/api/v1/users?role=admin_tu_keuangan')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.username', 'budi');
    }

    public function test_daftar_peran(): void
    {
        $names = collect($this->actingAs($this->super)->getJson('/api/v1/roles')->assertOk()->json('data'))->pluck('name');

        $this->assertEqualsCanonicalizing(['superadmin', 'admin_tu_keuangan', 'guru'], $names->all());
    }

    public function test_audit_log_tidak_menyimpan_password_dan_hanya_untuk_superadmin(): void
    {
        $this->actingAs($this->super)->postJson('/api/v1/users', $this->payload())->assertCreated();

        $created = AuditLog::where('event', 'created')->where('auditable_type', User::class)
            ->latest('id')->firstOrFail();
        $this->assertArrayHasKey('username', $created->new_values);
        $this->assertArrayNotHasKey('password', $created->new_values);
        $this->assertArrayNotHasKey('remember_token', $created->new_values);

        $this->actingAs($this->super)->getJson('/api/v1/audit-logs?event=created')
            ->assertOk()
            ->assertJsonPath('data.0.event', 'created');

        $tu = User::factory()->create();
        $tu->assignRole('admin_tu_keuangan');
        $this->actingAs($tu)->getJson('/api/v1/audit-logs')->assertStatus(403);
    }
}
