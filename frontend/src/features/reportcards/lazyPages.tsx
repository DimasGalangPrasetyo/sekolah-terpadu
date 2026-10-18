import { lazy } from 'react'

// Dimuat saat dibutuhkan agar unduhan awal ringan.
export const ReportCardsPage = lazy(() => import('./pages/ReportCardsPage').then((m) => ({ default: m.ReportCardsPage })))
export const ReportWorkspacePage = lazy(() => import('./pages/ReportWorkspacePage').then((m) => ({ default: m.ReportWorkspacePage })))
export const ReportBatchPrintPage = lazy(() => import('./pages/ReportBatchPrintPage').then((m) => ({ default: m.ReportBatchPrintPage })))
