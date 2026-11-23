import { Card, Tabs } from 'antd'
import { PageHeader } from '../../components/PageHeader'
import { FINANCE_TABS } from './tabs'
import { useMe } from '../auth/useMe'
import { can } from '../../lib/permissions'

export function FinancePage() {
  const { data: me } = useMe()

  const visibleTabs = FINANCE_TABS.filter((tab) => !tab.permission || can(me, tab.permission))

  return (
    <div>
      <PageHeader
        title="Keuangan"
        subtitle="Tagihan, pembayaran, kas, laporan, tarif, dan diskon"
      />

      <Card styles={{ body: { padding: 16 } }}>
        <Tabs
          defaultActiveKey="invoices"
          items={visibleTabs.map((tab) => ({
            key: tab.key,
            label: tab.label,
            children: tab.children,
          }))}
        />
      </Card>
    </div>
  )
}

