<?php

namespace App\Services;

use App\Models\AcademicYear;
use App\Models\Semester;
use Illuminate\Support\Facades\DB;

/** Satu-satunya sumber kebenaran untuk tahun ajaran dan semester aktif. */
class AcademicContext
{
    public function year(): ?AcademicYear
    {
        return AcademicYear::where('is_active', true)->first();
    }

    public function semester(): ?Semester
    {
        return Semester::where('is_active', true)->first();
    }

    /** Mengaktifkan satu tahun ajaran; semester aktif = yang mencakup hari ini, atau semester pertamanya. */
    public function activateYear(AcademicYear $year): void
    {
        DB::transaction(function () use ($year) {
            AcademicYear::query()->update(['is_active' => false]);
            Semester::query()->update(['is_active' => false]);

            $year->update(['is_active' => true]);

            $today = now()->toDateString();
            $semesters = $year->semesters()->orderBy('start_date')->get();
            $current = $semesters->first(
                fn (Semester $s) => $s->start_date->toDateString() <= $today && $s->end_date->toDateString() >= $today
            ) ?? $semesters->first();

            $current?->update(['is_active' => true]);
        });
    }

    /** Mengaktifkan satu semester sekaligus tahun ajaran induknya. */
    public function activateSemester(Semester $semester): void
    {
        DB::transaction(function () use ($semester) {
            AcademicYear::query()->update(['is_active' => false]);
            Semester::query()->update(['is_active' => false]);

            $semester->academicYear->update(['is_active' => true]);
            $semester->update(['is_active' => true]);
        });
    }
}
