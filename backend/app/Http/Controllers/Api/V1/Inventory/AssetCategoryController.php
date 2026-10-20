<?php

namespace App\Http\Controllers\Api\V1\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\AssetCategoryRequest;
use App\Models\AssetCategory;
use App\Services\AssetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class AssetCategoryController extends Controller
{
    public function __construct(private readonly AssetService $assetService) {}

    public function index(): JsonResponse
    {
        $categories = $this->assetService->listCategories();

        return response()->json(['data' => $categories]);
    }

    public function store(AssetCategoryRequest $request): JsonResponse
    {
        $category = $this->assetService->createCategory($request->validated());

        return response()->json(['data' => $category], 201);
    }

    public function update(AssetCategoryRequest $request, AssetCategory $assetCategory): JsonResponse
    {
        $updated = $this->assetService->updateCategory($assetCategory, $request->validated());

        return response()->json(['data' => $updated]);
    }

    public function destroy(AssetCategory $assetCategory): Response
    {
        $this->assetService->deleteCategory($assetCategory);

        return response()->noContent();
    }
}
