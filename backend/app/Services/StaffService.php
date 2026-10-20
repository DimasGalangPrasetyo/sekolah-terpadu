<?php

namespace App\Services;

use App\Models\Asset;
use App\Models\Staff;
use App\Models\Unit;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StaffService
{
    public function __construct(private readonly AcademicContext $context) {}

    public function list(array $filters): LengthAwarePaginator
    {
        $activeYearId = $this->context->year()?->id;

        return Staff::query()
            ->with([
                'unitAssignments.unit',
                'user',
                'homeroomClassrooms' => fn ($q) => $q->where('academic_year_id', $activeYearId)->with('unit'),
            ])
            ->when(! empty($filters['q']), function ($q) use ($filters) {
                $search = $filters['q'];
                $q->where(fn ($w) => $w
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('nip', 'like', "%{$search}%")
                    ->orWhere('nuptk', 'like', "%{$search}%")
                );
            })
            ->when(isset($filters['is_teacher']) && $filters['is_teacher'] !== '', fn ($q) => $q->where('is_teacher', filter_var($filters['is_teacher'], FILTER_VALIDATE_BOOLEAN)))
            ->when(isset($filters['is_active']) && $filters['is_active'] !== '', fn ($q) => $q->where('is_active', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN)))
            ->when(! empty($filters['unit']), fn ($q) => $q->whereHas('unitAssignments.unit', fn ($u) => $u->where('code', $filters['unit'])))
            ->when(! empty($filters['employment_status']), fn ($q) => $q->where('employment_status', $filters['employment_status']))
            ->orderBy('name')
            ->paginate(min((int) ($filters['per_page'] ?? 15), 100));
    }

    public function create(array $data): Staff
    {
        return DB::transaction(function () use ($data) {
            $staff = Staff::create(
                $this->staffAttributes($data) + ['is_active' => $data['is_active'] ?? true]
            );

            $this->syncAssignments($staff, $data['assignments'] ?? []);

            return $this->loadRelations($staff);
        });
    }

    public function update(Staff $staff, array $data): Staff
    {
        return DB::transaction(function () use ($staff, $data) {
            $staff->update($this->staffAttributes($data));

            if (array_key_exists('assignments', $data)) {
                $this->syncAssignments($staff, $data['assignments'] ?? []);
            }

            return $this->loadRelations($staff->fresh());
        });
    }

    public function syncAssignments(Staff $staff, array $assignments): void
    {
        $keepIds = [];

        foreach (array_values($assignments) as $row) {
            $attributes = [
                'unit_id' => $row['unit_id'],
                'role_title' => $row['role_title'],
                'start_date' => $row['start_date'] ?? null,
                'end_date' => $row['end_date'] ?? null,
            ];

            $existing = ! empty($row['id']) ? $staff->unitAssignments()->whereKey($row['id'])->first() : null;

            if ($existing) {
                $existing->update($attributes);
                $keepIds[] = $existing->id;
            } else {
                $keepIds[] = $staff->unitAssignments()->create($attributes)->id;
            }
        }

        $staff->unitAssignments()->whereNotIn('id', $keepIds)->get()->each->delete();
    }

    public function deactivate(Staff $staff): Staff
    {
        $activeYearId = $this->context->year()?->id;

        if ($activeYearId && $staff->homeroomClassrooms()->where('academic_year_id', $activeYearId)->exists()) {
            throw ValidationException::withMessages([
                'is_active' => ['Staf tidak dapat dinonaktifkan karena saat ini menjadi wali kelas pada tahun ajaran aktif.'],
            ]);
        }

        $staff->update(['is_active' => false]);

        return $this->loadRelations($staff->fresh());
    }

    public function activate(Staff $staff): Staff
    {
        $staff->update(['is_active' => true]);

        return $this->loadRelations($staff->fresh());
    }

    public function delete(Staff $staff): void
    {
        if ($staff->user()->exists()) {
            abort(409, 'Staf tidak dapat dihapus karena memiliki akun pengguna.');
        }

        if ($staff->homeroomClassrooms()->exists()) {
            abort(409, 'Staf tidak dapat dihapus karena pernah atau sedang menjadi wali kelas.');
        }

        if (Asset::where('responsible_staff_id', $staff->id)->exists()) {
            abort(409, 'Staf tidak dapat dihapus karena bertanggung jawab atas aset inventaris.');
        }

        if (Unit::where('head_staff_id', $staff->id)->exists()) {
            abort(409, 'Staf tidak dapat dihapus karena menjabat sebagai kepala unit.');
        }

        DB::transaction(function () use ($staff) {
            $staff->unitAssignments()->get()->each->delete();
            $staff->delete();
        });
    }

    public function loadRelations(Staff $staff): Staff
    {
        $activeYearId = $this->context->year()?->id;

        return $staff->load([
            'unitAssignments.unit',
            'user',
            'homeroomClassrooms' => fn ($q) => $q->where('academic_year_id', $activeYearId)->with('unit'),
        ]);
    }

    private function staffAttributes(array $data): array
    {
        return collect($data)->only([
            'nip', 'nuptk', 'name', 'gender', 'birth_place', 'birth_date',
            'phone', 'email', 'address', 'position', 'employment_status',
            'join_date', 'education', 'is_teacher', 'is_active',
        ])->all();
    }
}
