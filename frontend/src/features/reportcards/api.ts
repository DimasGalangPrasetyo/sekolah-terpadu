import { http } from '../../api/client'
import type { Classroom } from '../../types/api'
import type { ReportCardDetail, ReportData, ReportRow, ReportRowsMeta } from './types'

export async function listReportClassrooms(): Promise<Classroom[]> {
  const { data } = await http.get<{ data: Classroom[] }>('/report-cards/classrooms')
  return data.data
}

export async function listReportRows(classroomId: number): Promise<{ data: ReportRow[]; meta: ReportRowsMeta }> {
  const { data } = await http.get<{ data: ReportRow[]; meta: ReportRowsMeta }>('/report-cards', { params: { classroom_id: classroomId } })
  return data
}

export async function openReportCard(studentId: number): Promise<ReportCardDetail> {
  const { data } = await http.post<{ data: ReportCardDetail }>('/report-cards', { student_id: studentId })
  return data.data
}

export async function getReportCard(id: number): Promise<ReportCardDetail> {
  const { data } = await http.get<{ data: ReportCardDetail }>(`/report-cards/${id}`)
  return data.data
}

export async function saveReportCard(id: number, reportData: ReportData): Promise<ReportCardDetail> {
  const { data } = await http.put<{ data: ReportCardDetail }>(`/report-cards/${id}`, { data: reportData })
  return data.data
}

export async function finalizeReportCard(id: number): Promise<ReportCardDetail> {
  const { data } = await http.post<{ data: ReportCardDetail }>(`/report-cards/${id}/finalize`)
  return data.data
}

export async function unlockReportCard(id: number, reason: string): Promise<ReportCardDetail> {
  const { data } = await http.post<{ data: ReportCardDetail }>(`/report-cards/${id}/unlock`, { reason })
  return data.data
}

export async function logPrinted(id: number): Promise<void> {
  await http.post(`/report-cards/${id}/printed`)
}

export async function listBatchCards(classroomId: number): Promise<ReportCardDetail[]> {
  const { data } = await http.get<{ data: ReportCardDetail[] }>('/report-cards/batch', { params: { classroom_id: classroomId } })
  return data.data
}
