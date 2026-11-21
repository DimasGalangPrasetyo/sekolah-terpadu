<?php

namespace App\Http\Requests\Finance;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CashTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // dijaga middleware can:finance.manage
    }

    public function rules(): array
    {
        return [
            // Tanggal transaksi tidak boleh melewati hari ini (menurut hari di zona waktu aplikasi, Asia/Jakarta).
            'transaction_date' => ['required', 'date_format:Y-m-d', 'before_or_equal:'.now()->toDateString()],
            'cash_category_id' => ['required', 'integer', Rule::exists('cash_categories', 'id')],
            'unit_id' => ['nullable', 'integer', Rule::exists('units', 'id')],
            'amount' => ['required', 'integer', 'min:1', 'max:9999999999'],
            'description' => ['required', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'transaction_date.required' => 'Tanggal transaksi wajib diisi.',
            'transaction_date.date_format' => 'Format tanggal transaksi harus YYYY-MM-DD.',
            'transaction_date.before_or_equal' => 'Tanggal transaksi tidak boleh melewati hari ini.',
            'cash_category_id.required' => 'Kategori kas wajib dipilih.',
            'cash_category_id.exists' => 'Kategori kas tidak valid.',
            'unit_id.exists' => 'Unit tidak valid.',
            'amount.required' => 'Nominal wajib diisi.',
            'amount.integer' => 'Nominal harus berupa bilangan bulat.',
            'amount.min' => 'Nominal transaksi minimal Rp 1.',
            'amount.max' => 'Nominal transaksi melebihi batas maksimal.',
            'description.required' => 'Keterangan transaksi wajib diisi.',
            'description.max' => 'Keterangan transaksi maksimal 255 karakter.',
        ];
    }
}
