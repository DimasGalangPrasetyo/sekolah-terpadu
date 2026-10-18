import type { ReportData, TableRow } from './types'

export function getRows(data: ReportData, key: string): TableRow[] {
  const value = data[key]
  return Array.isArray(value) ? (value as TableRow[]) : []
}

export function getGroup(data: ReportData, key: string): Record<string, string> {
  const value = data[key]
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, string>) : {}
}

export function getText(data: ReportData, key: string): string {
  const value = data[key]
  return typeof value === 'string' ? value : ''
}
