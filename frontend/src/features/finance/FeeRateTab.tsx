import { DeleteOutlined, EditOutlined, MoreOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Dropdown, Flex, Modal, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { TableColumnsType } from 'antd'
import { useState } from 'react'
import { getErrorMessage } from '../../api/errors'
import { listAcademicYears, listUnits } from '../../api/master'
import { useIsMobile } from '../../hooks/useIsMobile'
import { formatRupiah } from '../../lib/format'
import { can } from '../../lib/permissions'
import { useUiStore } from '../../stores/ui'
import { useMe } from '../auth/useMe'
import { FeeRateDrawer } from './FeeRateDrawer'
import { deleteFeeRate, listFeeRates, listFeeTypes } from './api'
import type { FeeRate } from './types'

export function FeeRateTab() {
  const isMobile = useIsMobile()
  const { data: me } = useMe()
  const canManage = can(me, 'finance.manage')
  const queryClient = useQueryClient()

  // Unit mengikuti pemilih unit di bilah atas lewat useUiStore
  const unitFilter = useUiStore((s) => s.unit)

  const [selectedYearId, setSelectedYearId] = useState<number | undefined>(undefined)
  const [selectedFeeTypeId, setSelectedFeeTypeId] = useState<number | undefined>(undefined)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedRate, setSelectedRate] = useState<FeeRate | null>(null)

  const { data: academicYears = [] } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => listAcademicYears(),
  })

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => listUnits(),
  })

  const { data: feeTypes = [] } = useQuery({
    queryKey: ['fee-types'],
    queryFn: () => listFeeTypes(),
  })

  const activeYear = academicYears.find((y) => y.is_active) ?? academicYears[0]
  const effectiveYearId = selectedYearId ?? activeYear?.id

  const apiUnit = unitFilter === 'ALL' ? undefined : unitFilter

  const { data: feeRates = [], isLoading, error } = useQuery({
    queryKey: ['fee-rates', effectiveYearId, apiUnit, selectedFeeTypeId],
    queryFn: () =>
      listFeeRates({
        academic_year_id: effectiveYearId,
        unit: apiUnit,
        fee_type_id: selectedFeeTypeId,
      }),
    enabled: effectiveYearId !== undefined,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['fee-rates'] })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteFeeRate(id),
    onSuccess: () => {
      message.success('Tarif berhasil dihapus')
      invalidate()
    },
    onError: (err) => message.error(getErrorMessage(err)),
  })

  const handleEdit = (record: FeeRate) => {
    setSelectedRate(record)
    setDrawerOpen(true)
  }

  const handleCreate = () => {
    setSelectedRate(null)
    setDrawerOpen(true)
  }

  const confirmDelete = (record: FeeRate) => {
    const tingkatLabel = record.grade_level ? `Tingkat ${record.grade_level.name}` : 'Semua tingkat'
    Modal.confirm({
      title: 'Hapus Tarif',
      content: `Apakah Anda yakin ingin menghapus tarif ${record.fee_type.name} untuk unit ${record.unit.code} (${tingkatLabel})? Tagihan yang sudah diterbitkan sebelumnya tidak terpengaruh.`,
      okText: 'Hapus',
      okType: 'danger',
      cancelText: 'Batal',
      onOk: () => deleteMutation.mutateAsync(record.id),
    })
  }

  const currentUnitModel = units.find((u) => u.code === apiUnit)

  const columns: TableColumnsType<FeeRate> = [
    {
      title: 'Jenis Biaya',
      dataIndex: ['fee_type', 'name'],
      key: 'fee_type',
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Typography.Text strong>{record.fee_type.name}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.fee_type.code}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Unit',
      dataIndex: ['unit', 'code'],
      key: 'unit',
      width: 90,
      render: (code: string) => <Tag color="blue">{code}</Tag>,
    },
    {
      title: 'Tingkat',
      key: 'grade_level',
      width: 140,
      render: (_, record) =>
        record.grade_level ? (
          `Tingkat ${record.grade_level.name}`
        ) : (
          <Typography.Text type="secondary">Semua tingkat</Typography.Text>
        ),
    },
    {
      title: 'Nominal Tarif',
      dataIndex: 'amount',
      key: 'amount',
      width: 170,
      render: (amt: number) => <Typography.Text strong>{formatRupiah(amt)}</Typography.Text>,
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
                label: 'Ubah Nominal',
                icon: <EditOutlined />,
                onClick: () => handleEdit(record),
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
            value={effectiveYearId}
            onChange={setSelectedYearId}
            style={{ width: 180 }}
            placeholder="Tahun Ajaran"
            options={academicYears.map((ay) => ({
              value: ay.id,
              label: ay.name + (ay.is_active ? ' (Aktif)' : ''),
            }))}
          />

          <Select
            value={selectedFeeTypeId}
            onChange={setSelectedFeeTypeId}
            allowClear
            style={{ width: 200 }}
            placeholder="Semua Jenis Biaya"
            options={feeTypes.map((ft) => ({
              value: ft.id,
              label: `${ft.name} (${ft.code})`,
            }))}
          />
        </Flex>

        {canManage && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Tambah Tarif
          </Button>
        )}
      </Flex>

      {error && (
        <Alert
          message="Gagal memuat tarif"
          description={getErrorMessage(error)}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={feeRates}
        loading={isLoading}
        size={isMobile ? 'small' : 'middle'}
        scroll={{ x: 'max-content' }}
        pagination={false}
      />

      <FeeRateDrawer
        open={drawerOpen}
        feeRate={selectedRate}
        defaultAcademicYearId={effectiveYearId}
        defaultUnitId={currentUnitModel?.id}
        onClose={() => setDrawerOpen(false)}
        onSuccess={invalidate}
      />
    </div>
  )
}
