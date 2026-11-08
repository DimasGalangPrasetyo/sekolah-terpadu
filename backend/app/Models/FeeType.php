<?php

namespace App\Models;

use App\Enums\FeeCategory;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FeeType extends Model
{
    use Auditable;

    protected $fillable = [
        'code',
        'name',
        'category',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'category' => FeeCategory::class,
            'is_active' => 'boolean',
        ];
    }

    public function rates(): HasMany
    {
        return $this->hasMany(FeeRate::class, 'fee_type_id');
    }

    public function discounts(): HasMany
    {
        return $this->hasMany(StudentDiscount::class, 'fee_type_id');
    }
}
