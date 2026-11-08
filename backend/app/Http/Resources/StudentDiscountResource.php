<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StudentDiscountResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type->value,
            'value' => $this->value,
            'reason' => $this->reason,
            'is_active' => $this->is_active,
            'student' => $this->whenLoaded('student', fn () => [
                'id' => $this->student->id,
                'name' => $this->student->name,
                'nis' => $this->student->nis,
            ]),
            'fee_type' => $this->whenLoaded('feeType', fn () => $this->feeType ? [
                'id' => $this->feeType->id,
                'code' => $this->feeType->code,
                'name' => $this->feeType->name,
            ] : null),
            'academic_year' => $this->whenLoaded('academicYear', fn () => [
                'id' => $this->academicYear->id,
                'name' => $this->academicYear->name,
            ]),
        ];
    }
}
