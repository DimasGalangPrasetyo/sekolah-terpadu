<?php

use App\Http\Controllers\Api\V1\Reports\FinanceReportController;
use Illuminate\Support\Facades\Route;

// Laporan keuangan (hanya baca; reports.view: superadmin dan admin TU & keuangan)
Route::middleware('can:reports.view')->prefix('reports/finance')->group(function () {
    Route::get('summary', [FinanceReportController::class, 'summary']);
    Route::get('arrears', [FinanceReportController::class, 'arrears']);
    Route::get('cash-book', [FinanceReportController::class, 'cashBook']);
    Route::get('daily-payments', [FinanceReportController::class, 'dailyPayments']);
});
