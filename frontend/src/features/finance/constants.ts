import type { DiscountType, FeeCategory, InvoiceKind, InvoiceStatus } from './types'

export const FEE_CATEGORY_LABELS: Record<FeeCategory, string> = {
  monthly: 'Bulanan',
  one_time: 'Sekali Bayar',
  annual: 'Tahunan',
  other: 'Lainnya',
}

export const FEE_CATEGORY_COLORS: Record<FeeCategory, string> = {
  monthly: 'blue',
  one_time: 'purple',
  annual: 'orange',
  other: 'default',
}

export const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  fixed: 'Nominal Tetap (Rp)',
  percent: 'Persentase (%)',
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  unpaid: 'Belum Bayar',
  partial: 'Sebagian',
  paid: 'Lunas',
  void: 'Dibatalkan',
}

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  unpaid: 'orange',
  partial: 'blue',
  paid: 'success',
  void: 'default',
}

export const INVOICE_KIND_LABELS: Record<InvoiceKind, string> = {
  monthly: 'Bulanan',
  one_time: 'Sekali Bayar',
}
