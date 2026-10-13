<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AcademicYearResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'start_date' => $this->start_date->toDateString(),
            'end_date' => $this->end_date->toDateString(),
            'is_active' => $this->is_active,
            'classrooms_count' => $this->whenCounted('classrooms'),
            'semesters' => $this->whenLoaded('semesters', fn () => $this->semesters->sortBy('start_date')->values()->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->name->value,
                'start_date' => $s->start_date->toDateString(),
                'end_date' => $s->end_date->toDateString(),
                'is_active' => $s->is_active,
            ])),
        ];
    }
}
