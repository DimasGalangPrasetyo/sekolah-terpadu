export type FeeCategory = 'monthly' | 'one_time' | 'annual' | 'other'

export interface FeeType {
  id: number
  code: string
  name: string
  category: FeeCategory
  is_active: boolean
}

export interface FeeTypePayload {
  code?: string
  name: string
  category: FeeCategory
}

export interface FeeRate {
  id: number
  amount: number
  fee_type: {
    id: number
    code: string
    name: string
    category: FeeCategory
    is_active: boolean
  }
  unit: {
    id: number
    code: string
    name: string
  }
  grade_level: {
    id: number
    code: string
    name: string
  } | null
  academic_year: {
    id: number
    name: string
  }
}

export interface FeeRatePayload {
  fee_type_id: number
  unit_id: number
  grade_level_id?: number | null
  academic_year_id: number
  amount: number
}

export type DiscountType = 'fixed' | 'percent'

export interface StudentDiscount {
  id: number
  type: DiscountType
  value: number
  reason: string | null
  is_active: boolean
  student: {
    id: number
    name: string
    nis: string | null
  }
  fee_type: {
    id: number
    code: string
    name: string
  } | null
  academic_year: {
    id: number
    name: string
  }
}

export interface StudentDiscountPayload {
  student_id?: number
  fee_type_id?: number | null
  academic_year_id?: number
  type: DiscountType
  value: number
  reason?: string | null
}

export interface StudentDiscountParams {
  page?: number
  per_page?: number
  q?: string
  academic_year_id?: number
  fee_type_id?: number
  is_active?: boolean | number
}

// --- Tagihan ---

export type InvoiceStatus = 'unpaid' | 'partial' | 'paid' | 'void'
export type InvoiceKind = 'monthly' | 'one_time'

export interface InvoiceItem {
  id: number
  fee_type: { id: number; code: string; name: string } | null
  description: string
  quantity: number
  unit_price: number
  discount_amount: number
  subtotal: number
}

export interface InvoiceAllocation {
  id: number
  amount: number
  payment: { id: number; receipt_number: string; payment_date: string; status: string } | null
}

export interface Invoice {
  id: number
  number: string
  kind: InvoiceKind
  period_month: string | null
  due_date: string | null
  total_amount: number
  paid_amount: number
  outstanding: number
  status: InvoiceStatus
  is_overdue: boolean
  notes: string | null
  voided_at: string | null
  void_reason: string | null
  created_at: string
  student?: { id: number; nis: string | null; name: string } | null
  unit?: { id: number; code: string; name: string }
  academic_year?: { id: number; name: string }
  items?: InvoiceItem[]
  allocations?: InvoiceAllocation[]
}

export interface GenerateResult {
  dry_run: boolean
  period: string
  unit: { id: number; code: string }
  eligible: number
  created: number
  skipped_existing: number
  skipped_no_rate: number
  skipped_no_rate_students: { id: number; nis: string | null; name: string }[]
  total_amount: number
}

export interface GenerateInvoicesPayload {
  unit_id: number
  month: string
  due_date?: string
  academic_year_id?: number
  student_ids?: number[]
  dry_run?: boolean
}

export interface InvoiceCreatePayload {
  student_id: number
  due_date?: string
  notes?: string
  items: {
    fee_type_id: number
    quantity?: number
    unit_price?: number
    description?: string
  }[]
}

export interface InvoiceListParams {
  unit?: string
  status?: InvoiceStatus
  kind?: InvoiceKind
  period?: string
  student_id?: number
  q?: string
  overdue?: 1
  academic_year_id?: number
  page?: number
  per_page?: number
}
