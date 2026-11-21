<?php

use App\Http\Controllers\Api\V1\Finance\CashCategoryController;
use App\Http\Controllers\Api\V1\Finance\CashTransactionController;
use Illuminate\Support\Facades\Route;

// Baca (finance.view)
Route::middleware('can:finance.view')->group(function () {
    // Kategori Kas
    Route::get('cash-categories', [CashCategoryController::class, 'index']);

    // Transaksi Kas
    Route::get('cash-transactions', [CashTransactionController::class, 'index']);
    Route::get('cash-transactions/summary', [CashTransactionController::class, 'summary']);
    Route::get('cash-transactions/{cashTransaction}', [CashTransactionController::class, 'show']);
});

// Tulis (finance.manage)
Route::middleware('can:finance.manage')->group(function () {
    // Kategori Kas
    Route::post('cash-categories', [CashCategoryController::class, 'store']);
    Route::put('cash-categories/{cashCategory}', [CashCategoryController::class, 'update']);
    Route::post('cash-categories/{cashCategory}/deactivate', [CashCategoryController::class, 'deactivate']);
    Route::post('cash-categories/{cashCategory}/activate', [CashCategoryController::class, 'activate']);
    Route::delete('cash-categories/{cashCategory}', [CashCategoryController::class, 'destroy']);

    // Transaksi Kas
    Route::post('cash-transactions', [CashTransactionController::class, 'store']);
    Route::post('cash-transactions/{cashTransaction}/void', [CashTransactionController::class, 'void']);
});
