import {
  ExclamationCircleOutlined,
  ExportOutlined,
  HistoryOutlined,
  SwapOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  App,
  Button,
  DatePicker,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { TableColumnsType } from 'antd'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { useState } from 'react'
import { getErrorMessage } from '../../api/errors'
import { useIsMobile } from '../../hooks/useIsMobile'
import { formatDate, formatRupiah } from '../../lib/format'
import { applyFieldErrors } from '../../lib/formErrors'
import { can } from '../../lib/permissions'
import { useMe } from '../auth/useMe'
import { getAsset, listLocations, recordAssetMovement } from './api'
import { CONDITION_CONFIG, MOVEMENT_TYPE_CONFIG, STATUS_CONFIG } from './constants'
import type {
  AssetCondition,
  AssetMovement,
  AssetMovementPayload,
  AssetMovementType,
} from './types'

const FMT = 'YYYY-MM-DD'

interface MovementFormValues {
  moved_at: Dayjs
  to_location_id?: number
  to_condition?: AssetCondition
  notes?: string
}

interface AssetDetailPanelProps {
  open: boolean
  assetId: number | null
  onClose: () => void
}

export function AssetDetailPanel({ open, assetId, onClose }: AssetDetailPanelProps) {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const isMobile = useIsMobile()
  const { data: me } = useMe()
  const canManage = can(me, 'inventory.manage')

  // Movement modal state
  const [movementModalOpen, setMovementModalOpen] = useState(false)
  const [movementType, setMovementType] = useState<AssetMovementType>('move')
  const [form] = Form.useForm<MovementFormValues>()
  const [formError, setFormError] = useState<string | null>(null)

  const assetQuery = useQuery({
    queryKey: ['asset', assetId],
    queryFn: () => (assetId ? getAsset(assetId) : Promise.reject(new Error('No asset id'))),
    enabled: Boolean(assetId) && open,
  })

  const locationsQuery = useQuery({
    queryKey: ['locations'],
    queryFn: () => listLocations(),
    enabled: open,
  })

  const asset = assetQuery.data
  const isDisposed = asset?.status === 'disposed' || asset?.item_condition === 'disposed'

  const recordMutation = useMutation({
    mutationFn: async (values: MovementFormValues) => {
      if (!asset) throw new Error('Aset tidak ditemukan')

      const payload: AssetMovementPayload = {
        type: movementType,
        moved_at: values.moved_at.format(FMT),
        to_location_id: movementType === 'move' ? values.to_location_id || null : null,
        to_condition: movementType === 'condition' ? values.to_condition || null : null,
        notes: values.notes?.trim() || null,
      }

      return recordAssetMovement(asset.id, payload)
    },
    onSuccess: () => {
      message.success('Riwayat aset berhasil dicatat')
      void queryClient.invalidateQueries({ queryKey: ['asset', assetId] })
      void queryClient.invalidateQueries({ queryKey: ['assets'] })
      setMovementModalOpen(false)
      form.resetFields()
    },
    onError: (err) => {
      if (!applyFieldErrors(form, err)) {
        setFormError(getErrorMessage(err))
      }
    },
  })

  const openMovementModal = (type: AssetMovementType) => {
    setMovementType(type)
    setFormError(null)
    form.resetFields()
    form.setFieldsValue({
      moved_at: dayjs(),
    })
    setMovementModalOpen(true)
  }

  const movementColumns: TableColumnsType<AssetMovement> = [
    {
      title: 'Tanggal',
      dataIndex: 'moved_at',
      key: 'moved_at',
      width: 120,
      render: (date: string) => formatDate(date),
    },
    {
      title: 'Jenis',
      dataIndex: 'type',
      key: 'type',
      width: 140,
      render: (type: AssetMovementType) => {
        const conf = MOVEMENT_TYPE_CONFIG[type] ?? { label: type, color: 'default' }
        return <Tag color={conf.color}>{conf.label}</Tag>
      },
    },
    {
      title: 'Keterangan Perubahan',
      key: 'change',
      render: (_, record) => {
        if (record.type === 'move') {
          return (
            <div>
              <Typography.Text type="secondary">
                {record.from_location?.name ?? 'Lokasi awal'}
              </Typography.Text>
              {' → '}
              <Typography.Text strong>
                {record.to_location?.name ?? 'Lokasi baru'}
              </Typography.Text>
            </div>
          )
        }
        if (record.type === 'condition') {
          const fromConf = record.from_condition ? CONDITION_CONFIG[record.from_condition] : null
          const toConf = record.to_condition ? CONDITION_CONFIG[record.to_condition] : null
          return (
            <Flex gap={4} align="center">
              <Tag>{fromConf?.label ?? record.from_condition}</Tag>
              <span>→</span>
              <Tag color={toConf?.color}>{toConf?.label ?? record.to_condition}</Tag>
            </Flex>
          )
        }
        if (record.type === 'dispose') {
          return <Tag color="magenta">Aset Dihapuskan (Disposed)</Tag>
        }
        return '-'
      },
    },
    {
      title: 'Catatan',
      dataIndex: 'notes',
      key: 'notes',
      responsive: ['md'],
      render: (notes: string | null) => notes || '-',
    },
    {
      title: 'Petugas',
      key: 'creator',
      responsive: ['lg'],
      render: (_, record) => record.creator?.name ?? '-',
    },
  ]

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={asset ? `Detail Aset: ${asset.code}` : 'Memuat data...'}
      width="min(760px, 100vw)"
      destroyOnHidden
    >
      {assetQuery.isError && (
        <Alert
          type="error"
          showIcon
          title="Gagal memuat detail aset"
          description={getErrorMessage(assetQuery.error)}
          style={{ marginBottom: 16 }}
        />
      )}

      {asset && (
        <div>
          <Flex justify="space-between" align="start" wrap gap={12} style={{ marginBottom: 16 }}>
            <div>
              <Typography.Title level={4} style={{ margin: 0 }}>
                {asset.name}
              </Typography.Title>
              <Typography.Text type="secondary">Kode: {asset.code}</Typography.Text>
            </div>
            <Flex gap={8} wrap>
              <Tag color={CONDITION_CONFIG[asset.item_condition]?.color}>
                {CONDITION_CONFIG[asset.item_condition]?.label ?? asset.item_condition}
              </Tag>
              <Tag color={STATUS_CONFIG[asset.status]?.color}>
                {STATUS_CONFIG[asset.status]?.label ?? asset.status}
              </Tag>
            </Flex>
          </Flex>

          <Descriptions
            bordered
            size={isMobile ? 'small' : 'middle'}
            column={{ xs: 1, sm: 2, md: 2 }}
            style={{ marginBottom: 24, background: '#fff' }}
          >
            <Descriptions.Item label="Kategori">
              {asset.category ? `${asset.category.code} - ${asset.category.name}` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Unit Sekolah">
              {asset.unit ? <Tag color="blue">{asset.unit.code}</Tag> : <Tag color="cyan">Fasilitas Bersama</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Lokasi Penempatan">
              {asset.location ? asset.location.name : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Jumlah & Satuan">
              {asset.quantity} {asset.unit_label}
            </Descriptions.Item>
            <Descriptions.Item label="Tanggal Perolehan">
              {formatDate(asset.acquisition_date)}
            </Descriptions.Item>
            <Descriptions.Item label="Sumber Perolehan">
              {asset.acquisition_source || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Biaya Perolehan">
              {asset.acquisition_cost !== null ? formatRupiah(asset.acquisition_cost) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Penanggung Jawab">
              {asset.responsible_staff ? asset.responsible_staff.name : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Catatan" span={2}>
              {asset.notes || '-'}
            </Descriptions.Item>
          </Descriptions>

          <Divider style={{ margin: '16px 0' }} />

          <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
            <div>
              <Typography.Title level={5} style={{ margin: 0 }}>
                <HistoryOutlined /> Riwayat Perpindahan & Kondisi
              </Typography.Title>
              <Typography.Text type="secondary">
                Catatan mutasi ruang, perubahan kelayakan barang, atau penghapusan aset
              </Typography.Text>
            </div>

            {canManage && !isDisposed && (
              <Space wrap>
                <Button icon={<SwapOutlined />} onClick={() => openMovementModal('move')}>
                  Pindah Lokasi
                </Button>
                <Button icon={<ExportOutlined />} onClick={() => openMovementModal('condition')}>
                  Ubah Kondisi
                </Button>
                <Button
                  danger
                  icon={<WarningOutlined />}
                  onClick={() => openMovementModal('dispose')}
                >
                  Hapuskan Aset
                </Button>
              </Space>
            )}
          </Flex>

          {isDisposed && (
            <Alert
              type="info"
              showIcon
              message="Aset Sudah Dihapuskan"
              description="Aset ini telah berstatus dihapuskan (disposed). Tidak dapat dilakukan pemindahan lokasi atau perubahan kondisi lagi."
              style={{ marginBottom: 16 }}
            />
          )}

          <Table<AssetMovement>
            rowKey="id"
            columns={movementColumns}
            dataSource={asset.movements ?? []}
            size="small"
            pagination={false}
            locale={{
              emptyText: <Empty description="Belum ada riwayat tercatat untuk aset ini" />,
            }}
            style={{ background: '#fff', borderRadius: 8 }}
          />

          <Modal
            open={movementModalOpen}
            onCancel={() => setMovementModalOpen(false)}
            title={
              movementType === 'move'
                ? 'Catat Pemindahan Lokasi'
                : movementType === 'condition'
                  ? 'Catat Perubahan Kondisi Barang'
                  : 'Catat Penghapusan Aset (Dispose)'
            }
            footer={null}
            destroyOnHidden
          >
            <Form<MovementFormValues>
              form={form}
              layout="vertical"
              onFinish={(values) => {
                setFormError(null)
                recordMutation.mutate(values)
              }}
            >
              {formError && (
                <Alert
                  type="error"
                  showIcon
                  message={formError}
                  style={{ marginBottom: 16 }}
                  closable
                  onClose={() => setFormError(null)}
                />
              )}

              {movementType === 'dispose' && (
                <Alert
                  type="warning"
                  showIcon
                  icon={<ExclamationCircleOutlined />}
                  message="Peringatan Penghapusan Aset"
                  description="Aksi ini akan mengubah status dan kondisi aset menjadi Dihapuskan (Disposed) secara permanen. Setelah dihapuskan, aset tidak dapat dipindahkan atau diubah kondisinya lagi."
                  style={{ marginBottom: 16 }}
                />
              )}

              <Form.Item
                name="moved_at"
                label="Tanggal Pencatatan"
                rules={[{ required: true, message: 'Tanggal wajib diisi' }]}
              >
                <DatePicker format={FMT} style={{ width: '100%' }} />
              </Form.Item>

              {movementType === 'move' && (
                <Form.Item
                  name="to_location_id"
                  label="Lokasi / Ruangan Tujuan"
                  rules={[{ required: true, message: 'Pilih lokasi tujuan' }]}
                >
                  <Select
                    placeholder="Pilih lokasi baru"
                    options={(locationsQuery.data ?? []).map((loc) => ({
                      value: loc.id,
                      label: loc.unit ? `[${loc.unit.code}] ${loc.name}` : `[Bersama] ${loc.name}`,
                    }))}
                  />
                </Form.Item>
              )}

              {movementType === 'condition' && (
                <Form.Item
                  name="to_condition"
                  label="Kondisi Baru"
                  rules={[{ required: true, message: 'Pilih kondisi baru' }]}
                >
                  <Select
                    placeholder="Pilih kondisi"
                    options={[
                      { value: 'good', label: 'Baik' },
                      { value: 'light_damage', label: 'Rusak Ringan' },
                      { value: 'heavy_damage', label: 'Rusak Berat' },
                      { value: 'lost', label: 'Hilang' },
                    ]}
                  />
                </Form.Item>
              )}

              <Form.Item name="notes" label="Catatan / Alasan">
                <Input.TextArea
                  rows={3}
                  placeholder={
                    movementType === 'move'
                      ? 'Alasan pemindahan...'
                      : movementType === 'condition'
                        ? 'Penyebab kerusakan / temuan pemeriksaan...'
                        : 'Alasan penghapusan aset...'
                  }
                />
              </Form.Item>

              <Flex justify="end" gap={8} style={{ marginTop: 24 }}>
                <Button onClick={() => setMovementModalOpen(false)}>Batal</Button>
                <Button
                  type={movementType === 'dispose' ? 'primary' : 'primary'}
                  danger={movementType === 'dispose'}
                  htmlType="submit"
                  loading={recordMutation.isPending}
                >
                  {movementType === 'dispose' ? 'Konfirmasi Penghapusan' : 'Simpan'}
                </Button>
              </Flex>
            </Form>
          </Modal>
        </div>
      )}
    </Drawer>
  )
}
