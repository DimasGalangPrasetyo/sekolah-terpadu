<?php

namespace Tests\Feature\Finance;

use App\Models\AcademicYear;
use App\Models\GradeLevel;
use App\Models\Unit;
use App\Models\User;
use App\Services\FeeService;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\FinanceFixtures;
use Tests\Concerns\SchoolFixtures;
use Tests\TestCase;

class FeeRateTest extends TestCase
{
    use FinanceFixtures, RefreshDatabase, SchoolFixtures;

    private User $tu;

    private User $superadmin;

    private User $guru;

    private AcademicYear $year;

    private Unit $unitSd;

    private Unit $unitSmp;

    private GradeLevel $sdGrade1;

    private GradeLevel $smpGrade7;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CoreSeeder::class);
        $this->tu = $this->actAs('admin_tu_keuangan');
        $this->superadmin = $this->actAs('superadmin');
        $this->guru = $this->actAs('guru');
        $this->year = AcademicYear::where('is_active', true)->first() ?? $this->makeYear();

        $this->unitSd = Unit::where('code', 'SD')->firstOrFail();
        $this->unitSmp = Unit::where('code', 'SMP')->firstOrFail();
        $this->sdGrade1 = GradeLevel::where('unit_id', $this->unitSd->id)->firstOrFail();
        $this->smpGrade7 = GradeLevel::where('unit_id', $this->unitSmp->id)->firstOrFail();
    }

    public function test_daftar_default_tahun_ajaran_aktif_dan_filter_unit(): void
    {
        $otherYear = $this->makeYear('2025/2026', false);

        $rateActiveYear = $this->makeFeeRate([
            'unit_id' => $this->unitSd->id,
            'academic_year_id' => $this->year->id,
            'amount' => 100000,
        ]);
        $rateOtherYear = $this->makeFeeRate([
            'unit_id' => $this->unitSd->id,
            'academic_year_id' => $otherYear->id,
            'amount' => 90000,
        ]);
        $rateSmp = $this->makeFeeRate([
            'unit_id' => $this->unitSmp->id,
            'academic_year_id' => $this->year->id,
            'amount' => 150000,
        ]);

        // Default: tahun ajaran aktif
        $resDefault = $this->actingAs($this->tu)->getJson('/api/v1/fee-rates');
        $resDefault->assertOk();
        $ids = collect($resDefault->json('data'))->pluck('id');
        $this->assertTrue($ids->contains($rateActiveYear->id));
        $this->assertTrue($ids->contains($rateSmp->id));
        $this->assertFalse($ids->contains($rateOtherYear->id));

        // Filter unit=SD
        $resSd = $this->actingAs($this->tu)->getJson('/api/v1/fee-rates?unit=SD');
        $resSd->assertOk();
        $sdIds = collect($resSd->json('data'))->pluck('id');
        $this->assertTrue($sdIds->contains($rateActiveYear->id));
        $this->assertFalse($sdIds->contains($rateSmp->id));

        // Filter academic_year_id spesifik
        $resOther = $this->actingAs($this->tu)->getJson("/api/v1/fee-rates?academic_year_id={$otherYear->id}");
        $resOther->assertOk();
        $otherIds = collect($resOther->json('data'))->pluck('id');
        $this->assertTrue($otherIds->contains($rateOtherYear->id));
        $this->assertFalse($otherIds->contains($rateActiveYear->id));
    }

    public function test_buat_tarif_per_tingkat(): void
    {
        $feeType = $this->makeFeeType();

        $payload = [
            'fee_type_id' => $feeType->id,
            'unit_id' => $this->unitSd->id,
            'grade_level_id' => $this->sdGrade1->id,
            'academic_year_id' => $this->year->id,
            'amount' => 250000,
        ];

        $this->actingAs($this->tu)->postJson('/api/v1/fee-rates', $payload)
            ->assertCreated()
            ->assertJsonPath('data.amount', 250000)
            ->assertJsonPath('data.unit.code', 'SD')
            ->assertJsonPath('data.grade_level.id', $this->sdGrade1->id);

        $this->assertDatabaseHas('fee_rates', [
            'fee_type_id' => $feeType->id,
            'unit_id' => $this->unitSd->id,
            'grade_level_id' => $this->sdGrade1->id,
            'academic_year_id' => $this->year->id,
            'amount' => 250000,
        ]);
    }

    public function test_buat_tarif_semua_tingkat_null(): void
    {
        $feeType = $this->makeFeeType();

        $payload = [
            'fee_type_id' => $feeType->id,
            'unit_id' => $this->unitSd->id,
            'grade_level_id' => null,
            'academic_year_id' => $this->year->id,
            'amount' => 300000,
        ];

        $this->actingAs($this->tu)->postJson('/api/v1/fee-rates', $payload)
            ->assertCreated()
            ->assertJsonPath('data.grade_level', null)
            ->assertJsonPath('data.amount', 300000);
    }

    public function test_duplikat_null_ditolak(): void
    {
        $feeType = $this->makeFeeType();

        $this->makeFeeRate([
            'fee_type_id' => $feeType->id,
            'unit_id' => $this->unitSd->id,
            'grade_level_id' => null,
            'academic_year_id' => $this->year->id,
        ]);

        $this->actingAs($this->tu)->postJson('/api/v1/fee-rates', [
            'fee_type_id' => $feeType->id,
            'unit_id' => $this->unitSd->id,
            'grade_level_id' => null,
            'academic_year_id' => $this->year->id,
            'amount' => 350000,
        ])->assertStatus(422);
    }

    public function test_tingkat_bukan_milik_unit_ditolak(): void
    {
        $feeType = $this->makeFeeType();

        // Mengirim unit SD tetapi grade_level_id milik SMP
        $this->actingAs($this->tu)->postJson('/api/v1/fee-rates', [
            'fee_type_id' => $feeType->id,
            'unit_id' => $this->unitSd->id,
            'grade_level_id' => $this->smpGrade7->id,
            'academic_year_id' => $this->year->id,
            'amount' => 200000,
        ])->assertStatus(422);
    }

    public function test_amount_nol_atau_negatif_ditolak(): void
    {
        $feeType = $this->makeFeeType();

        $this->actingAs($this->tu)->postJson('/api/v1/fee-rates', [
            'fee_type_id' => $feeType->id,
            'unit_id' => $this->unitSd->id,
            'academic_year_id' => $this->year->id,
            'amount' => 0,
        ])->assertStatus(422)->assertJsonValidationErrors(['amount']);
    }

    public function test_ubah_amount(): void
    {
        $rate = $this->makeFeeRate(['amount' => 100000]);

        $this->actingAs($this->tu)->putJson("/api/v1/fee-rates/{$rate->id}", [
            'amount' => 150000,
        ])->assertOk()
            ->assertJsonPath('data.amount', 150000);

        $this->assertSame(150000, $rate->fresh()->amount);
    }

    public function test_ubah_kunci_ditolak(): void
    {
        $rate = $this->makeFeeRate([
            'unit_id' => $this->unitSd->id,
            'grade_level_id' => null,
            'amount' => 100000,
        ]);

        // Mengirim unit berbeda
        $this->actingAs($this->tu)->putJson("/api/v1/fee-rates/{$rate->id}", [
            'unit_id' => $this->unitSmp->id,
            'amount' => 120000,
        ])->assertStatus(422);

        // Mengirim grade_level_id berbeda
        $this->actingAs($this->tu)->putJson("/api/v1/fee-rates/{$rate->id}", [
            'grade_level_id' => $this->sdGrade1->id,
            'amount' => 120000,
        ])->assertStatus(422);
    }

    public function test_jenis_biaya_nonaktif_ditolak(): void
    {
        $inactiveFeeType = $this->makeFeeType(['is_active' => false]);

        $this->actingAs($this->tu)->postJson('/api/v1/fee-rates', [
            'fee_type_id' => $inactiveFeeType->id,
            'unit_id' => $this->unitSd->id,
            'academic_year_id' => $this->year->id,
            'amount' => 100000,
        ])->assertStatus(422);
    }

    public function test_hapus_tarif(): void
    {
        $rate = $this->makeFeeRate();

        $this->actingAs($this->tu)->deleteJson("/api/v1/fee-rates/{$rate->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('fee_rates', ['id' => $rate->id]);
    }

    public function test_resolver_tarif(): void
    {
        $service = app(FeeService::class);
        $feeType = $this->makeFeeType();

        // Kasus 1: Belum ada tarif -> null
        $this->assertNull($service->resolveRate($feeType, $this->unitSd->id, $this->sdGrade1->id, $this->year->id));

        // Kasus 2: Hanya ada tarif semua tingkat (NULL) -> fallback ke NULL
        $fallbackRate = $this->makeFeeRate([
            'fee_type_id' => $feeType->id,
            'unit_id' => $this->unitSd->id,
            'grade_level_id' => null,
            'academic_year_id' => $this->year->id,
            'amount' => 120000,
        ]);

        $resolvedFallback = $service->resolveRate($feeType, $this->unitSd->id, $this->sdGrade1->id, $this->year->id);
        $this->assertNotNull($resolvedFallback);
        $this->assertSame($fallbackRate->id, $resolvedFallback->id);
        $this->assertSame(120000, $resolvedFallback->amount);

        // Kasus 3: Ada tarif spesifik tingkat -> memilih tarif spesifik
        $specificRate = $this->makeFeeRate([
            'fee_type_id' => $feeType->id,
            'unit_id' => $this->unitSd->id,
            'grade_level_id' => $this->sdGrade1->id,
            'academic_year_id' => $this->year->id,
            'amount' => 150000,
        ]);

        $resolvedSpecific = $service->resolveRate($feeType, $this->unitSd->id, $this->sdGrade1->id, $this->year->id);
        $this->assertNotNull($resolvedSpecific);
        $this->assertSame($specificRate->id, $resolvedSpecific->id);
        $this->assertSame(150000, $resolvedSpecific->amount);
    }

    public function test_izin_tarif(): void
    {
        $rate = $this->makeFeeRate();

        // 401 unauthenticated
        $this->getJson('/api/v1/fee-rates')->assertStatus(401);
        $this->postJson('/api/v1/fee-rates', [])->assertStatus(401);

        // 403 guru
        $this->actingAs($this->guru)->getJson('/api/v1/fee-rates')->assertStatus(403);
        $this->actingAs($this->guru)->postJson('/api/v1/fee-rates', [])->assertStatus(403);

        // Superadmin: 200 baca, 403 tulis
        $this->actingAs($this->superadmin)->getJson('/api/v1/fee-rates')->assertStatus(200);
        $this->actingAs($this->superadmin)->postJson('/api/v1/fee-rates', [
            'fee_type_id' => $rate->fee_type_id,
            'unit_id' => $this->unitSd->id,
            'academic_year_id' => $this->year->id,
            'amount' => 200000,
        ])->assertStatus(403);
        $this->actingAs($this->superadmin)->putJson("/api/v1/fee-rates/{$rate->id}", ['amount' => 200000])->assertStatus(403);
        $this->actingAs($this->superadmin)->deleteJson("/api/v1/fee-rates/{$rate->id}")->assertStatus(403);
    }
}
