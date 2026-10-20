import type { AssetCondition, AssetMovementType, AssetStatus } from './types'

export const CONDITION_CONFIG: Record<
  AssetCondition,
  { label: string; color: string }
> = {
  good: { label: 'Baik', color: 'success' },
  light_damage: { label: 'Rusak Ringan', color: 'warning' },
  heavy_damage: { label: 'Rusak Berat', color: 'error' },
  lost: { label: 'Hilang', color: 'default' },
  disposed: { label: 'Dihapuskan', color: 'magenta' },
}

export const STATUS_CONFIG: Record<
  AssetStatus,
  { label: string; color: string }
> = {
  active: { label: 'Aktif', color: 'processing' },
  disposed: { label: 'Dihapuskan', color: 'default' },
}

export const MOVEMENT_TYPE_CONFIG: Record<
  AssetMovementType,
  { label: string; color: string }
> = {
  move: { label: 'Perpindahan Lokasi', color: 'blue' },
  condition: { label: 'Perubahan Kondisi', color: 'orange' },
  dispose: { label: 'Penghapusan Aset', color: 'red' },
}
