<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClassroomResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'academic_year_id' => $this->academic_year_id,
            'unit' => ['id' => $this->unit->id, 'code' => $this->unit->code],
            'grade_level' => ['id' => $this->gradeLevel->id, 'code' => $this->gradeLevel->code, 'name' => $this->gradeLevel->name],
            'homeroom' => $this->homeroomStaff ? ['id' => $this->homeroomStaff->id, 'name' => $this->homeroomStaff->name] : null,
            'capacity' => $this->capacity,
            'students_count' => $this->whenCounted('enrollments'),
        ];
    }
}
