import { RequirePermission } from '../../app/guards'
import type { ModuleDef } from '../../app/moduleTypes'
import { StaffPage } from './lazyPages'

const staffModule: ModuleDef = {
  key: 'staff',
  routes: [
    {
      path: 'staf',
      element: (
        <RequirePermission permission="staff.view">
          <StaffPage />
        </RequirePermission>
      ),
    },
  ],
}

export default staffModule
