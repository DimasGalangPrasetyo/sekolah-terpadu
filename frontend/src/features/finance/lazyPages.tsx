import { lazy } from 'react'

export const FinancePage = lazy(() => import('./FinancePage').then((m) => ({ default: m.FinancePage })))
