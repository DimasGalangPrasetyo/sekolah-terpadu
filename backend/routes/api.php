<?php

use App\Http\Controllers\Api\V1\AuditLogController;
use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\Master\AcademicYearController;
use App\Http\Controllers\Api\V1\Master\ClassroomController;
use App\Http\Controllers\Api\V1\Master\LookupController;
use App\Http\Controllers\Api\V1\Students\StudentController;
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
            // --- Akun dan sistem (superadmin) ---
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

            // --- Data master: baca ---
            Route::middleware('can:master.view')->group(function () {
                Route::get('units', [LookupController::class, 'units']);
                Route::get('grade-levels', [LookupController::class, 'gradeLevels']);
                Route::get('academic-context', [LookupController::class, 'academicContext']);
                Route::get('academic-years', [AcademicYearController::class, 'index']);
                Route::get('classrooms', [ClassroomController::class, 'index']);
            });

            // --- Data master: kelola ---
            Route::middleware('can:master.manage')->group(function () {
                Route::post('academic-years', [AcademicYearController::class, 'store']);
                Route::put('academic-years/{academicYear}', [AcademicYearController::class, 'update']);
                Route::delete('academic-years/{academicYear}', [AcademicYearController::class, 'destroy']);
                Route::post('academic-years/{academicYear}/activate', [AcademicYearController::class, 'activate']);
                Route::post('semesters/{semester}/activate', [AcademicYearController::class, 'activateSemester']);
                Route::post('classrooms', [ClassroomController::class, 'store']);
                Route::put('classrooms/{classroom}', [ClassroomController::class, 'update']);
                Route::delete('classrooms/{classroom}', [ClassroomController::class, 'destroy']);
                Route::get('teacher-options', [LookupController::class, 'teacherOptions']);
            });

            // --- Siswa ---
            Route::middleware('can:students.view')->group(function () {
                Route::get('students', [StudentController::class, 'index']);
                Route::get('students/{student}', [StudentController::class, 'show']);
            });

            Route::middleware('can:students.manage')->group(function () {
                Route::post('students', [StudentController::class, 'store']);
                Route::put('students/{student}', [StudentController::class, 'update']);
                Route::delete('students/{student}', [StudentController::class, 'destroy']);
                Route::post('students/{student}/status', [StudentController::class, 'changeStatus']);
                Route::put('students/{student}/enrollment', [StudentController::class, 'place']);
            });

            // --- Modul tambahan: setiap berkas di routes/v1/*.php dimuat otomatis di grup ini ---
            // Menambah modul baru cukup membuat berkas baru di sana (tanpa mengubah berkas ini).
            foreach (glob(base_path('routes/v1/*.php')) ?: [] as $moduleRoutes) {
                Route::group([], $moduleRoutes);
            }
        });
    });
});
