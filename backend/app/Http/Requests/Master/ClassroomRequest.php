<?php

namespace App\Http\Requests\Master;

use App\Models\Classroom;
use App\Models\GradeLevel;
use App\Models\Staff;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ClassroomRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // dijaga middleware can:master.manage
    }

    public function rules(): array
    {
        $current = $this->route('classroom');

        return [
            'unit_id' => ['required', 'integer', 'exists:units,id'],
            'academic_year_id' => ['required', 'integer', 'exists:academic_years,id'],
            'grade_level_id' => [
                'required', 'integer', 'exists:grade_levels,id',
                function (string $attribute, mixed $value, \Closure $fail) {
                    if (! GradeLevel::whereKey($value)->where('unit_id', $this->input('unit_id'))->exists()) {
                        $fail('Tingkat tidak sesuai dengan unit yang dipilih.');
                    }
                },
            ],
            'name' => [
                'required', 'string', 'max:30',
                Rule::unique('classrooms', 'name')
                    ->where('unit_id', $this->input('unit_id'))
                    ->where('academic_year_id', $this->input('academic_year_id'))
                    ->ignore($current?->id),
            ],
            'homeroom_staff_id' => [
                'nullable', 'integer', 'exists:staff,id',
                function (string $attribute, mixed $value, \Closure $fail) use ($current) {
                    if (! $value) {
                        return;
                    }

                    if (! Staff::whereKey($value)->where('is_teacher', true)->where('is_active', true)->exists()) {
                        $fail('Wali kelas harus guru yang masih aktif.');

                        return;
                    }

                    $busy = Classroom::where('academic_year_id', $this->input('academic_year_id'))
                        ->where('homeroom_staff_id', $value)
                        ->when($current, fn ($q) => $q->where('id', '!=', $current->id))
                        ->first();

                    if ($busy) {
                        $fail("Guru ini sudah menjadi wali kelas {$busy->name} pada tahun ajaran tersebut.");
                    }
                },
            ],
            'capacity' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return ['name.unique' => 'Nama rombel sudah dipakai pada unit dan tahun ajaran ini.'];
    }
}
