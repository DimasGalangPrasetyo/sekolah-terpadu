<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AssetResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'asset_category_id' => $this->asset_category_id,
            'unit_id' => $this->unit_id,
            'location_id' => $this->location_id,
            'quantity' => (int) $this->quantity,
            'unit_label' => $this->unit_label,
            'acquisition_date' => $this->acquisition_date?->toDateString(),
            'acquisition_source' => $this->acquisition_source,
            'acquisition_cost' => $this->acquisition_cost !== null ? (int) $this->acquisition_cost : null,
            'item_condition' => $this->item_condition?->value ?? $this->item_condition,
            'responsible_staff_id' => $this->responsible_staff_id,
            'photo_path' => $this->photo_path,
            'status' => $this->status?->value ?? $this->status,
            'notes' => $this->notes,
            'category' => $this->assetCategory ? [
                'id' => $this->assetCategory->id,
                'code' => $this->assetCategory->code,
                'name' => $this->assetCategory->name,
            ] : null,
            'unit' => $this->unit ? [
                'id' => $this->unit->id,
                'code' => $this->unit->code,
                'name' => $this->unit->name,
            ] : null,
            'location' => $this->location ? [
                'id' => $this->location->id,
                'name' => $this->location->name,
                'unit_id' => $this->location->unit_id,
            ] : null,
            'responsible_staff' => $this->responsibleStaff ? [
                'id' => $this->responsibleStaff->id,
                'name' => $this->responsibleStaff->name,
                'nip' => $this->responsibleStaff->nip,
            ] : null,
            'movements' => $this->relationLoaded('movements')
                ? AssetMovementResource::collection($this->movements)
                : null,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
