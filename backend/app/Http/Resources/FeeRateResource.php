<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FeeRateResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'amount' => $this->amount,
            'fee_type' => $this->whenLoaded('feeType', fn () => [
                'id' => $this->feeType->id,
                'code' => $this->feeType->code,
                'name' => $this->feeType->name,
                'category' => $this->feeType->category->value,
                'is_active' => $this->feeType->is_active,
            ]),
            'unit' => $this->whenLoaded('unit', fn () => [
                'id' => $this->unit->id,
                'code' => $this->unit->code,
                'name' => $this->unit->name,
            ]),
            'grade_level' => $this->whenLoaded('gradeLevel', fn () => $this->gradeLevel ? [
                'id' => $this->gradeLevel->id,
                'code' => $this->gradeLevel->code,
                'name' => $this->gradeLevel->name,
            ] : null),
            'academic_year' => $this->whenLoaded('academicYear', fn () => [
                'id' => $this->academicYear->id,
                'name' => $this->academicYear->name,
            ]),
        ];
    }
}
