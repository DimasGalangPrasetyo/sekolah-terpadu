<?php

namespace Tests\Feature\Finance;

use App\Enums\DiscountType;
use App\Models\AuditLog;
use App\Models\FeeType;
use App\Models\Invoice;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\FinanceFixtures;
use Tests\Concerns\InvoiceFixtures;
use Tests\Concerns\SchoolFixtures;
use Tests\TestCase;

class InvoiceManualVoidTest extends TestCase
{
    use FinanceFixtures, InvoiceFixtures, RefreshDatabase, SchoolFixtures;

    private FeeType $pangkal;

    private FeeType $seragam;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpInvoiceContext();
        $this->pangkal = FeeType::where('code', 'UANG_PANGKAL')->firstOrFail();
        $this->seragam = FeeType::where('code', 'SERAGAM')->firstOrFail();
    }

    private function storeInvoice(array $payload)
    {
        return $this->actingAs($this->tu)->postJson('/api/v1/invoices', $payload);
    }

    public function test_buat_tagihan_manual_dengan_nominal_sendiri(): void
    {
        $siswa = $this->sdStudent('Andi');

        $this->storeInvoice([
            'student_id' => $siswa->id,
            'due_date' => '2026-11-30',
            'notes' => 'Siswa baru',
            'items' => [['fee_type_id' => $this->pangkal->id, 'unit_price' => 5000000]],
        ])->assertCreated()
            ->assertJsonPath('data.kind', 'one_time')
            ->assertJsonPath('data.status', 'unpaid')
            ->assertJsonPath('data.total_amount', 5000000)
            ->assertJsonPath('data.outstanding', 5000000)
            ->assertJsonPath('data.due_date', '2026-11-30')
            ->assertJsonPath('data.unit.code', 'SD')
            ->assertJsonPath('data.items.0.description', 'Uang Pangkal')
            ->assertJsonPath('data.items.0.unit_price', 5000000);

        $invoice = Invoice::firstOrFail();
        $this->assertNull($invoice->period_month);
        $this->assertNull($invoice->active_period);
        $this->assertSame($this->tu->id, (int) $invoice->created_by);
        $this->assertMatchesRegularExpression('#^INV/\d{4}/\d{2}/\d{4}$#', $invoice->number);

        $this->assertSame(1, AuditLog::where('event', 'created')->where('auditable_type', $invoice->getMorphClass())->count());
    }

    public function test_nominal_diambil_dari_tarif_bila_tidak_diisi(): void
    {
        $siswa = $this->sdStudent('Andi');
        $this->makeFeeRate([
            'fee_type_id' => $this->pangkal->id,
            'unit_id' => $this->unitSd->id,
            'academic_year_id' => $this->year->id,
            'amount' => 4000000,
        ]);

        $this->storeInvoice([
            'student_id' => $siswa->id,
            'items' => [['fee_type_id' => $this->pangkal->id]],
        ])->assertCreated()->assertJsonPath('data.total_amount', 4000000);
    }

    public function test_tanpa_tarif_dan_tanpa_nominal_ditolak(): void
    {
        $siswa = $this->sdStudent('Andi');

        $this->storeInvoice([
            'student_id' => $siswa->id,
            'items' => [['fee_type_id' => $this->pangkal->id]],
        ])->assertStatus(422)->assertJsonValidationErrors(['items.0.unit_price']);

        $this->assertSame(0, Invoice::count());
    }

    public function test_tagihan_sekali_bayar_ganda_ditolak_dan_boleh_lagi_setelah_void(): void
    {
        $siswa = $this->sdStudent('Andi');
        $payload = [
            'student_id' => $siswa->id,
            'items' => [['fee_type_id' => $this->pangkal->id, 'unit_price' => 5000000]],
        ];

        $id = $this->storeInvoice($payload)->assertCreated()->json('data.id');
        $this->storeInvoice($payload)->assertStatus(422)->assertJsonValidationErrors(['items.0.fee_type_id']);

        $this->actingAs($this->tu)->postJson("/api/v1/invoices/$id/void", ['reason' => 'Salah input'])->assertOk();
        $this->storeInvoice($payload)->assertCreated();

        $this->assertSame(2, Invoice::count());
    }

    public function test_biaya_bulanan_tidak_boleh_lewat_tagihan_manual(): void
    {
        $siswa = $this->sdStudent('Andi');

        $this->storeInvoice([
            'student_id' => $siswa->id,
            'items' => [['fee_type_id' => $this->spp->id, 'unit_price' => 300000]],
        ])->assertStatus(422)->assertJsonValidationErrors(['items.0.fee_type_id']);
    }

    public function test_jenis_biaya_nonaktif_ditolak(): void
    {
        $siswa = $this->sdStudent('Andi');
        $this->pangkal->update(['is_active' => false]);

        $this->storeInvoice([
            'student_id' => $siswa->id,
            'items' => [['fee_type_id' => $this->pangkal->id, 'unit_price' => 5000000]],
        ])->assertStatus(422)->assertJsonValidationErrors(['items.0.fee_type_id']);
    }

    public function test_diskon_nominal_umum_dihabiskan_antarbaris_dan_kuantitas(): void
    {
        $siswa = $this->sdStudent('Andi');
        $this->makeDiscount(['student_id' => $siswa->id, 'fee_type_id' => null, 'type' => DiscountType::Fixed, 'value' => 1200000]);

        $this->storeInvoice([
            'student_id' => $siswa->id,
            'items' => [
                ['fee_type_id' => $this->pangkal->id, 'unit_price' => 1000000],
                ['fee_type_id' => $this->seragam->id, 'unit_price' => 250000, 'quantity' => 2],
            ],
        ])->assertCreated()
            ->assertJsonPath('data.items.0.discount_amount', 1000000)
            ->assertJsonPath('data.items.0.subtotal', 0)
            ->assertJsonPath('data.items.1.quantity', 2)
            ->assertJsonPath('data.items.1.discount_amount', 200000)
            ->assertJsonPath('data.items.1.subtotal', 300000)
            ->assertJsonPath('data.total_amount', 300000);
    }

    public function test_siswa_tanpa_rombel_atau_nonaktif_ditolak(): void
    {
        $tanpaRombel = $this->makeStudent(['name' => 'Tanpa Rombel']);
        $nonaktif = $this->sdStudent('Nonaktif');
        $nonaktif->update(['status' => 'inactive']);
        $item = [['fee_type_id' => $this->pangkal->id, 'unit_price' => 1000000]];

        $this->storeInvoice(['student_id' => $tanpaRombel->id, 'items' => $item])
            ->assertStatus(422)->assertJsonValidationErrors(['student_id']);
        $this->storeInvoice(['student_id' => $nonaktif->id, 'items' => $item])
            ->assertStatus(422)->assertJsonValidationErrors(['student_id']);
    }

    public function test_validasi_item(): void
    {
        $siswa = $this->sdStudent('Andi');

        $this->storeInvoice(['student_id' => $siswa->id, 'items' => []])
            ->assertStatus(422)->assertJsonValidationErrors(['items']);

        $this->storeInvoice(['student_id' => $siswa->id, 'items' => [
            ['fee_type_id' => $this->pangkal->id, 'unit_price' => 1000],
            ['fee_type_id' => $this->pangkal->id, 'unit_price' => 2000],
        ]])->assertStatus(422)->assertJsonValidationErrors(['items.1.fee_type_id']);

        $this->storeInvoice(['student_id' => $siswa->id, 'items' => [
            ['fee_type_id' => $this->pangkal->id, 'unit_price' => 0],
        ]])->assertStatus(422)->assertJsonValidationErrors(['items.0.unit_price']);
    }

    public function test_void_berhasil(): void
    {
        $id = $this->makeManualInvoice();

        $this->actingAs($this->tu)->postJson("/api/v1/invoices/$id/void", ['reason' => 'Salah input data'])->assertOk()
            ->assertJsonPath('data.status', 'void')
            ->assertJsonPath('data.outstanding', 0)
            ->assertJsonPath('data.void_reason', 'Salah input data');

        $invoice = Invoice::findOrFail($id);
        $this->assertNotNull($invoice->voided_at);
        $this->assertSame($this->tu->id, (int) $invoice->voided_by);
        $this->assertNull($invoice->active_period);
    }

    public function test_void_dua_kali_ditolak(): void
    {
        $id = $this->makeManualInvoice();

        $this->actingAs($this->tu)->postJson("/api/v1/invoices/$id/void", ['reason' => 'Salah input data'])->assertOk();
        $this->actingAs($this->tu)->postJson("/api/v1/invoices/$id/void", ['reason' => 'Salah input data'])->assertStatus(409);
    }

    public function test_void_ditolak_bila_sudah_ada_pembayaran(): void
    {
        $id = $this->makeManualInvoice();
        Invoice::whereKey($id)->update(['paid_amount' => 100000, 'status' => 'partial']);

        $this->actingAs($this->tu)->postJson("/api/v1/invoices/$id/void", ['reason' => 'Salah input data'])->assertStatus(409);

        $this->assertSame('partial', Invoice::findOrFail($id)->status->value);
    }

    public function test_void_wajib_alasan(): void
    {
        $id = $this->makeManualInvoice();

        $this->actingAs($this->tu)->postJson("/api/v1/invoices/$id/void", [])->assertStatus(422)->assertJsonValidationErrors(['reason']);
        $this->actingAs($this->tu)->postJson("/api/v1/invoices/$id/void", ['reason' => 'abc'])->assertStatus(422)->assertJsonValidationErrors(['reason']);
    }

    public function test_izin_tulis_tagihan(): void
    {
        $this->postJson('/api/v1/invoices', ['student_id' => 1, 'items' => []])->assertStatus(401);
        $this->postJson('/api/v1/invoices/1/void', ['reason' => 'Salah input data'])->assertStatus(401);

        $id = $this->makeManualInvoice();
        $siswa = $this->sdStudent('Budi');
        $payload = ['student_id' => $siswa->id, 'items' => [['fee_type_id' => $this->pangkal->id, 'unit_price' => 1000000]]];

        foreach ([$this->guru, $this->superadmin] as $user) {
            $this->actingAs($user)->postJson('/api/v1/invoices', $payload)->assertStatus(403);
            $this->actingAs($user)->postJson("/api/v1/invoices/$id/void", ['reason' => 'Salah input data'])->assertStatus(403);
        }

        $this->assertSame('unpaid', Invoice::findOrFail($id)->status->value);
    }

    private function makeManualInvoice(): int
    {
        $siswa = $this->sdStudent('Andi');

        return (int) $this->storeInvoice([
            'student_id' => $siswa->id,
            'items' => [['fee_type_id' => $this->pangkal->id, 'unit_price' => 5000000]],
        ])->assertCreated()->json('data.id');
    }
}
