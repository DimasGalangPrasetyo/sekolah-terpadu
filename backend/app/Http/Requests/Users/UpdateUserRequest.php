<?php

namespace App\Http\Requests\Users;

use App\Models\Staff;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // dijaga middleware can:users.manage
    }

    public function rules(): array
    {
        $userId = $this->route('user')->id;

        return [
            'name' => ['required', 'string', 'max:150'],
            'email' => ['nullable', 'email', 'max:150', Rule::unique('users', 'email')->ignore($userId)],
            'role' => ['required', Rule::in(StoreUserRequest::ROLES)],
            'staff_id' => [
                Rule::requiredIf(fn () => $this->input('role') === 'guru'),
                'nullable',
                'integer',
                'exists:staff,id',
                Rule::unique('users', 'staff_id')->ignore($userId),
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
        return ['staff_id.unique' => 'Staf ini sudah memiliki akun.'];
    }
}
