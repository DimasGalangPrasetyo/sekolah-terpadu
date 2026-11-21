import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  PlusOutlined,
  StopOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Dropdown,
  Flex,
  Modal,
  Select,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { TableColumnsType } from 'antd'
import { useState } from 'react'
import { getErrorMessage } from '../../api/errors'
import { useIsMobile } from '../../hooks/useIsMobile'
import { can } from '../../lib/permissions'
import { useMe } from '../auth/useMe'
import {
  activateCashCategory,
  deactivateCashCategory,
  deleteCashCategory,
  listCashCategories,
} from './api'
import {
  CASH_TYPE_COLORS,
  CASH_TYPE_LABELS,
} from './constants'
import type { CashCategory, CashType } from './types'
import { CashCategoryDrawer } from './CashCategoryDrawer'

export function CashCategoryTab() {
  const isMobile = useIsMobile()
  const { data: me } = useMe()
  const canManage = can(me, 'finance.manage')
  const queryClient = useQueryClient()

  const [typeFilter, setTypeFilter] = useState<'all' | CashType>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<CashCategory | null>(null)

  const typeParam = typeFilter === 'all' ? undefined : typeFilter
  const isActiveParam = statusFilter === 'all' ? undefined : statusFilter === 'active'

  const {
    data: categories = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['cash-categories', typeFilter, statusFilter],
    queryFn: () =>
      listCashCategories({
        type: typeParam,
        is_active: isActiveParam,
      }),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['cash-categories'] })

  const toggleStatusMutation = useMutation({
    mutationFn: (record: CashCategory) =>
      record.is_active
        ? deactivateCashCategory(record.id)
        : activateCashCategory(record.id),
    onSuccess: (_, record) => {
      message.success(
        `Kategori kas berhasil ${record.is_active ? 'dinonaktifkan' : 'diaktifkan'}`
      )
      invalidate()
    },
    onError: (err) => message.error(getErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCashCategory(id),
    onSuccess: () => {
      message.success('Kategori kas berhasil dihapus')
      invalidate()
    },
    onError: (err) => {
      Modal.error({
        title: 'Gagal Menghapus Kategori Kas',
        content: getErrorMessage(err),
      })
    },
  })

  const handleEdit = (record: CashCategory) => {
    setSelectedCategory(record)
    setDrawerOpen(true)
  }

  const handleCreate = () => {
    setSelectedCategory(null)
    setDrawerOpen(true)
  }

  const confirmDelete = (record: CashCategory) => {
    Modal.confirm({
      title: 'Hapus Kategori Kas',
      content: `Apakah Anda yakin ingin menghapus kategori kas "${record.name}"? Tindakan ini tidak dapat dibatalkan.`,
      okText: 'Hapus',
      okType: 'danger',
      cancelText: 'Batal',
      onOk: () => deleteMutation.mutateAsync(record.id),
    })
  }

  const confirmToggleStatus = (record: CashCategory) => {
    const action = record.is_active ? 'menonaktifkan' : 'mengaktifkan'
    Modal.confirm({
      title: `${record.is_active ? 'Nonaktifkan' : 'Aktifkan'} Kategori Kas`,
      content: `Apakah Anda yakin ingin ${action} "${record.name}"? ${
        record.is_active
          ? 'Kategori kas nonaktif tidak dapat digunakan untuk transaksi baru.'
          : ''
      }`,
      okText: record.is_active ? 'Nonaktifkan' : 'Aktifkan',
      okType: record.is_active ? 'danger' : 'primary',
      cancelText: 'Batal',
      onOk: () => toggleStatusMutation.mutateAsync(record),
    })
  }

  const columns: TableColumnsType<CashCategory> = [
    {
      title: 'Nama Kategori',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <Typography.Text strong style={{ opacity: record.is_active ? 1 : 0.45 }}>
          {name}
        </Typography.Text>
      ),
    },
    {
      title: 'Jenis',
      dataIndex: 'type',
      key: 'type',
      width: 140,
      render: (type: CashType, record) => (
        <span style={{ opacity: record.is_active ? 1 : 0.45 }}>
          <Tag color={CASH_TYPE_COLORS[type]}>
            {CASH_TYPE_LABELS[type]}
          </Tag>
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 120,
      render: (active: boolean) => (
        <Tag color={active ? 'success' : 'default'}>
          {active ? 'Aktif' : 'Nonaktif'}
        </Tag>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_, record) => {
        if (!canManage) return null

        return (
          <Dropdown
            menu={{
              items: [
                {
                  key: 'edit',
                  icon: <EditOutlined />,
                  label: 'Ubah',
                  onClick: () => handleEdit(record),
                },
                {
                  key: 'toggle',
                  icon: record.is_active ? <StopOutlined /> : <CheckCircleOutlined />,
                  label: record.is_active ? 'Nonaktifkan' : 'Aktifkan',
                  danger: record.is_active,
                  onClick: () => confirmToggleStatus(record),
                },
                {
                  type: 'divider',
                },
                {
                  key: 'delete',
                  icon: <DeleteOutlined />,
                  label: 'Hapus',
                  danger: true,
                  onClick: () => confirmDelete(record),
                },
              ],
            }}
            trigger={['click']}
          >
            <Button
              type="text"
              icon={<MoreOutlined />}
              aria-label={`Aksi untuk ${record.name}`}
            />
          </Dropdown>
        )
      },
    },
  ]

  return (
    <div>
      <Flex
        wrap="wrap"
        justify="space-between"
        align="center"
        gap={12}
        style={{ marginBottom: 16 }}
      >
        <Flex wrap="wrap" gap={8} align="center">
          <Select<'all' | CashType>
            value={typeFilter}
            onChange={(v) => setTypeFilter(v)}
            style={{ width: 140 }}
            options={[
              { value: 'all', label: 'Semua Jenis' },
              { value: 'income', label: 'Pemasukan' },
              { value: 'expense', label: 'Pengeluaran' },
            ]}
          />

          <Select<'all' | 'active' | 'inactive'>
            value={statusFilter}
            onChange={(v) => setStatusFilter(v)}
            style={{ width: 140 }}
            options={[
              { value: 'all', label: 'Semua Status' },
              { value: 'active', label: 'Aktif' },
              { value: 'inactive', label: 'Nonaktif' },
            ]}
          />
        </Flex>

        {canManage && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Tambah Kategori
          </Button>
        )}
      </Flex>

      {error && (
        <Alert
          message="Gagal memuat kategori kas"
          description={(error as Error).message}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Table<CashCategory>
        rowKey="id"
        columns={columns}
        dataSource={categories}
        loading={isLoading}
        size={isMobile ? 'small' : 'middle'}
        pagination={false}
      />

      <CashCategoryDrawer
        open={drawerOpen}
        category={selectedCategory}
        onClose={() => setDrawerOpen(false)}
        onSuccess={invalidate}
      />
    </div>
  )
}
