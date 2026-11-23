import { useState } from 'react'
import {
  Alert,
  Button,
  DatePicker,
  Flex,
  Select,
  Skeleton,
  Table,
  Typography,
} from 'antd'
import { PrinterOutlined, SearchOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { getErrorMessage } from '../../api/errors'
import { formatDate, formatRupiah } from '../../lib/format'
import { getCashBookReport } from './api'
import { ReportPrint } from './ReportPrint'
import type { CashBookEntry, CashBookReportParams } from './types'

interface CashBookTableRow extends Partial<CashBookEntry> {
  key: string
  isOpening?: boolean
}

export function ReportCashBook() {
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null]>([
    dayjs().startOf('month'),
    dayjs(),
  ])
  const [unit, setUnit] = useState<string>('')
  const [appliedParams, setAppliedParams] = useState<CashBookReportParams>({
    date_from: dayjs().startOf('month').format('YYYY-MM-DD'),
    date_to: dayjs().format('YYYY-MM-DD'),
    unit: undefined,
  })
  const [isPrinting, setIsPrinting] = useState(false)

  const isRangeValid = Boolean(range && range[0] && range[1])
  const diffDays =
    range && range[0] && range[1] ? range[1].diff(range[0], 'day') : 0
  const isOver366 = diffDays > 366 || diffDays < 0

  const {
    data,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ['finance-report-cash-book', appliedParams],
    queryFn: () => getCashBookReport(appliedParams),
  })

  const handleApply = () => {
    if (!range || !range[0] || !range[1] || isOver366) return
    setAppliedParams({
      date_from: range[0].format('YYYY-MM-DD'),
      date_to: range[1].format('YYYY-MM-DD'),
      unit: unit || undefined,
    })
  }

  const columns: TableColumnsType<CashBookTableRow> = [
    {
      title: 'Tanggal',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (val: string, record) =>
        record.isOpening ? (
          <Typography.Text italic>{formatDate(val)}</Typography.Text>
        ) : (
          formatDate(val)
        ),
    },
    {
      title: 'Referensi',
      dataIndex: 'reference',
      key: 'reference',
      width: 130,
      render: (val: string | undefined, record) =>
        record.isOpening ? '-' : val ?? '-',
    },
    {
      title: 'Uraian',
      dataIndex: 'description',
      key: 'description',
      render: (val: string | undefined, record) =>
        record.isOpening ? (
          <Typography.Text strong italic>
            Saldo awal sebelum periode
          </Typography.Text>
        ) : (
          val ?? '-'
        ),
    },
    {
      title: 'Unit',
      dataIndex: 'unit',
      key: 'unit',
      width: 90,
      render: (val: string | null | undefined, record) =>
        record.isOpening ? '-' : val ?? 'Umum',
    },
    {
      title: 'Masuk',
      dataIndex: 'income',
      key: 'income',
      align: 'right',
      width: 130,
      render: (val: number | undefined, record) =>
        record.isOpening
          ? '-'
          : val && val > 0
            ? formatRupiah(val)
            : '-',
    },
    {
      title: 'Keluar',
      dataIndex: 'expense',
      key: 'expense',
      align: 'right',
      width: 130,
      render: (val: number | undefined, record) =>
        record.isOpening
          ? '-'
          : val && val > 0
            ? formatRupiah(val)
            : '-',
    },
    {
      title: 'Saldo',
      dataIndex: 'balance',
      key: 'balance',
      align: 'right',
      width: 140,
      render: (val: number | undefined) => (
        <Typography.Text
          strong
          style={{ color: (val ?? 0) < 0 ? '#cf1322' : undefined }}
        >
          {formatRupiah(val ?? 0)}
        </Typography.Text>
      ),
    },
  ]

  const tableData: CashBookTableRow[] = data
    ? [
        {
          key: 'opening_balance',
          date: data.period.from,
          isOpening: true,
          balance: data.opening_balance,
        },
        ...data.entries.map((e, idx) => ({
          ...e,
          key: `entry_${idx}_${e.reference}`,
        })),
      ]
    : []

  return (
    <div>
      {/* Filter Bar */}
      <Flex wrap="wrap" gap={8} align="center" style={{ marginBottom: 8 }}>
        <DatePicker.RangePicker
          value={range}
          onChange={(val) => setRange(val as [Dayjs | null, Dayjs | null])}
          allowClear={false}
          format="DD/MM/YYYY"
        />

        <Select<string>
          value={unit}
          onChange={setUnit}
          style={{ width: 180 }}
          options={[
            { value: '', label: 'Semua Unit' },
            { value: 'TK', label: 'Unit TK' },
            { value: 'SD', label: 'Unit SD' },
            { value: 'SMP', label: 'Unit SMP' },
            { value: 'none', label: 'Umum (Tanpa Unit)' },
          ]}
        />

        <Button
          type="primary"
          icon={<SearchOutlined />}
          onClick={handleApply}
          disabled={!isRangeValid || isOver366 || isFetching}
        >
          Tampilkan
        </Button>

        <Button
          icon={<PrinterOutlined />}
          disabled={!data || isLoading || isFetching}
          onClick={() => setIsPrinting(true)}
        >
          Cetak
        </Button>
      </Flex>

      {/* Catatan Kecil */}
      <Typography.Text
        type="secondary"
        style={{ fontSize: 12, display: 'block', marginBottom: 16 }}
      >
        * Saldo awal dihitung dari seluruh transaksi valid di sistem sebelum periode.
      </Typography.Text>

      {/* Validasi Rentang Tanggal */}
      {isOver366 && (
        <Alert
          type="error"
          showIcon
          message="Rentang tanggal maksimal 366 hari. Silakan persempit filter rentang tanggal."
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Tampilan Galat */}
      {error && (
        <Alert
          type="error"
          showIcon
          message={getErrorMessage(error, 'Gagal memuat laporan buku kas.')}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Indikator Memuat */}
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : data ? (
        <div style={{ overflowX: 'auto' }}>
          <Table<CashBookTableRow>
            columns={columns}
            dataSource={tableData}
            pagination={false}
            size="middle"
            rowClassName={(record) => (record.isOpening ? 'bg-gray-50' : '')}
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row
                  style={{ backgroundColor: '#fafafa', fontWeight: 'bold' }}
                >
                  <Table.Summary.Cell index={0} colSpan={4}>
                    Total Mutasi & Saldo Akhir
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right">
                    {formatRupiah(data.total_income)}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="right">
                    {formatRupiah(data.total_expense)}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6} align="right">
                    <span
                      style={{
                        color: data.closing_balance < 0 ? '#cf1322' : undefined,
                      }}
                    >
                      {formatRupiah(data.closing_balance)}
                    </span>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />
        </div>
      ) : null}

      {/* Cetak */}
      {isPrinting && data && (
        <ReportPrint
          kind="cash-book"
          data={data}
          onDone={() => setIsPrinting(false)}
        />
      )}
    </div>
  )
}
