<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

class AuthService
{
    public const MAX_ATTEMPTS = 5;

    public const LOCK_MINUTES = 15;

    private const GENERIC_ERROR = 'Username atau password salah.';

    /**
     * Login dengan username. Perlindungan: throttle 5/menit per (username+IP),
     * kunci akun 15 menit setelah 5 kegagalan, pesan galat sama untuk username tak dikenal.
     */
    public function attempt(string $username, string $password, Request $request): User
    {
        $username = Str::lower(trim($username));
        $key = $username.'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($key, self::MAX_ATTEMPTS)) {
            AuditLogger::log('login_throttled', null, null, ['username' => $username]);

            throw new TooManyRequestsHttpException(
                RateLimiter::availableIn($key),
                'Terlalu banyak percobaan masuk. Coba lagi beberapa saat lagi.',
            );
        }

        $user = User::where('username', $username)->first();

        if ($user && $user->locked_until && $user->locked_until->isFuture()) {
            RateLimiter::hit($key, 60);
            $minutes = max(1, (int) ceil(($user->locked_until->timestamp - now()->timestamp) / 60));

            throw new HttpException(423, "Akun dikunci sementara. Coba lagi dalam {$minutes} menit.");
        }

        // Selalu lakukan satu verifikasi hash agar waktu respons tidak membocorkan username.
        $valid = Hash::check($password, $user?->password ?? $this->dummyHash()) && $user !== null;

        if (! $valid) {
            RateLimiter::hit($key, 60);

            if ($user) {
                $user->increment('failed_attempts');

                if ($user->failed_attempts >= self::MAX_ATTEMPTS) {
                    $user->forceFill([
                        'failed_attempts' => 0,
                        'locked_until' => now()->addMinutes(self::LOCK_MINUTES),
                    ])->saveQuietly();
                    AuditLogger::log('account_locked', $user, null, ['minutes' => self::LOCK_MINUTES]);
                }
            }

            AuditLogger::log('login_failed', $user, null, ['username' => $username]);

            throw ValidationException::withMessages(['username' => [self::GENERIC_ERROR]]);
        }

        if (! $user->is_active) {
            AuditLogger::log('login_inactive', $user, null, null, $user->id);

            throw ValidationException::withMessages([
                'username' => ['Akun tidak aktif. Hubungi pengelola sistem.'],
            ]);
        }

        RateLimiter::clear($key);

        $user->forceFill([
            'failed_attempts' => 0,
            'locked_until' => null,
            'last_login_at' => now(),
        ])->saveQuietly();

        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        AuditLogger::log('login', $user, null, null, $user->id);

        return $user;
    }

    private function dummyHash(): string
    {
        static $hash = null;

        return $hash ??= Hash::make(Str::random(32));
    }
}
