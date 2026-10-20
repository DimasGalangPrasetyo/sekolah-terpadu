<?php

namespace App\Http\Requests\Inventory;

use App\Enums\AssetMovementType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AssetMovementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['required', Rule::enum(AssetMovementType::class)],
            'moved_at' => ['required', 'date'],
            'to_location_id' => [
                'nullable',
                'required_if:type,move',
                'integer',
                'exists:locations,id',
            ],
            'to_condition' => [
                'nullable',
                'required_if:type,condition',
                Rule::in(['good', 'light_damage', 'heavy_damage', 'lost']),
            ],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'to_location_id.required_if' => 'Lokasi tujuan wajib dipilih jika jenis riwayat adalah perpindahan.',
            'to_condition.required_if' => 'Kondisi tujuan wajib dipilih jika jenis riwayat adalah perubahan kondisi.',
            'to_condition.in' => 'Kondisi tujuan harus berupa salah satu dari: baik, rusak ringan, rusak berat, atau hilang.',
        ];
    }

    public function attributes(): array
    {
        return [
            'type' => 'jenis riwayat',
            'moved_at' => 'tanggal pencatatan',
            'to_location_id' => 'lokasi tujuan',
            'to_condition' => 'kondisi tujuan',
            'notes' => 'catatan',
        ];
    }
}
