<?php

namespace App\Http\Controllers\Api\V1\Master;

use App\Http\Controllers\Controller;
use App\Http\Requests\Master\ClassroomRequest;
use App\Http\Resources\ClassroomResource;
use App\Models\Classroom;
use App\Services\AcademicContext;
use Illuminate\Http\Request;

class ClassroomController extends Controller
{
    public function index(Request $request, AcademicContext $context)
    {
        $yearId = $request->query('academic_year_id') ?: $context->year()?->id;

        $classrooms = Classroom::query()
            ->with(['unit', 'gradeLevel', 'homeroomStaff'])
            ->withCount(['enrollments' => fn ($q) => $q->where('status', 'active')])
            ->when($yearId, fn ($q, $id) => $q->where('academic_year_id', $id))
            ->when(! $yearId, fn ($q) => $q->whereRaw('1 = 0'))
            ->when($request->query('unit'), fn ($q, $code) => $q->whereHas('unit', fn ($u) => $u->where('code', $code)))
            ->when($request->query('grade_level_id'), fn ($q, $id) => $q->where('grade_level_id', $id))
            ->orderBy('unit_id')
            ->orderBy('grade_level_id')
            ->orderBy('name')
            ->get();

        return ClassroomResource::collection($classrooms);
    }

    public function store(ClassroomRequest $request): ClassroomResource
    {
        $classroom = Classroom::create($request->validated());

        return new ClassroomResource($this->loaded($classroom));
    }

    public function update(ClassroomRequest $request, Classroom $classroom): ClassroomResource
    {
        $classroom->update($request->validated());

        return new ClassroomResource($this->loaded($classroom->fresh()));
    }

    public function destroy(Classroom $classroom)
    {
        if ($classroom->enrollments()->exists()) {
            abort(409, 'Rombel ini sudah memiliki siswa dan tidak dapat dihapus.');
        }

        $classroom->delete();

        return response()->noContent();
    }

    private function loaded(Classroom $classroom): Classroom
    {
        return $classroom->load(['unit', 'gradeLevel', 'homeroomStaff'])->loadCount('enrollments');
    }
}
