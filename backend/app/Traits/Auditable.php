<?php

namespace App\Traits;

use App\Services\AuditLogger;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Arr;

/**
 * Mencatat created/updated/deleted/restored ke audit_logs.
 * Kolom yang tidak boleh dicatat: tambahkan di properti $auditExclude pada model.
 */
trait Auditable
{
    public static function bootAuditable(): void
    {
        static::created(function (Model $model) {
            AuditLogger::log('created', $model, null, $model->auditFilter($model->getAttributes()));
        });

        static::updated(function (Model $model) {
            $changes = $model->auditFilter($model->getChanges());

            if ($changes === []) {
                return;
            }

            AuditLogger::log('updated', $model, Arr::only($model->getOriginal(), array_keys($changes)), $changes);
        });

        static::deleted(function (Model $model) {
            AuditLogger::log('deleted', $model);
        });

        if (method_exists(static::class, 'restored')) {
            static::restored(function (Model $model) {
                AuditLogger::log('restored', $model);
            });
        }
    }

    /** @param array<string, mixed> $attributes */
    public function auditFilter(array $attributes): array
    {
        $exclude = array_merge(
            ['password', 'remember_token', 'created_at', 'updated_at', 'deleted_at'],
            $this->auditExclude ?? [],
        );

        return Arr::except($attributes, $exclude);
    }
}
