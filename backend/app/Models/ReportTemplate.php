<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ReportTemplate extends Model
{
    protected $fillable = [
        'unit_id',
        'name',
        'version',
        'page_size',
        'page_width_mm',
        'page_height_mm',
        'orientation',
        'margin_top_mm',
        'margin_right_mm',
        'margin_bottom_mm',
        'margin_left_mm',
        'offset_x_mm',
        'offset_y_mm',
        'font_family',
        'font_size_pt',
        'definition',
        'is_active',
        'is_locked',
    ];

    protected function casts(): array
    {
        return [
            'page_width_mm' => 'decimal:1',
            'page_height_mm' => 'decimal:1',
            'margin_top_mm' => 'decimal:1',
            'margin_right_mm' => 'decimal:1',
            'margin_bottom_mm' => 'decimal:1',
            'margin_left_mm' => 'decimal:1',
            'offset_x_mm' => 'decimal:1',
            'offset_y_mm' => 'decimal:1',
            'definition' => 'array',
            'is_active' => 'boolean',
            'is_locked' => 'boolean',
        ];
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'unit_id');
    }

    public function reportCards(): HasMany
    {
        return $this->hasMany(ReportCard::class, 'template_id');
    }
}
