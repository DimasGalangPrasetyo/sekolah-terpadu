import type { ReactNode } from 'react'
import { CashCategoryTab } from './CashCategoryTab'
import { CashTab } from './CashTab'
import { DiscountTab } from './DiscountTab'
import { FeeRateTab } from './FeeRateTab'
import { FeeTypeTab } from './FeeTypeTab'
import { InvoiceTab } from './InvoiceTab'
import { PaymentTab } from './PaymentTab'
import { ReportTab } from './ReportTab'

export interface FinanceTabItem {
  key: string
  label: string
  children: ReactNode
  permission?: string
}

/**
 * Daftar tab pada modul keuangan.
 * K-1 menyediakan Tarif, Jenis Biaya, dan Diskon Siswa.
 * K-2F menambahkan tab Tagihan sebagai tab pertama (tab awal).
 * K-3F menambahkan tab Pembayaran sebagai tab kedua (setelah Tagihan).
 * K-4 menambahkan tab Kas (setelah Pembayaran) dan tab Kategori Kas (paling akhir).
 * K-5F menambahkan tab Laporan (setelah Kas).
 */
export const FINANCE_TABS: FinanceTabItem[] = [
  {
    key: 'invoices',
    label: 'Tagihan',
    children: <InvoiceTab />,
  },
  {
    key: 'payments',
    label: 'Pembayaran',
    children: <PaymentTab />,
  },
  {
    key: 'cash',
    label: 'Kas',
    children: <CashTab />,
  },
  {
    key: 'reports',
    label: 'Laporan',
    children: <ReportTab />,
    permission: 'reports.view',
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
  {
    key: 'cash-categories',
    label: 'Kategori Kas',
    children: <CashCategoryTab />,
  },
]
