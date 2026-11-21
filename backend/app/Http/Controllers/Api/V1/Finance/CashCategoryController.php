<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Enums\CashType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\CashCategoryRequest;
use App\Http\Resources\CashCategoryResource;
use App\Models\CashCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

class CashCategoryController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'type' => ['nullable', Rule::enum(CashType::class)],
            'is_active' => ['nullable'],
        ]);

        $query = CashCategory::query()
            ->when($request->query('type'), fn ($q, $type) => $q->where('type', $type))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('type')
            ->orderBy('name');

        return CashCategoryResource::collection($query->get());
    }

    public function store(CashCategoryRequest $request): JsonResponse
    {
        $category = CashCategory::create([
            'name' => $request->validated('name'),
            'type' => $request->validated('type'),
            'is_active' => true,
        ]);

        return (new CashCategoryResource($category))->response()->setStatusCode(201);
    }

    public function update(CashCategoryRequest $request, CashCategory $cashCategory): CashCategoryResource
    {
        $cashCategory->update([
            'name' => $request->validated('name'),
        ]);

        return new CashCategoryResource($cashCategory->fresh());
    }

    public function deactivate(CashCategory $cashCategory): CashCategoryResource
    {
        $cashCategory->update(['is_active' => false]);

        return new CashCategoryResource($cashCategory->fresh());
    }

    public function activate(CashCategory $cashCategory): CashCategoryResource
    {
        $cashCategory->update(['is_active' => true]);

        return new CashCategoryResource($cashCategory->fresh());
    }

    public function destroy(CashCategory $cashCategory): Response
    {
        if ($cashCategory->transactions()->exists()) {
            abort(409, 'Kategori kas tidak dapat dihapus karena sudah memiliki transaksi. Silakan nonaktifkan kategori ini.');
        }

        $cashCategory->delete();

        return response()->noContent();
    }
}
