import { http } from '../../api/client'
import type { Paginated } from '../../types/api'
import type {
  FeeRate,
  FeeRatePayload,
  FeeType,
  FeeTypePayload,
  StudentDiscount,
  StudentDiscountParams,
  StudentDiscountPayload,
} from './types'

// --- Jenis Biaya ---

export async function listFeeTypes(isActive?: boolean): Promise<FeeType[]> {
  const params = isActive !== undefined ? { is_active: isActive ? 1 : 0 } : {}
  const { data } = await http.get<{ data: FeeType[] }>('/fee-types', { params })
  return data.data
}

export async function createFeeType(payload: FeeTypePayload): Promise<FeeType> {
  const { data } = await http.post<{ data: FeeType }>('/fee-types', payload)
  return data.data
}

export async function updateFeeType(id: number, payload: FeeTypePayload): Promise<FeeType> {
  const { data } = await http.put<{ data: FeeType }>(`/fee-types/${id}`, payload)
  return data.data
}

export async function deactivateFeeType(id: number): Promise<FeeType> {
  const { data } = await http.post<{ data: FeeType }>(`/fee-types/${id}/deactivate`)
  return data.data
}

export async function activateFeeType(id: number): Promise<FeeType> {
  const { data } = await http.post<{ data: FeeType }>(`/fee-types/${id}/activate`)
  return data.data
}

export async function deleteFeeType(id: number): Promise<void> {
  await http.delete(`/fee-types/${id}`)
}

// --- Tarif ---

export interface FeeRateFilterParams {
  academic_year_id?: number
  unit?: string
  fee_type_id?: number
  grade_level_id?: number
}

export async function listFeeRates(params?: FeeRateFilterParams): Promise<FeeRate[]> {
  const { data } = await http.get<{ data: FeeRate[] }>('/fee-rates', { params })
  return data.data
}

export async function createFeeRate(payload: FeeRatePayload): Promise<FeeRate> {
  const { data } = await http.post<{ data: FeeRate }>('/fee-rates', payload)
  return data.data
}

export async function updateFeeRate(id: number, amount: number): Promise<FeeRate> {
  const { data } = await http.put<{ data: FeeRate }>(`/fee-rates/${id}`, { amount })
  return data.data
}

export async function deleteFeeRate(id: number): Promise<void> {
  await http.delete(`/fee-rates/${id}`)
}

// --- Diskon Siswa ---

export async function listStudentDiscounts(params?: StudentDiscountParams): Promise<Paginated<StudentDiscount>> {
  const { data } = await http.get<Paginated<StudentDiscount>>('/student-discounts', { params })
  return data
}

export async function createStudentDiscount(payload: StudentDiscountPayload): Promise<StudentDiscount> {
  const { data } = await http.post<{ data: StudentDiscount }>('/student-discounts', payload)
  return data.data
}

export async function updateStudentDiscount(id: number, payload: StudentDiscountPayload): Promise<StudentDiscount> {
  const { data } = await http.put<{ data: StudentDiscount }>(`/student-discounts/${id}`, payload)
  return data.data
}

export async function deactivateStudentDiscount(id: number): Promise<StudentDiscount> {
  const { data } = await http.post<{ data: StudentDiscount }>(`/student-discounts/${id}/deactivate`)
  return data.data
}

export async function activateStudentDiscount(id: number): Promise<StudentDiscount> {
  const { data } = await http.post<{ data: StudentDiscount }>(`/student-discounts/${id}/activate`)
  return data.data
}
