import { CheckCircleOutlined, DeleteOutlined, EditOutlined, MoreOutlined, PlusOutlined, StopOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Dropdown, Flex, Modal, Select, Table, Tag, Typography, message } from 'antd'
import type { TableColumnsType } from 'antd'
import { useState } from 'react'
import { getErrorMessage } from '../../api/errors'
import { useIsMobile } from '../../hooks/useIsMobile'
import { can } from '../../lib/permissions'
import { useMe } from '../auth/useMe'
import { FeeTypeDrawer } from './FeeTypeDrawer'
import { activateFeeType, deactivateFeeType, deleteFeeType, listFeeTypes } from './api'
import { FEE_CATEGORY_COLORS, FEE_CATEGORY_LABELS } from './constants'
import type { FeeType } from './types'

export function FeeTypeTab() {
  const isMobile = useIsMobile()
  const { data: me } = useMe()
  const canManage = can(me, 'finance.manage')
  const queryClient = useQueryClient()

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedFeeType, setSelectedFeeType] = useState<FeeType | null>(null)

  const isActiveParam = statusFilter === 'all' ? undefined : statusFilter === 'active'

  const { data: feeTypes = [], isLoading, error } = useQuery({
    queryKey: ['fee-types', statusFilter],
    queryFn: () => listFeeTypes(isActiveParam),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['fee-types'] })

  const toggleStatusMutation = useMutation({
    mutationFn: (record: FeeType) => (record.is_active ? deactivateFeeType(record.id) : activateFeeType(record.id)),
    onSuccess: (_, record) => {
      message.success(`Jenis biaya berhasil ${record.is_active ? 'dinonaktifkan' : 'diaktifkan'}`)
      invalidate()
    },
    onError: (err) => message.error(getErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteFeeType(id),
    onSuccess: () => {
      message.success('Jenis biaya berhasil dihapus')
      invalidate()
    },
    onError: (err) => {
      Modal.error({
        title: 'Gagal Menghapus Jenis Biaya',
        content: getErrorMessage(err),
      })
    },
  })

  const handleEdit = (record: FeeType) => {
    setSelectedFeeType(record)
    setDrawerOpen(true)
  }

  const handleCreate = () => {
    setSelectedFeeType(null)
    setDrawerOpen(true)
  }

  const confirmDelete = (record: FeeType) => {
    Modal.confirm({
      title: 'Hapus Jenis Biaya',
      content: `Apakah Anda yakin ingin menghapus jenis biaya "${record.name}" (${record.code})? Tindakan ini tidak dapat dibatalkan.`,
      okText: 'Hapus',
      okType: 'danger',
      cancelText: 'Batal',
      onOk: () => deleteMutation.mutateAsync(record.id),
    })
  }

  const confirmToggleStatus = (record: FeeType) => {
    const action = record.is_active ? 'menonaktifkan' : 'mengaktifkan'
    Modal.confirm({
      title: `${record.is_active ? 'Nonaktifkan' : 'Aktifkan'} Jenis Biaya`,
      content: `Apakah Anda yakin ingin ${action} "${record.name}"? ${record.is_active ? 'Jenis biaya nonaktif tidak dapat digunakan untuk tarif atau diskon baru.' : ''}`,
      okText: record.is_active ? 'Nonaktifkan' : 'Aktifkan',
      okType: record.is_active ? 'danger' : 'primary',
      cancelText: 'Batal',
      onOk: () => toggleStatusMutation.mutateAsync(record),
    })
  }

  const columns: TableColumnsType<FeeType> = [
    {
      title: 'Kode',
      dataIndex: 'code',
      key: 'code',
      width: 140,
      render: (code: string) => <Typography.Text strong copyable={{ text: code }}>{code}</Typography.Text>,
    },
    {
      title: 'Nama Jenis Biaya',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Kategori',
      dataIndex: 'category',
      key: 'category',
      width: 140,
      render: (cat: FeeType['category']) => (
        <Tag color={FEE_CATEGORY_COLORS[cat]}>{FEE_CATEGORY_LABELS[cat] ?? cat}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 110,
      render: (active: boolean) => (
        <Tag color={active ? 'success' : 'default'}>{active ? 'Aktif' : 'Nonaktif'}</Tag>
      ),
    },
  ]

  if (canManage) {
    columns.push({
      title: '',
      key: 'action',
      width: 50,
      fixed: 'right',
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'edit',
                label: 'Ubah',
                icon: <EditOutlined />,
                onClick: () => handleEdit(record),
              },
              {
                key: 'toggle',
                label: record.is_active ? 'Nonaktifkan' : 'Aktifkan',
                icon: record.is_active ? <StopOutlined /> : <CheckCircleOutlined />,
                danger: record.is_active,
                onClick: () => confirmToggleStatus(record),
              },
              {
                type: 'divider',
              },
              {
                key: 'delete',
                label: 'Hapus',
                icon: <DeleteOutlined />,
                danger: true,
                onClick: () => confirmDelete(record),
              },
            ],
          }}
          trigger={['click']}
        >
          <Button type="text" size="small" icon={<MoreOutlined />} aria-label="Aksi" />
        </Dropdown>
      ),
    })
  }

  return (
    <div>
      <Flex wrap="wrap" justify="space-between" align="center" gap={12} style={{ marginBottom: 16 }}>
        <Flex wrap="wrap" gap={8} align="center">
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
            options={[
              { value: 'all', label: 'Semua Status' },
              { value: 'active', label: 'Hanya Aktif' },
              { value: 'inactive', label: 'Hanya Nonaktif' },
            ]}
          />
        </Flex>

        {canManage && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Tambah Jenis Biaya
          </Button>
        )}
      </Flex>

      {error && (
        <Alert
          message="Gagal memuat jenis biaya"
          description={getErrorMessage(error)}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={feeTypes}
        loading={isLoading}
        size={isMobile ? 'small' : 'middle'}
        scroll={{ x: 'max-content' }}
        pagination={false}
      />

      <FeeTypeDrawer
        open={drawerOpen}
        feeType={selectedFeeType}
        onClose={() => setDrawerOpen(false)}
        onSuccess={invalidate}
      />
    </div>
  )
}
