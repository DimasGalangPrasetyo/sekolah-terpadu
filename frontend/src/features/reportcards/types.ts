export interface TableColumn {
  key: string
  label: string
  input?: 'text' | 'textarea' | 'number'
}

export interface IdentitySection {
  key: string
  type: 'student_identity'
  title?: string
}

export interface TableSection {
  key: string
  type: 'table'
  title?: string
  rows_from?: string
  dynamic_rows?: boolean
  columns: TableColumn[]
}

export interface FieldsSection {
  key: string
  type: 'fields'
  title?: string
  fields: { key: string; label: string; input?: 'text' | 'number' | 'select' | 'date'; options?: string[] }[]
}

export interface TextSection {
  key: string
  type: 'text'
  title?: string
  label?: string
  max_length?: number
}

export interface SignatureSection {
  key: string
  type: 'signature'
  title?: string
  signers: string[]
}

export type ReportSection = IdentitySection | TableSection | FieldsSection | TextSection | SignatureSection

export interface ReportDefinition {
  sections: ReportSection[]
}

export type TableRow = Record<string, string>
export type ReportData = Record<string, unknown>

export interface TemplatePage {
  size: string
  width_mm: number
  height_mm: number
  orientation: 'portrait' | 'landscape'
  margin_top_mm: number
  margin_right_mm: number
  margin_bottom_mm: number
  margin_left_mm: number
  offset_x_mm: number
  offset_y_mm: number
  font_family: string
  font_size_pt: number
}

export interface ReportCardDetail {
  id: number
  status: 'draft' | 'final'
  editable: boolean
  /** Isian rapor (kunci sesuai definisi template). */
  answers: ReportData
  student: {
    id: number
    name: string
    nis: string | null
    nisn: string | null
    gender: 'L' | 'P'
    birth_place: string | null
    birth_date: string | null
    religion: string | null
    address: string | null
  }
  classroom: { id: number; name: string; unit: { code: string; name: string }; grade: string | null; homeroom: string | null }
  semester: { id: number; name: 'ganjil' | 'genap'; year: string }
  template: { id: number; name: string; version: number; page: TemplatePage; definition: ReportDefinition }
  school: { foundation_name: string | null; address: string | null; phone: string | null; email: string | null }
  finalized_at: string | null
  updated_at: string | null
}

export interface ReportRow {
  student: { id: number; name: string; nis: string | null }
  report_card: { id: number; status: 'draft' | 'final'; updated_at: string | null } | null
}

export interface ReportRowsMeta {
  classroom: { id: number; name: string; unit: string }
  semester: { id: number; name: string } | null
  counts: { total: number; draft: number; final: number }
}
