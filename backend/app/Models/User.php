<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use Auditable, HasApiTokens, HasFactory, HasRoles, SoftDeletes;

    /** Kolom yang tidak dicatat di audit log (terlalu berisik). */
    protected array $auditExclude = ['failed_attempts', 'last_login_at', 'locked_until'];

    protected $fillable = [
        'staff_id',
        'name',
        'username',
        'email',
        'password',
        'is_active',
        'must_change_password',
        'last_login_at',
        'failed_attempts',
        'locked_until',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_active' => 'boolean',
            'must_change_password' => 'boolean',
            'last_login_at' => 'datetime',
            'locked_until' => 'datetime',
        ];
    }

    public function staff(): BelongsTo
    {
        return $this->belongsTo(Staff::class, 'staff_id');
    }

    /**
     * Rombel yang diwalikan guru ini pada tahun ajaran aktif.
     * Wali kelas adalah penugasan (classrooms.homeroom_staff_id), bukan peran.
     *
     * @return Collection<int, Classroom>
     */
    public function activeHomeroomClassrooms(): Collection
    {
        if (! $this->staff_id) {
            return new Collection;
        }

        return Classroom::query()
            ->with('unit')
            ->where('homeroom_staff_id', $this->staff_id)
            ->whereHas('academicYear', fn ($q) => $q->where('is_active', true))
            ->orderBy('name')
            ->get();
    }
}
