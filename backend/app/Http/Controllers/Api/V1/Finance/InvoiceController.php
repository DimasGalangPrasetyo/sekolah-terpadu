<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Enums\InvoiceKind;
use App\Enums\InvoiceStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\GenerateInvoicesRequest;
use App\Http\Requests\Finance\InvoiceRequest;
use App\Http\Requests\Finance\VoidInvoiceRequest;
use App\Http\Resources\InvoiceResource;
use App\Models\Invoice;
use App\Services\AcademicContext;
use App\Services\InvoiceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class InvoiceController extends Controller
{
    public function __construct(
        private readonly AcademicContext $context,
        private readonly InvoiceService $invoices,
    ) {}

    public function index(Request $request)
    {
        $request->validate([
            'status' => ['nullable', Rule::enum(InvoiceStatus::class)],
            'kind' => ['nullable', Rule::enum(InvoiceKind::class)],
            'period' => ['nullable', 'date_format:Y-m'],
            'academic_year_id' => ['nullable', 'integer'],
            'student_id' => ['nullable', 'integer'],
            'per_page' => ['nullable', 'integer', 'min:1'],
        ]);

        $yearId = $request->query('academic_year_id')
            ? (int) $request->query('academic_year_id')
            : $this->context->year()?->id;

        $query = Invoice::with(['student' => fn ($q) => $q->withTrashed(), 'unit'])
            ->when($yearId, fn ($q) => $q->where('academic_year_id', $yearId))
            ->when($request->query('unit'), fn ($q, $code) => $q->whereHas('unit', fn ($u) => $u->where('code', $code)))
            ->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
            ->when($request->query('kind'), fn ($q, $kind) => $q->where('kind', $kind))
            ->when($request->query('student_id'), fn ($q, $id) => $q->where('student_id', (int) $id))
            ->when($request->query('period'), fn ($q, $period) => $q->whereDate('period_month', $period.'-01'))
            ->when($request->boolean('overdue'), fn ($q) => $q
                ->whereIn('status', [InvoiceStatus::Unpaid->value, InvoiceStatus::Partial->value])
                ->whereDate('due_date', '<', now()->toDateString()))
            ->when($request->query('q'), fn ($q, $search) => $q->whereHas('student', fn ($s) => $s
                ->where('name', 'like', "%{$search}%")
                ->orWhere('nis', 'like', "%{$search}%")))
            ->latest('id');

        return InvoiceResource::collection($query->paginate(min((int) $request->query('per_page', 15), 100)));
    }

    public function show(Invoice $invoice): InvoiceResource
    {
        return new InvoiceResource($invoice->load(['student' => fn ($q) => $q->withTrashed(), 'unit', 'academicYear', 'items.feeType', 'allocations.payment']));
    }

    public function generate(GenerateInvoicesRequest $request): JsonResponse
    {
        $result = $this->invoices->generateMonthly($request->validated(), $request->user());

        return response()->json(['data' => $result]);
    }

    public function store(InvoiceRequest $request): JsonResponse
    {
        $invoice = $this->invoices->createManual($request->validated(), $request->user());

        return (new InvoiceResource($invoice))->response()->setStatusCode(201);
    }

    public function void(VoidInvoiceRequest $request, Invoice $invoice): InvoiceResource
    {
        return new InvoiceResource(
            $this->invoices->void($invoice, $request->validated()['reason'], $request->user())
        );
    }
}
