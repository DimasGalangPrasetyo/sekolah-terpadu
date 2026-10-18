import type { ModuleDef } from './moduleTypes'

const found = import.meta.glob<{ default: ModuleDef }>('../features/*/module.tsx', { eager: true })

/** Semua modul yang ditemukan di features/<nama>/module.tsx. */
export const MODULES: ModuleDef[] = Object.values(found).map((m) => m.default)
