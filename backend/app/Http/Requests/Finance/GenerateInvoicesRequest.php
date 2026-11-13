<?php

namespace App\Http\Requests\Finance;

use Illuminate\Foundation\Http\FormRequest;

class GenerateInvoicesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // dijaga middleware can:finance.manage
    }

    public function rules(): array
    {
        return [
            'unit_id' => ['required', 'integer', 'exists:units,id'],
            'month' => ['required', 'date_format:Y-m'],
            'academic_year_id' => ['nullable', 'integer', 'exists:academic_years,id'],
            'due_date' => ['nullable', 'date_format:Y-m-d'],
            'student_ids' => ['nullable', 'array', 'max:500'],
            'student_ids.*' => ['integer', 'distinct'],
            'dry_run' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'month.required' => 'Bulan tagihan wajib diisi.',
            'month.date_format' => 'Format bulan harus TTTT-BB, contoh 2026-10.',
            'due_date.date_format' => 'Format jatuh tempo harus TTTT-BB-HH.',
        ];
    }
}
