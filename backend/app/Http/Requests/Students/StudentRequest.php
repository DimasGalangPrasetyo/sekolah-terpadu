<?php

namespace App\Http\Requests\Students;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // dijaga middleware can:students.manage
    }

    public function rules(): array
    {
        $id = $this->route('student')?->id;

        return [
            'nis' => ['nullable', 'string', 'max:30', Rule::unique('students', 'nis')->ignore($id)],
            'nisn' => ['nullable', 'string', 'max:20', Rule::unique('students', 'nisn')->ignore($id)],
            'name' => ['required', 'string', 'max:150'],
            'gender' => ['required', 'in:L,P'],
            'birth_place' => ['nullable', 'string', 'max:100'],
            'birth_date' => ['nullable', 'date', 'before_or_equal:today'],
            'religion' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:500'],
            'phone' => ['nullable', 'string', 'max:30'],
            'previous_school' => ['nullable', 'string', 'max:150'],
            'entry_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'classroom_id' => ['nullable', 'integer', 'exists:classrooms,id'],
            'guardians' => ['nullable', 'array', 'max:4'],
            'guardians.*.id' => ['nullable', 'integer'],
            'guardians.*.relation' => ['required', 'in:father,mother,guardian'],
            'guardians.*.name' => ['required', 'string', 'max:150'],
            'guardians.*.occupation' => ['nullable', 'string', 'max:100'],
            'guardians.*.phone' => ['nullable', 'string', 'max:30'],
            'guardians.*.address' => ['nullable', 'string', 'max:500'],
            'guardians.*.is_primary_contact' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'nis.unique' => 'NIS sudah dipakai siswa lain.',
            'nisn.unique' => 'NISN sudah dipakai siswa lain.',
            'birth_date.before_or_equal' => 'Tanggal lahir tidak boleh di masa depan.',
            'guardians.max' => 'Maksimal 4 data wali.',
        ];
    }

    public function attributes(): array
    {
        return [
            'guardians.*.name' => 'nama wali',
            'guardians.*.relation' => 'hubungan wali',
        ];
    }
}
