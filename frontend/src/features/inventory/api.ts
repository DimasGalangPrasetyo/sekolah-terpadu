import { http } from '../../api/client'
import type { Paginated } from '../../types/api'
import type {
  Asset,
  AssetCategory,
  AssetCategoryPayload,
  AssetListParams,
  AssetMovement,
  AssetMovementPayload,
  AssetPayload,
  LocationItem,
  LocationPayload,
} from './types'

export async function listAssets(params: AssetListParams): Promise<Paginated<Asset>> {
  const { data } = await http.get<Paginated<Asset>>('/assets', { params })
  return data
}

export async function getAsset(id: number): Promise<Asset> {
  const { data } = await http.get<{ data: Asset }>(`/assets/${id}`)
  return data.data
}

export async function createAsset(payload: AssetPayload): Promise<Asset> {
  const { data } = await http.post<{ data: Asset }>('/assets', payload)
  return data.data
}

export async function updateAsset(id: number, payload: AssetPayload): Promise<Asset> {
  const { data } = await http.put<{ data: Asset }>(`/assets/${id}`, payload)
  return data.data
}

export async function deleteAsset(id: number): Promise<void> {
  await http.delete(`/assets/${id}`)
}

export async function listAssetMovements(assetId: number): Promise<AssetMovement[]> {
  const { data } = await http.get<{ data: AssetMovement[] }>(`/assets/${assetId}/movements`)
  return data.data
}

export async function recordAssetMovement(
  assetId: number,
  payload: AssetMovementPayload,
): Promise<AssetMovement> {
  const { data } = await http.post<{ data: AssetMovement }>(`/assets/${assetId}/movements`, payload)
  return data.data
}

export async function listAssetCategories(): Promise<AssetCategory[]> {
  const { data } = await http.get<{ data: AssetCategory[] }>('/asset-categories')
  return data.data
}

export async function createAssetCategory(payload: AssetCategoryPayload): Promise<AssetCategory> {
  const { data } = await http.post<{ data: AssetCategory }>('/asset-categories', payload)
  return data.data
}

export async function updateAssetCategory(
  id: number,
  payload: AssetCategoryPayload,
): Promise<AssetCategory> {
  const { data } = await http.put<{ data: AssetCategory }>(`/asset-categories/${id}`, payload)
  return data.data
}

export async function deleteAssetCategory(id: number): Promise<void> {
  await http.delete(`/asset-categories/${id}`)
}

export async function listLocations(params?: { unit?: string }): Promise<LocationItem[]> {
  const { data } = await http.get<{ data: LocationItem[] }>('/locations', { params })
  return data.data
}

export async function createLocation(payload: LocationPayload): Promise<LocationItem> {
  const { data } = await http.post<{ data: LocationItem }>('/locations', payload)
  return data.data
}

export async function updateLocation(
  id: number,
  payload: LocationPayload,
): Promise<LocationItem> {
  const { data } = await http.put<{ data: LocationItem }>(`/locations/${id}`, payload)
  return data.data
}

export async function deleteLocation(id: number): Promise<void> {
  await http.delete(`/locations/${id}`)
}
