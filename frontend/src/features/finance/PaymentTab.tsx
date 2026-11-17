import {
  Alert,
  Button,
  DatePicker,
  Flex,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import { PlusOutlined, PrinterOutlined, SearchOutlined } from '@ant-design/icons'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { useMemo, useState } from 'react'
import { useIsMobile } from '../../hooks/useIsMobile'
import { formatDate, formatRupiah } from '../../lib/format'
import { can } from '../../lib/permissions'
import { useMe } from '../auth/useMe'
import { getErrorMessage } from '../../api/errors'
import { PrintJob } from '../reportcards/components/PrintJob'
import { getReceipt, listPayments } from './api'
import {
  PAYMENT_METHOD_COLORS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  RECEIPT_PAGE,
} from './constants'
import type { Payment, PaymentMethod, PaymentStatus, Receipt } from './types'
import { PaymentCreateDrawer } from './PaymentCreateDrawer'
import { PaymentDetailDrawer } from './PaymentDetailDrawer'
import { ReceiptPrint } from './ReceiptPrint'

function debounce<Args extends unknown[]>(fn: (...args: Args) => void, delay: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  return (...args: Args) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

const PER_PAGE = 15

export function PaymentTab() {
  const isMobile = useIsMobile()
  const { data: me } = useMe()
  const canManage = can(me, 'finance.manage')
  const canView = can(me, 'finance.view')
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | undefined>(undefined)
  const [dateRange, setDateRange] = useState<[string | undefined, string | undefined]>([
    undefined,
    undefined,
  ])

  const [createOpen, setCreateOpen] = useState(false)
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null)

  // Direct print state from table row
  const [printingId, setPrintingId] = useState<number | null>(null)
  const [printingReceipt, setPrintingReceipt] = useState<Receipt | null>(null)

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

  const { data, isLoading, error } = useQuery({
    queryKey: ['payments', page, debouncedSearch, methodFilter, statusFilter, dateFrom, dateTo],
    queryFn: () =>
      listPayments({
        page,
        per_page: PER_PAGE,
        q: debouncedSearch || undefined,
        method: methodFilter,
        status: statusFilter,
        date_from: dateFrom,
        date_to: dateTo,
      }),
    placeholderData: keepPreviousData,
  })

  const payments = data?.data ?? []
  const meta = data?.meta

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['payments'] })
    void queryClient.invalidateQueries({ queryKey: ['invoices'] })
  }

  const handlePrintReceipt = async (paymentId: number) => {
    setPrintingId(paymentId)
    try {
      const receipt = await getReceipt(paymentId)
      setPrintingReceipt(receipt)
    } catch (err: unknown) {
      message.error(getErrorMessage(err, 'Gagal mengambil data kwitansi.'))
    } finally {
      setPrintingId(null)
    }
  }

  const columns: TableColumnsType<Payment> = [
    {
      title: 'No. Kwitansi',
      dataIndex: 'receipt_number',
      key: 'receipt_number',
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
      dataIndex: 'payment_date',
      key: 'payment_date',
      width: 120,
      render: (date: string, record) => (
        <span style={{ opacity: record.status === 'void' ? 0.45 : 1 }}>
          {formatDate(date)}
        </span>
      ),
    },
    {
      title: 'Siswa',
      key: 'student',
      render: (_, record) => (
        <Space
          direction="vertical"
          size={0}
          style={{ opacity: record.status === 'void' ? 0.45 : 1 }}
        >
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
      title: 'Metode',
      key: 'method',
      width: 110,
      responsive: ['md'],
      render: (_, record) => (
        <span style={{ opacity: record.status === 'void' ? 0.45 : 1 }}>
          <Tag color={PAYMENT_METHOD_COLORS[record.method]}>
            {PAYMENT_METHOD_LABELS[record.method]}
          </Tag>
        </span>
      ),
    },
    {
      title: 'Nominal',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      align: 'right',
      render: (amt: number, record) => (
        <Typography.Text
          strong
          style={{ opacity: record.status === 'void' ? 0.45 : 1 }}
        >
          {formatRupiah(amt)}
        </Typography.Text>
      ),
    },
    {
      title: 'Penerima',
      key: 'received_by',
      width: 140,
      responsive: ['lg'],
      render: (_, record) => (
        <span style={{ opacity: record.status === 'void' ? 0.45 : 1 }}>
          {record.received_by?.name ?? '-'}
        </span>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 110,
      render: (_, record) => (
        <Tag color={PAYMENT_STATUS_COLORS[record.status]}>
          {PAYMENT_STATUS_LABELS[record.status]}
        </Tag>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_, record) => {
        if (!canView) return null
        return (
          <Button
            type="text"
            icon={<PrinterOutlined />}
            loading={printingId === record.id}
            aria-label={`Cetak kwitansi ${record.receipt_number}`}
            title="Cetak Kwitansi"
            onClick={(e) => {
              e.stopPropagation()
              void handlePrintReceipt(record.id)
            }}
          />
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
        <Flex wrap="wrap" gap={8} align="center" style={{ flex: 1 }}>
          <Input
            placeholder="Cari no. kwitansi / siswa / NIS..."
            prefix={<SearchOutlined />}
            value={searchInput}
            onChange={handleSearchChange}
            allowClear
            style={{ width: 230 }}
          />

          <Select<PaymentMethod | undefined>
            value={methodFilter}
            onChange={(v) => {
              setMethodFilter(v)
              setPage(1)
            }}
            allowClear
            style={{ width: 140 }}
            placeholder="Semua Metode"
            options={[
              { value: 'cash', label: 'Tunai' },
              { value: 'transfer', label: 'Transfer' },
              { value: 'other', label: 'Lainnya' },
            ]}
          />

          <Select<PaymentStatus | undefined>
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v)
              setPage(1)
            }}
            allowClear
            style={{ width: 140 }}
            placeholder="Semua Status"
            options={[
              { value: 'valid', label: 'Valid' },
              { value: 'void', label: 'Dibatalkan' },
            ]}
          />

          <DatePicker.RangePicker
            format="DD/MM/YYYY"
            placeholder={['Dari tanggal', 'Sampai tanggal']}
            style={{ width: 250 }}
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
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateOpen(true)}
          >
            {isMobile ? 'Bayar' : 'Catat Pembayaran'}
          </Button>
        )}
      </Flex>

      {error && (
        <Alert
          message="Gagal memuat daftar pembayaran"
          description={getErrorMessage(error)}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={payments}
        loading={isLoading}
        size={isMobile ? 'small' : 'middle'}
        scroll={{ x: 'max-content' }}
        rowClassName={(record) => (record.status === 'void' ? 'payment-row-void' : '')}
        onRow={(record) => ({
          onClick: () => setSelectedPaymentId(record.id),
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

      <PaymentCreateDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={invalidate}
      />

      <PaymentDetailDrawer
        open={selectedPaymentId !== null}
        paymentId={selectedPaymentId}
        onClose={() => setSelectedPaymentId(null)}
        onVoidSuccess={invalidate}
      />

      {printingReceipt && (
        <PrintJob page={RECEIPT_PAGE} onDone={() => setPrintingReceipt(null)}>
          <ReceiptPrint receipt={printingReceipt} />
        </PrintJob>
      )}
    </div>
  )
}
