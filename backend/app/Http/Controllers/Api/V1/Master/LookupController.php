<?php

namespace App\Http\Controllers\Api\V1\Master;

use App\Http\Controllers\Controller;
use App\Models\Classroom;
use App\Models\GradeLevel;
use App\Models\Staff;
use App\Models\Unit;
use App\Services\AcademicContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Data rujukan kecil untuk pilihan/filter di antarmuka. */
class LookupController extends Controller
{
    public function units(): JsonResponse
    {
        return response()->json([
            'data' => Unit::where('is_active', true)->orderBy('id')->get(['id', 'code', 'name', 'has_report_card']),
        ]);
    }

    public function gradeLevels(Request $request): JsonResponse
    {
        $levels = GradeLevel::query()
            ->when($request->query('unit_id'), fn ($q, $id) => $q->where('unit_id', $id))
            ->orderBy('unit_id')->orderBy('sort_order')
            ->get(['id', 'unit_id', 'code', 'name']);

        return response()->json(['data' => $levels]);
    }

    public function academicContext(AcademicContext $context): JsonResponse
    {
        $year = $context->year();
        $semester = $context->semester();

        return response()->json(['data' => [
            'year' => $year ? ['id' => $year->id, 'name' => $year->name] : null,
            'semester' => $semester ? ['id' => $semester->id, 'name' => $semester->name->value] : null,
        ]]);
    }

    /** Guru aktif untuk dipilih sebagai wali kelas; menandai yang sudah menjadi wali kelas lain di tahun aktif. */
    public function teacherOptions(Request $request, AcademicContext $context): JsonResponse
    {
        $busy = $context->year()
            ? Classroom::where('academic_year_id', $context->year()->id)->whereNotNull('homeroom_staff_id')->pluck('name', 'homeroom_staff_id')
            : collect();

        $teachers = Staff::query()
            ->where('is_teacher', true)->where('is_active', true)
            ->when($request->query('q'), fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->orderBy('name')->limit(50)
            ->get(['id', 'name', 'position'])
            ->map(fn ($t) => [
                'id' => $t->id,
                'name' => $t->name,
                'position' => $t->position,
                'homeroom_classroom' => $busy[$t->id] ?? null,
            ]);

        return response()->json(['data' => $teachers]);
    }
}
