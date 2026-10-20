<?php

use App\Http\Controllers\Api\V1\Inventory\AssetCategoryController;
use App\Http\Controllers\Api\V1\Inventory\AssetController;
use App\Http\Controllers\Api\V1\Inventory\LocationController;
use Illuminate\Support\Facades\Route;

Route::middleware('can:inventory.view')->group(function () {
    Route::get('asset-categories', [AssetCategoryController::class, 'index']);

    Route::get('locations', [LocationController::class, 'index']);

    Route::get('assets', [AssetController::class, 'index']);
    Route::get('assets/{asset}', [AssetController::class, 'show']);
    Route::get('assets/{asset}/movements', [AssetController::class, 'movements']);
});

Route::middleware('can:inventory.manage')->group(function () {
    Route::post('asset-categories', [AssetCategoryController::class, 'store']);
    Route::put('asset-categories/{assetCategory}', [AssetCategoryController::class, 'update']);
    Route::delete('asset-categories/{assetCategory}', [AssetCategoryController::class, 'destroy']);

    Route::post('locations', [LocationController::class, 'store']);
    Route::put('locations/{location}', [LocationController::class, 'update']);
    Route::delete('locations/{location}', [LocationController::class, 'destroy']);

    Route::post('assets', [AssetController::class, 'store']);
    Route::put('assets/{asset}', [AssetController::class, 'update']);
    Route::delete('assets/{asset}', [AssetController::class, 'destroy']);

    Route::post('assets/{asset}/movements', [AssetController::class, 'storeMovement']);
});
