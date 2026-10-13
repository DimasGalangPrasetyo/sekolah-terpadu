<?php

namespace App\Http\Controllers\Api\V1\Master;

use App\Http\Controllers\Controller;
use App\Http\Requests\Master\AcademicYearRequest;
use App\Http\Resources\AcademicYearResource;
use App\Models\AcademicYear;
use App\Models\Semester;
use App\Services\AcademicContext;
use App\Services\AuditLogger;
use Illuminate\Support\Facades\DB;

class AcademicYearController extends Controller
{
    public function index()
    {
        $years = AcademicYear::query()->with('semesters')->withCount('classrooms')->orderByDesc('start_date')->get();

        return AcademicYearResource::collection($years);
    }

    public function store(AcademicYearRequest $request): AcademicYearResource
    {
        $data = $request->validated();

        $year = DB::transaction(function () use ($data) {
            $year = AcademicYear::create([
                'name' => $data['name'],
                'start_date' => $data['start_date'],
                'end_date' => $data['end_date'],
                'is_active' => false,
            ]);

            foreach ($data['semesters'] as $semester) {
                $year->semesters()->create($semester + ['is_active' => false]);
            }

            return $year;
        });

        return new AcademicYearResource($year->load('semesters'));
    }

    public function update(AcademicYearRequest $request, AcademicYear $academicYear): AcademicYearResource
    {
        $data = $request->validated();

        DB::transaction(function () use ($data, $academicYear) {
            $academicYear->update([
                'name' => $data['name'],
                'start_date' => $data['start_date'],
                'end_date' => $data['end_date'],
            ]);

            foreach ($data['semesters'] as $semester) {
                $academicYear->semesters()->updateOrCreate(
                    ['name' => $semester['name']],
                    ['start_date' => $semester['start_date'], 'end_date' => $semester['end_date']],
                );
            }
        });

        return new AcademicYearResource($academicYear->fresh()->load('semesters'));
    }

    public function destroy(AcademicYear $academicYear)
    {
        if ($academicYear->is_active) {
            abort(409, 'Tahun ajaran yang sedang aktif tidak dapat dihapus.');
        }

        if ($academicYear->classrooms()->exists()) {
            abort(409, 'Tahun ajaran ini sudah memiliki rombel dan tidak dapat dihapus.');
        }

        DB::transaction(function () use ($academicYear) {
            $academicYear->semesters()->get()->each->delete();
            $academicYear->delete();
        });

        return response()->noContent();
    }

    public function activate(AcademicYear $academicYear, AcademicContext $context): AcademicYearResource
    {
        $context->activateYear($academicYear);
        AuditLogger::log('academic_year_activated', $academicYear);

        return new AcademicYearResource($academicYear->fresh()->load('semesters'));
    }

    public function activateSemester(Semester $semester, AcademicContext $context): AcademicYearResource
    {
        $context->activateSemester($semester);
        AuditLogger::log('semester_activated', $semester);

        return new AcademicYearResource($semester->academicYear->fresh()->load('semesters'));
    }
}
