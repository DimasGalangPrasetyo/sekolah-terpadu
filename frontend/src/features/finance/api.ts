import { http } from '../../api/client'
import type { Paginated } from '../../types/api'
import type {
  CashCategory,
  CashCategoryPayload,
  CashSummary,
  CashTransaction,
  CashTransactionCreatePayload,
  CashTransactionListParams,
  CashType,
  FeeRate,
  FeeRatePayload,
  FeeType,
  FeeTypePayload,
  GenerateInvoicesPayload,
  GenerateResult,
  Invoice,
  InvoiceCreatePayload,
  InvoiceListParams,
  Payment,
  PaymentCreatePayload,
  PaymentListParams,
  Receipt,
  StudentDiscount,
  StudentDiscountParams,
  StudentDiscountPayload,
  SummaryReport,
  SummaryReportParams,
  ArrearsReport,
  ArrearsReportParams,
  CashBookReport,
  CashBookReportParams,
  DailyReport,
  DailyReportParams,
} from './types'

// --- Jenis Biaya ---

export async function listFeeTypes(isActive?: boolean): Promise<FeeType[]> {
  const params = isActive !== undefined ? { is_active: isActive ? 1 : 0 } : {}
  const { data } = await http.get<{ data: FeeType[] }>('/fee-types', { params })
  return data.data
}

export async function createFeeType(payload: FeeTypePayload): Promise<FeeType> {
  const { data } = await http.post<{ data: FeeType }>('/fee-types', payload)
  return data.data
}

export async function updateFeeType(id: number, payload: FeeTypePayload): Promise<FeeType> {
  const { data } = await http.put<{ data: FeeType }>(`/fee-types/${id}`, payload)
  return data.data
}

export async function deactivateFeeType(id: number): Promise<FeeType> {
  const { data } = await http.post<{ data: FeeType }>(`/fee-types/${id}/deactivate`)
  return data.data
}

export async function activateFeeType(id: number): Promise<FeeType> {
  const { data } = await http.post<{ data: FeeType }>(`/fee-types/${id}/activate`)
  return data.data
}

export async function deleteFeeType(id: number): Promise<void> {
  await http.delete(`/fee-types/${id}`)
}

// --- Tarif ---

export interface FeeRateFilterParams {
  academic_year_id?: number
  unit?: string
  fee_type_id?: number
  grade_level_id?: number
}

export async function listFeeRates(params?: FeeRateFilterParams): Promise<FeeRate[]> {
  const { data } = await http.get<{ data: FeeRate[] }>('/fee-rates', { params })
  return data.data
}

export async function createFeeRate(payload: FeeRatePayload): Promise<FeeRate> {
  const { data } = await http.post<{ data: FeeRate }>('/fee-rates', payload)
  return data.data
}

export async function updateFeeRate(id: number, amount: number): Promise<FeeRate> {
  const { data } = await http.put<{ data: FeeRate }>(`/fee-rates/${id}`, { amount })
  return data.data
}

export async function deleteFeeRate(id: number): Promise<void> {
  await http.delete(`/fee-rates/${id}`)
}

// --- Diskon Siswa ---

export async function listStudentDiscounts(params?: StudentDiscountParams): Promise<Paginated<StudentDiscount>> {
  const { data } = await http.get<Paginated<StudentDiscount>>('/student-discounts', { params })
  return data
}

export async function createStudentDiscount(payload: StudentDiscountPayload): Promise<StudentDiscount> {
  const { data } = await http.post<{ data: StudentDiscount }>('/student-discounts', payload)
  return data.data
}

export async function updateStudentDiscount(id: number, payload: StudentDiscountPayload): Promise<StudentDiscount> {
  const { data } = await http.put<{ data: StudentDiscount }>(`/student-discounts/${id}`, payload)
  return data.data
}

export async function deactivateStudentDiscount(id: number): Promise<StudentDiscount> {
  const { data } = await http.post<{ data: StudentDiscount }>(`/student-discounts/${id}/deactivate`)
  return data.data
}

export async function activateStudentDiscount(id: number): Promise<StudentDiscount> {
  const { data } = await http.post<{ data: StudentDiscount }>(`/student-discounts/${id}/activate`)
  return data.data
}

// --- Tagihan ---

export async function listInvoices(params?: InvoiceListParams): Promise<Paginated<Invoice>> {
  const { data } = await http.get<Paginated<Invoice>>('/invoices', { params })
  return data
}

export async function getInvoice(id: number): Promise<Invoice> {
  const { data } = await http.get<{ data: Invoice }>(`/invoices/${id}`)
  return data.data
}

export async function generateInvoices(payload: GenerateInvoicesPayload): Promise<GenerateResult> {
  const { data } = await http.post<{ data: GenerateResult }>('/invoices/generate', payload)
  return data.data
}

export async function createInvoice(payload: InvoiceCreatePayload): Promise<Invoice> {
  const { data } = await http.post<{ data: Invoice }>('/invoices', payload)
  return data.data
}

