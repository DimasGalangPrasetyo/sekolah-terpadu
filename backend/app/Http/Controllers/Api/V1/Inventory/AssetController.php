<?php

namespace App\Http\Controllers\Api\V1\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\AssetMovementRequest;
use App\Http\Requests\Inventory\AssetRequest;
use App\Http\Resources\AssetMovementResource;
use App\Http\Resources\AssetResource;
use App\Models\Asset;
use App\Services\AssetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class AssetController extends Controller
{
    public function __construct(private readonly AssetService $assetService) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $assets = $this->assetService->list($request->query());

        return AssetResource::collection($assets);
    }

    public function show(Asset $asset): AssetResource
    {
        return new AssetResource($this->assetService->loadRelations($asset));
    }

    public function store(AssetRequest $request): JsonResponse
    {
        $asset = $this->assetService->create($request->validated());

        return (new AssetResource($asset))
            ->response()
            ->setStatusCode(201);
    }

    public function update(AssetRequest $request, Asset $asset): AssetResource
    {
        $updated = $this->assetService->update($asset, $request->validated());

        return new AssetResource($updated);
    }

    public function destroy(Asset $asset): Response
    {
        $this->assetService->delete($asset);

        return response()->noContent();
    }

    public function movements(Asset $asset): AnonymousResourceCollection
    {
        $movements = $asset->movements()
            ->with(['fromLocation', 'toLocation', 'creator'])
            ->orderByDesc('moved_at')
            ->orderByDesc('id')
            ->get();

        return AssetMovementResource::collection($movements);
    }

    public function storeMovement(AssetMovementRequest $request, Asset $asset): JsonResponse
    {
        $userId = (int) $request->user()->id;
        $movement = $this->assetService->storeMovement($asset, $request->validated(), $userId);

        return (new AssetMovementResource($movement))
            ->response()
            ->setStatusCode(201);
    }
}
