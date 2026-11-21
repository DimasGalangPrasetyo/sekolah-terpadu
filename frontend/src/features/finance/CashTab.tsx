import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Flex,
  Input,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { TableColumnsType } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useIsMobile } from '../../hooks/useIsMobile'
import { formatDate, formatRupiah } from '../../lib/format'
import { can } from '../../lib/permissions'
import { useMe } from '../auth/useMe'
import { getCashSummary, listCashCategories, listCashTransactions } from './api'
import {
  CASH_STATUS_COLORS,
  CASH_STATUS_LABELS,
  CASH_TYPE_COLORS,
  CASH_TYPE_LABELS,
} from './constants'
import type { CashStatus, CashTransaction, CashType } from './types'
import { CashDetailDrawer } from './CashDetailDrawer'
import { CashDrawer } from './CashDrawer'

function debounce<Args extends unknown[]>(fn: (...args: Args) => void, delay: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  return (...args: Args) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

const PER_PAGE = 15

export function CashTab() {
  const isMobile = useIsMobile()
  const { data: me } = useMe()
  const canManage = can(me, 'finance.manage')
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<CashType | undefined>(undefined)
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>(undefined)
  const [unitFilter, setUnitFilter] = useState<string | undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState<CashStatus | undefined>(undefined)
  const [dateRange, setDateRange] = useState<[string | undefined, string | undefined]>([
    undefined,
    undefined,
  ])

  const [createOpen, setCreateOpen] = useState(false)
  const [createInitialType, setCreateInitialType] = useState<CashType>('income')
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null)

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

  const [dateFrom, dateTo] = dateRange

  // Ambil daftar kategori aktif untuk filter
  const { data: categories = [] } = useQuery({
    queryKey: ['cash-categories', typeFilter, true],
    queryFn: () => listCashCategories({ type: typeFilter, is_active: true }),
  })

  // Ringkasan arus kas dengan filter aktif
  const { data: summary } = useQuery({
    queryKey: [
      'cash-summary',
      debouncedSearch,
      typeFilter,
      categoryFilter,
      unitFilter,
      dateFrom,
      dateTo,
    ],
    queryFn: () =>
      getCashSummary({
        q: debouncedSearch || undefined,
        type: typeFilter,
        cash_category_id: categoryFilter,
        unit: unitFilter,
        date_from: dateFrom,
        date_to: dateTo,
      }),
  })

  // Daftar transaksi dengan paginasi
  const { data, isLoading, error } = useQuery({
    queryKey: [
      'cash-transactions',
      page,
      debouncedSearch,
      typeFilter,
      categoryFilter,
      unitFilter,
      statusFilter,
      dateFrom,
      dateTo,
    ],
    queryFn: () =>
      listCashTransactions({
        page,
        per_page: PER_PAGE,
        q: debouncedSearch || undefined,
        type: typeFilter,
        cash_category_id: categoryFilter,
        unit: unitFilter,
        status: statusFilter,
        date_from: dateFrom,
        date_to: dateTo,
      }),
    placeholderData: keepPreviousData,
  })

  const transactions = data?.data ?? []
  const meta = data?.meta

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['cash-transactions'] })
    void queryClient.invalidateQueries({ queryKey: ['cash-summary'] })
  }

  const handleOpenCreate = (type: CashType) => {
    setCreateInitialType(type)
    setCreateOpen(true)
  }

  const columns: TableColumnsType<CashTransaction> = [
    {
      title: 'Nomor',
      dataIndex: 'number',
      key: 'number',
      width: 140,
      render: (num: string, record) => (
        <Typography.Text
          strong
          style={{ opacity: record.status === 'void' ? 0.45 : 1 }}
        >
          {num}
        </Typography.Text>
      ),
    },
    {
      title: 'Tanggal',
      dataIndex: 'transaction_date',
      key: 'transaction_date',
      width: 120,
      render: (date: string, record) => (
        <span style={{ opacity: record.status === 'void' ? 0.45 : 1 }}>
          {formatDate(date)}
        </span>
      ),
    },
    {
      title: 'Jenis',
      key: 'type',
      width: 110,
      render: (_, record) => (
        <span style={{ opacity: record.status === 'void' ? 0.45 : 1 }}>
          <Tag color={CASH_TYPE_COLORS[record.type]}>
            {CASH_TYPE_LABELS[record.type]}
          </Tag>
        </span>
      ),
    },
    {
      title: 'Kategori',
      key: 'category',
      responsive: ['md'],
      render: (_, record) => (
        <span style={{ opacity: record.status === 'void' ? 0.45 : 1 }}>
          {record.category?.name ?? '-'}
        </span>
      ),
    },
    {
      title: 'Unit',
      key: 'unit',
      width: 100,
      responsive: ['md'],
      render: (_, record) => (
        <span style={{ opacity: record.status === 'void' ? 0.45 : 1 }}>
          {record.unit ? (
            <Tag color="cyan">{record.unit.code}</Tag>
          ) : (
            <Tag color="default">Umum</Tag>
          )}
        </span>
      ),
    },
    {
      title: 'Keterangan',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      responsive: ['lg'],
      render: (desc: string, record) => (
        <span style={{ opacity: record.status === 'void' ? 0.45 : 1 }}>
          {desc}
        </span>
      ),
    },
    {
      title: 'Nominal',
      dataIndex: 'amount',
      key: 'amount',
      width: 140,
      align: 'right',
      render: (amt: number, record) => (
        <Typography.Text
          strong
          style={{
            opacity: record.status === 'void' ? 0.45 : 1,
            color: record.type === 'income' ? '#389e0d' : '#cf1322',
          }}
        >
          {formatRupiah(amt)}
        </Typography.Text>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 110,
      render: (_, record) => (
        <Tag color={CASH_STATUS_COLORS[record.status]}>
          {CASH_STATUS_LABELS[record.status]}
        </Tag>
      ),
    },
  ]

  return (
    <div>
      {/* 3 Ringkasan Statistik */}
      <Row gutter={[16, 16]} style={{ marginBottom: 12 }}>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderLeft: '4px solid #52c41a' }}>
            <Statistic
              title="Total Pemasukan"
              value={summary?.income ?? 0}
              formatter={(val) => formatRupiah(Number(val))}
              valueStyle={{ color: '#389e0d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderLeft: '4px solid #ff4d4f' }}>
            <Statistic
              title="Total Pengeluaran"
              value={summary?.expense ?? 0}
              formatter={(val) => formatRupiah(Number(val))}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card
            size="small"
            style={{
              borderLeft: `4px solid ${(summary?.balance ?? 0) >= 0 ? '#13c2c2' : '#faad14'}`,
            }}
          >
            <Statistic
              title="Selisih (Saldo)"
              value={summary?.balance ?? 0}
              formatter={(val) => formatRupiah(Number(val))}
              valueStyle={{
                color: (summary?.balance ?? 0) >= 0 ? '#08979c' : '#d46b08',
              }}
            />
          </Card>
        </Col>
      </Row>

      <div style={{ marginBottom: 16 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          * Tidak termasuk pembayaran siswa.
        </Typography.Text>
      </div>

      {/* Filter & Tombol Aksi */}
      <Flex
        wrap="wrap"
        justify="space-between"
        align="center"
        gap={12}
        style={{ marginBottom: 16 }}
      >
        <Flex wrap="wrap" gap={8} align="center" style={{ flex: 1 }}>
          <Input
            placeholder="Cari no. kas / keterangan..."
            prefix={<SearchOutlined />}
            value={searchInput}
            onChange={handleSearchChange}
            allowClear
            style={{ width: 220 }}
          />

          <Select<CashType | undefined>
            value={typeFilter}
            onChange={(v) => {
              setTypeFilter(v)
              setCategoryFilter(undefined)
              setPage(1)
            }}
            allowClear
            style={{ width: 130 }}
            placeholder="Semua Jenis"
            options={[
              { value: 'income', label: 'Pemasukan' },
              { value: 'expense', label: 'Pengeluaran' },
            ]}
          />

          <Select<number | undefined>
            value={categoryFilter}
            onChange={(v) => {
              setCategoryFilter(v)
              setPage(1)
            }}
            allowClear
            style={{ width: 160 }}
            placeholder="Semua Kategori"
            showSearch
            optionFilterProp="label"
            options={categories.map((c) => ({
              value: c.id,
              label: c.name,
            }))}
          />

          <Select<string | undefined>
            value={unitFilter}
            onChange={(v) => {
              setUnitFilter(v)
              setPage(1)
            }}
            allowClear
            style={{ width: 140 }}
            placeholder="Semua Unit"
            options={[
              { value: 'none', label: 'Umum (Tanpa Unit)' },
              { value: 'TK', label: 'Unit TK' },
              { value: 'SD', label: 'Unit SD' },
              { value: 'SMP', label: 'Unit SMP' },
            ]}
          />

          <Select<CashStatus | undefined>
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v)
              setPage(1)
            }}
            allowClear
            style={{ width: 130 }}
            placeholder="Semua Status"
            options={[
              { value: 'valid', label: 'Valid' },
              { value: 'void', label: 'Dibatalkan' },
            ]}
          />

          <DatePicker.RangePicker
            format="DD/MM/YYYY"
            placeholder={['Dari tanggal', 'Sampai tanggal']}
            style={{ width: 240 }}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setDateRange([
                  dates[0].format('YYYY-MM-DD'),
                  dates[1].format('YYYY-MM-DD'),
                ])
              } else {
                setDateRange([undefined, undefined])
              }
              setPage(1)
            }}
          />
        </Flex>

        {canManage && (
          <Space wrap>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              style={{ backgroundColor: '#389e0d', borderColor: '#389e0d' }}
              onClick={() => handleOpenCreate('income')}
            >
              Catat Kas Masuk
            </Button>
            <Button
              type="primary"
              danger
              icon={<PlusOutlined />}
              onClick={() => handleOpenCreate('expense')}
            >
              Catat Kas Keluar
            </Button>
          </Space>
        )}
      </Flex>

      {error && (
        <Alert
          message="Gagal memuat data kas"
          description={(error as Error).message}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Tabel Transaksi Kas */}
      <Table<CashTransaction>
        rowKey="id"
        columns={columns}
        dataSource={transactions}
        loading={isLoading}
        size={isMobile ? 'small' : 'middle'}
        scroll={{ x: 'max-content' }}
        onRow={(record) => ({
          onClick: () => setSelectedTransactionId(record.id),
          style: { cursor: 'pointer' },
        })}
        pagination={{
          current: page,
          pageSize: PER_PAGE,
          total: meta?.total ?? 0,
          showSizeChanger: false,
          simple: isMobile,
          onChange: (p) => setPage(p),
        }}
      />

      {/* Form Drawer Tambah Kas */}
      <CashDrawer
        open={createOpen}
        initialType={createInitialType}
        onClose={() => setCreateOpen(false)}
        onSuccess={invalidate}
      />

      {/* Detail Drawer Kas */}
      <CashDetailDrawer
        open={selectedTransactionId !== null}
        transactionId={selectedTransactionId}
        onClose={() => setSelectedTransactionId(null)}
        onVoidSuccess={invalidate}
      />
    </div>
  )
}
