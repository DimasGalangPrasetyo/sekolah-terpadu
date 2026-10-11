import { http } from './client'
import type { ManagedUser, Paginated, RoleOption, StaffOption } from '../types/api'

export interface UserListParams {
  page: number
  per_page: number
  q?: string
  role?: string
  is_active?: boolean
}

export interface UserPayload {
  name: string
  username?: string
  email?: string | null
  role: string
  staff_id?: number | null
}

export async function listUsers(params: UserListParams): Promise<Paginated<ManagedUser>> {
  const { data } = await http.get<Paginated<ManagedUser>>('/users', { params })
  return data
}

export async function createUser(payload: UserPayload) {
  const { data } = await http.post<{ data: ManagedUser; temporary_password: string }>('/users', payload)
  return data
}

export async function updateUser(id: number, payload: UserPayload) {
  const { data } = await http.put<{ data: ManagedUser }>(`/users/${id}`, payload)
  return data.data
}

export async function resetUserPassword(id: number) {
  const { data } = await http.post<{ temporary_password: string }>(`/users/${id}/reset-password`)
  return data.temporary_password
}

export async function setUserActive(id: number, active: boolean) {
  const { data } = await http.post<{ data: ManagedUser }>(`/users/${id}/${active ? 'activate' : 'deactivate'}`)
  return data.data
}

export async function listRoles(): Promise<RoleOption[]> {
  const { data } = await http.get<{ data: RoleOption[] }>('/roles')
  return data.data
}

export async function searchStaffOptions(q: string, includeId?: number): Promise<StaffOption[]> {
  const { data } = await http.get<{ data: StaffOption[] }>('/staff-options', {
    params: { q: q || undefined, include_id: includeId },
  })
  return data.data
}
