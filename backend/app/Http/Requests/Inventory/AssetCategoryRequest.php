<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AssetCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('assetCategory')?->id;

        return [
            'code' => [
                'required',
                'string',
                'max:20',
                Rule::unique('asset_categories', 'code')->ignore($id),
            ],
            'name' => ['required', 'string', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'code.unique' => 'Kode kategori sudah digunakan.',
        ];
    }

    public function attributes(): array
    {
        return [
            'code' => 'kode kategori',
            'name' => 'nama kategori',
        ];
    }
}
