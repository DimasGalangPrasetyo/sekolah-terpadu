import {
  Alert,
  Button,
  DatePicker,
  Flex,
  Input,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd'
import { FileAddOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { useMemo, useState } from 'react'
import { listAcademicYears } from '../../api/master'
import { useIsMobile } from '../../hooks/useIsMobile'
import { formatDate, formatRupiah } from '../../lib/format'
import { can } from '../../lib/permissions'
import { useUiStore } from '../../stores/ui'
import { useMe } from '../auth/useMe'
import { getErrorMessage } from '../../api/errors'
import { listInvoices } from './api'
import {
  INVOICE_KIND_LABELS,
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
} from './constants'
import type { Invoice, InvoiceKind, InvoiceStatus } from './types'
import { GenerateInvoicesModal } from './GenerateInvoicesModal'
import { InvoiceCreateDrawer } from './InvoiceCreateDrawer'
import { InvoiceDetailDrawer } from './InvoiceDetailDrawer'

function debounce<Args extends unknown[]>(fn: (...args: Args) => void, delay: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  return (...args: Args) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

const PER_PAGE = 15

export function InvoiceTab() {
  const isMobile = useIsMobile()
  const { data: me } = useMe()
  const canManage = can(me, 'finance.manage')
  const queryClient = useQueryClient()

  const unitFilter = useUiStore((s) => s.unit)

  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedYearId, setSelectedYearId] = useState<number | undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | undefined>(undefined)
  const [kindFilter, setKindFilter] = useState<InvoiceKind | undefined>(undefined)
  const [periodFilter, setPeriodFilter] = useState<string | undefined>(undefined)
  const [overdueOnly, setOverdueOnly] = useState(false)

  const [generateOpen, setGenerateOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null)

  const { data: academicYears = [] } = useQuery({
    queryKey: ['academic-years'],
    queryFn: listAcademicYears,
  })

  const activeYear = academicYears.find((y) => y.is_active) ?? academicYears[0]
  const effectiveYearId = selectedYearId ?? activeYear?.id

  const apiUnit = unitFilter === 'ALL' ? undefined : unitFilter

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

  const { data, isLoading, error } = useQuery({
    queryKey: [
      'invoices',
      page,
      debouncedSearch,
      effectiveYearId,
      statusFilter,
      kindFilter,
      periodFilter,
      overdueOnly,
      apiUnit,
    ],
    queryFn: () =>
      listInvoices({
        page,
        per_page: PER_PAGE,
        q: debouncedSearch || undefined,
        academic_year_id: effectiveYearId,
        status: statusFilter,
        kind: kindFilter,
        period: periodFilter,
        overdue: overdueOnly ? 1 : undefined,
        unit: apiUnit,
      }),
    placeholderData: keepPreviousData,
  })

  const invoices = data?.data ?? []
  const meta = data?.meta

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['invoices'] })

  const columns: TableColumnsType<Invoice> = [
    {
      title: 'Nomor',
      dataIndex: 'number',
      key: 'number',
      width: 140,
      render: (num: string, record) => (
        <Typography.Text style={{ opacity: record.status === 'void' ? 0.45 : 1 }}>
          {num}
        </Typography.Text>
      ),
    },
    {
      title: 'Siswa',
      key: 'student',
      render: (_, record) => (
        <Space direction="vertical" size={0} style={{ opacity: record.status === 'void' ? 0.45 : 1 }}>
          <Typography.Text strong>{record.student?.name ?? '-'}</Typography.Text>
          {record.student?.nis && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              NIS: {record.student.nis}
            </Typography.Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Unit',
      key: 'unit',
      width: 80,
      responsive: ['md'],
      render: (_, record) =>
        record.unit ? <Tag>{record.unit.code}</Tag> : '-',
    },
    {
      title: 'Jenis',
      key: 'kind',
      width: 160,
      responsive: ['md'],
      render: (_, record) => (
        <span style={{ opacity: record.status === 'void' ? 0.45 : 1 }}>
          {INVOICE_KIND_LABELS[record.kind]}
          {record.period_month && (
            <Typography.Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
              · {record.period_month.slice(5, 7)}/{record.period_month.slice(0, 4)}
            </Typography.Text>
          )}
        </span>
      ),
    },
    {
      title: 'Jatuh Tempo',
      key: 'due_date',
      width: 140,
      render: (_, record) => {
        if (!record.due_date) return '-'
        const isOverdue = record.is_overdue && record.status !== 'void'
        return (
          <Space size={4} style={{ opacity: record.status === 'void' ? 0.45 : 1 }}>
            <Typography.Text style={{ color: isOverdue ? '#ff4d4f' : undefined }}>
              {formatDate(record.due_date)}
            </Typography.Text>
            {isOverdue && <Tag color="red" style={{ marginLeft: 0 }}>Terlambat</Tag>}
          </Space>
        )
      },
    },
    {
      title: 'Total',
      key: 'total_amount',
      width: 120,
      align: 'right',
      render: (_, record) => (
        <Typography.Text style={{ opacity: record.status === 'void' ? 0.45 : 1 }}>
          {formatRupiah(record.total_amount)}
        </Typography.Text>
      ),
    },
    {
      title: 'Terbayar',
      key: 'paid_amount',
      width: 120,
      align: 'right',
      responsive: ['lg'],
      render: (_, record) => (
        <Typography.Text style={{ opacity: record.status === 'void' ? 0.45 : 1 }}>
          {formatRupiah(record.paid_amount)}
        </Typography.Text>
      ),
    },
    {
      title: 'Sisa',
      key: 'outstanding',
      width: 120,
      align: 'right',
      render: (_, record) => (
        <Typography.Text
          style={{ opacity: record.status === 'void' ? 0.45 : 1 }}
          type={record.outstanding > 0 && record.status !== 'void' ? 'danger' : undefined}
        >
          {formatRupiah(record.outstanding)}
        </Typography.Text>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_, record) => (
        <Tag color={INVOICE_STATUS_COLORS[record.status]}>
          {INVOICE_STATUS_LABELS[record.status]}
        </Tag>
      ),
    },
  ]

  return (
    <div>
      <Flex wrap="wrap" justify="space-between" align="center" gap={12} style={{ marginBottom: 16 }}>
        <Flex wrap="wrap" gap={8} align="center" style={{ flex: 1 }}>
          <Input
            placeholder="Cari nomor atau nama siswa..."
            prefix={<SearchOutlined />}
            value={searchInput}
            onChange={handleSearchChange}
            allowClear
            style={{ width: 220 }}
          />

          <Select
            value={effectiveYearId}
            onChange={(y) => { setSelectedYearId(y); setPage(1) }}
            style={{ width: 170 }}
            placeholder="Tahun Ajaran"
            options={academicYears.map((ay) => ({
              value: ay.id,
              label: ay.name + (ay.is_active ? ' (Aktif)' : ''),
            }))}
          />

          <Select<InvoiceStatus | undefined>
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1) }}
            allowClear
            style={{ width: 150 }}
            placeholder="Semua Status"
            options={[
              { value: 'unpaid', label: 'Belum Bayar' },
              { value: 'partial', label: 'Sebagian' },
              { value: 'paid', label: 'Lunas' },
              { value: 'void', label: 'Dibatalkan' },
            ]}
          />

          <Select<InvoiceKind | undefined>
            value={kindFilter}
            onChange={(v) => { setKindFilter(v); setPage(1) }}
            allowClear
            style={{ width: 160 }}
            placeholder="Semua Jenis"
            options={[
              { value: 'monthly', label: 'Bulanan' },
              { value: 'one_time', label: 'Sekali Bayar' },
            ]}
          />

          <DatePicker
            picker="month"
            format="MM/YYYY"
            placeholder="Filter bulan"
            style={{ width: 140 }}
            onChange={(d) => { setPeriodFilter(d ? d.format('YYYY-MM') : undefined); setPage(1) }}
          />

          <Space>
            <Switch
              checked={overdueOnly}
              onChange={(v) => { setOverdueOnly(v); setPage(1) }}
              size="small"
            />
            <Typography.Text style={{ fontSize: 13 }}>Jatuh tempo terlewat</Typography.Text>
          </Space>
        </Flex>

        {canManage && (
          <Space>
            <Button
              icon={<FileAddOutlined />}
              onClick={() => setGenerateOpen(true)}
            >
              {isMobile ? 'SPP Bulanan' : 'Buat Tagihan Bulanan'}
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateOpen(true)}
            >
              {isMobile ? 'Manual' : 'Tagihan Manual'}
            </Button>
          </Space>
        )}
      </Flex>

      {error && (
        <Alert
          message="Gagal memuat daftar tagihan"
          description={getErrorMessage(error)}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={invoices}
        loading={isLoading}
        size={isMobile ? 'small' : 'middle'}
        scroll={{ x: 'max-content' }}
        rowClassName={(record) => (record.status === 'void' ? 'invoice-row-void' : '')}
        onRow={(record) => ({
          onClick: () => setSelectedInvoiceId(record.id),
          style: { cursor: 'pointer' },
        })}
        pagination={{
          current: page,
          pageSize: PER_PAGE,
          total: meta?.total ?? 0,
          simple: isMobile,
          showSizeChanger: false,
          onChange: (p) => setPage(p),
        }}
      />

      <GenerateInvoicesModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onSuccess={invalidate}
      />

      <InvoiceCreateDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={invalidate}
      />

      <InvoiceDetailDrawer
        open={selectedInvoiceId !== null}
        invoiceId={selectedInvoiceId}
        onClose={() => setSelectedInvoiceId(null)}
        onVoidSuccess={invalidate}
      />
    </div>
  )
}
