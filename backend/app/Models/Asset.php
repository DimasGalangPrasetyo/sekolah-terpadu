<?php

namespace App\Models;

use App\Enums\AssetCondition;
use App\Enums\AssetStatus;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Asset extends Model
{
    use Auditable, SoftDeletes;

    protected array $auditExclude = ['photo_path'];

    protected $fillable = [
        'code',
        'name',
        'asset_category_id',
        'unit_id',
        'location_id',
        'quantity',
        'unit_label',
        'acquisition_date',
        'acquisition_source',
        'acquisition_cost',
        'item_condition',
        'responsible_staff_id',
        'photo_path',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'acquisition_date' => 'date',
            'item_condition' => AssetCondition::class,
            'status' => AssetStatus::class,
        ];
    }

    public function assetCategory(): BelongsTo
    {
        return $this->belongsTo(AssetCategory::class, 'asset_category_id');
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'unit_id');
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class, 'location_id');
    }

    public function responsibleStaff(): BelongsTo
    {
        return $this->belongsTo(Staff::class, 'responsible_staff_id');
    }

    public function movements(): HasMany
    {
        return $this->hasMany(AssetMovement::class, 'asset_id');
    }
}
