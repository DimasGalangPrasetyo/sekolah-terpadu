<?php

namespace Tests\Feature\School;

use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\SchoolFixtures;
use Tests\TestCase;

class SchoolProfileTest extends TestCase
{
    use RefreshDatabase, SchoolFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CoreSeeder::class);
    }

    private function payload(array $override = []): array
    {
        return array_merge([
            'foundation_name' => 'Yayasan Contoh Bangsa',
            'address' => 'Jl. Pendidikan No. 1',
            'phone' => '021-123456',
            'email' => 'info@contoh.sch.id',
            'headmasters' => ['TK' => 'Bu Tika', 'SD' => 'Pak Sandi', 'SMP' => 'Bu Sinta'],
        ], $override);
    }

    public function test_semua_pengguna_masuk_boleh_membaca_profil(): void
    {
        $this->getJson('/api/v1/school-profile')->assertStatus(401);

        $this->actingAs($this->actAs('guru'))->getJson('/api/v1/school-profile')
            ->assertOk()->assertJsonStructure(['data' => ['foundation_name', 'headmasters' => ['TK', 'SD', 'SMP']]]);
    }

    public function test_hanya_superadmin_yang_boleh_mengubah_profil(): void
    {
        $this->actingAs($this->actAs('admin_tu_keuangan'))->putJson('/api/v1/school-profile', $this->payload())->assertStatus(403);
        $this->actingAs($this->actAs('guru'))->putJson('/api/v1/school-profile', $this->payload())->assertStatus(403);

        $this->actingAs($this->actAs('superadmin'))->putJson('/api/v1/school-profile', $this->payload())
            ->assertOk()
            ->assertJsonPath('data.foundation_name', 'Yayasan Contoh Bangsa')
            ->assertJsonPath('data.headmasters.SD', 'Pak Sandi');
    }

    public function test_validasi_profil(): void
    {
        $this->actingAs($this->actAs('superadmin'))->putJson('/api/v1/school-profile', $this->payload(['foundation_name' => '', 'email' => 'bukan-email']))
            ->assertStatus(422)->assertJsonValidationErrors(['foundation_name', 'email']);
    }

    public function test_perubahan_profil_dicatat_di_audit(): void
    {
        $this->actingAs($this->actAs('superadmin'))->putJson('/api/v1/school-profile', $this->payload())->assertOk();

        $this->assertDatabaseHas('audit_logs', ['event' => 'school_profile_updated']);
    }
}
