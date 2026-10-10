<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SchoolProfile extends Model
{
    protected $fillable = [
        'foundation_name',
        'address',
        'phone',
        'email',
        'logo_path',
        'letterhead',
    ];

    protected function casts(): array
    {
        return [
            'letterhead' => 'array',
        ];
    }
}
