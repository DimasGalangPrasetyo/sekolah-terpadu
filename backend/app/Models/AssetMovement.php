<?php

namespace App\Models;

use App\Enums\AssetCondition;
use App\Enums\AssetMovementType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetMovement extends Model
{
    protected $fillable = [
        'asset_id',
        'type',
        'from_location_id',
        'to_location_id',
        'from_condition',
        'to_condition',
        'moved_at',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'type' => AssetMovementType::class,
            'from_condition' => AssetCondition::class,
            'to_condition' => AssetCondition::class,
            'moved_at' => 'date',
        ];
    }

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class, 'asset_id');
    }

    public function fromLocation(): BelongsTo
    {
        return $this->belongsTo(Location::class, 'from_location_id');
    }

    public function toLocation(): BelongsTo
    {
        return $this->belongsTo(Location::class, 'to_location_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
