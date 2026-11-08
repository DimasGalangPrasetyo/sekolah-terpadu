import { RequirePermission } from '../../app/guards'
import type { ModuleDef } from '../../app/moduleTypes'
import { FinancePage } from './lazyPages'

const finance: ModuleDef = {
  key: 'finance',
  routes: [
    {
      path: 'keuangan',
      element: (
        <RequirePermission permission="finance.view">
          <FinancePage />
        </RequirePermission>
      ),
    },
  ],
}

export default finance
