<?php

namespace Tests\Feature\Finance;

use App\Enums\FeeCategory;
use App\Models\AcademicYear;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Unit;
use App\Models\User;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\FinanceFixtures;
use Tests\Concerns\SchoolFixtures;
use Tests\TestCase;

class FeeTypeTest extends TestCase
{
    use FinanceFixtures, RefreshDatabase, SchoolFixtures;

    private User $tu;

    private User $superadmin;

    private User $guru;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CoreSeeder::class);
        $this->tu = $this->actAs('admin_tu_keuangan');
        $this->superadmin = $this->actAs('superadmin');
        $this->guru = $this->actAs('guru');
    }

    public function test_daftar_dan_filter_aktif(): void
    {
        $this->makeFeeType(['code' => 'ACTIVE_ONE', 'name' => 'Biaya Aktif', 'is_active' => true]);
        $this->makeFeeType(['code' => 'INACTIVE_ONE', 'name' => 'Biaya Nonaktif', 'is_active' => false]);

        $res = $this->actingAs($this->tu)->getJson('/api/v1/fee-types');
        $res->assertOk();
        $this->assertGreaterThanOrEqual(2, count($res->json('data')));

        $resActive = $this->actingAs($this->tu)->getJson('/api/v1/fee-types?is_active=1');
        $resActive->assertOk();
        $codes = collect($resActive->json('data'))->pluck('code');
        $this->assertTrue($codes->contains('ACTIVE_ONE'));
        $this->assertFalse($codes->contains('INACTIVE_ONE'));

        $resInactive = $this->actingAs($this->tu)->getJson('/api/v1/fee-types?is_active=0');
        $resInactive->assertOk();
        $codesInactive = collect($resInactive->json('data'))->pluck('code');
        $this->assertFalse($codesInactive->contains('ACTIVE_ONE'));
        $this->assertTrue($codesInactive->contains('INACTIVE_ONE'));
    }

    public function test_buat_jenis_biaya_berhasil(): void
    {
        $payload = [
            'code' => 'SPP_SMA',
            'name' => 'SPP SMA Bulanan',
            'category' => 'monthly',
        ];

        $this->actingAs($this->tu)->postJson('/api/v1/fee-types', $payload)
            ->assertCreated()
            ->assertJsonPath('data.code', 'SPP_SMA')
            ->assertJsonPath('data.name', 'SPP SMA Bulanan')
            ->assertJsonPath('data.category', 'monthly')
            ->assertJsonPath('data.is_active', true);

        $this->assertDatabaseHas('fee_types', ['code' => 'SPP_SMA']);
    }

    public function test_kode_duplikat_ditolak(): void
    {
        $this->makeFeeType(['code' => 'DUPLICATE_CODE']);

        $this->actingAs($this->tu)->postJson('/api/v1/fee-types', [
            'code' => 'DUPLICATE_CODE',
            'name' => 'Jenis Duplikat',
            'category' => 'annual',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['code']);
    }

    public function test_format_kode_salah_ditolak(): void
    {
        // Harus diawali huruf kapital, regex ^[A-Z][A-Z0-9_]{1,29}$
        $invalidCodes = ['spp_kecil', '1_ANGKA', 'A', 'KODE SPASI', 'KODE-STRIP'];

        foreach ($invalidCodes as $code) {
            $this->actingAs($this->tu)->postJson('/api/v1/fee-types', [
                'code' => $code,
                'name' => 'Nama Uji',
                'category' => 'one_time',
            ])->assertStatus(422)->assertJsonValidationErrors(['code']);
        }
    }

    public function test_ubah_nama_dan_kategori(): void
    {
        $feeType = $this->makeFeeType(['code' => 'FEE_CHANGE', 'name' => 'Nama Lama', 'category' => FeeCategory::OneTime]);

        $this->actingAs($this->tu)->putJson("/api/v1/fee-types/{$feeType->id}", [
            'name' => 'Nama Baru',
            'category' => 'annual',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Nama Baru')
            ->assertJsonPath('data.category', 'annual')
            ->assertJsonPath('data.code', 'FEE_CHANGE');

        $this->assertSame('Nama Baru', $feeType->fresh()->name);
    }

    public function test_ubah_kode_ditolak(): void
    {
        $feeType = $this->makeFeeType(['code' => 'FEE_IMMUTABLE']);

        $this->actingAs($this->tu)->putJson("/api/v1/fee-types/{$feeType->id}", [
            'code' => 'FEE_MODIFIED',
            'name' => 'Nama Tetap',
            'category' => 'monthly',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['code']);
    }

    public function test_nonaktifkan_dan_aktifkan(): void
    {
        $feeType = $this->makeFeeType(['is_active' => true]);

        $this->actingAs($this->tu)->postJson("/api/v1/fee-types/{$feeType->id}/deactivate")
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->assertFalse($feeType->fresh()->is_active);

        $this->actingAs($this->tu)->postJson("/api/v1/fee-types/{$feeType->id}/activate")
            ->assertOk()
            ->assertJsonPath('data.is_active', true);

        $this->assertTrue($feeType->fresh()->is_active);
    }

    public function test_hapus_berhasil(): void
    {
        $feeType = $this->makeFeeType();

        $this->actingAs($this->tu)->deleteJson("/api/v1/fee-types/{$feeType->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('fee_types', ['id' => $feeType->id]);
    }

    public function test_hapus_ditolak_bila_dipakai_tarif_diskon_atau_tagihan(): void
    {
        // 1. Dipakai tarif
        $feeType1 = $this->makeFeeType();
        $this->makeFeeRate(['fee_type_id' => $feeType1->id]);
        $this->actingAs($this->tu)->deleteJson("/api/v1/fee-types/{$feeType1->id}")
            ->assertStatus(409);

        // 2. Dipakai diskon
        $feeType2 = $this->makeFeeType();
        $this->makeDiscount(['fee_type_id' => $feeType2->id]);
        $this->actingAs($this->tu)->deleteJson("/api/v1/fee-types/{$feeType2->id}")
            ->assertStatus(409);

        // 3. Dipakai item tagihan
        $feeType3 = $this->makeFeeType();
        $student = $this->makeStudent();
        $unit = Unit::where('code', 'SD')->firstOrFail();
        $year = AcademicYear::where('is_active', true)->first() ?? $this->makeYear('2028/2029');
        $invoice = Invoice::create([
            'number' => 'INV/2026/001',
            'student_id' => $student->id,
            'unit_id' => $unit->id,
            'academic_year_id' => $year->id,
            'kind' => 'monthly',
            'total_amount' => 100000,
            'status' => 'unpaid',
            'created_by' => $this->tu->id,
            'due_date' => now()->addDays(10)->toDateString(),
        ]);
        InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'fee_type_id' => $feeType3->id,
            'description' => 'SPP Juli',
            'quantity' => 1,
            'unit_price' => 100000,
            'subtotal' => 100000,
        ]);

        $this->actingAs($this->tu)->deleteJson("/api/v1/fee-types/{$feeType3->id}")
            ->assertStatus(409);
    }

    public function test_izin_jenis_biaya(): void
    {
        $feeType = $this->makeFeeType();

        // Belum login 401
        $this->getJson('/api/v1/fee-types')->assertStatus(401);
        $this->postJson('/api/v1/fee-types', [])->assertStatus(401);

        // Guru 403
        $this->actingAs($this->guru)->getJson('/api/v1/fee-types')->assertStatus(403);
        $this->actingAs($this->guru)->postJson('/api/v1/fee-types', [
            'code' => 'SPP_NEW',
            'name' => 'Baru',
            'category' => 'monthly',
        ])->assertStatus(403);

        // Superadmin: baca 200, tulis 403
        $this->actingAs($this->superadmin)->getJson('/api/v1/fee-types')->assertStatus(200);
        $this->actingAs($this->superadmin)->postJson('/api/v1/fee-types', [
            'code' => 'SPP_NEW',
            'name' => 'Baru',
            'category' => 'monthly',
        ])->assertStatus(403);
        $this->actingAs($this->superadmin)->putJson("/api/v1/fee-types/{$feeType->id}", [
            'name' => 'Baru',
            'category' => 'monthly',
        ])->assertStatus(403);
        $this->actingAs($this->superadmin)->deleteJson("/api/v1/fee-types/{$feeType->id}")->assertStatus(403);
    }
}
