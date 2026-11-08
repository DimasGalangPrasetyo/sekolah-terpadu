<?php

namespace App\Http\Requests\Finance;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class FeeRateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // dijaga middleware can:finance.manage
    }

    public function rules(): array
    {
        $feeRate = $this->route('feeRate');

        if ($this->isMethod('POST')) {
            return [
                'fee_type_id' => ['required', 'integer', 'exists:fee_types,id'],
                'unit_id' => ['required', 'integer', 'exists:units,id'],
                'grade_level_id' => ['nullable', 'integer', 'exists:grade_levels,id'],
                'academic_year_id' => ['required', 'integer', 'exists:academic_years,id'],
                'amount' => ['required', 'integer', 'min:1', 'max:9999999999'],
            ];
        }

        // PUT: hanya amount yang boleh diubah; kunci lain bila dikirim harus sama persis
        return [
            'fee_type_id' => ['sometimes', 'integer', Rule::in([$feeRate?->fee_type_id])],
            'unit_id' => ['sometimes', 'integer', Rule::in([$feeRate?->unit_id])],
            'grade_level_id' => [
                'sometimes',
                function (string $attribute, mixed $value, \Closure $fail) use ($feeRate) {
                    $expected = $feeRate?->grade_level_id;
                    $val = ($value === '' || $value === null) ? null : (int) $value;
                    if ($val !== $expected) {
                        $fail('Tingkat kelas tidak dapat diubah.');
                    }
                },
            ],
            'academic_year_id' => ['sometimes', 'integer', Rule::in([$feeRate?->academic_year_id])],
            'amount' => ['required', 'integer', 'min:1', 'max:9999999999'],
        ];
    }

    public function messages(): array
    {
        return [
            'amount.min' => 'Jumlah tarif minimal Rp 1 (tidak boleh Rp 0).',
            'amount.max' => 'Jumlah tarif terlalu besar.',
            'fee_type_id.in' => 'Jenis biaya tidak dapat diubah.',
            'unit_id.in' => 'Unit tidak dapat diubah.',
            'grade_level_id.in' => 'Tingkat kelas tidak dapat diubah.',
            'academic_year_id.in' => 'Tahun ajaran tidak dapat diubah.',
        ];
    }
}
