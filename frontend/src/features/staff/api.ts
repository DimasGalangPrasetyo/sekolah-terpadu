import { http } from '../../api/client'
import type { Paginated } from '../../types/api'
import type { Staff, StaffListParams, StaffPayload } from './types'

export async function listStaff(params: StaffListParams): Promise<Paginated<Staff>> {
  const { data } = await http.get<Paginated<Staff>>('/staff', { params })
  return data
}

export async function getStaff(id: number): Promise<Staff> {
  const { data } = await http.get<{ data: Staff }>(`/staff/${id}`)
  return data.data
}

export async function createStaff(payload: StaffPayload): Promise<Staff> {
  const { data } = await http.post<{ data: Staff }>('/staff', payload)
  return data.data
}

export async function updateStaff(id: number, payload: StaffPayload): Promise<Staff> {
  const { data } = await http.put<{ data: Staff }>(`/staff/${id}`, payload)
  return data.data
}

export async function deactivateStaff(id: number): Promise<Staff> {
  const { data } = await http.post<{ data: Staff }>(`/staff/${id}/deactivate`)
  return data.data
}

export async function activateStaff(id: number): Promise<Staff> {
  const { data } = await http.post<{ data: Staff }>(`/staff/${id}/activate`)
  return data.data
}

export async function deleteStaff(id: number): Promise<void> {
  await http.delete(`/staff/${id}`)
}
