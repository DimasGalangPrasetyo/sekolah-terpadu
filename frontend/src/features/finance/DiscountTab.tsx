import { CheckCircleOutlined, EditOutlined, MoreOutlined, PlusOutlined, SearchOutlined, StopOutlined } from '@ant-design/icons'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Dropdown, Flex, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { TableColumnsType } from 'antd'
import { useMemo, useState } from 'react'
import { getErrorMessage } from '../../api/errors'
import { listAcademicYears } from '../../api/master'
import { useIsMobile } from '../../hooks/useIsMobile'
import { formatRupiah } from '../../lib/format'
import { can } from '../../lib/permissions'
import { useMe } from '../auth/useMe'
import { DiscountDrawer } from './DiscountDrawer'
import { activateStudentDiscount, deactivateStudentDiscount, listFeeTypes, listStudentDiscounts } from './api'
import type { StudentDiscount } from './types'

function debounce<Args extends unknown[]>(fn: (...args: Args) => void, delay: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  return (...args: Args) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

const PER_PAGE = 15

export function DiscountTab() {
  const isMobile = useIsMobile()
  const { data: me } = useMe()
  const canManage = can(me, 'finance.manage')
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedYearId, setSelectedYearId] = useState<number | undefined>(undefined)
  const [selectedFeeTypeId, setSelectedFeeTypeId] = useState<number | undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedDiscount, setSelectedDiscount] = useState<StudentDiscount | null>(null)

  const { data: academicYears = [] } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => listAcademicYears(),
  })

  const { data: feeTypes = [] } = useQuery({
    queryKey: ['fee-types'],
    queryFn: () => listFeeTypes(),
  })

  const activeYear = academicYears.find((y) => y.is_active) ?? academicYears[0]
  const effectiveYearId = selectedYearId ?? activeYear?.id

  const debounceSearchHandler = useMemo(
    () =>
      debounce((val: string) => {
        setDebouncedSearch(val)
        setPage(1)
      }, 400),
    [],
  )

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value)
    debounceSearchHandler(e.target.value)
  }

  const isActiveParam = statusFilter === 'all' ? undefined : statusFilter === 'active'

  const { data, isLoading, error } = useQuery({
    queryKey: ['student-discounts', page, debouncedSearch, effectiveYearId, selectedFeeTypeId, statusFilter],
    queryFn: () =>
      listStudentDiscounts({
        page,
        per_page: PER_PAGE,
        q: debouncedSearch || undefined,
        academic_year_id: effectiveYearId,
        fee_type_id: selectedFeeTypeId,
        is_active: isActiveParam,
      }),
    placeholderData: keepPreviousData,
    enabled: effectiveYearId !== undefined,
  })

  const discounts = data?.data ?? []
  const meta = data?.meta

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['student-discounts'] })

  const toggleStatusMutation = useMutation({
    mutationFn: (record: StudentDiscount) =>
      record.is_active ? deactivateStudentDiscount(record.id) : activateStudentDiscount(record.id),
    onSuccess: (_, record) => {
      message.success(`Diskon siswa berhasil ${record.is_active ? 'dinonaktifkan' : 'diaktifkan'}`)
      invalidate()
    },
    onError: (err) => message.error(getErrorMessage(err)),
  })

  const handleEdit = (record: StudentDiscount) => {
    setSelectedDiscount(record)
    setDrawerOpen(true)
  }

  const handleCreate = () => {
    setSelectedDiscount(null)
    setDrawerOpen(true)
  }

  const confirmToggleStatus = (record: StudentDiscount) => {
    const action = record.is_active ? 'menonaktifkan' : 'mengaktifkan'
    Modal.confirm({
      title: `${record.is_active ? 'Nonaktifkan' : 'Aktifkan'} Diskon Siswa`,
      content: `Apakah Anda yakin ingin ${action} diskon untuk siswa "${record.student.name}"?`,
      okText: record.is_active ? 'Nonaktifkan' : 'Aktifkan',
      okType: record.is_active ? 'danger' : 'primary',
      cancelText: 'Batal',
      onOk: () => toggleStatusMutation.mutateAsync(record),
    })
  }

  const columns: TableColumnsType<StudentDiscount> = [
    {
      title: 'Siswa',
      key: 'student',
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Typography.Text strong>{record.student.name}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.student.nis ? `NIS: ${record.student.nis}` : 'Tanpa NIS'}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Jenis Biaya',
      key: 'fee_type',
      width: 180,
      render: (_, record) =>
        record.fee_type ? (
          <Space orientation="vertical" size={0}>
            <Typography.Text>{record.fee_type.name}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {record.fee_type.code}
            </Typography.Text>
          </Space>
        ) : (
          <Tag color="cyan">Semua jenis biaya</Tag>
        ),
    },
    {
      title: 'Potongan',
      key: 'value',
      width: 130,
      render: (_, record) => (
        <Typography.Text strong>
          {record.type === 'percent' ? `${record.value}%` : formatRupiah(record.value)}
        </Typography.Text>
      ),
    },
    {
      title: 'Alasan',
      dataIndex: 'reason',
      key: 'reason',
      responsive: ['lg'],
      render: (reason: string | null) => reason || '-',
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
                label: 'Ubah Diskon',
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
        <Flex wrap="wrap" gap={8} align="center" style={{ flex: 1 }}>
          <Input
            placeholder="Cari nama atau NIS siswa..."
            prefix={<SearchOutlined />}
            value={searchInput}
            onChange={handleSearchChange}
            allowClear
            style={{ width: 220 }}
          />

          <Select
            value={effectiveYearId}
            onChange={(y) => {
              setSelectedYearId(y)
              setPage(1)
            }}
            style={{ width: 170 }}
            placeholder="Tahun Ajaran"
            options={academicYears.map((ay) => ({
              value: ay.id,
              label: ay.name + (ay.is_active ? ' (Aktif)' : ''),
            }))}
          />

          <Select
            value={selectedFeeTypeId}
            onChange={(ft) => {
              setSelectedFeeTypeId(ft)
              setPage(1)
            }}
            allowClear
            style={{ width: 190 }}
            placeholder="Semua Jenis Biaya"
            options={feeTypes.map((ft) => ({
              value: ft.id,
              label: `${ft.name} (${ft.code})`,
            }))}
          />

          <Select
            value={statusFilter}
            onChange={(s) => {
              setStatusFilter(s)
              setPage(1)
            }}
            style={{ width: 140 }}
            options={[
              { value: 'all', label: 'Semua Status' },
              { value: 'active', label: 'Hanya Aktif' },
              { value: 'inactive', label: 'Hanya Nonaktif' },
            ]}
          />
        </Flex>

        {canManage && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Tambah Diskon
          </Button>
        )}
      </Flex>

      {error && (
        <Alert
          message="Gagal memuat diskon siswa"
          description={getErrorMessage(error)}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={discounts}
        loading={isLoading}
        size={isMobile ? 'small' : 'middle'}
        scroll={{ x: 'max-content' }}
        pagination={{
          current: page,
          pageSize: PER_PAGE,
          total: meta?.total ?? 0,
          simple: isMobile,
          showSizeChanger: false,
          onChange: (p) => setPage(p),
        }}
      />

      <DiscountDrawer
        open={drawerOpen}
        discount={selectedDiscount}
        defaultAcademicYearId={effectiveYearId}
        onClose={() => setDrawerOpen(false)}
        onSuccess={invalidate}
      />
    </div>
  )
}
