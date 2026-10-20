import { RequirePermission } from '../../app/guards'
import type { ModuleDef } from '../../app/moduleTypes'
import { InventoryPage } from './lazyPages'

const inventoryModule: ModuleDef = {
  key: 'inventory',
  routes: [
    {
      path: 'inventaris',
      element: (
        <RequirePermission permission="inventory.view">
          <InventoryPage />
        </RequirePermission>
      ),
    },
  ],
}

export default inventoryModule
