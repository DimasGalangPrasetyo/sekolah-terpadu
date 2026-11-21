<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Enums\CashType;
use App\Enums\RecordStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\CashTransactionRequest;
use App\Http\Requests\Finance\VoidCashTransactionRequest;
use App\Http\Resources\CashTransactionResource;
use App\Models\CashTransaction;
use App\Services\CashService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class CashTransactionController extends Controller
{
    public function __construct(
        private readonly CashService $cashService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->validateFilters($request);

        $query = $this->applyFilters(
            CashTransaction::with(['cashCategory', 'unit', 'creator']),
            $request
        )->orderByDesc('transaction_date')->orderByDesc('id');

        $perPage = min(max((int) $request->query('per_page', 15), 1), 100);

        return CashTransactionResource::collection($query->paginate($perPage));
    }

    public function summary(Request $request): JsonResponse
    {
        $this->validateFilters($request);

        // Ringkasan hanya menghitung transaksi berstatus valid
        $query = $this->applyFilters(
            CashTransaction::query()->where('status', RecordStatus::Valid),
            $request,
            applyStatusFilter: false
        );

        $income = (int) (clone $query)->where('type', CashType::Income)->sum('amount');
        $expense = (int) (clone $query)->where('type', CashType::Expense)->sum('amount');
        $balance = $income - $expense;
        $count = (int) $query->count();

        return response()->json([
            'data' => [
                'income' => $income,
                'expense' => $expense,
                'balance' => $balance,
                'count' => $count,
            ],
        ]);
    }

    public function show(CashTransaction $cashTransaction): CashTransactionResource
    {
        return new CashTransactionResource(
            $cashTransaction->load(['cashCategory', 'unit', 'creator', 'voider'])
        );
    }

    public function store(CashTransactionRequest $request): JsonResponse
    {
        $transaction = $this->cashService->record($request->validated(), $request->user());

        return (new CashTransactionResource($transaction))->response()->setStatusCode(201);
    }

    public function void(VoidCashTransactionRequest $request, CashTransaction $cashTransaction): CashTransactionResource
    {
        $transaction = $this->cashService->void(
            $cashTransaction,
            $request->validated('reason'),
            $request->user()
        );

        return new CashTransactionResource($transaction);
    }

    private function validateFilters(Request $request): void
    {
        $request->validate([
            'type' => ['nullable', Rule::enum(CashType::class)],
            'cash_category_id' => ['nullable', 'integer'],
            'unit' => ['nullable', 'string'],
            'status' => ['nullable', Rule::enum(RecordStatus::class)],
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d'],
            'q' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1'],
        ]);
    }

    /**
     * @param  Builder<CashTransaction>  $query
     * @return Builder<CashTransaction>
     */
    private function applyFilters(Builder $query, Request $request, bool $applyStatusFilter = true): Builder
    {
        return $query
            ->when($request->query('type'), fn ($q, $type) => $q->where('type', $type))
            ->when($request->query('cash_category_id'), fn ($q, $catId) => $q->where('cash_category_id', (int) $catId))
            ->when($request->query('unit'), function ($q, $unit) {
                if ($unit === 'none') {
                    $q->whereNull('unit_id');
                } else {
                    $q->whereHas('unit', fn ($u) => $u->where('code', $unit));
                }
            })
            ->when($applyStatusFilter && $request->query('status'), fn ($q, $status) => $q->where('status', $status))
            ->when($request->query('date_from'), fn ($q, $date) => $q->whereDate('transaction_date', '>=', $date))
            ->when($request->query('date_to'), fn ($q, $date) => $q->whereDate('transaction_date', '<=', $date))
            ->when($request->query('q'), fn ($q, $search) => $q->where(fn ($w) => $w
                ->where('number', 'like', "%{$search}%")
                ->orWhere('description', 'like', "%{$search}%")));
    }
}
