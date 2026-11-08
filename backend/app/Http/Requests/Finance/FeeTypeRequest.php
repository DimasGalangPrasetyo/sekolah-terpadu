<?php

namespace App\Http\Requests\Finance;

use App\Enums\FeeCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

class FeeTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // dijaga middleware can:finance.manage
    }

    public function rules(): array
    {
        $feeType = $this->route('feeType');
        $id = $feeType?->id;

        $rules = [
            'name' => ['required', 'string', 'max:100'],
            'category' => ['required', new Enum(FeeCategory::class)],
        ];

        if ($this->isMethod('POST')) {
            // Buat: kode wajib dan unik
            $rules['code'] = [
                'required',
                'string',
                'regex:/^[A-Z][A-Z0-9_]{1,29}$/',
                Rule::unique('fee_types', 'code'),
            ];
        } else {
            // Ubah: tolak bila kode dikirim berbeda dari nilai asal
            $rules['code'] = [
                'sometimes',
                'string',
                function (string $attribute, mixed $value, \Closure $fail) use ($feeType) {
                    if ($feeType && $value !== $feeType->code) {
                        $fail('Kode jenis biaya tidak dapat diubah setelah dibuat.');
                    }
                },
            ];
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'code.regex' => 'Kode harus diawali huruf kapital, hanya huruf kapital, angka, dan garis bawah, panjang 2–30 karakter.',
            'code.unique' => 'Kode sudah dipakai jenis biaya lain.',
            'name.required' => 'Nama jenis biaya wajib diisi.',
            'category.Illuminate\Validation\Rules\Enum' => 'Kategori tidak valid.',
        ];
    }
}
