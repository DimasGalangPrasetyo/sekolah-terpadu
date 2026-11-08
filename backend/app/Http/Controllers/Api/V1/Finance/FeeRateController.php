<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\FeeRateRequest;
use App\Http\Resources\FeeRateResource;
use App\Models\FeeRate;
use App\Models\FeeType;
use App\Models\GradeLevel;
use App\Services\AcademicContext;
use App\Services\FeeService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class FeeRateController extends Controller
{
    public function __construct(
        private readonly AcademicContext $context,
        private readonly FeeService $feeService,
    ) {}

    public function index(Request $request)
    {
        $yearId = $request->query('academic_year_id')
            ? (int) $request->query('academic_year_id')
            : $this->context->year()?->id;

        $query = FeeRate::with(['feeType', 'unit', 'gradeLevel', 'academicYear']);

        if ($yearId) {
            $query->where('academic_year_id', $yearId);
        }

        if ($request->query('unit')) {
            $query->whereHas('unit', fn ($q) => $q->where('code', $request->query('unit')));
        }

        if ($request->query('fee_type_id')) {
            $query->where('fee_type_id', (int) $request->query('fee_type_id'));
        }

        if ($request->query('grade_level_id')) {
            $query->where('grade_level_id', (int) $request->query('grade_level_id'));
        }

        return FeeRateResource::collection($query->get());
    }

    public function store(FeeRateRequest $request): FeeRateResource
    {
        $data = $request->validated();

        // Jenis biaya harus aktif
        $feeType = FeeType::findOrFail($data['fee_type_id']);
        if (! $feeType->is_active) {
            abort(422, 'Jenis biaya yang dipilih sudah nonaktif. Pilih jenis biaya yang aktif.');
        }

        // Tingkat kelas harus milik unit yang sama
        if (! empty($data['grade_level_id'])) {
            $gradeLevel = GradeLevel::findOrFail($data['grade_level_id']);
            if ($gradeLevel->unit_id !== (int) $data['unit_id']) {
                abort(422, 'Tingkat kelas bukan milik unit yang dipilih.');
            }
        }

        // Cek duplikat kombinasi kunci (termasuk NULL grade_level_id)
        if ($this->feeService->rateExists(
            $data['fee_type_id'],
            $data['unit_id'],
            $data['grade_level_id'] ?? null,
            $data['academic_year_id'],
        )) {
            abort(422, 'Tarif dengan kombinasi jenis biaya, unit, tingkat, dan tahun ajaran ini sudah ada.');
        }

        $feeRate = FeeRate::create($data);

        return new FeeRateResource($feeRate->load(['feeType', 'unit', 'gradeLevel', 'academicYear']));
    }

    public function update(FeeRateRequest $request, FeeRate $feeRate): FeeRateResource
    {
        $feeRate->update(['amount' => $request->validated()['amount']]);

        return new FeeRateResource($feeRate->fresh()->load(['feeType', 'unit', 'gradeLevel', 'academicYear']));
    }

    public function destroy(FeeRate $feeRate): Response
    {
        $feeRate->delete();

        return response()->noContent();
    }
}
