import type {
  DiscountType,
  FeeCategory,
  InvoiceKind,
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
} from './types'

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

// --- Pembayaran ---

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Tunai',
  transfer: 'Transfer',
  other: 'Lainnya',
}

export const PAYMENT_METHOD_COLORS: Record<PaymentMethod, string> = {
  cash: 'green',
  transfer: 'blue',
  other: 'default',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  valid: 'Valid',
  void: 'Dibatalkan',
}

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  valid: 'success',
  void: 'default',
}

// --- Cetak Kwitansi ---

export const RECEIPT_PAGE: import('../reportcards/printSettings').EffectivePage = {
  width: 210,
  height: 148,
  top: 10,
  right: 10,
  bottom: 10,
  left: 10,
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSizePt: 9,
}
