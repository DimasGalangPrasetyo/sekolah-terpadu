<?php

namespace App\Http\Resources;

use App\Enums\CashType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CashCategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'type' => $this->type instanceof CashType ? $this->type->value : (string) $this->type,
            'is_active' => (bool) $this->is_active,
        ];
    }
}
