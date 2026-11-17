<?php

namespace App\Http\Requests\Finance;

use App\Enums\PaymentMethod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // dijaga middleware can:finance.manage
    }

    public function rules(): array
    {
        return [
            'student_id' => ['required', 'integer', Rule::exists('students', 'id')->whereNull('deleted_at')],
            // Tanggal pembayaran tidak boleh di masa depan (menurut hari di zona waktu aplikasi, Asia/Jakarta).
            'payment_date' => ['required', 'date_format:Y-m-d', 'before_or_equal:'.now()->toDateString()],
            'method' => ['required', Rule::enum(PaymentMethod::class)],
            'amount' => ['nullable', 'integer', 'min:1', 'max:9999999999'],
            'reference' => [
                'nullable', 'string', 'max:100',
                Rule::requiredIf(fn () => $this->input('method') === PaymentMethod::Transfer->value),
            ],
            'notes' => ['nullable', 'string', 'max:500'],
            'allocations' => ['nullable', 'array', 'max:50'],
            'allocations.*.invoice_id' => ['required', 'integer', 'exists:invoices,id', 'distinct'],
            'allocations.*.amount' => ['required', 'integer', 'min:1', 'max:9999999999'],
        ];
    }

    public function messages(): array
    {
        return [
            'payment_date.required' => 'Tanggal pembayaran wajib diisi.',
            'payment_date.before_or_equal' => 'Tanggal pembayaran tidak boleh melewati hari ini.',
            'method.required' => 'Metode pembayaran wajib dipilih.',
            'reference.required' => 'Nomor referensi/bukti transfer wajib diisi untuk pembayaran transfer.',
            'amount.min' => 'Nominal minimal Rp 1.',
            'allocations.*.invoice_id.distinct' => 'Tagihan tidak boleh dobel dalam satu pembayaran.',
            'allocations.*.amount.min' => 'Nominal alokasi minimal Rp 1.',
        ];
    }
}
