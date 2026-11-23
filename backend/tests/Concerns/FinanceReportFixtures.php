<?php

namespace Tests\Concerns;

use App\Models\CashCategory;
use App\Models\FeeRate;
use App\Models\Invoice;
use App\Models\Student;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Testing\TestResponse;

/** Data uji laporan keuangan. Dipakai bersama InvoiceFixtures, PaymentFixtures, CashFixtures, FinanceFixtures, SchoolFixtures. */
trait FinanceReportFixtures
{
    protected function cashIn(int $amount, string $date, ?string $unitCode = null): int
    {
        return $this->cashEntry('Donasi', $amount, $date, $unitCode);
    }

    protected function cashOut(int $amount, string $date, ?string $unitCode = null): int
    {
        return $this->cashEntry('Operasional', $amount, $date, $unitCode);
    }

    private function cashEntry(string $category, int $amount, string $date, ?string $unitCode): int
    {
        $payload = [
            'cash_category_id' => CashCategory::where('name', $category)->firstOrFail()->id,
            'transaction_date' => $date,
            'amount' => $amount,
            'description' => 'Uji laporan',
        ];
        if ($unitCode !== null) {
            $payload['unit_id'] = Unit::where('code', $unitCode)->firstOrFail()->id;
        }

        return (int) $this->recordCash($payload)->assertCreated()->json('data.id');
    }

    /** Membayar tagihan $amount pada tanggal $date; mengembalikan id pembayaran. */
    protected function payOn(Invoice $invoice, int $amount, string $date, string $method = 'cash'): int
    {
        $extra = ['payment_date' => $date, 'method' => $method];
        if ($method === 'transfer') {
            $extra['reference'] = 'TRF-'.$invoice->id;
        }

        return (int) $this->payInvoice($invoice, $amount, $extra)->assertCreated()->json('data.id');
    }

    protected function smpRate(int $amount): FeeRate
    {
        return $this->makeFeeRate([
            'fee_type_id' => $this->spp->id,
            'unit_id' => $this->unitSmp->id,
            'grade_level_id' => null,
            'academic_year_id' => $this->year->id,
            'amount' => $amount,
        ]);
    }

    protected function smpInvoice(Student $student, string $month): Invoice
    {
        $this->generateAs($this->tu, [
            'unit_id' => $this->unitSmp->id,
            'month' => $month,
            'student_ids' => [$student->id],
        ])->assertOk();

        return Invoice::where('student_id', $student->id)->whereDate('period_month', $month.'-01')->firstOrFail();
    }

    protected function report(string $path, array $query = [], ?User $as = null): TestResponse
    {
        $url = '/api/v1/reports/finance/'.$path.($query === [] ? '' : '?'.http_build_query($query));

        return $this->actingAs($as ?? $this->tu)->getJson($url);
    }

    /** @return array<string, array<string, mixed>> baris ringkasan berindeks key unit */
    protected function rowsByKey(TestResponse $response): array
    {
        return collect($response->json('data.rows'))->keyBy('key')->all();
    }
}
