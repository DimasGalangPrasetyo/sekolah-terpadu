import { Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { LoginPage } from '../features/auth/LoginPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { NotFoundPage } from '../features/errors/NotFoundPage'
import { ComingSoon } from '../components/ComingSoon'
import { AppLayout } from './AppLayout'
import { AuditLogPage, ChangePasswordPage, UsersPage } from './lazyPages'
import { GuestOnly, RequireAuth, RequirePermission } from './guards'
import { NAV_ITEMS } from './navigation'

const planned: Record<string, string[]> = {
  students: ['Buku induk digital TK, SD, SMP', 'Data wali dan riwayat mutasi', 'Penempatan siswa di rombel', 'Pencarian dan impor data'],
  staff: ['Data guru dan tenaga kependidikan', 'Penugasan ke unit', 'Penetapan wali kelas per rombel'],
  master: ['Tahun ajaran dan semester aktif', 'Rombel per tahun ajaran', 'Mata pelajaran'],
  finance: ['Jenis biaya dan tarif per tingkat', 'Tagihan SPP dan pembayaran', 'Kwitansi dan kas', 'Laporan keuangan per unit'],
  inventory: ['Daftar aset dan lokasi', 'Kondisi dan perpindahan aset'],
  reportcards: ['Form isian di kiri, pratinjau halaman di kanan', 'Pengaturan kertas dan kalibrasi cetak', 'Simpan sebagai PDF atau cetak langsung'],
  templates: ['Susunan rapor SD dan SMP', 'Ukuran kertas, margin, dan offset cetak'],
  reports: ['Laporan siswa, staf, keuangan, dan aset', 'Siap cetak dengan kop sekolah'],
}

const modulePages = NAV_ITEMS.filter((item) => item.key in planned).map((item) => ({
  path: item.path.slice(1),
  element: (
    <RequirePermission permission={item.permission ?? []}>
      <ComingSoon title={item.label} description={item.description} planned={planned[item.key]} />
    </RequirePermission>
  ),
}))

export const router = createBrowserRouter([
  { path: '/masuk', element: <GuestOnly><LoginPage /></GuestOnly> },
  { path: '/ganti-password', element: <RequireAuth allowPasswordChange><Suspense fallback={null}><ChangePasswordPage /></Suspense></RequireAuth> },
  {
    element: <RequireAuth><AppLayout /></RequireAuth>,
    children: [
      { index: true, element: <DashboardPage /> },
      ...modulePages,
      { path: 'akun', element: <RequirePermission permission="users.manage"><UsersPage /></RequirePermission> },
      { path: 'audit', element: <RequirePermission permission="audit.view"><AuditLogPage /></RequirePermission> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
