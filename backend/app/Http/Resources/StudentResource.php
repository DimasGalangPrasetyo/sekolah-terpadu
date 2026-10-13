<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StudentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $enrollment = $this->relationLoaded('enrollments') ? $this->enrollments->first() : null;
        $classroom = $enrollment?->classroom;

        return [
            'id' => $this->id,
            'nis' => $this->nis,
            'nisn' => $this->nisn,
            'name' => $this->name,
            'gender' => $this->gender->value,
            'birth_place' => $this->birth_place,
            'birth_date' => $this->birth_date?->toDateString(),
            'religion' => $this->religion,
            'address' => $this->address,
            'phone' => $this->phone,
            'previous_school' => $this->previous_school,
            'entry_date' => $this->entry_date?->toDateString(),
            'status' => $this->status->value,
            'notes' => $this->notes,
            'classroom' => $classroom ? [
                'id' => $classroom->id,
                'name' => $classroom->name,
                'unit' => $classroom->unit->code,
            ] : null,
            'guardians' => $this->whenLoaded('guardians', fn () => $this->guardians->map(fn ($g) => [
                'id' => $g->id,
                'relation' => $g->relation->value,
                'name' => $g->name,
                'occupation' => $g->occupation,
                'phone' => $g->phone,
                'address' => $g->address,
                'is_primary_contact' => $g->is_primary_contact,
            ])->values()),
            'status_logs' => $this->whenLoaded('statusLogs', fn () => $this->statusLogs->map(fn ($l) => [
                'id' => $l->id,
                'from_status' => $l->from_status?->value,
                'to_status' => $l->to_status->value,
                'effective_date' => $l->effective_date->toDateString(),
                'reason' => $l->reason,
                'destination_school' => $l->destination_school,
                'document_number' => $l->document_number,
                'created_by' => $l->creator?->name,
            ])->values()),
        ];
    }
}
