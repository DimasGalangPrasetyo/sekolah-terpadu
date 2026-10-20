import { lazy } from 'react'

export const InventoryPage = lazy(() =>
  import('./InventoryPage').then((m) => ({ default: m.InventoryPage })),
)
