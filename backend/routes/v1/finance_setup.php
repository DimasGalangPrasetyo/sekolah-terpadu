<?php

use App\Http\Controllers\Api\V1\Finance\FeeRateController;
use App\Http\Controllers\Api\V1\Finance\FeeTypeController;
use App\Http\Controllers\Api\V1\Finance\StudentDiscountController;
use Illuminate\Support\Facades\Route;

// Baca (finance.view)
Route::middleware('can:finance.view')->group(function () {
    Route::get('fee-types', [FeeTypeController::class, 'index']);
    Route::get('fee-rates', [FeeRateController::class, 'index']);
    Route::get('student-discounts', [StudentDiscountController::class, 'index']);
});

// Tulis (finance.manage)
Route::middleware('can:finance.manage')->group(function () {
    // Jenis Biaya
    Route::post('fee-types', [FeeTypeController::class, 'store']);
    Route::put('fee-types/{feeType}', [FeeTypeController::class, 'update']);
    Route::post('fee-types/{feeType}/deactivate', [FeeTypeController::class, 'deactivate']);
    Route::post('fee-types/{feeType}/activate', [FeeTypeController::class, 'activate']);
    Route::delete('fee-types/{feeType}', [FeeTypeController::class, 'destroy']);

    // Tarif
    Route::post('fee-rates', [FeeRateController::class, 'store']);
    Route::put('fee-rates/{feeRate}', [FeeRateController::class, 'update']);
    Route::delete('fee-rates/{feeRate}', [FeeRateController::class, 'destroy']);

    // Diskon Siswa
    Route::post('student-discounts', [StudentDiscountController::class, 'store']);
    Route::put('student-discounts/{studentDiscount}', [StudentDiscountController::class, 'update']);
    Route::post('student-discounts/{studentDiscount}/deactivate', [StudentDiscountController::class, 'deactivate']);
    Route::post('student-discounts/{studentDiscount}/activate', [StudentDiscountController::class, 'activate']);
});
