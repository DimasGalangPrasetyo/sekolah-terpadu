<?php

namespace App\Http\Requests\Auth;

use App\Rules\NotCommonPassword;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class ChangePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'current_password' => ['required', 'string', 'current_password'],
            'password' => [
                'required',
                'string',
                'confirmed',
                'different:current_password',
                Password::min(10)->letters()->numbers(),
                new NotCommonPassword,
                function (string $attribute, mixed $value, \Closure $fail) {
                    if (Str::lower((string) $value) === Str::lower((string) $this->user()->username)) {
                        $fail('Password tidak boleh sama dengan username.');
                    }
                },
            ],
        ];
    }
}
