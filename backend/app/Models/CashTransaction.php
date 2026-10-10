<?php

namespace App\Models;

use App\Enums\CashType;
use App\Enums\RecordStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashTransaction extends Model
{
    protected $fillable = [
        'number',
        'transaction_date',
        'type',
        'cash_category_id',
        'unit_id',
        'amount',
        'description',
        'proof_path',
        'created_by',
        'status',
        'voided_at',
        'voided_by',
        'void_reason',
    ];

    protected function casts(): array
    {
        return [
            'transaction_date' => 'date',
            'type' => CashType::class,
            'status' => RecordStatus::class,
            'voided_at' => 'datetime',
        ];
    }

    public function cashCategory(): BelongsTo
    {
        return $this->belongsTo(CashCategory::class, 'cash_category_id');
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'unit_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function voider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'voided_by');
    }
}
