import type { ReactNode } from 'react'
import { DiscountTab } from './DiscountTab'
import { FeeRateTab } from './FeeRateTab'
import { FeeTypeTab } from './FeeTypeTab'
import { InvoiceTab } from './InvoiceTab'

export interface FinanceTabItem {
  key: string
  label: string
  children: ReactNode
}

/**
 * Daftar tab pada modul keuangan.
 * K-1 menyediakan Tarif, Jenis Biaya, dan Diskon Siswa.
 * K-2F menambahkan tab Tagihan sebagai tab pertama (tab awal).
 */
export const FINANCE_TABS: FinanceTabItem[] = [
  {
    key: 'invoices',
    label: 'Tagihan',
    children: <InvoiceTab />,
  },
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
