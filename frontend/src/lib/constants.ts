export const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Pengelola Sistem',
  admin_tu_keuangan: 'Admin TU dan Keuangan',
  guru: 'Guru',
}

export const ROLE_COLORS: Record<string, string> = {
  superadmin: 'purple',
  admin_tu_keuangan: 'blue',
  guru: 'green',
}

export const UNIT_OPTIONS = [
  { value: 'ALL', label: 'Semua' },
  { value: 'TK', label: 'TK' },
  { value: 'SD', label: 'SD' },
  { value: 'SMP', label: 'SMP' },
] as const

export type UnitFilter = (typeof UNIT_OPTIONS)[number]['value']

export const AUDIT_EVENT_LABELS: Record<string, string> = {
  login: 'Masuk',
  logout: 'Keluar',
  login_failed: 'Gagal masuk',
  login_throttled: 'Percobaan dibatasi',
  login_inactive: 'Akun nonaktif mencoba masuk',
  account_locked: 'Akun dikunci',
  created: 'Dibuat',
  updated: 'Diubah',
  deleted: 'Dihapus',
  restored: 'Dipulihkan',
  password_changed: 'Ganti password',
  password_reset: 'Reset password',
  role_assigned: 'Peran diberikan',
  role_changed: 'Peran diubah',
  user_activated: 'Akun diaktifkan',
  user_deactivated: 'Akun dinonaktifkan',
}

/** Batas waktu menganggur sebelum peringatan, dan lama peringatan sebelum keluar otomatis. */
export const IDLE_MINUTES = 30
export const IDLE_WARNING_SECONDS = 60
