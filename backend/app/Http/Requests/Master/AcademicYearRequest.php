<?php

namespace App\Http\Requests\Master;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AcademicYearRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // dijaga middleware can:master.manage
    }

    public function rules(): array
    {
        $id = $this->route('academicYear')?->id;

        return [
            'name' => ['required', 'string', 'max:20', Rule::unique('academic_years', 'name')->ignore($id)],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
            'semesters' => ['required', 'array', 'size:2'],
            'semesters.*.name' => ['required', 'in:ganjil,genap', 'distinct'],
            'semesters.*.start_date' => ['required', 'date'],
            'semesters.*.end_date' => ['required', 'date', 'after_or_equal:semesters.*.start_date'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $start = $this->input('start_date');
            $end = $this->input('end_date');
            $semesters = collect($this->input('semesters'))->keyBy('name');

            foreach ($semesters as $name => $semester) {
                if ($semester['start_date'] < $start || $semester['end_date'] > $end) {
                    $validator->errors()->add('semesters', "Semester {$name} harus berada di dalam rentang tahun ajaran.");
                }
            }

            if ($semesters->has('ganjil') && $semesters->has('genap')
                && $semesters['ganjil']['end_date'] >= $semesters['genap']['start_date']) {
                $validator->errors()->add('semesters', 'Semester ganjil harus berakhir sebelum semester genap dimulai.');
            }
        });
    }

    public function messages(): array
    {
        return [
            'end_date.after' => 'Tanggal akhir harus setelah tanggal mulai.',
            'name.unique' => 'Tahun ajaran ini sudah ada.',
            'semesters.size' => 'Harus ada tepat dua semester (ganjil dan genap).',
        ];
    }
}
