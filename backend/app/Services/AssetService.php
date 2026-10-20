<?php

namespace App\Services;

use App\Enums\AssetCondition;
use App\Enums\AssetMovementType;
use App\Enums\AssetStatus;
use App\Models\Asset;
use App\Models\AssetCategory;
use App\Models\AssetMovement;
use App\Models\Location;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AssetService
{
    public function list(array $filters): LengthAwarePaginator
    {
        return Asset::query()
            ->with(['assetCategory', 'unit', 'location', 'responsibleStaff'])
            ->when(! empty($filters['q']), function ($q) use ($filters) {
                $search = $filters['q'];
                $q->where(fn ($w) => $w
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                );
            })
            ->when(! empty($filters['unit']), function ($q) use ($filters) {
                $unit = $filters['unit'];
                if ($unit === 'shared') {
                    $q->whereNull('unit_id');
                } elseif (is_numeric($unit)) {
                    $q->where('unit_id', $unit);
                } else {
                    $q->whereHas('unit', fn ($u) => $u->where('code', $unit));
                }
            })
            ->when(! empty($filters['category_id']), fn ($q) => $q->where('asset_category_id', $filters['category_id']))
            ->when(! empty($filters['location_id']), fn ($q) => $q->where('location_id', $filters['location_id']))
            ->when(! empty($filters['item_condition']), fn ($q) => $q->where('item_condition', $filters['item_condition']))
            ->when(! empty($filters['status']), fn ($q) => $q->where('status', $filters['status']))
            ->orderByDesc('id')
            ->paginate(min((int) ($filters['per_page'] ?? 15), 100));
    }

    public function create(array $data): Asset
    {
        return DB::transaction(function () use ($data) {
            $autoCode = empty($data['code']);
            if ($autoCode) {
                $data['code'] = 'TMP-'.Str::uuid();
            }

            $asset = Asset::create($this->assetAttributes($data) + [
                'code' => $data['code'],
                'quantity' => $data['quantity'] ?? 1,
                'unit_label' => $data['unit_label'] ?? 'unit',
                'item_condition' => $data['item_condition'] ?? AssetCondition::Good,
                'status' => $data['status'] ?? AssetStatus::Active,
            ]);

            if ($autoCode) {
                $code = sprintf('AST-%04d', $asset->id);
                $asset->update(['code' => $code]);
            }

            return $this->loadRelations($asset->fresh());
        });
    }

    public function update(Asset $asset, array $data): Asset
    {
        return DB::transaction(function () use ($asset, $data) {
            $attributes = $this->assetAttributes($data);
            if (! empty($data['code'])) {
                $attributes['code'] = $data['code'];
            }
            if (isset($data['quantity'])) {
                $attributes['quantity'] = $data['quantity'];
            }
            if (isset($data['unit_label'])) {
                $attributes['unit_label'] = $data['unit_label'];
            }
            if (isset($data['item_condition'])) {
                $attributes['item_condition'] = $data['item_condition'];
            }
            if (isset($data['status'])) {
                $attributes['status'] = $data['status'];
            }

            $asset->update($attributes);

            return $this->loadRelations($asset->fresh());
        });
    }

    public function delete(Asset $asset): void
    {
        $asset->delete();
    }

    public function storeMovement(Asset $asset, array $data, int $userId): AssetMovement
    {
        if ($asset->status === AssetStatus::Disposed || (is_string($asset->status) && $asset->status === 'disposed')) {
            throw ValidationException::withMessages([
                'status' => ['Aset yang sudah dihapuskan (disposed) tidak dapat dipindahkan atau diubah kondisinya.'],
            ]);
        }

        return DB::transaction(function () use ($asset, $data, $userId) {
            $type = $data['type'] instanceof AssetMovementType ? $data['type']->value : $data['type'];
            $fromLocationId = null;
            $toLocationId = null;
            $fromCondition = null;
            $toCondition = null;

            if ($type === 'move') {
                $fromLocationId = $asset->location_id;
                $toLocationId = $data['to_location_id'];
                $asset->update(['location_id' => $toLocationId]);
            } elseif ($type === 'condition') {
                $fromCondition = $asset->item_condition instanceof AssetCondition
                    ? $asset->item_condition->value
                    : (string) $asset->item_condition;
                $toCondition = $data['to_condition'];
                $asset->update(['item_condition' => $toCondition]);
            } elseif ($type === 'dispose') {
                $fromCondition = $asset->item_condition instanceof AssetCondition
                    ? $asset->item_condition->value
                    : (string) $asset->item_condition;
                $toCondition = AssetCondition::Disposed->value;
                $asset->update([
                    'status' => AssetStatus::Disposed,
                    'item_condition' => AssetCondition::Disposed,
                ]);
            }

            return AssetMovement::create([
                'asset_id' => $asset->id,
                'type' => $type,
                'from_location_id' => $fromLocationId,
                'to_location_id' => $toLocationId,
                'from_condition' => $fromCondition,
                'to_condition' => $toCondition,
                'moved_at' => $data['moved_at'],
                'notes' => $data['notes'] ?? null,
                'created_by' => $userId,
            ])->load(['fromLocation', 'toLocation', 'creator']);
        });
    }

    public function listCategories(): Collection
    {
        return AssetCategory::query()->orderBy('name')->get();
    }

    public function createCategory(array $data): AssetCategory
    {
        return AssetCategory::create([
            'code' => $data['code'],
            'name' => $data['name'],
        ]);
    }

    public function updateCategory(AssetCategory $category, array $data): AssetCategory
    {
        $category->update([
            'code' => $data['code'],
            'name' => $data['name'],
        ]);

        return $category->fresh();
    }

    public function deleteCategory(AssetCategory $category): void
    {
        if (Asset::withTrashed()->where('asset_category_id', $category->id)->exists()) {
            abort(409, 'Kategori tidak dapat dihapus karena masih digunakan oleh aset.');
        }

        $category->delete();
    }

    public function listLocations(array $filters = []): Collection
    {
        return Location::query()
            ->with('unit')
            ->when(! empty($filters['unit']), function ($q) use ($filters) {
                $unit = $filters['unit'];
                if ($unit === 'shared') {
                    $q->whereNull('unit_id');
                } elseif (is_numeric($unit)) {
                    $q->where('unit_id', $unit);
                } else {
                    $q->whereHas('unit', fn ($u) => $u->where('code', $unit));
                }
            })
            ->orderBy('name')
            ->get();
    }

    public function createLocation(array $data): Location
    {
        return Location::create([
            'unit_id' => $data['unit_id'] ?? null,
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
        ])->load('unit');
    }

    public function updateLocation(Location $location, array $data): Location
    {
        $location->update([
            'unit_id' => array_key_exists('unit_id', $data) ? $data['unit_id'] : $location->unit_id,
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
        ]);

        return $location->fresh()->load('unit');
    }

    public function deleteLocation(Location $location): void
    {
        $isUsedInAssets = Asset::withTrashed()->where('location_id', $location->id)->exists();
        $isUsedInMovements = AssetMovement::where('from_location_id', $location->id)
            ->orWhere('to_location_id', $location->id)
            ->exists();

        if ($isUsedInAssets || $isUsedInMovements) {
            abort(409, 'Lokasi tidak dapat dihapus karena masih digunakan oleh aset atau riwayat perpindahan.');
        }

        $location->delete();
    }

    public function loadRelations(Asset $asset): Asset
    {
        return $asset->load([
            'assetCategory',
            'unit',
            'location',
            'responsibleStaff',
            'movements' => fn ($q) => $q->with(['fromLocation', 'toLocation', 'creator'])
                ->orderByDesc('moved_at')
                ->orderByDesc('id'),
        ]);
    }

    private function assetAttributes(array $data): array
    {
        return collect($data)->only([
            'name',
            'asset_category_id',
            'unit_id',
            'location_id',
            'acquisition_date',
            'acquisition_source',
            'acquisition_cost',
            'responsible_staff_id',
            'photo_path',
            'notes',
        ])->all();
    }
}
