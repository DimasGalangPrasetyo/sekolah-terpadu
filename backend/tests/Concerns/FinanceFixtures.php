<?php

namespace Tests\Concerns;

use App\Enums\DiscountType;
use App\Enums\FeeCategory;
use App\Models\AcademicYear;
use App\Models\FeeRate;
use App\Models\FeeType;
use App\Models\StudentDiscount;
use App\Models\Unit;

trait FinanceFixtures
{
    protected function makeFeeType(array $attrs = []): FeeType
    {
        return FeeType::create(array_merge([
            'code' => 'SPP_'.strtoupper(fake()->lexify('???')),
            'name' => 'SPP Bulanan',
            'category' => FeeCategory::Monthly,
            'is_active' => true,
        ], $attrs));
    }

    protected function makeFeeRate(array $attrs = []): FeeRate
    {
        $type = $attrs['fee_type_id'] ?? $this->makeFeeType()->id;
        $unit = $attrs['unit_id'] ?? Unit::where('code', 'SD')->firstOrFail()->id;
        $year = $attrs['academic_year_id'] ?? (AcademicYear::where('is_active', true)->first()?->id ?? $this->makeYear()->id);

        return FeeRate::create(array_merge([
            'fee_type_id' => $type,
            'unit_id' => $unit,
            'grade_level_id' => null,
            'academic_year_id' => $year,
            'amount' => 250000,
        ], $attrs));
    }

    protected function makeDiscount(array $attrs = []): StudentDiscount
    {
        $student = $attrs['student_id'] ?? $this->makeStudent()->id;
        $year = $attrs['academic_year_id'] ?? (AcademicYear::where('is_active', true)->first()?->id ?? $this->makeYear()->id);

        return StudentDiscount::create(array_merge([
            'student_id' => $student,
            'fee_type_id' => null,
            'academic_year_id' => $year,
            'type' => DiscountType::Percent,
            'value' => 20,
            'reason' => 'Keringanan beasiswa prestasi',
            'is_active' => true,
        ], $attrs));
    }
}
