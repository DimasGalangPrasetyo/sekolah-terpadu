import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  MoreOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  App,
  Button,
  Dropdown,
  Empty,
  Flex,
  Input,
  Modal,
  Select,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { TableColumnsType } from 'antd'
import { useState } from 'react'
import { getErrorMessage } from '../../api/errors'
import { useIsMobile } from '../../hooks/useIsMobile'
import { formatRupiah } from '../../lib/format'
import { can } from '../../lib/permissions'
import { useUiStore } from '../../stores/ui'
import { useMe } from '../auth/useMe'
import { deleteAsset, listAssetCategories, listAssets, listLocations } from './api'
import { AssetDetailPanel } from './AssetDetailPanel'
import { AssetDrawer } from './AssetDrawer'
import { CONDITION_CONFIG, STATUS_CONFIG } from './constants'
import type { Asset, AssetCondition, AssetListParams, AssetStatus } from './types'

const PER_PAGE = 15
const filterStyle = { flex: '1 1 160px', minWidth: 140, maxWidth: 280 } as const

export function AssetTab() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const isMobile = useIsMobile()
  const { data: me } = useMe()
  const canManage = can(me, 'inventory.manage')
  const unit = useUiStore((s) => s.unit)

  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [categoryId, setCategoryId] = useState<number | undefined>()
  const [locationId, setLocationId] = useState<number | undefined>()
  const [itemCondition, setItemCondition] = useState<AssetCondition | undefined>()
  const [status, setStatus] = useState<AssetStatus | undefined>()
  const [sharedOnly, setSharedOnly] = useState<boolean>(false)

  // Drawer & Panel states
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [detailAssetId, setDetailAssetId] = useState<number | null>(null)

  const categoriesQuery = useQuery({
    queryKey: ['asset-categories'],
    queryFn: listAssetCategories,
  })

  const locationsQuery = useQuery({
    queryKey: ['locations'],
    queryFn: () => listLocations(),
  })

  // Unit filter logic: if top bar unit is TK/SD/SMP, use that; if ALL and user chose shared, use 'shared'
  const effectiveUnit = sharedOnly ? 'shared' : unit === 'ALL' ? undefined : unit

  const params: AssetListParams = {
    page,
    per_page: PER_PAGE,
    q: q || undefined,
    unit: effectiveUnit,
    category_id: categoryId || undefined,
    location_id: locationId || undefined,
    item_condition: itemCondition || undefined,
    status: status || undefined,
  }

  const assetsQuery = useQuery({
    queryKey: ['assets', params],
    queryFn: () => listAssets(params),
    placeholderData: keepPreviousData,
  })

  const resetPage = () => setPage(1)

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAsset(id),
    onSuccess: () => {
      message.success('Data aset berhasil dihapus (soft delete)')
      void queryClient.invalidateQueries({ queryKey: ['assets'] })
    },
    onError: (err) => message.error(getErrorMessage(err)),
  })

  const handleDelete = (asset: Asset) => {
    Modal.confirm({
      title: `Hapus aset ${asset.name}?`,
      content:
        'Aset akan dihapus dari daftar aktif (soft delete). Riwayat yang pernah tercatat tetap tersimpan di sistem.',
      okText: 'Hapus',
      okType: 'danger',
      cancelText: 'Batal',
      onOk: () => deleteMutation.mutateAsync(asset.id),
    })
  }

  const columns: TableColumnsType<Asset> = [
    {
      title: 'Barang / Aset',
      key: 'item',
      render: (_, asset) => (
        <div>
          <Typography.Text strong>{asset.name}</Typography.Text>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              {asset.code}
            </Typography.Text>
          </div>
          {isMobile && (
            <Flex gap={4} wrap style={{ marginTop: 4 }}>
              <Tag>{asset.category?.name ?? 'Tanpa Kategori'}</Tag>
              <Tag color={asset.unit ? 'blue' : 'cyan'}>
                {asset.unit ? asset.unit.code : 'Bersama'}
              </Tag>
              <Tag color={CONDITION_CONFIG[asset.item_condition]?.color}>
                {CONDITION_CONFIG[asset.item_condition]?.label ?? asset.item_condition}
              </Tag>
            </Flex>
          )}
        </div>
      ),
    },
    {
      title: 'Kategori',
      key: 'category',
      responsive: ['sm'],
      render: (_, asset) => asset.category?.name ?? '-',
    },
    {
      title: 'Unit & Lokasi',
      key: 'location',
      render: (_, asset) => (
        <div>
          <Tag color={asset.unit ? 'blue' : 'cyan'}>
            {asset.unit ? asset.unit.code : 'Bersama'}
          </Tag>
          <div style={{ fontSize: 13, marginTop: 2 }}>{asset.location?.name ?? '-'}</div>
        </div>
      ),
    },
    {
      title: 'Jumlah',
      key: 'quantity',
      width: 100,
      render: (_, asset) => `${asset.quantity} ${asset.unit_label}`,
    },
    {
      title: 'Kondisi',
      key: 'condition',
      width: 130,
      render: (_, asset) => {
        const conf = CONDITION_CONFIG[asset.item_condition]
        return <Tag color={conf?.color}>{conf?.label ?? asset.item_condition}</Tag>
      },
    },
    {
      title: 'Biaya',
      key: 'cost',
      responsive: ['md'],
      render: (_, asset) =>
        asset.acquisition_cost !== null ? formatRupiah(asset.acquisition_cost) : '-',
    },
    {
      title: 'Status',
      key: 'status',
      responsive: ['lg'],
      render: (_, asset) => {
        const conf = STATUS_CONFIG[asset.status]
        return <Tag color={conf?.color}>{conf?.label ?? asset.status}</Tag>
      },
    },
    {
      title: '',
      key: 'actions',
      width: 56,
      align: 'right',
      render: (_, asset) => (
        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          menu={{
            items: [
              {
                key: 'detail',
                icon: <EyeOutlined />,
                label: 'Detail & Riwayat',
              },
              ...(canManage
                ? [
                    {
                      key: 'edit',
                      icon: <EditOutlined />,
                      label: 'Ubah Data',
                    },
                    {
                      type: 'divider' as const,
                    },
                    {
                      key: 'delete',
                      icon: <DeleteOutlined />,
                      label: 'Hapus Aset',
                      danger: true,
                    },
                  ]
                : []),
            ],
            onClick: ({ key, domEvent }) => {
              domEvent.stopPropagation()
              if (key === 'detail') {
                setDetailAssetId(asset.id)
              } else if (key === 'edit') {
                setEditingAsset(asset)
                setDrawerOpen(true)
              } else if (key === 'delete') {
                handleDelete(asset)
              }
            },
          }}
        >
          <Button
            type="text"
            icon={<MoreOutlined />}
            aria-label={`Menu aksi untuk ${asset.name}`}
            onClick={(e) => e.stopPropagation()}
          />
        </Dropdown>
      ),
    },
  ]

  return (
    <div>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <div>
          <Typography.Title level={5} style={{ margin: 0 }}>
            Daftar Aset & Perlengkapan
          </Typography.Title>
          <Typography.Text type="secondary">
            {effectiveUnit === 'shared'
              ? 'Menampilkan aset fasilitas bersama'
              : unit !== 'ALL'
                ? `Menampilkan aset Unit ${unit}`
                : 'Menampilkan aset semua unit dan fasilitas bersama'}
          </Typography.Text>
        </div>
        {canManage && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingAsset(null)
              setDrawerOpen(true)
            }}
          >
            Tambah Aset
          </Button>
        )}
      </Flex>

      {/* Filter Row */}
      <Flex wrap gap={12} align="center" style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Cari nama atau kode aset"
          allowClear
          onSearch={(val) => {
            setQ(val.trim())
            resetPage()
          }}
          style={{ ...filterStyle, maxWidth: 300 }}
        />

        {unit === 'ALL' && (
          <Select
            allowClear
            placeholder="Semua Unit & Fasilitas"
            value={sharedOnly ? 'shared' : undefined}
            onChange={(val) => {
              setSharedOnly(val === 'shared')
              resetPage()
            }}
            options={[{ value: 'shared', label: 'Hanya Fasilitas Bersama' }]}
            style={filterStyle}
          />
        )}

        <Select
          allowClear
          placeholder="Semua Kategori"
          value={categoryId}
          onChange={(val) => {
            setCategoryId(val)
            resetPage()
          }}
          loading={categoriesQuery.isFetching}
          options={(categoriesQuery.data ?? []).map((c) => ({
            value: c.id,
            label: c.name,
          }))}
          style={filterStyle}
        />

        <Select
          allowClear
          placeholder="Semua Lokasi"
          value={locationId}
          onChange={(val) => {
            setLocationId(val)
            resetPage()
          }}
          loading={locationsQuery.isFetching}
          options={(locationsQuery.data ?? []).map((l) => ({
            value: l.id,
            label: l.unit ? `[${l.unit.code}] ${l.name}` : `[Bersama] ${l.name}`,
          }))}
          style={filterStyle}
        />

        <Select
          allowClear
          placeholder="Semua Kondisi"
          value={itemCondition}
          onChange={(val) => {
            setItemCondition(val)
            resetPage()
          }}
          options={Object.entries(CONDITION_CONFIG).map(([val, conf]) => ({
            value: val,
            label: conf.label,
          }))}
          style={filterStyle}
        />

        <Select
          allowClear
          placeholder="Semua Status"
          value={status}
          onChange={(val) => {
            setStatus(val)
            resetPage()
          }}
          options={Object.entries(STATUS_CONFIG).map(([val, conf]) => ({
            value: val,
            label: conf.label,
          }))}
          style={filterStyle}
        />
      </Flex>

      {assetsQuery.isError && (
        <Alert
          type="error"
          showIcon
          title="Gagal memuat daftar aset"
          description={getErrorMessage(assetsQuery.error)}
          action={
            <Button size="small" onClick={() => void assetsQuery.refetch()}>
              Coba lagi
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      <Table<Asset>
        rowKey="id"
        columns={columns}
        dataSource={assetsQuery.data?.data ?? []}
        loading={assetsQuery.isFetching}
        size={isMobile ? 'small' : 'middle'}
        locale={{
          emptyText: <Empty description="Belum ada data aset yang cocok" />,
        }}
        pagination={{
          current: page,
          pageSize: PER_PAGE,
          total: assetsQuery.data?.meta.total ?? 0,
          showSizeChanger: false,
          simple: isMobile,
          onChange: setPage,
        }}
        onRow={(record) => ({
          onClick: () => setDetailAssetId(record.id),
          style: { cursor: 'pointer' },
        })}
        style={{ background: '#fff', borderRadius: 8 }}
      />

      <AssetDrawer
        open={drawerOpen}
        asset={editingAsset}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => void queryClient.invalidateQueries({ queryKey: ['assets'] })}
      />

      <AssetDetailPanel
        open={detailAssetId !== null}
        assetId={detailAssetId}
        onClose={() => setDetailAssetId(null)}
      />
    </div>
  )
}
