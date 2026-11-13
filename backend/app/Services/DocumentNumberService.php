<?php

namespace App\Services;

use App\Models\NumberSequence;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

/**
 * Penomoran dokumen berurutan per jenis dan per bulan: INV/2026/10/0001, KWT/2026/10/0001, dst.
 * Penambahan nomor ikut transaksi pemanggil, jadi bila transaksi dibatalkan nomornya tidak hilang (tanpa celah).
 */
class DocumentNumberService
{
    public function next(string $key, CarbonInterface $date): string
    {
        $period = $date->format('Y-m');

        $number = DB::transaction(function () use ($key, $period) {
            DB::table('number_sequences')->insertOrIgnore([
                'sequence_key' => $key,
                'period' => $period,
                'last_number' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $row = NumberSequence::where('sequence_key', $key)
                ->where('period', $period)
                ->lockForUpdate()
                ->firstOrFail();

            $row->last_number = (int) $row->last_number + 1;
            $row->save();

            return (int) $row->last_number;
        });

        return sprintf('%s/%s/%s/%04d', $key, $date->format('Y'), $date->format('m'), $number);
    }
}
