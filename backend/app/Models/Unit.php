<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Unit extends Model
{
    protected $fillable = [
        'code',
        'name',
        'has_report_card',
        'npsn',
        'head_staff_id',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'has_report_card' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function headStaff(): BelongsTo
    {
        return $this->belongsTo(Staff::class, 'head_staff_id');
    }

    public function gradeLevels(): HasMany
    {
        return $this->hasMany(GradeLevel::class, 'unit_id');
    }

    public function classrooms(): HasMany
    {
        return $this->hasMany(Classroom::class, 'unit_id');
    }

    public function staffAssignments(): HasMany
    {
        return $this->hasMany(StaffUnitAssignment::class, 'unit_id');
    }
}
