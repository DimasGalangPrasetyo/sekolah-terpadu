<?php

namespace Tests\Feature\Auth;

use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\GradeLevel;
use App\Models\Staff;
use App\Models\Unit;
use App\Models\User;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    private const LOGIN = '/api/v1/auth/login';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CoreSeeder::class);
    }

    private function makeUser(string $role = 'admin_tu_keuangan', array $attrs = []): User
    {
        $user = User::factory()->create(array_merge([
            'username' => 'budi',
            'password' => 'Rahasia12345',
        ], $attrs));
        $user->assignRole($role);

        return $user;
    }

    private function login(string $username = 'budi', string $password = 'Rahasia12345')
    {
        return $this->postJson(self::LOGIN, ['username' => $username, 'password' => $password]);
    }

    public function test_login_berhasil_mengembalikan_profil_dan_permission(): void
    {
        $user = $this->makeUser();

        $response = $this->login()->assertOk()
            ->assertJsonPath('data.username', 'budi')
            ->assertJsonPath('data.roles.0', 'admin_tu_keuangan');

        $this->assertContains('finance.manage', $response->json('data.permissions'));
        $this->assertAuthenticatedAs($user);
        $this->assertDatabaseHas('audit_logs', ['event' => 'login', 'user_id' => $user->id]);
    }

    public function test_username_tidak_peka_huruf_besar_kecil(): void
    {
        $this->makeUser();

        $this->login('BUDI')->assertOk();
    }

    public function test_password_salah_ditolak_dan_dihitung(): void
    {
        $user = $this->makeUser();

        $this->login('budi', 'salah-salah')
            ->assertStatus(422)
            ->assertJsonValidationErrors('username');

        $this->assertSame(1, $user->fresh()->failed_attempts);
        $this->assertGuest();
    }

    public function test_username_tidak_dikenal_memberi_pesan_yang_sama(): void
    {
        $this->makeUser();

        $unknown = $this->login('tidak-ada', 'apa-saja')->assertStatus(422);
        $wrong = $this->login('budi', 'salah-salah')->assertStatus(422);

        $this->assertSame($unknown->json('errors.username'), $wrong->json('errors.username'));
    }

    public function test_akun_terkunci_setelah_lima_kegagalan_dan_terbuka_setelah_15_menit(): void
    {
        $user = $this->makeUser();

        foreach (range(1, 5) as $i) {
            $this->login('budi', 'salah-salah');
        }

        $this->assertNotNull($user->fresh()->locked_until);

        RateLimiter::clear('budi|127.0.0.1');
        $this->login()->assertStatus(423); // password benar pun ditolak saat terkunci

        $this->travel(16)->minutes();
        RateLimiter::clear('budi|127.0.0.1');
        $this->login()->assertOk();
    }

    public function test_throttle_membatasi_percobaan_per_menit(): void
    {
        $this->makeUser();

        foreach (range(1, 5) as $i) {
            $this->login('budi', 'salah-salah');
        }

        $this->login('budi', 'salah-salah')->assertStatus(429);
    }

    public function test_akun_nonaktif_tidak_bisa_masuk(): void
    {
        $this->makeUser('admin_tu_keuangan', ['is_active' => false]);

        $this->login()->assertStatus(422)->assertJsonValidationErrors('username');
        $this->assertGuest();
    }

    public function test_me_butuh_login(): void
    {
        $this->getJson('/api/v1/auth/me')->assertStatus(401);
    }

    public function test_me_untuk_guru_menyertakan_rombel_yang_diwalikan(): void
    {
        $year = AcademicYear::create(['name' => '2026/2027', 'start_date' => '2026-07-13', 'end_date' => '2027-06-26', 'is_active' => true]);
        $unit = Unit::where('code', 'SD')->first();
        $grade = GradeLevel::where('unit_id', $unit->id)->where('code', '1')->first();
        $staff = Staff::create(['name' => 'Bu Guru', 'gender' => 'P', 'position' => 'Guru', 'employment_status' => 'permanent', 'is_teacher' => true]);
        Classroom::create(['unit_id' => $unit->id, 'academic_year_id' => $year->id, 'grade_level_id' => $grade->id, 'name' => '1A', 'homeroom_staff_id' => $staff->id]);

        $guru = $this->makeUser('guru', ['username' => 'bu.guru', 'staff_id' => $staff->id]);

        $this->actingAs($guru)->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.homerooms.0.name', '1A')
            ->assertJsonPath('data.homerooms.0.unit', 'SD');
    }

    public function test_guru_tanpa_penugasan_tidak_punya_rombel(): void
    {
        $guru = $this->makeUser('guru');

        $this->actingAs($guru)->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonCount(0, 'data.homerooms');
    }

    public function test_logout(): void
    {
        $user = $this->makeUser();

        $this->actingAs($user)->postJson('/api/v1/auth/logout')->assertOk();
        $this->assertGuest();
    }

    public function test_password_sementara_memblokir_endpoint_lain_tetapi_bukan_me(): void
    {
        $user = $this->makeUser('superadmin', ['must_change_password' => true]);

        $this->actingAs($user)->getJson('/api/v1/auth/me')->assertOk();
        $this->actingAs($user)->getJson('/api/v1/users')
            ->assertStatus(403)
            ->assertJsonPath('code', 'password_change_required');
    }

    public function test_ganti_password_berhasil(): void
    {
        $user = $this->makeUser('admin_tu_keuangan', ['must_change_password' => true]);

        $this->actingAs($user)->putJson('/api/v1/auth/password', [
            'current_password' => 'Rahasia12345',
            'password' => 'BaruAman98765',
            'password_confirmation' => 'BaruAman98765',
        ])->assertOk()->assertJsonPath('data.must_change_password', false);

        $user->refresh();
        $this->assertFalse($user->must_change_password);
        $this->assertTrue(Hash::check('BaruAman98765', $user->password));
        $this->assertDatabaseHas('audit_logs', ['event' => 'password_changed', 'user_id' => $user->id]);
    }

    public function test_ganti_password_menolak_password_lemah(): void
    {
        $user = $this->makeUser();

        $cases = [
            'terlalu pendek' => 'Pendek1',
            'tanpa angka' => 'HurufSajaPanjang',
            'tanpa huruf' => '12345678901',
            'terlalu umum' => 'sekolah123',
            'sama dengan username' => 'budi',
            'sama dengan password lama' => 'Rahasia12345',
        ];

        foreach ($cases as $label => $password) {
            $response = $this->actingAs($user)->putJson('/api/v1/auth/password', [
                'current_password' => 'Rahasia12345',
                'password' => $password,
                'password_confirmation' => $password,
            ]);

            $this->assertSame(422, $response->status(), "Seharusnya ditolak: {$label}");
        }
    }

    public function test_ganti_password_butuh_password_saat_ini_yang_benar(): void
    {
        $user = $this->makeUser();

        $this->actingAs($user)->putJson('/api/v1/auth/password', [
            'current_password' => 'bukan-password-saya',
            'password' => 'BaruAman98765',
            'password_confirmation' => 'BaruAman98765',
        ])->assertStatus(422)->assertJsonValidationErrors('current_password');
    }
}
