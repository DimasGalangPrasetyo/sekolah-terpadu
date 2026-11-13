<?php

namespace Tests\Concerns;

use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\FeeRate;
use App\Models\FeeType;
use App\Models\GradeLevel;
use App\Models\Student;
use App\Models\Unit;
use App\Models\User;
use Database\Seeders\CoreSeeder;
use Illuminate\Testing\TestResponse;

/** Data uji tagihan. Pakai bersama SchoolFixtures dan FinanceFixtures; panggil setUpInvoiceContext() dari setUp(). */
trait InvoiceFixtures
{
    protected User $tu;

    protected User $superadmin;

    protected User $guru;

    protected AcademicYear $year;

    protected Unit $unitSd;

    protected Unit $unitSmp;

    protected FeeType $spp;

    /** @var array<string, Classroom> */
    protected array $rooms = [];

    protected function setUpInvoiceContext(): void
    {
        $this->seed(CoreSeeder::class);
        $this->tu = $this->actAs('admin_tu_keuangan');
        $this->superadmin = $this->actAs('superadmin');
        $this->guru = $this->actAs('guru');
        $this->year = AcademicYear::where('is_active', true)->first() ?? $this->makeYear();
        $this->unitSd = Unit::where('code', 'SD')->firstOrFail();
        $this->unitSmp = Unit::where('code', 'SMP')->firstOrFail();
        $this->spp = FeeType::where('code', 'SPP')->firstOrFail();
    }

    protected function sdStudent(string $name, string $grade = '1'): Student
    {
        $this->rooms["SD-$grade"] ??= $this->makeClassroom('SD', $grade, $grade.'A');

        return $this->makeStudent(['name' => $name], $this->rooms["SD-$grade"]);
    }

    protected function smpStudent(string $name): Student
    {
        $code = GradeLevel::where('unit_id', $this->unitSmp->id)->orderBy('sort_order')->firstOrFail()->code;
        $this->rooms['SMP'] ??= $this->makeClassroom('SMP', $code, 'A');

        return $this->makeStudent(['name' => $name], $this->rooms['SMP']);
    }

    protected function sdGradeId(string $code): int
    {
        return GradeLevel::where('unit_id', $this->unitSd->id)->where('code', $code)->firstOrFail()->id;
    }

    /** Tarif SPP untuk SD; tanpa $gradeLevelId berlaku untuk semua tingkat. */
    protected function sppRate(int $amount, ?int $gradeLevelId = null): FeeRate
    {
        return $this->makeFeeRate([
            'fee_type_id' => $this->spp->id,
            'unit_id' => $this->unitSd->id,
            'grade_level_id' => $gradeLevelId,
            'academic_year_id' => $this->year->id,
            'amount' => $amount,
        ]);
    }

    protected function generateAs(User $user, array $payload = []): TestResponse
    {
        return $this->actingAs($user)->postJson('/api/v1/invoices/generate', array_merge([
            'unit_id' => $this->unitSd->id,
            'month' => '2026-10',
        ], $payload));
    }
}
