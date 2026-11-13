import { Card, Tabs } from 'antd'
import { PageHeader } from '../../components/PageHeader'
import { FINANCE_TABS } from './tabs'

export function FinancePage() {
  return (
    <div>
      <PageHeader
        title="Keuangan"
        subtitle="Pengaturan jenis biaya, tarif per unit/tingkat, dan diskon siswa"
      />

      <Card styles={{ body: { padding: 16 } }}>
        <Tabs
          defaultActiveKey="invoices"
          items={FINANCE_TABS.map((tab) => ({
            key: tab.key,
            label: tab.label,
            children: tab.children,
          }))}
        />
      </Card>
    </div>
  )
}
