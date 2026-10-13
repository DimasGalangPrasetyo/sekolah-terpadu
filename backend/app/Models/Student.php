<?php

namespace App\Models;

use App\Enums\Gender;
use App\Enums\StudentStatus;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Student extends Model
{
    use Auditable, SoftDeletes;

    /** Data pribadi tidak disalin ke audit log. */
    protected array $auditExclude = ['address', 'phone', 'notes', 'photo_path'];

    protected $fillable = [
        'nis',
        'nisn',
        'name',
        'gender',
        'birth_place',
        'birth_date',
        'religion',
        'address',
        'phone',
        'previous_school',
        'entry_date',
        'status',
        'photo_path',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'gender' => Gender::class,
            'birth_date' => 'date',
            'entry_date' => 'date',
            'status' => StudentStatus::class,
        ];
    }

    public function guardians(): HasMany
    {
        return $this->hasMany(Guardian::class, 'student_id');
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(StudentEnrollment::class, 'student_id');
    }

    public function statusLogs(): HasMany
    {
        return $this->hasMany(StudentStatusLog::class, 'student_id');
    }

    public function reportCards(): HasMany
    {
        return $this->hasMany(ReportCard::class, 'student_id');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class, 'student_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class, 'student_id');
    }

    public function discounts(): HasMany
    {
        return $this->hasMany(StudentDiscount::class, 'student_id');
    }
}