export async function voidInvoice(id: number, reason: string): Promise<Invoice> {
  const { data } = await http.post<{ data: Invoice }>(`/invoices/${id}/void`, { reason })
  return data.data
}

// --- Pembayaran ---

export async function listPayments(params?: PaymentListParams): Promise<Paginated<Payment>> {
  const { data } = await http.get<Paginated<Payment>>('/payments', { params })
  return data
}

export async function getPayment(id: number): Promise<Payment> {
  const { data } = await http.get<{ data: Payment }>(`/payments/${id}`)
  return data.data
}

export async function listOpenInvoices(studentId: number): Promise<Invoice[]> {
  const { data } = await http.get<{ data: Invoice[] }>('/payments/open-invoices', {
    params: { student_id: studentId },
  })
  return data.data
}

export async function createPayment(payload: PaymentCreatePayload): Promise<Payment> {
  const { data } = await http.post<{ data: Payment }>('/payments', payload)
  return data.data
}

export async function voidPayment(id: number, reason: string): Promise<Payment> {
  const { data } = await http.post<{ data: Payment }>(`/payments/${id}/void`, { reason })
  return data.data
}

export async function getReceipt(id: number): Promise<Receipt> {
  const { data } = await http.get<{ data: Receipt }>(`/payments/${id}/receipt`)
  return data.data
}

// --- Kategori Kas ---

export async function listCashCategories(params?: {
  type?: CashType
  is_active?: boolean | number
}): Promise<CashCategory[]> {
  const queryParams: Record<string, unknown> = {}
  if (params?.type) queryParams.type = params.type
  if (params?.is_active !== undefined) {
    queryParams.is_active = typeof params.is_active === 'boolean' ? (params.is_active ? 1 : 0) : params.is_active
  }
  const { data } = await http.get<{ data: CashCategory[] }>('/cash-categories', { params: queryParams })
  return data.data
}

export async function createCashCategory(payload: CashCategoryPayload): Promise<CashCategory> {
  const { data } = await http.post<{ data: CashCategory }>('/cash-categories', payload)
  return data.data
}

export async function updateCashCategory(id: number, payload: { name: string }): Promise<CashCategory> {
  const { data } = await http.put<{ data: CashCategory }>(`/cash-categories/${id}`, payload)
  return data.data
}

export async function deactivateCashCategory(id: number): Promise<CashCategory> {
  const { data } = await http.post<{ data: CashCategory }>(`/cash-categories/${id}/deactivate`)
  return data.data
}

export async function activateCashCategory(id: number): Promise<CashCategory> {
  const { data } = await http.post<{ data: CashCategory }>(`/cash-categories/${id}/activate`)
  return data.data
}

export async function deleteCashCategory(id: number): Promise<void> {
  await http.delete(`/cash-categories/${id}`)
}

// --- Transaksi Kas ---

export async function listCashTransactions(
  params?: CashTransactionListParams,
): Promise<Paginated<CashTransaction>> {
  const { data } = await http.get<Paginated<CashTransaction>>('/cash-transactions', { params })
  return data
}

export async function getCashSummary(
  params?: Omit<CashTransactionListParams, 'page' | 'per_page'>,
): Promise<CashSummary> {
  const { data } = await http.get<{ data: CashSummary }>('/cash-transactions/summary', { params })
  return data.data
}

export async function getCashTransaction(id: number): Promise<CashTransaction> {
  const { data } = await http.get<{ data: CashTransaction }>(`/cash-transactions/${id}`)
  return data.data
}

export async function createCashTransaction(
  payload: CashTransactionCreatePayload,
): Promise<CashTransaction> {
  const { data } = await http.post<{ data: CashTransaction }>('/cash-transactions', payload)
  return data.data
}

export async function voidCashTransaction(id: number, reason: string): Promise<CashTransaction> {
  const { data } = await http.post<{ data: CashTransaction }>(`/cash-transactions/${id}/void`, { reason })
  return data.data
}

// --- Laporan Keuangan ---

export async function getSummaryReport(params: SummaryReportParams): Promise<SummaryReport> {
  const { data } = await http.get<{ data: SummaryReport }>('/reports/finance/summary', { params })
  return data.data
}

export async function getArrearsReport(params?: ArrearsReportParams): Promise<ArrearsReport> {
  const formattedParams = params
    ? {
        ...params,
        include_not_due: params.include_not_due ? 1 : 0,
      }
    : undefined
  const { data } = await http.get<{ data: ArrearsReport }>('/reports/finance/arrears', {
    params: formattedParams,
  })
  return data.data
}

export async function getCashBookReport(params: CashBookReportParams): Promise<CashBookReport> {
  const { data } = await http.get<{ data: CashBookReport }>('/reports/finance/cash-book', { params })
  return data.data
}

export async function getDailyReport(params: DailyReportParams): Promise<DailyReport> {
  const { data } = await http.get<{ data: DailyReport }>('/reports/finance/daily-payments', { params })
  return data.data
}


