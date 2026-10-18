import type { ReactNode } from 'react'
import type { RouteObject } from 'react-router-dom'

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

/**
 * Definisi satu modul. Setiap modul baru cukup membuat `features/<nama>/module.tsx`
 * yang mengekspor ini sebagai default; router dan menu memuatnya otomatis
 * (tanpa mengubah berkas bersama).
 */
export interface ModuleDef {
  /** Jika sama dengan kunci menu yang masih berupa "segera hadir", halaman penggantinya dipakai. */
  key: string
  routes: RouteObject[]
  nav?: NavItem[]
}
