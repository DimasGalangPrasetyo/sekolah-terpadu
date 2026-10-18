<?php

namespace App\Http\Requests\School;

use Illuminate\Foundation\Http\FormRequest;

class SchoolProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // dijaga middleware can:system.manage
    }

    public function rules(): array
    {
        return [
            'foundation_name' => ['required', 'string', 'max:200'],
            'address' => ['nullable', 'string', 'max:500'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:150'],
            'headmasters' => ['nullable', 'array'],
            'headmasters.TK' => ['nullable', 'string', 'max:150'],
            'headmasters.SD' => ['nullable', 'string', 'max:150'],
            'headmasters.SMP' => ['nullable', 'string', 'max:150'],
        ];
    }
}
