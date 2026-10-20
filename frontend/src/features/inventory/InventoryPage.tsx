import {
  AppstoreOutlined,
  EnvironmentOutlined,
  InboxOutlined,
} from '@ant-design/icons'
import { Card, Tabs } from 'antd'
import { useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { useUiStore } from '../../stores/ui'
import { AssetTab } from './AssetTab'
import { CategoryTab } from './CategoryTab'
import { LocationTab } from './LocationTab'

export function InventoryPage() {
  const unit = useUiStore((s) => s.unit)
  const [activeTab, setActiveTab] = useState('assets')

  return (
    <>
      <PageHeader
        title="Inventaris"
        subtitle={
          unit === 'ALL'
            ? 'Pengelolaan sarana dan prasarana semua unit (TK, SD, SMP) dan fasilitas bersama'
            : `Pengelolaan sarana dan prasarana Unit ${unit}`
        }
      />

      <Card styles={{ body: { padding: '12px 16px' } }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'assets',
              label: (
                <span>
                  <InboxOutlined /> Aset & Barang
                </span>
              ),
              children: <AssetTab />,
            },
            {
              key: 'categories',
              label: (
                <span>
                  <AppstoreOutlined /> Kategori
                </span>
              ),
              children: <CategoryTab />,
            },
            {
              key: 'locations',
              label: (
                <span>
                  <EnvironmentOutlined /> Lokasi & Ruangan
                </span>
              ),
              children: <LocationTab />,
            },
          ]}
        />
      </Card>
    </>
  )
}
