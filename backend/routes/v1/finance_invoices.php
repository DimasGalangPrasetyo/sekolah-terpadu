<?php

use App\Http\Controllers\Api\V1\Finance\InvoiceController;
use Illuminate\Support\Facades\Route;

// Baca (finance.view)
Route::middleware('can:finance.view')->group(function () {
    Route::get('invoices', [InvoiceController::class, 'index']);
    Route::get('invoices/{invoice}', [InvoiceController::class, 'show']);
});

// Tulis (finance.manage)
Route::middleware('can:finance.manage')->group(function () {
    Route::post('invoices/generate', [InvoiceController::class, 'generate']);
    Route::post('invoices', [InvoiceController::class, 'store']);
    Route::post('invoices/{invoice}/void', [InvoiceController::class, 'void']);
});
