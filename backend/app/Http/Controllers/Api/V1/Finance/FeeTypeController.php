<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\FeeTypeRequest;
use App\Http\Resources\FeeTypeResource;
use App\Models\FeeType;
use App\Models\InvoiceItem;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class FeeTypeController extends Controller
{
    public function index(Request $request)
    {
        $query = FeeType::orderBy('name');

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        return FeeTypeResource::collection($query->get());
    }

    public function store(FeeTypeRequest $request): FeeTypeResource
    {
        $feeType = FeeType::create(array_merge($request->validated(), ['is_active' => true]));

        return new FeeTypeResource($feeType);
    }

    public function update(FeeTypeRequest $request, FeeType $feeType): FeeTypeResource
    {
        $feeType->update($request->validated());

        return new FeeTypeResource($feeType->fresh());
    }

    public function deactivate(FeeType $feeType): FeeTypeResource
    {
        $feeType->update(['is_active' => false]);

        return new FeeTypeResource($feeType->fresh());
    }

    public function activate(FeeType $feeType): FeeTypeResource
    {
        $feeType->update(['is_active' => true]);

        return new FeeTypeResource($feeType->fresh());
    }

    public function destroy(FeeType $feeType): Response
    {
        $dipakai = $feeType->rates()->exists()
            || $feeType->discounts()->exists()
            || InvoiceItem::where('fee_type_id', $feeType->id)->exists();

        if ($dipakai) {
            abort(409, 'Jenis biaya ini sudah dipakai di data tarif, diskon, atau tagihan. Sebaiknya nonaktifkan saja daripada menghapus.');
        }

        $feeType->delete();

        return response()->noContent();
    }
}
