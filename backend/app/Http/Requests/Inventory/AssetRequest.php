<?php

namespace App\Http\Requests\Inventory;

use App\Enums\AssetCondition;
use App\Enums\AssetStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('asset')?->id;

        return [
            'code' => [
                'nullable',
                'string',
                'max:40',
                Rule::unique('assets', 'code')->ignore($id),
            ],
            'name' => ['required', 'string', 'max:150'],
            'asset_category_id' => ['required', 'integer', 'exists:asset_categories,id'],
            'unit_id' => ['nullable', 'integer', 'exists:units,id'],
            'location_id' => ['nullable', 'integer', 'exists:locations,id'],
            'quantity' => ['required', 'integer', 'min:1'],
            'unit_label' => ['nullable', 'string', 'max:20'],
            'acquisition_date' => ['nullable', 'date'],
            'acquisition_source' => ['nullable', 'string', 'max:100'],
            'acquisition_cost' => ['nullable', 'integer', 'min:0'],
            'item_condition' => ['nullable', Rule::enum(AssetCondition::class)],
            'responsible_staff_id' => [
                'nullable',
                'integer',
                Rule::exists('staff', 'id')->where(fn ($query) => $query->where('is_active', true)->whereNull('deleted_at')),
            ],
            'photo_path' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::enum(AssetStatus::class)],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'code.unique' => 'Kode aset sudah digunakan.',
            'responsible_staff_id.exists' => 'Penanggung jawab harus staf aktif yang terdaftar.',
            'quantity.min' => 'Jumlah barang minimal 1.',
        ];
    }

    public function attributes(): array
    {
        return [
            'code' => 'kode aset',
            'name' => 'nama aset',
            'asset_category_id' => 'kategori aset',
            'unit_id' => 'unit',
            'location_id' => 'lokasi',
            'quantity' => 'jumlah',
            'unit_label' => 'satuan',
            'acquisition_date' => 'tanggal perolehan',
            'acquisition_source' => 'sumber perolehan',
            'acquisition_cost' => 'biaya perolehan',
            'item_condition' => 'kondisi barang',
            'responsible_staff_id' => 'penanggung jawab',
            'status' => 'status',
            'notes' => 'catatan',
        ];
    }
}
