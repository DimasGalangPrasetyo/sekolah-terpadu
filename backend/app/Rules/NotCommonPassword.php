<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class NotCommonPassword implements ValidationRule
{
    private const COMMON = [
        'password', 'password1', 'password12', 'password123', 'password1234', 'passw0rd123',
        '12345678', '123456789', '1234567890', 'qwerty123', 'qwertyuiop', 'abc123456',
        'sekolah123', 'sekolah1234', 'sekolah12345', 'sekolahterpadu', 'admin12345', 'admin123456',
        'indonesia123', 'welcome123', 'katasandi123', 'iloveyou123',
    ];

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (in_array(mb_strtolower((string) $value), self::COMMON, true)) {
            $fail('Password terlalu umum dan mudah ditebak.');
        }
    }
}
