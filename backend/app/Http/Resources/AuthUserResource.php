<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Profil pengguna yang sedang login (untuk frontend: menu, izin, kelas yang diwalikan). */
class AuthUserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'username' => $this->username,
            'email' => $this->email,
            'staff_id' => $this->staff_id,
            'is_active' => $this->is_active,
            'must_change_password' => $this->must_change_password,
            'roles' => $this->getRoleNames()->values(),
            'permissions' => $this->getAllPermissions()->pluck('name')->sort()->values(),
            'homerooms' => $this->activeHomeroomClassrooms()->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'unit' => $c->unit->code,
            ])->values(),
        ];
    }
}
