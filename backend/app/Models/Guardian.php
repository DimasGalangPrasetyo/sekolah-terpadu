<?php

namespace App\Models;

use App\Enums\GuardianRelation;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Guardian extends Model
{
    use Auditable;

    /** Data pribadi tidak disalin ke audit log. */
    protected array $auditExclude = ['address', 'phone'];

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
