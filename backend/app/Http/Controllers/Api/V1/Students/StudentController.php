<?php

namespace App\Http\Controllers\Api\V1\Students;

use App\Http\Controllers\Controller;
use App\Http\Requests\Students\StudentRequest;
use App\Http\Requests\Students\StudentStatusRequest;
use App\Http\Resources\StudentResource;
use App\Models\Classroom;
use App\Models\Student;
use App\Services\AcademicContext;
use App\Services\StudentService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class StudentController extends Controller
{
    public function __construct(
        private readonly StudentService $students,
        private readonly AcademicContext $context,
    ) {}

    public function index(Request $request)
    {
        $yearId = $this->context->year()?->id;

        $students = $this->visible($request)
            ->with([
                'enrollments' => fn ($q) => $q->where('academic_year_id', $yearId)->with('classroom.unit'),
                'guardians',
            ])
            ->when($request->query('q'), fn ($q, $s) => $q->where(
                fn ($w) => $w->where('name', 'like', "%{$s}%")->orWhere('nis', 'like', "%{$s}%")->orWhere('nisn', 'like', "%{$s}%")
            ))
            ->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
            ->when($request->query('unit'), fn ($q, $code) => $q->whereHas('enrollments', fn ($e) => $e
                ->where('academic_year_id', $yearId)
                ->whereHas('classroom.unit', fn ($u) => $u->where('code', $code))))
            ->when($request->query('classroom_id'), fn ($q, $id) => $q->whereHas('enrollments', fn ($e) => $e
                ->where('academic_year_id', $yearId)->where('classroom_id', $id)))
            ->when($request->boolean('unplaced'), fn ($q) => $q->whereDoesntHave('enrollments', fn ($e) => $e->where('academic_year_id', $yearId)))
            ->orderBy('name')
            ->paginate(min((int) $request->query('per_page', 15), 100));

        return StudentResource::collection($students);
    }

    public function show(Request $request, Student $student): StudentResource
    {
        abort_unless($this->visible($request)->whereKey($student->id)->exists(), 403, 'Anda tidak berhak melihat siswa ini.');

        return new StudentResource($this->detail($student));
    }

    public function store(StudentRequest $request): StudentResource
    {
        $student = $this->students->create($request->validated());

        return new StudentResource($this->detail($student));
    }

    public function update(StudentRequest $request, Student $student): StudentResource
    {
        $this->students->update($student, $request->validated());

        return new StudentResource($this->detail($student->fresh()));
    }

    public function destroy(Student $student)
    {
        if ($student->invoices()->exists() || $student->payments()->exists() || $student->reportCards()->exists()) {
            abort(409, 'Siswa ini sudah memiliki data keuangan atau rapor. Ubah statusnya menjadi nonaktif, jangan dihapus.');
        }

        $student->enrollments()->get()->each->delete();
        $student->guardians()->get()->each->delete();
        $student->delete();

        return response()->noContent();
    }

    public function changeStatus(StudentStatusRequest $request, Student $student): StudentResource
    {
        $this->students->changeStatus($student, $request->validated(), $request->user());

        return new StudentResource($this->detail($student->fresh()));
    }

    public function place(Request $request, Student $student): StudentResource
    {
        $data = $request->validate(['classroom_id' => ['required', 'integer', 'exists:classrooms,id']]);

        $this->students->place($student, Classroom::findOrFail($data['classroom_id']));

        return new StudentResource($this->detail($student->fresh()));
    }

    /** Guru hanya melihat siswa di rombel yang ia walikan (tahun ajaran aktif); TU melihat semuanya. */
    private function visible(Request $request): Builder
    {
        $query = Student::query();
        $user = $request->user();

        if (! $user->can('students.manage')) {
            $rooms = $user->activeHomeroomClassrooms()->pluck('id');
            $query->whereHas('enrollments', fn ($q) => $q
                ->whereIn('classroom_id', $rooms)
                ->where('academic_year_id', $this->context->year()?->id));
        }

        return $query;
    }

    private function detail(Student $student): Student
    {
        return $student->load([
            'guardians',
            'enrollments' => fn ($q) => $q->where('academic_year_id', $this->context->year()?->id)->with('classroom.unit'),
            'statusLogs' => fn ($q) => $q->latest('id')->limit(20)->with('creator'),
        ]);
    }
}
