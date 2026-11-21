<?php

namespace App\Http\Requests\Finance;

use App\Enums\CashType;
use App\Models\CashCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

class CashCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // dijaga middleware can:finance.manage
    }

    public function rules(): array
    {
        /** @var CashCategory|null $category */
        $category = $this->route('cashCategory') ?? $this->route('cash_category');
        $isPost = $this->isMethod('POST');

        $type = $isPost
            ? $this->input('type')
            : ($category?->type instanceof CashType ? $category->type->value : $category?->type);

        $rules = [
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('cash_categories', 'name')
                    ->where(fn ($query) => $type ? $query->where('type', $type) : $query)
                    ->ignore($category?->id),
            ],
        ];

        if ($isPost) {
            $rules['type'] = ['required', new Enum(CashType::class)];
        } else {
            $rules['type'] = [
                'sometimes',
                function (string $attribute, mixed $value, \Closure $fail) use ($category) {
                    $currentType = $category?->type instanceof CashType ? $category->type->value : $category?->type;
                    if ($category && $value !== $currentType) {
                        $fail('Jenis kategori kas tidak dapat diubah setelah dibuat.');
                    }
                },
            ];
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Nama kategori kas wajib diisi.',
            'name.max' => 'Nama kategori kas maksimal 100 karakter.',
            'name.unique' => 'Nama kategori kas sudah digunakan untuk jenis kas ini.',
            'type.required' => 'Jenis kategori kas wajib dipilih.',
            'type.Illuminate\Validation\Rules\Enum' => 'Jenis kategori kas tidak valid.',
        ];
    }
}
