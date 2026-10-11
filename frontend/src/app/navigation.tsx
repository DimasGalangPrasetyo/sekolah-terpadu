import {
  AuditOutlined,
  BarChartOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  HomeOutlined,
  IdcardOutlined,
  InboxOutlined,
  LayoutOutlined,
  TeamOutlined,
  UserSwitchOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import type { ReactNode } from 'react'
import { can } from '../lib/permissions'
import type { AuthUser } from '../types/api'

export interface NavItem {
  key: string
  path: string
  label: string
  description: string
  icon: ReactNode
  /** Salah satu izin ini cukup. Kosong = semua pengguna. */
  permission?: string[]
  group: 'main' | 'settings'
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'home', path: '/', label: 'Beranda', description: 'Ringkasan dan pintasan', icon: <HomeOutlined />, group: 'main' },
  { key: 'students', path: '/siswa', label: 'Siswa', description: 'Buku induk, wali, dan mutasi siswa TK, SD, SMP', icon: <TeamOutlined />, permission: ['students.view'], group: 'main' },
  { key: 'staff', path: '/staf', label: 'Staf', description: 'Data guru dan tenaga kependidikan, wali kelas', icon: <IdcardOutlined />, permission: ['staff.view'], group: 'main' },
  { key: 'master', path: '/master', label: 'Data Master', description: 'Tahun ajaran, semester, dan rombel', icon: <DatabaseOutlined />, permission: ['master.manage'], group: 'main' },
  { key: 'finance', path: '/keuangan', label: 'Keuangan', description: 'Tagihan, pembayaran, kas, dan laporan', icon: <WalletOutlined />, permission: ['finance.view'], group: 'main' },
  { key: 'inventory', path: '/inventaris', label: 'Inventaris', description: 'Aset dan perlengkapan sekolah', icon: <InboxOutlined />, permission: ['inventory.view'], group: 'main' },
  { key: 'reportcards', path: '/rapor', label: 'Rapor', description: 'Isi dan cetak rapor siswa SD dan SMP', icon: <FileTextOutlined />, permission: ['reportcards.fill', 'reportcards.manage'], group: 'main' },
  { key: 'templates', path: '/template-rapor', label: 'Template Rapor', description: 'Susunan, ukuran kertas, dan kalibrasi cetak', icon: <LayoutOutlined />, permission: ['templates.manage'], group: 'main' },
  { key: 'reports', path: '/laporan', label: 'Laporan', description: 'Laporan siswa, staf, keuangan, dan aset untuk dicetak', icon: <BarChartOutlined />, permission: ['reports.view'], group: 'main' },
  { key: 'users', path: '/akun', label: 'Akun dan Peran', description: 'Kelola akun pengguna', icon: <UserSwitchOutlined />, permission: ['users.manage'], group: 'settings' },
  { key: 'audit', path: '/audit', label: 'Audit Log', description: 'Jejak aktivitas penting', icon: <AuditOutlined />, permission: ['audit.view'], group: 'settings' },
]

/** Menu yang boleh dilihat pengguna ini. Guru hanya melihat Rapor bila ia wali kelas. */
export function visibleNav(user: AuthUser): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (item.permission && !can(user, item.permission)) return false
    if (item.key === 'reportcards' && !can(user, 'reportcards.manage') && user.homerooms.length === 0) return false
    return true
  })
}

export function activeNavKey(pathname: string): string {
  const match = [...NAV_ITEMS]
    .filter((item) => item.path !== '/')
    .find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`))

  return match?.key ?? 'home'
}
