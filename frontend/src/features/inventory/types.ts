export type AssetCondition = 'good' | 'light_damage' | 'heavy_damage' | 'lost' | 'disposed'
export type AssetStatus = 'active' | 'disposed'
export type AssetMovementType = 'move' | 'condition' | 'dispose'

export interface AssetCategory {
  id: number
  code: string
  name: string
  created_at?: string
  updated_at?: string
}

export interface LocationItem {
  id: number
  unit_id: number | null
  name: string
  description: string | null
  unit?: { id: number; code: string; name: string } | null
  created_at?: string
  updated_at?: string
}

export interface AssetMovement {
  id: number
  asset_id: number
  type: AssetMovementType
  from_location_id: number | null
  to_location_id: number | null
  from_condition: AssetCondition | null
  to_condition: AssetCondition | null
  moved_at: string
  notes: string | null
  created_by: number
  from_location?: { id: number; name: string } | null
  to_location?: { id: number; name: string } | null
  creator?: { id: number; name: string; username: string } | null
  created_at?: string
}

export interface Asset {
  id: number
  code: string
  name: string
  asset_category_id: number
  unit_id: number | null
  location_id: number | null
  quantity: number
  unit_label: string
  acquisition_date: string | null
  acquisition_source: string | null
  acquisition_cost: number | null
  item_condition: AssetCondition
  responsible_staff_id: number | null
  photo_path: string | null
  status: AssetStatus
  notes: string | null
  category?: { id: number; code: string; name: string } | null
  unit?: { id: number; code: string; name: string } | null
  location?: { id: number; name: string; unit_id: number | null } | null
  responsible_staff?: { id: number; name: string; nip: string | null } | null
  movements?: AssetMovement[] | null
  created_at?: string
  updated_at?: string
}

export interface AssetListParams {
  page?: number
  per_page?: number
  q?: string
  unit?: string
  category_id?: number | string
  location_id?: number | string
  item_condition?: AssetCondition | string
  status?: AssetStatus | string
}

export interface AssetPayload {
  code?: string | null
  name: string
  asset_category_id: number
  unit_id?: number | null
  location_id?: number | null
  quantity: number
  unit_label?: string
  acquisition_date?: string | null
  acquisition_source?: string | null
  acquisition_cost?: number | null
  item_condition?: AssetCondition
  responsible_staff_id?: number | null
  photo_path?: string | null
  status?: AssetStatus
  notes?: string | null
}

export interface AssetMovementPayload {
  type: AssetMovementType
  moved_at: string
  to_location_id?: number | null
  to_condition?: AssetCondition | null
  notes?: string | null
}

export interface AssetCategoryPayload {
  code: string
  name: string
}

export interface LocationPayload {
  unit_id?: number | null
  name: string
  description?: string | null
}
