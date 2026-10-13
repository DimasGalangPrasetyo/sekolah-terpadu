import { lazy } from 'react'

// Halaman berat dimuat saat dibutuhkan agar unduhan awal ringan (penting di jaringan lambat/HP).
export const ChangePasswordPage = lazy(() =>
  import('../features/auth/ChangePasswordPage').then((m) => ({ default: m.ChangePasswordPage })),
)
export const UsersPage = lazy(() => import('../features/users/UsersPage').then((m) => ({ default: m.UsersPage })))
export const AuditLogPage = lazy(() => import('../features/audit/AuditLogPage').then((m) => ({ default: m.AuditLogPage })))
export const MasterPage = lazy(() => import('../features/master/MasterPage').then((m) => ({ default: m.MasterPage })))
export const StudentsPage = lazy(() => import('../features/students/StudentsPage').then((m) => ({ default: m.StudentsPage })))
export const StudentDetailPage = lazy(() =>
  import('../features/students/StudentDetailPage').then((m) => ({ default: m.StudentDetailPage })),
)
export const StudentFormPage = lazy(() => import('../features/students/StudentFormPage').then((m) => ({ default: m.StudentFormPage })))
