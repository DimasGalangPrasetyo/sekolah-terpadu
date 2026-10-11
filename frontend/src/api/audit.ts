import { http } from './client'
import type { AuditLogEntry, Paginated } from '../types/api'

export interface AuditListParams {
  page: number
  per_page: number
  event?: string
  from?: string
  to?: string
}

export async function listAuditLogs(params: AuditListParams): Promise<Paginated<AuditLogEntry>> {
  const { data } = await http.get<Paginated<AuditLogEntry>>('/audit-logs', { params })
  return data
}
