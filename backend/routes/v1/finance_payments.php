<?php

use App\Http\Controllers\Api\V1\Finance\PaymentController;
use Illuminate\Support\Facades\Route;

// Baca (finance.view)
Route::middleware('can:finance.view')->group(function () {
    Route::get('payments', [PaymentController::class, 'index']);
    Route::get('payments/open-invoices', [PaymentController::class, 'openInvoices']);
    Route::get('payments/{payment}', [PaymentController::class, 'show']);
    Route::get('payments/{payment}/receipt', [PaymentController::class, 'receipt']);
});

// Tulis (finance.manage)
Route::middleware('can:finance.manage')->group(function () {
    Route::post('payments', [PaymentController::class, 'store']);
    Route::post('payments/{payment}/void', [PaymentController::class, 'void']);
});
