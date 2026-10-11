export interface Homeroom {
  id: number
  name: string
  unit: string
}

export interface AuthUser {
  id: number
  name: string
  username: string
  email: string | null
  staff_id: number | null
  is_active: boolean
  must_change_password: boolean
  roles: string[]
  permissions: string[]
  homerooms: Homeroom[]
}

export interface ManagedUser {
  id: number
  name: string
  username: string
  email: string | null
  role: string | null
  is_active: boolean
  must_change_password: boolean
  last_login_at: string | null
  locked_until: string | null
  staff?: { id: number; name: string; is_teacher: boolean } | null
  created_at: string | null
}

export interface RoleOption {
  name: string
  label: string
}

export interface StaffOption {
  id: number
  name: string
  position: string | null
}

export interface PageMeta {
  current_page: number
  per_page: number
  total: number
  last_page: number
}

export interface Paginated<T> {
  data: T[]
  meta: PageMeta
}

export interface AuditLogEntry {
  id: number
  event: string
  user?: { id: number; name: string; username: string } | null
  auditable_type: string | null
  auditable_id: number | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  created_at: string | null
}

export interface ApiErrorBody {
  message?: string
  errors?: Record<string, string[]>
  code?: string
}
