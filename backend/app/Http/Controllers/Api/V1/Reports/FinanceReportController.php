<?php

namespace App\Http\Controllers\Api\V1\Reports;

use App\Http\Controllers\Controller;
use App\Services\FinanceReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FinanceReportController extends Controller
{
    public function __construct(private readonly FinanceReportService $reports) {}

    /** Ringkasan penerimaan, kas masuk, pengeluaran, dan saldo per unit untuk satu periode. */
    public function summary(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date_from' => ['required', 'date_format:Y-m-d'],
            'date_to' => ['required', 'date_format:Y-m-d', 'after_or_equal:date_from'],
            'unit' => ['nullable', 'string', 'max:10'],
        ]);

        return response()->json(['data' => $this->reports->summary($data['date_from'], $data['date_to'], $data['unit'] ?? null)]);
    }

    /** Tunggakan per siswa (tagihan terbuka yang jatuh tempo, atau semua yang terbuka bila include_not_due). */
    public function arrears(Request $request): JsonResponse
    {
        $data = $request->validate([
            'unit' => ['nullable', 'string', 'max:10'],
            'academic_year_id' => ['nullable', 'integer', 'exists:academic_years,id'],
            'as_of' => ['nullable', 'date_format:Y-m-d'],
            'include_not_due' => ['nullable', 'boolean'],
        ]);

        return response()->json(['data' => $this->reports->arrears(
            $data['unit'] ?? null,
            isset($data['academic_year_id']) ? (int) $data['academic_year_id'] : null,
            $data['as_of'] ?? now()->toDateString(),
            (bool) ($data['include_not_due'] ?? false),
        )]);
    }

    /** Buku kas gabungan: pembayaran siswa + kas masuk + kas keluar, dengan saldo awal dan saldo berjalan. */
    public function cashBook(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date_from' => ['required', 'date_format:Y-m-d'],
            'date_to' => ['required', 'date_format:Y-m-d', 'after_or_equal:date_from'],
            'unit' => ['nullable', 'string', 'max:10'],
        ]);

        return response()->json(['data' => $this->reports->cashBook($data['date_from'], $data['date_to'], $data['unit'] ?? null)]);
    }

    /** Laporan kasir harian: pembayaran siswa pada satu tanggal, total per metode, dan pembayaran yang dibatalkan. */
    public function dailyPayments(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
            'unit' => ['nullable', 'string', 'max:10'],
        ]);

        return response()->json(['data' => $this->reports->dailyPayments($data['date'], $data['unit'] ?? null)]);
    }
}
