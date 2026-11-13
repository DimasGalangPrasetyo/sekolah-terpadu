<?php

namespace App\Http\Requests\Finance;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class InvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // dijaga middleware can:finance.manage
    }

    public function rules(): array
    {
        return [
            'student_id' => ['required', 'integer', Rule::exists('students', 'id')->whereNull('deleted_at')],
            'academic_year_id' => ['nullable', 'integer', 'exists:academic_years,id'],
            'due_date' => ['nullable', 'date_format:Y-m-d'],
            'notes' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1', 'max:20'],
            'items.*.fee_type_id' => ['required', 'integer', 'exists:fee_types,id', 'distinct'],
            'items.*.quantity' => ['nullable', 'integer', 'min:1', 'max:100'],
            'items.*.unit_price' => ['nullable', 'integer', 'min:1', 'max:9999999999'],
            'items.*.description' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'items.required' => 'Minimal satu item tagihan.',
            'items.min' => 'Minimal satu item tagihan.',
            'items.*.fee_type_id.distinct' => 'Jenis biaya tidak boleh dobel dalam satu tagihan.',
            'items.*.unit_price.min' => 'Nominal minimal Rp 1.',
        ];
    }
}
