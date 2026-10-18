import { RequirePermission } from '../../app/guards'
import type { ModuleDef } from '../../app/moduleTypes'
import { ReportBatchPrintPage, ReportCardsPage, ReportWorkspacePage } from './lazyPages'

const ACCESS = ['reportcards.fill', 'reportcards.manage']

const reportCards: ModuleDef = {
  key: 'reportcards',
  routes: [
    { path: 'rapor', element: <RequirePermission permission={ACCESS}><ReportCardsPage /></RequirePermission> },
    { path: 'rapor/cetak', element: <RequirePermission permission={ACCESS}><ReportBatchPrintPage /></RequirePermission> },
    { path: 'rapor/:id', element: <RequirePermission permission={ACCESS}><ReportWorkspacePage /></RequirePermission> },
  ],
}

export default reportCards
