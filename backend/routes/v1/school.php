<?php

use App\Http\Controllers\Api\V1\School\SchoolProfileController;
use Illuminate\Support\Facades\Route;

Route::get('school-profile', [SchoolProfileController::class, 'show']);
Route::put('school-profile', [SchoolProfileController::class, 'update'])->middleware('can:system.manage');
