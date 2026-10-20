<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AssetMovementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'asset_id' => $this->asset_id,
            'type' => $this->type?->value ?? $this->type,
            'from_location_id' => $this->from_location_id,
            'to_location_id' => $this->to_location_id,
            'from_condition' => $this->from_condition?->value ?? $this->from_condition,
            'to_condition' => $this->to_condition?->value ?? $this->to_condition,
            'moved_at' => $this->moved_at?->toDateString(),
            'notes' => $this->notes,
            'created_by' => $this->created_by,
            'from_location' => $this->fromLocation ? [
                'id' => $this->fromLocation->id,
                'name' => $this->fromLocation->name,
            ] : null,
            'to_location' => $this->toLocation ? [
                'id' => $this->toLocation->id,
                'name' => $this->toLocation->name,
            ] : null,
            'creator' => $this->creator ? [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
                'username' => $this->creator->username,
            ] : null,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
