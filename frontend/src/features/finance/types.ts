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

// --- Pembayaran ---

export type PaymentMethod = 'cash' | 'transfer' | 'other'
export type PaymentStatus = 'valid' | 'void'

export interface PaymentAllocation {
  id: number
  amount: number
  invoice: {
    id: number
    number: string
    kind: 'monthly' | 'one_time'
    period_month: string | null
    status: InvoiceStatus
  } | null
}

export interface Payment {
  id: number
  receipt_number: string
  payment_date: string // 'YYYY-MM-DD'
  method: PaymentMethod
  amount: number
  reference: string | null
  notes: string | null
  status: PaymentStatus
  voided_at: string | null
  void_reason: string | null
  created_at: string
  student?: { id: number; nis: string | null; name: string } | null
  received_by?: { id: number; name: string } | null
  allocations?: PaymentAllocation[]
}

export interface ReceiptAllocation {
  invoice_number: string | null
  unit: string | null
  description: string | null
  amount: number
}

export interface ReceiptSchool {
  name: string
  address: string | null
  phone: string | null
  email: string | null
}

export interface Receipt {
  receipt_number: string
  payment_date: string
  method: PaymentMethod
  method_label: string
  reference: string | null
  notes: string | null
  amount: number
  amount_in_words: string
  status: PaymentStatus
  voided_at: string | null
  void_reason: string | null
  student: { nis: string | null; name: string } | null
  received_by: string | null
  allocations: ReceiptAllocation[]
  school: ReceiptSchool
  printed_at: string
}

export interface PaymentListParams {
  q?: string
  student_id?: number
  method?: PaymentMethod
  status?: PaymentStatus
  date_from?: string // YYYY-MM-DD
  date_to?: string // YYYY-MM-DD
  page?: number
  per_page?: number
}

export interface PaymentCreatePayload {
  student_id: number
  payment_date: string // YYYY-MM-DD
  method: PaymentMethod
  reference?: string | null
  notes?: string | null
  amount?: number
  allocations?: {
    invoice_id: number
    amount: number
  }[]
}

// --- Kas Masuk / Keluar & Kategori Kas ---

export type CashType = 'income' | 'expense'
export type CashStatus = 'valid' | 'void'

export interface CashCategory {
  id: number
  name: string
  type: CashType
  is_active: boolean
}

export interface CashCategoryPayload {
  name: string
  type?: CashType
}

export interface CashTransaction {
  id: number
  number: string
  transaction_date: string
  type: CashType
  amount: number
  description: string
  status: CashStatus
  voided_at: string | null
  void_reason: string | null
  created_at: string
  category?: { id: number; name: string; type: CashType } | null
  unit?: { id: number; code: string; name: string } | null
  created_by?: { id: number; name: string } | null
  voided_by?: { id: number; name: string } | null
}

export interface CashSummary {
  income: number
  expense: number
  balance: number
  count: number
}

export interface CashTransactionListParams {
  type?: CashType
  cash_category_id?: number
  unit?: string
  status?: CashStatus
  date_from?: string
  date_to?: string
  q?: string
  page?: number
  per_page?: number
}

export interface CashTransactionCreatePayload {
  transaction_date: string
  cash_category_id: number
  unit_id?: number | null
  amount: number
  description: string
}

