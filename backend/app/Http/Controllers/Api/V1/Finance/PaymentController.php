<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Enums\PaymentMethod;
use App\Enums\RecordStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\PaymentRequest;
use App\Http\Requests\Finance\VoidPaymentRequest;
use App\Http\Resources\InvoiceResource;
use App\Http\Resources\PaymentResource;
use App\Models\Payment;
use App\Models\SchoolProfile;
use App\Services\AuditLogger;
use App\Services\PaymentService;
use App\Support\Terbilang;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PaymentController extends Controller
{
    private const METHOD_LABELS = [
        'cash' => 'Tunai',
        'transfer' => 'Transfer',
        'other' => 'Lainnya',
    ];

    public function __construct(private readonly PaymentService $payments) {}

    public function index(Request $request)
    {
        $request->validate([
            'student_id' => ['nullable', 'integer'],
            'method' => ['nullable', Rule::enum(PaymentMethod::class)],
            'status' => ['nullable', Rule::enum(RecordStatus::class)],
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d'],
            'per_page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = Payment::with(['student' => fn ($q) => $q->withTrashed(), 'receiver'])
            ->when($request->query('student_id'), fn ($q, $id) => $q->where('student_id', (int) $id))
            ->when($request->query('method'), fn ($q, $method) => $q->where('method', $method))
            ->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
            ->when($request->query('date_from'), fn ($q, $date) => $q->whereDate('payment_date', '>=', $date))
            ->when($request->query('date_to'), fn ($q, $date) => $q->whereDate('payment_date', '<=', $date))
            ->when($request->query('q'), fn ($q, $search) => $q->where(fn ($w) => $w
                ->where('receipt_number', 'like', "%{$search}%")
                ->orWhereHas('student', fn ($s) => $s
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('nis', 'like', "%{$search}%"))))
            ->latest('id');

        return PaymentResource::collection($query->paginate(min((int) $request->query('per_page', 15), 100)));
    }

    /** Tagihan siswa yang masih terbuka, urut terlama (urutan alokasi otomatis). */
    public function openInvoices(Request $request)
    {
        $data = $request->validate(['student_id' => ['required', 'integer', 'exists:students,id']]);

        $invoices = $this->payments->openInvoices((int) $data['student_id'])->load('unit');

        return InvoiceResource::collection($invoices);
    }

    public function show(Payment $payment): PaymentResource
    {
        return new PaymentResource($payment->load(['student' => fn ($q) => $q->withTrashed(), 'receiver', 'allocations.invoice']));
    }

    public function store(PaymentRequest $request): JsonResponse
    {
        $payment = $this->payments->record($request->validated(), $request->user());

        return (new PaymentResource($payment))->response()->setStatusCode(201);
    }

    public function void(VoidPaymentRequest $request, Payment $payment): PaymentResource
    {
        return new PaymentResource(
            $this->payments->void($payment, $request->validated()['reason'], $request->user())
        );
    }

    /** Data kwitansi untuk dicetak. Setiap pengambilan dicatat di audit. */
    public function receipt(Payment $payment): JsonResponse
    {
        $payment->load([
            'student' => fn ($q) => $q->withTrashed(),
            'receiver',
            'allocations.invoice.items',
            'allocations.invoice.unit',
        ]);
        $profile = SchoolProfile::first();

        AuditLogger::log('receipt_printed', $payment);

        return response()->json(['data' => [
            'receipt_number' => $payment->receipt_number,
            'payment_date' => $payment->payment_date?->toDateString(),
            'method' => $payment->method->value,
            'method_label' => self::METHOD_LABELS[$payment->method->value] ?? $payment->method->value,
            'reference' => $payment->reference,
            'notes' => $payment->notes,
            'amount' => (int) $payment->amount,
            'amount_in_words' => Terbilang::rupiah((int) $payment->amount),
            'status' => $payment->status->value,
            'voided_at' => $payment->voided_at?->toIso8601String(),
            'void_reason' => $payment->void_reason,
            'student' => $payment->student ? [
                'nis' => $payment->student->nis,
                'name' => $payment->student->name,
            ] : null,
            'received_by' => $payment->receiver?->name,
            'allocations' => $payment->allocations->map(fn ($a) => [
                'invoice_number' => $a->invoice?->number,
                'unit' => $a->invoice?->unit?->code,
                'description' => $a->invoice ? $a->invoice->items->pluck('description')->implode(', ') : null,
                'amount' => (int) $a->amount,
            ])->values(),
            'school' => [
                'name' => $profile?->foundation_name ?? 'Nama Yayasan',
                'address' => $profile?->address,
                'phone' => $profile?->phone,
                'email' => $profile?->email,
            ],
            'printed_at' => now()->toIso8601String(),
        ]]);
    }
}
