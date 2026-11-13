<?php

namespace Tests\Feature\Finance;

use App\Models\NumberSequence;
use App\Services\DocumentNumberService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DocumentNumberTest extends TestCase
{
    use RefreshDatabase;

    public function test_nomor_berurutan_per_jenis_dan_per_bulan(): void
    {
        $service = app(DocumentNumberService::class);

        $this->assertSame('INV/2026/10/0001', $service->next('INV', Carbon::parse('2026-10-05')));
        $this->assertSame('INV/2026/10/0002', $service->next('INV', Carbon::parse('2026-10-28')));
        $this->assertSame('KWT/2026/10/0001', $service->next('KWT', Carbon::parse('2026-10-05')));
        $this->assertSame('INV/2026/11/0001', $service->next('INV', Carbon::parse('2026-11-01')));
        $this->assertSame('INV/2026/10/0003', $service->next('INV', Carbon::parse('2026-10-31')));

        $this->assertSame(3, NumberSequence::count());
    }

    public function test_nomor_tidak_bolong_bila_transaksi_dibatalkan(): void
    {
        $service = app(DocumentNumberService::class);
        $date = Carbon::parse('2026-10-05');

        try {
            DB::transaction(function () use ($service, $date) {
                $service->next('INV', $date);
                throw new \RuntimeException('gagal');
            });
        } catch (\RuntimeException) {
            // diharapkan
        }

        $this->assertSame('INV/2026/10/0001', $service->next('INV', $date));
    }
}
