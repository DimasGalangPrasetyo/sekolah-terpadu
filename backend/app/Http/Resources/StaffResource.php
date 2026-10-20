<?php

namespace App\Http\Resources;

use App\Services\AcademicContext;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StaffResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $assignments = $this->relationLoaded('unitAssignments')
            ? $this->unitAssignments
            : $this->unitAssignments()->with('unit')->get();

        $activeYearId = app(AcademicContext::class)->year()?->id;

        $homerooms = $this->relationLoaded('homeroomClassrooms')
            ? $this->homeroomClassrooms
            : $this->homeroomClassrooms()->where('academic_year_id', $activeYearId)->with('unit')->get();

        $user = $this->relationLoaded('user') ? $this->user : $this->user()->first();

        return [
            'id' => $this->id,
            'nip' => $this->nip,
            'nuptk' => $this->nuptk,
            'name' => $this->name,
            'gender' => $this->gender?->value ?? $this->gender,
            'birth_place' => $this->birth_place,
            'birth_date' => $this->birth_date?->toDateString(),
            'phone' => $this->phone,
            'email' => $this->email,
            'address' => $this->address,
            'position' => $this->position,
            'employment_status' => $this->employment_status?->value ?? $this->employment_status,
            'join_date' => $this->join_date?->toDateString(),
            'education' => $this->education,
            'is_teacher' => (bool) $this->is_teacher,
            'is_active' => (bool) $this->is_active,
            'photo_path' => $this->photo_path,
            'assignments' => $assignments->map(fn ($a) => [
                'id' => $a->id,
                'unit_id' => $a->unit_id,
                'role_title' => $a->role_title,
                'start_date' => $a->start_date?->toDateString(),
                'end_date' => $a->end_date?->toDateString(),
                'unit' => $a->unit ? [
                    'id' => $a->unit->id,
                    'code' => $a->unit->code,
                ] : null,
            ])->values(),
            'has_account' => $user !== null,
            'account_username' => $user?->username,
            'homerooms' => $homerooms->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'unit' => $c->unit?->code,
            ])->values(),
        ];
    }
}
