import type { DiscountType, FeeCategory } from './types'

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
