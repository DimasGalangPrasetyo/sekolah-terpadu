<?php

namespace App\Http\Resources;

use App\Enums\CashType;
use App\Enums\RecordStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CashTransactionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'number' => $this->number,
            'transaction_date' => $this->transaction_date?->toDateString(),
            'type' => $this->type instanceof CashType ? $this->type->value : (string) $this->type,
            'amount' => (int) $this->amount,
            'description' => $this->description,
            'status' => $this->status instanceof RecordStatus ? $this->status->value : (string) $this->status,
            'voided_at' => $this->voided_at?->toIso8601String(),
            'void_reason' => $this->void_reason,
            'created_at' => $this->created_at?->toIso8601String(),
            'category' => $this->whenLoaded('cashCategory', fn () => $this->cashCategory ? [
                'id' => $this->cashCategory->id,
                'name' => $this->cashCategory->name,
                'type' => $this->cashCategory->type instanceof CashType ? $this->cashCategory->type->value : (string) $this->cashCategory->type,
            ] : null),
            'unit' => $this->whenLoaded('unit', fn () => $this->unit ? [
                'id' => $this->unit->id,
                'code' => $this->unit->code,
                'name' => $this->unit->name,
            ] : null),
            'created_by' => $this->whenLoaded('creator', fn () => $this->creator ? [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ] : null),
            'voided_by' => $this->whenLoaded('voider', fn () => $this->voider ? [
                'id' => $this->voider->id,
                'name' => $this->voider->name,
            ] : null),
        ];
    }
}
