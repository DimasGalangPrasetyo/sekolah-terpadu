<?php

namespace App\Http\Requests\Finance;

use App\Enums\DiscountType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

class StudentDiscountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // dijaga middleware can:finance.manage
    }

    public function rules(): array
    {
        $discount = $this->route('studentDiscount');

        $rules = [
            'fee_type_id' => ['nullable', 'integer', 'exists:fee_types,id'],
            'type' => ['required', new Enum(DiscountType::class)],
            'value' => [
                'required',
                'integer',
                'min:1',
                function (string $attribute, mixed $value, \Closure $fail) {
                    $type = $this->input('type');
                    if ($type === DiscountType::Percent->value || $type === 'percent') {
                        if ((int) $value > 100) {
                            $fail('Nilai diskon persen maksimal 100%.');
                        }
                    }
                },
            ],
            'reason' => ['nullable', 'string', 'max:500'],
        ];

        if ($this->isMethod('POST')) {
            $rules['student_id'] = ['required', 'integer', 'exists:students,id'];
            $rules['academic_year_id'] = ['required', 'integer', 'exists:academic_years,id'];
        } else {
            $rules['student_id'] = ['sometimes', 'integer', Rule::in([$discount?->student_id])];
            $rules['academic_year_id'] = ['sometimes', 'integer', Rule::in([$discount?->academic_year_id])];
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'value.min' => 'Nilai diskon minimal 1.',
            'student_id.in' => 'Siswa tidak dapat diubah.',
            'academic_year_id.in' => 'Tahun ajaran tidak dapat diubah.',
            'type.Illuminate\Validation\Rules\Enum' => 'Tipe diskon harus fixed atau percent.',
        ];
    }
}
