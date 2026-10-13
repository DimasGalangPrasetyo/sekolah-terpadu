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

export interface Unit {
  id: number
  code: string
  name: string
  has_report_card: boolean
}

export interface GradeLevel {
  id: number
  unit_id: number
  code: string
  name: string
}

export interface Semester {
  id: number
  name: 'ganjil' | 'genap'
  start_date: string
  end_date: string
  is_active: boolean
}

export interface AcademicYear {
  id: number
  name: string
  start_date: string
  end_date: string
  is_active: boolean
  classrooms_count?: number
  semesters: Semester[]
}

export interface AcademicContext {
  year: { id: number; name: string } | null
  semester: { id: number; name: string } | null
}

export interface Classroom {
  id: number
  name: string
  academic_year_id: number
  unit: { id: number; code: string }
  grade_level: { id: number; code: string; name: string }
  homeroom: { id: number; name: string } | null
  capacity: number | null
  students_count?: number
}

export interface TeacherOption {
  id: number
  name: string
  position: string | null
  homeroom_classroom: string | null
}

export type StudentStatus = 'active' | 'inactive' | 'transferred' | 'dropped' | 'graduated'

export interface Guardian {
  id?: number
  relation: 'father' | 'mother' | 'guardian'
  name: string
  occupation: string | null
  phone: string | null
  address: string | null
  is_primary_contact: boolean
}

export interface StudentStatusLog {
  id: number
  from_status: StudentStatus | null
  to_status: StudentStatus
  effective_date: string
  reason: string | null
  destination_school: string | null
  document_number: string | null
  created_by: string | null
}

export interface Student {
  id: number
  nis: string | null
  nisn: string | null
  name: string
  gender: 'L' | 'P'
  birth_place: string | null
  birth_date: string | null
  religion: string | null
  address: string | null
  phone: string | null
  previous_school: string | null
  entry_date: string | null
  status: StudentStatus
  notes: string | null
  classroom: { id: number; name: string; unit: string } | null
  guardians?: Guardian[]
  status_logs?: StudentStatusLog[]
}
