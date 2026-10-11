import { ensureCsrfCookie, http } from './client'
import type { AuthUser } from '../types/api'

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await http.get<{ data: AuthUser }>('/auth/me')
  return data.data
}

export async function login(username: string, password: string): Promise<AuthUser> {
  await ensureCsrfCookie()
  const { data } = await http.post<{ data: AuthUser }>('/auth/login', { username, password })
  return data.data
}

export async function logoutRequest(): Promise<void> {
  await http.post('/auth/logout')
}

export interface ChangePasswordPayload {
  current_password: string
  password: string
  password_confirmation: string
}

export async function changePassword(payload: ChangePasswordPayload): Promise<AuthUser> {
  const { data } = await http.put<{ data: AuthUser }>('/auth/password', payload)
  return data.data
}
