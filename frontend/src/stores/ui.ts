import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UnitFilter } from '../lib/constants'

interface UiState {
  unit: UnitFilter
  siderCollapsed: boolean
  setUnit: (unit: UnitFilter) => void
  setSiderCollapsed: (collapsed: boolean) => void
}

/** Preferensi tampilan saja (bukan data sensitif), disimpan di perangkat. */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      unit: 'ALL',
      siderCollapsed: false,
      setUnit: (unit) => set({ unit }),
      setSiderCollapsed: (siderCollapsed) => set({ siderCollapsed }),
    }),
    { name: 'sekolah-terpadu-ui' },
  ),
)
