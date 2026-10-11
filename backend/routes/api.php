<?php

use App\Http\Controllers\Api\V1\AuditLogController;
use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\Users\StaffOptionController;
use App\Http\Controllers\Api\V1\Users\UserController;
use App\Http\Middleware\EnsurePasswordChanged;
use App\Http\Middleware\ForceJson;
use Illuminate\Support\Facades\Route;

/*
| Semua endpoint v1 (prefix /api otomatis dari bootstrap).
| Autentikasi memakai sesi cookie (guard "web") lewat grup middleware "web":
| cookie terenkripsi, sesi, dan perlindungan CSRF. SPA memanggil GET /sanctum/csrf-cookie lebih dulu.
*/
Route::prefix('v1')->middleware([ForceJson::class, 'web'])->group(function () {
    Route::post('auth/login', [AuthController::class, 'login']);

    Route::middleware(['auth:web', 'throttle:120,1'])->group(function () {
        // Boleh diakses walau password masih sementara:
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::put('auth/password', [AuthController::class, 'changePassword']);

        // Semua yang lain menunggu password sementara diganti:
        Route::middleware(EnsurePasswordChanged::class)->group(function () {
            Route::middleware('can:users.manage')->group(function () {
                Route::get('roles', [UserController::class, 'roles']);
                Route::get('staff-options', [StaffOptionController::class, 'index']);
                Route::get('users', [UserController::class, 'index']);
                Route::post('users', [UserController::class, 'store']);
                Route::get('users/{user}', [UserController::class, 'show']);
                Route::put('users/{user}', [UserController::class, 'update']);
                Route::post('users/{user}/reset-password', [UserController::class, 'resetPassword']);
                Route::post('users/{user}/deactivate', [UserController::class, 'deactivate']);
                Route::post('users/{user}/activate', [UserController::class, 'activate']);
            });

            Route::get('audit-logs', [AuditLogController::class, 'index'])->middleware('can:audit.view');
        });
    });
});
