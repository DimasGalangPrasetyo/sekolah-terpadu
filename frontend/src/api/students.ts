import { http } from './client'
import type { Guardian, Paginated, Student, StudentStatus } from '../types/api'

export interface StudentListParams {
  page: number
  per_page: number
  q?: string
  status?: string
  unit?: string
  classroom_id?: number
  unplaced?: boolean
}

export interface StudentPayload {
  name: string
  gender: 'L' | 'P'
  nis?: string | null
  nisn?: string | null
  birth_place?: string | null
  birth_date?: string | null
  religion?: string | null
  address?: string | null
  phone?: string | null
  previous_school?: string | null
  entry_date?: string | null
  notes?: string | null
  classroom_id?: number | null
  guardians: Guardian[]
}

export interface StatusPayload {
  to_status: StudentStatus
  effective_date: string
  reason?: string | null
  destination_school?: string | null
  document_number?: string | null
}

export async function listStudents(params: StudentListParams): Promise<Paginated<Student>> {
  const { data } = await http.get<Paginated<Student>>('/students', { params })
  return data
}

export async function getStudent(id: number): Promise<Student> {
  const { data } = await http.get<{ data: Student }>(`/students/${id}`)
  return data.data
}

export async function saveStudent(payload: StudentPayload, id?: number): Promise<Student> {
  const { data } = id
    ? await http.put<{ data: Student }>(`/students/${id}`, payload)
    : await http.post<{ data: Student }>('/students', payload)
  return data.data
}

export async function deleteStudent(id: number): Promise<void> {
  await http.delete(`/students/${id}`)
}

export async function changeStudentStatus(id: number, payload: StatusPayload): Promise<Student> {
  const { data } = await http.post<{ data: Student }>(`/students/${id}/status`, payload)
  return data.data
}

export async function placeStudent(id: number, classroomId: number): Promise<Student> {
  const { data } = await http.put<{ data: Student }>(`/students/${id}/enrollment`, { classroom_id: classroomId })
  return data.data
}
