<?php

namespace App\Models;

use App\Enums\GuardianRelation;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Guardian extends Model
{
    protected $fillable = [
        'student_id',
        'relation',
        'name',
        'occupation',
        'phone',
        'address',
        'is_primary_contact',
    ];

    protected function casts(): array
    {
        return [
            'relation' => GuardianRelation::class,
            'is_primary_contact' => 'boolean',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'student_id');
    }
}
