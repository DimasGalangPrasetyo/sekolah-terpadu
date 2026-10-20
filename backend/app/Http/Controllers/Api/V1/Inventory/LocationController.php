<?php

namespace App\Http\Controllers\Api\V1\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\LocationRequest;
use App\Models\Location;
use App\Services\AssetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class LocationController extends Controller
{
    public function __construct(private readonly AssetService $assetService) {}

    public function index(Request $request): JsonResponse
    {
        $locations = $this->assetService->listLocations($request->query());

        return response()->json(['data' => $locations]);
    }

    public function store(LocationRequest $request): JsonResponse
    {
        $location = $this->assetService->createLocation($request->validated());

        return response()->json(['data' => $location], 201);
    }

    public function update(LocationRequest $request, Location $location): JsonResponse
    {
        $updated = $this->assetService->updateLocation($location, $request->validated());

        return response()->json(['data' => $updated]);
    }

    public function destroy(Location $location): Response
    {
        $this->assetService->deleteLocation($location);

        return response()->noContent();
    }
}
