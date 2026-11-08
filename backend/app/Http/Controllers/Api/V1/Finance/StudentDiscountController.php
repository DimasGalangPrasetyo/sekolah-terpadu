<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\StudentDiscountRequest;
use App\Http\Resources\StudentDiscountResource;
use App\Models\FeeType;
use App\Models\Student;
use App\Models\StudentDiscount;
use App\Services\AcademicContext;
use Illuminate\Http\Request;

class StudentDiscountController extends Controller
{
    public function __construct(
        private readonly AcademicContext $context,
    ) {}

    public function index(Request $request)
    {
        $yearId = $request->query('academic_year_id')
            ? (int) $request->query('academic_year_id')
            : $this->context->year()?->id;

        $query = StudentDiscount::with(['student', 'feeType', 'academicYear'])
            ->when($yearId, fn ($q) => $q->where('academic_year_id', $yearId))
            ->when($request->query('fee_type_id'), fn ($q, $id) => $q->where('fee_type_id', (int) $id))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->when($request->query('q'), function ($q, $search) {
                $q->whereHas('student', function ($sq) use ($search) {
                    $sq->where('name', 'like', "%{$search}%")
                        ->orWhere('nis', 'like', "%{$search}%");
                });
            })
            ->latest('id');

        $discounts = $query->paginate((int) $request->query('per_page', 15));

        return StudentDiscountResource::collection($discounts);
    }

    public function store(StudentDiscountRequest $request): StudentDiscountResource
    {
        $data = $request->validated();

        $student = Student::findOrFail($data['student_id']);

        if (! empty($data['fee_type_id'])) {
            $feeType = FeeType::findOrFail($data['fee_type_id']);
            if (! $feeType->is_active) {
                abort(422, 'Jenis biaya yang dipilih sudah nonaktif. Pilih jenis biaya yang aktif.');
            }
        }

        $feeTypeId = $data['fee_type_id'] ?? null;
        $activeExists = StudentDiscount::where('student_id', $student->id)
            ->where('academic_year_id', $data['academic_year_id'])
            ->where('is_active', true)
            ->when($feeTypeId === null, fn ($q) => $q->whereNull('fee_type_id'), fn ($q) => $q->where('fee_type_id', $feeTypeId))
            ->exists();

        if ($activeExists) {
            abort(422, 'Siswa ini sudah memiliki diskon aktif untuk jenis biaya dan tahun ajaran tersebut.');
        }

        $discount = StudentDiscount::create(array_merge($data, ['is_active' => true]));

        return new StudentDiscountResource($discount->load(['student', 'feeType', 'academicYear']));
    }

    public function update(StudentDiscountRequest $request, StudentDiscount $studentDiscount): StudentDiscountResource
    {
        $data = $request->validated();

        $feeTypeId = array_key_exists('fee_type_id', $data) ? $data['fee_type_id'] : $studentDiscount->fee_type_id;

        if (! empty($feeTypeId)) {
            $feeType = FeeType::findOrFail($feeTypeId);
            if (! $feeType->is_active) {
                abort(422, 'Jenis biaya yang dipilih sudah nonaktif. Pilih jenis biaya yang aktif.');
            }
        }

        if ($studentDiscount->is_active) {
            $activeExists = StudentDiscount::where('student_id', $studentDiscount->student_id)
                ->where('academic_year_id', $studentDiscount->academic_year_id)
                ->where('is_active', true)
                ->where('id', '!=', $studentDiscount->id)
                ->when($feeTypeId === null, fn ($q) => $q->whereNull('fee_type_id'), fn ($q) => $q->where('fee_type_id', $feeTypeId))
                ->exists();

            if ($activeExists) {
                abort(422, 'Siswa ini sudah memiliki diskon aktif untuk jenis biaya dan tahun ajaran tersebut.');
            }
        }

        $studentDiscount->update($data);

        return new StudentDiscountResource($studentDiscount->fresh()->load(['student', 'feeType', 'academicYear']));
    }

    public function deactivate(StudentDiscount $studentDiscount): StudentDiscountResource
    {
        $studentDiscount->update(['is_active' => false]);

        return new StudentDiscountResource($studentDiscount->fresh()->load(['student', 'feeType', 'academicYear']));
    }

    public function activate(StudentDiscount $studentDiscount): StudentDiscountResource
    {
        if ($studentDiscount->fee_type_id !== null) {
            $feeType = FeeType::findOrFail($studentDiscount->fee_type_id);
            if (! $feeType->is_active) {
                abort(422, 'Jenis biaya untuk diskon ini sudah nonaktif.');
            }
        }

        $activeExists = StudentDiscount::where('student_id', $studentDiscount->student_id)
            ->where('academic_year_id', $studentDiscount->academic_year_id)
            ->where('is_active', true)
            ->where('id', '!=', $studentDiscount->id)
            ->when($studentDiscount->fee_type_id === null, fn ($q) => $q->whereNull('fee_type_id'), fn ($q) => $q->where('fee_type_id', $studentDiscount->fee_type_id))
            ->exists();

        if ($activeExists) {
            abort(422, 'Tidak dapat mengaktifkan: siswa ini sudah memiliki diskon aktif lain untuk jenis biaya dan tahun ajaran tersebut.');
        }

        $studentDiscount->update(['is_active' => true]);

        return new StudentDiscountResource($studentDiscount->fresh()->load(['student', 'feeType', 'academicYear']));
    }
}
