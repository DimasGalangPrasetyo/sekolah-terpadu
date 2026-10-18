<?php

namespace App\Http\Controllers\Api\V1\ReportCards;

use App\Http\Controllers\Controller;
use App\Http\Resources\ClassroomResource;
use App\Http\Resources\ReportCardResource;
use App\Models\Classroom;
use App\Models\ReportCard;
use App\Models\Student;
use App\Services\AcademicContext;
use App\Services\AuditLogger;
use App\Services\ReportCardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ReportCardController extends Controller
{
    private const WITH = [
        'student', 'semester.academicYear', 'template',
        'enrollment.classroom.unit', 'enrollment.classroom.gradeLevel', 'enrollment.classroom.homeroomStaff',
    ];

    public function __construct(
        private readonly ReportCardService $service,
        private readonly AcademicContext $context,
    ) {}

    /** Rombel SD/SMP yang boleh dikerjakan pengguna: TU semua, guru hanya yang diwalikannya. */
    public function classrooms(Request $request)
    {
        $this->ensureAccess($request);

        return ClassroomResource::collection($this->allowedClassrooms($request)->get());
    }

    /** Siswa dalam satu rombel beserta status rapor semester aktif. */
    public function index(Request $request): JsonResponse
    {
        $this->ensureAccess($request);
        $data = $request->validate(['classroom_id' => ['required', 'integer']]);

        $classroom = $this->allowedClassrooms($request)->findOrFail($data['classroom_id']);
        $semester = $this->context->semester();

        $enrollments = $classroom->enrollments()->where('status', 'active')->with('student')->get()
            ->sortBy(fn ($e) => mb_strtolower($e->student->name))->values();

        $cards = $semester
            ? ReportCard::where('semester_id', $semester->id)->whereIn('enrollment_id', $enrollments->pluck('id'))->get()->keyBy('student_id')
            : collect();

        $rows = $enrollments->map(fn ($e) => [
            'student' => ['id' => $e->student->id, 'name' => $e->student->name, 'nis' => $e->student->nis],
            'report_card' => ($card = $cards->get($e->student_id)) ? [
                'id' => $card->id,
                'status' => $card->status->value,
                'updated_at' => $card->updated_at?->toIso8601String(),
            ] : null,
        ]);

        return response()->json([
            'data' => $rows,
            'meta' => [
                'classroom' => ['id' => $classroom->id, 'name' => $classroom->name, 'unit' => $classroom->unit->code],
                'semester' => $semester ? ['id' => $semester->id, 'name' => $semester->name->value] : null,
                'counts' => [
                    'total' => $rows->count(),
                    'draft' => $cards->filter(fn ($c) => $c->status->value === 'draft')->count(),
                    'final' => $cards->filter(fn ($c) => $c->status->value === 'final')->count(),
                ],
            ],
        ]);
    }

    /** Membuka rapor siswa (membuat draft bila belum ada). */
    public function open(Request $request): ReportCardResource
    {
        $this->ensureAccess($request);
        $data = $request->validate(['student_id' => ['required', 'integer', 'exists:students,id']]);

        $card = $this->service->open(Student::findOrFail($data['student_id']), $request->user());

        return new ReportCardResource($card->load(self::WITH));
    }

    /** Semua rapor final dalam satu rombel, untuk cetak sekaligus. */
    public function batch(Request $request)
    {
        $this->ensureAccess($request);
        $data = $request->validate(['classroom_id' => ['required', 'integer']]);

        $classroom = $this->allowedClassrooms($request)->findOrFail($data['classroom_id']);
        $semester = $this->context->semester();

        $cards = ReportCard::query()
            ->with(self::WITH)
            ->where('semester_id', $semester?->id)
            ->where('status', 'final')
            ->whereHas('enrollment', fn ($q) => $q->where('classroom_id', $classroom->id))
            ->get()
            ->sortBy(fn ($c) => mb_strtolower($c->student->name))
            ->values();

        return ReportCardResource::collection($cards);
    }

    public function show(ReportCard $reportCard): ReportCardResource
    {
        Gate::authorize('view', $reportCard);

        return new ReportCardResource($reportCard->load(self::WITH));
    }

    public function update(Request $request, ReportCard $reportCard): ReportCardResource
    {
        Gate::authorize('update', $reportCard);
        $request->validate(['data' => ['present', 'array']]);

        $reportCard->load('template');
        $clean = $this->service->validateData($request->input('data'), $reportCard->template->definition);

        $reportCard->update(['data' => $clean]);

        return new ReportCardResource($reportCard->fresh()->load(self::WITH));
    }

    public function finalize(ReportCard $reportCard, Request $request): ReportCardResource
    {
        Gate::authorize('update', $reportCard);

        $reportCard->update([
            'status' => 'final',
            'finalized_by' => $request->user()->id,
            'finalized_at' => now(),
        ]);
        AuditLogger::log('report_card_finalized', $reportCard);

        return new ReportCardResource($reportCard->fresh()->load(self::WITH));
    }

    public function unlock(ReportCard $reportCard, Request $request): ReportCardResource
    {
        Gate::authorize('unlock', $reportCard);
        $data = $request->validate(['reason' => ['required', 'string', 'max:300']]);

        $reportCard->update(['status' => 'draft', 'finalized_by' => null, 'finalized_at' => null]);
        AuditLogger::log('report_card_unlocked', $reportCard, null, ['reason' => $data['reason']]);

        return new ReportCardResource($reportCard->fresh()->load(self::WITH));
    }

    /** Dicatat setelah rapor dicetak (dialog cetak ditutup). */
    public function printed(ReportCard $reportCard)
    {
        Gate::authorize('view', $reportCard);
        AuditLogger::log('report_card_printed', $reportCard);

        return response()->noContent();
    }

    private function ensureAccess(Request $request): void
    {
        $user = $request->user();

        abort_unless($user->can('reportcards.manage') || $user->can('reportcards.fill'), 403, 'Anda tidak berhak mengakses rapor.');
    }

    private function allowedClassrooms(Request $request)
    {
        $user = $request->user();

        return Classroom::query()
            ->with(['unit', 'gradeLevel', 'homeroomStaff'])
            ->withCount(['enrollments' => fn ($q) => $q->where('status', 'active')])
            ->where('academic_year_id', $this->context->year()?->id)
            ->whereHas('unit', fn ($u) => $u->where('has_report_card', true))
            ->when(! $user->can('reportcards.manage'), fn ($q) => $q->whereIn('id', $user->activeHomeroomClassrooms()->pluck('id')))
            ->orderBy('unit_id')->orderBy('grade_level_id')->orderBy('name');
    }
}
