<?php

namespace App\Http\Controllers\Api\V1\Staff;

use App\Http\Controllers\Controller;
use App\Http\Requests\Staff\StaffRequest;
use App\Http\Resources\StaffResource;
use App\Models\Staff;
use App\Services\StaffService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class StaffController extends Controller
{
    public function __construct(private readonly StaffService $staffService) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $staff = $this->staffService->list($request->query());

        return StaffResource::collection($staff);
    }

    public function show(Staff $staff): StaffResource
    {
        return new StaffResource($this->staffService->loadRelations($staff));
    }

    public function store(StaffRequest $request): JsonResponse
    {
        $staff = $this->staffService->create($request->validated());

        return (new StaffResource($staff))
            ->response()
            ->setStatusCode(201);
    }

    public function update(StaffRequest $request, Staff $staff): StaffResource
    {
        $updated = $this->staffService->update($staff, $request->validated());

        return new StaffResource($updated);
    }

    public function deactivate(Staff $staff): StaffResource
    {
        $deactivated = $this->staffService->deactivate($staff);

        return new StaffResource($deactivated);
    }

    public function activate(Staff $staff): StaffResource
    {
        $activated = $this->staffService->activate($staff);

        return new StaffResource($activated);
    }

    public function destroy(Staff $staff): Response
    {
        $this->staffService->delete($staff);

        return response()->noContent();
    }
}
