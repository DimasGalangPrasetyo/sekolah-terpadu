<?php

namespace App\Http\Requests\Students;

use Illuminate\Foundation\Http\FormRequest;

class StudentStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'to_status' => ['required', 'in:active,inactive,transferred,dropped,graduated'],
            'effective_date' => ['required', 'date'],
            'reason' => ['nullable', 'string', 'max:500'],
            'destination_school' => ['required_if:to_status,transferred', 'nullable', 'string', 'max:150'],
            'document_number' => ['nullable', 'string', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return ['destination_school.required_if' => 'Sekolah tujuan wajib diisi untuk siswa yang pindah.'];
    }
}
