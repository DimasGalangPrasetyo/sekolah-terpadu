import { lazy } from 'react'

export const StaffPage = lazy(() => import('./StaffPage').then((m) => ({ default: m.StaffPage })))
