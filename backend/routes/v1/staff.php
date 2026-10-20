<?php

use App\Http\Controllers\Api\V1\Staff\StaffController;
use Illuminate\Support\Facades\Route;

Route::middleware('can:staff.view')->group(function () {
    Route::get('staff', [StaffController::class, 'index']);
    Route::get('staff/{staff}', [StaffController::class, 'show']);
});

Route::middleware('can:staff.manage')->group(function () {
    Route::post('staff', [StaffController::class, 'store']);
    Route::put('staff/{staff}', [StaffController::class, 'update']);
    Route::post('staff/{staff}/deactivate', [StaffController::class, 'deactivate']);
    Route::post('staff/{staff}/activate', [StaffController::class, 'activate']);
    Route::delete('staff/{staff}', [StaffController::class, 'destroy']);
});
