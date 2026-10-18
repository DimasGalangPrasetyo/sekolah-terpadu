<?php

use App\Http\Controllers\Api\V1\ReportCards\ReportCardController;
use Illuminate\Support\Facades\Route;

// Dimuat otomatis di dalam grup terautentikasi (lihat routes/api.php). Izin diperiksa di controller/policy.
Route::get('report-cards/classrooms', [ReportCardController::class, 'classrooms']);
Route::get('report-cards/batch', [ReportCardController::class, 'batch']);
Route::get('report-cards', [ReportCardController::class, 'index']);
Route::post('report-cards', [ReportCardController::class, 'open']);
Route::get('report-cards/{reportCard}', [ReportCardController::class, 'show']);
Route::put('report-cards/{reportCard}', [ReportCardController::class, 'update']);
Route::post('report-cards/{reportCard}/finalize', [ReportCardController::class, 'finalize']);
Route::post('report-cards/{reportCard}/unlock', [ReportCardController::class, 'unlock']);
Route::post('report-cards/{reportCard}/printed', [ReportCardController::class, 'printed']);
