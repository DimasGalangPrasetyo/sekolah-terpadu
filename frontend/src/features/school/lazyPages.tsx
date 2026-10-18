import { lazy } from 'react'

export const SchoolProfilePage = lazy(() => import('./SchoolProfilePage').then((m) => ({ default: m.SchoolProfilePage })))
