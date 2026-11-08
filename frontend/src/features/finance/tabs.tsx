import type { ReactNode } from 'react'
import { DiscountTab } from './DiscountTab'
import { FeeRateTab } from './FeeRateTab'
import { FeeTypeTab } from './FeeTypeTab'

export interface FinanceTabItem {
  key: string
  label: string
  children: ReactNode
}

/**
 * Daftar tab pada modul keuangan.
 * K-1 menyediakan Tarif, Jenis Biaya, dan Diskon Siswa.
 * Paket K berikutnya cukup menambahkan elemen ke array ini.
 */
export const FINANCE_TABS: FinanceTabItem[] = [
  {
    key: 'rates',
    label: 'Tarif',
    children: <FeeRateTab />,
  },
  {
    key: 'fee-types',
    label: 'Jenis Biaya',
    children: <FeeTypeTab />,
  },
  {
    key: 'discounts',
    label: 'Diskon Siswa',
    children: <DiscountTab />,
  },
]
