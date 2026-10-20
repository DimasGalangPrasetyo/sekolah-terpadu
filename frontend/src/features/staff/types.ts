export interface StaffUnit {
  id: number
  code: string
}

export interface StaffAssignment {
  id?: number
  unit_id: number
  role_title: string
  start_date?: string | null
  end_date?: string | null
  unit?: StaffUnit | null
}

export interface StaffHomeroom {
  id: number
  name: string
  unit: string
}

export type EmploymentStatus = 'permanent' | 'honorary' | 'contract'

export interface Staff {
  id: number
  nip: string | null
  nuptk: string | null
  name: string
  gender: 'L' | 'P'
  birth_place: string | null
  birth_date: string | null
  phone: string | null
  email: string | null
  address: string | null
  position: string
  employment_status: EmploymentStatus
  join_date: string | null
  education: string | null
  is_teacher: boolean
  is_active: boolean
  photo_path: string | null
  assignments: StaffAssignment[]
  has_account: boolean
  account_username: string | null
  homerooms: StaffHomeroom[]
}

export interface StaffPayload {
  name: string
  gender: 'L' | 'P'
  position: string
  employment_status: EmploymentStatus
  nip?: string | null
  nuptk?: string | null
  birth_place?: string | null
  birth_date?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  join_date?: string | null
  education?: string | null
  is_teacher?: boolean
  is_active?: boolean
  assignments?: Array<{
    id?: number
    unit_id: number
    role_title: string
    start_date?: string | null
    end_date?: string | null
  }>
}

export interface StaffListParams {
  page?: number
  per_page?: number
  q?: string
  is_teacher?: boolean | string
  is_active?: boolean | string
  unit?: string
  employment_status?: string
}
