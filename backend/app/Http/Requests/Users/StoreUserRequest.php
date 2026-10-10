<?php

namespace App\Http\Requests\Users;

use App\Models\Staff;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    public const ROLES = ['superadmin', 'admin_tu_keuangan', 'guru'];

    public function authorize(): bool
    {
        return true; // dijaga middleware can:users.manage
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('username')) {
            $this->merge(['username' => Str::lower(trim((string) $this->input('username')))]);
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'username' => ['required', 'string', 'min:3', 'max:40', 'regex:/^[a-z0-9._-]+$/', 'unique:users,username'],
            'email' => ['nullable', 'email', 'max:150', 'unique:users,email'],
            'role' => ['required', Rule::in(self::ROLES)],
            'staff_id' => [
                Rule::requiredIf(fn () => $this->input('role') === 'guru'),
                'nullable',
                'integer',
                'exists:staff,id',
                Rule::unique('users', 'staff_id'),
                function (string $attribute, mixed $value, \Closure $fail) {
                    if ($value && $this->input('role') === 'guru' && ! Staff::whereKey($value)->where('is_teacher', true)->exists()) {
                        $fail('Akun guru harus ditautkan ke staf yang berstatus guru.');
                    }
                },
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'username.regex' => 'Username hanya boleh huruf kecil, angka, titik, garis bawah, dan tanda hubung.',
            'staff_id.unique' => 'Staf ini sudah memiliki akun.',
        ];
    }
}
