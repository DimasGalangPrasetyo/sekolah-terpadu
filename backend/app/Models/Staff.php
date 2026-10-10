<?php

namespace App\Models;

use App\Enums\EmploymentStatus;
use App\Enums\Gender;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Staff extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'nip',
        'nuptk',
        'name',
        'gender',
        'birth_place',
        'birth_date',
        'phone',
        'email',
        'address',
        'position',
        'employment_status',
        'join_date',
        'education',
        'is_teacher',
        'is_active',
        'photo_path',
    ];

    protected function casts(): array
    {
        return [
            'gender' => Gender::class,
            'birth_date' => 'date',
            'employment_status' => EmploymentStatus::class,
            'join_date' => 'date',
            'is_teacher' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function unitAssignments(): HasMany
    {
        return $this->hasMany(StaffUnitAssignment::class, 'staff_id');
    }

    public function homeroomClassrooms(): HasMany
    {
        return $this->hasMany(Classroom::class, 'homeroom_staff_id');
    }

    public function user(): HasOne
    {
        return $this->hasOne(User::class, 'staff_id');
    }
}
