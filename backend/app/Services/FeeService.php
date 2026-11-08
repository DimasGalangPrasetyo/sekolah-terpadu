<?php

namespace App\Services;

use App\Models\FeeRate;
use App\Models\FeeType;

class FeeService
{
    /**
     * Resolver tarif: cari tarif untuk kombinasi jenis biaya, unit, tingkat, dan tahun ajaran.
     *
     * Urutan pencarian:
     * 1. Tarif dengan grade_level_id persis sama.
     * 2. Bila tidak ada, tarif dengan grade_level_id NULL (berlaku semua tingkat di unit itu).
     * 3. Bila tidak ada, null (tidak ada tagihan, bukan Rp 0).
     */
    public function resolveRate(FeeType $type, int $unitId, ?int $gradeLevelId, int $academicYearId): ?FeeRate
    {
        // Coba tarif spesifik tingkat terlebih dahulu
        if ($gradeLevelId !== null) {
            $specific = FeeRate::where('fee_type_id', $type->id)
                ->where('unit_id', $unitId)
                ->where('grade_level_id', $gradeLevelId)
                ->where('academic_year_id', $academicYearId)
                ->first();

            if ($specific !== null) {
                return $specific;
            }
        }

        // Fallback ke tarif semua tingkat (NULL)
        return FeeRate::where('fee_type_id', $type->id)
            ->where('unit_id', $unitId)
            ->whereNull('grade_level_id')
            ->where('academic_year_id', $academicYearId)
            ->first();
    }

    /**
     * Periksa duplikat kombinasi kunci tarif.
     * MySQL tidak mencegah duplikat NULL pada unique index, sehingga pemeriksaan dilakukan di sini.
     */
    public function rateExists(int $feeTypeId, int $unitId, ?int $gradeLevelId, int $academicYearId, ?int $excludeId = null): bool
    {
        $query = FeeRate::where('fee_type_id', $feeTypeId)
            ->where('unit_id', $unitId)
            ->where('academic_year_id', $academicYearId);

        if ($gradeLevelId === null) {
            $query->whereNull('grade_level_id');
        } else {
            $query->where('grade_level_id', $gradeLevelId);
        }

        if ($excludeId !== null) {
            $query->where('id', '!=', $excludeId);
        }

        return $query->exists();
    }
}
