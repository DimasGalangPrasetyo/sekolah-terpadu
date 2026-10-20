<?php

namespace App\Http\Requests\Staff;

use App\Enums\EmploymentStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StaffRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Dijaga middleware can:staff.manage
    }

    public function rules(): array
    {
        $id = $this->route('staff')?->id;

        return [
            'nip' => ['nullable', 'string', 'max:50', Rule::unique('staff', 'nip')->ignore($id)],
            'nuptk' => ['nullable', 'string', 'max:50', Rule::unique('staff', 'nuptk')->ignore($id)],
            'name' => ['required', 'string', 'max:150'],
            'gender' => ['required', 'in:L,P'],
            'birth_place' => ['nullable', 'string', 'max:100'],
            'birth_date' => ['nullable', 'date', 'before_or_equal:today'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:150'],
            'address' => ['nullable', 'string', 'max:500'],
            'position' => ['required', 'string', 'max:100'],
            'employment_status' => ['required', Rule::enum(EmploymentStatus::class)],
            'join_date' => ['nullable', 'date'],
            'education' => ['nullable', 'string', 'max:100'],
            'is_teacher' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'assignments' => ['nullable', 'array'],
            'assignments.*.id' => ['nullable', 'integer'],
            'assignments.*.unit_id' => ['required', 'integer', 'exists:units,id'],
            'assignments.*.role_title' => ['required', 'string', 'max:100'],
            'assignments.*.start_date' => ['nullable', 'date'],
            'assignments.*.end_date' => [
                'nullable',
                'date',
                function (string $attribute, mixed $value, \Closure $fail) {
                    $parts = explode('.', $attribute);
                    $index = $parts[1] ?? null;
                    if ($index !== null) {
                        $start = $this->input("assignments.{$index}.start_date");
                        if ($start && $value && $value < $start) {
                            $fail('Tanggal selesai penugasan harus sama atau setelah tanggal mulai.');
                        }
                    }
                },
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'nip.unique' => 'NIP sudah dipakai staf lain.',
            'nuptk.unique' => 'NUPTK sudah dipakai staf lain.',
            'birth_date.before_or_equal' => 'Tanggal lahir tidak boleh di masa depan.',
        ];
    }

    public function attributes(): array
    {
        return [
            'assignments.*.unit_id' => 'unit penugasan',
            'assignments.*.role_title' => 'peran penugasan',
            'assignments.*.start_date' => 'tanggal mulai penugasan',
            'assignments.*.end_date' => 'tanggal selesai penugasan',
        ];
    }
}
