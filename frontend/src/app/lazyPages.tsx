import { lazy } from 'react'

// Halaman berat dimuat saat dibutuhkan agar unduhan awal ringan (penting di jaringan lambat/HP).
export const ChangePasswordPage = lazy(() =>
  import('../features/auth/ChangePasswordPage').then((m) => ({ default: m.ChangePasswordPage })),
)
export const UsersPage = lazy(() => import('../features/users/UsersPage').then((m) => ({ default: m.UsersPage })))
export const AuditLogPage = lazy(() => import('../features/audit/AuditLogPage').then((m) => ({ default: m.AuditLogPage })))
