import { http } from './client'
import type { AcademicContext, AcademicYear, Classroom, GradeLevel, TeacherOption, Unit } from '../types/api'

export interface AcademicYearPayload {
  name: string
  start_date: string
  end_date: string
  semesters: { name: 'ganjil' | 'genap'; start_date: string; end_date: string }[]
}

export async function listAcademicYears(): Promise<AcademicYear[]> {
  const { data } = await http.get<{ data: AcademicYear[] }>('/academic-years')
  return data.data
}

export async function saveAcademicYear(payload: AcademicYearPayload, id?: number): Promise<AcademicYear> {
  const { data } = id
    ? await http.put<{ data: AcademicYear }>(`/academic-years/${id}`, payload)
    : await http.post<{ data: AcademicYear }>('/academic-years', payload)
  return data.data
}

export async function deleteAcademicYear(id: number): Promise<void> {
  await http.delete(`/academic-years/${id}`)
}

export async function activateAcademicYear(id: number): Promise<void> {
  await http.post(`/academic-years/${id}/activate`)
}

export async function activateSemester(id: number): Promise<void> {
  await http.post(`/semesters/${id}/activate`)
}

export interface ClassroomParams {
  academic_year_id?: number
  unit?: string
  grade_level_id?: number
}

export interface ClassroomPayload {
  unit_id: number
  academic_year_id: number
  grade_level_id: number
  name: string
  homeroom_staff_id: number | null
  capacity: number | null
}

export async function listClassrooms(params: ClassroomParams = {}): Promise<Classroom[]> {
  const { data } = await http.get<{ data: Classroom[] }>('/classrooms', { params })
  return data.data
}

export async function saveClassroom(payload: ClassroomPayload, id?: number): Promise<Classroom> {
  const { data } = id
    ? await http.put<{ data: Classroom }>(`/classrooms/${id}`, payload)
    : await http.post<{ data: Classroom }>('/classrooms', payload)
  return data.data
}

export async function deleteClassroom(id: number): Promise<void> {
  await http.delete(`/classrooms/${id}`)
}

export async function listUnits(): Promise<Unit[]> {
  const { data } = await http.get<{ data: Unit[] }>('/units')
  return data.data
}

export async function listGradeLevels(): Promise<GradeLevel[]> {
  const { data } = await http.get<{ data: GradeLevel[] }>('/grade-levels')
  return data.data
}

export async function fetchAcademicContext(): Promise<AcademicContext> {
  const { data } = await http.get<{ data: AcademicContext }>('/academic-context')
  return data.data
}

export async function listTeacherOptions(q: string): Promise<TeacherOption[]> {
  const { data } = await http.get<{ data: TeacherOption[] }>('/teacher-options', { params: { q: q || undefined } })
  return data.data
}
