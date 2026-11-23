import { useState } from 'react'
import {
  Alert,
  Button,
  DatePicker,
  Empty,
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
import { formatRupiah } from '../../lib/format'
import { getSummaryReport } from './api'
import { ReportPrint } from './ReportPrint'
import type { SummaryReportParams, SummaryRow } from './types'

export function ReportSummary() {
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null]>([
    dayjs().startOf('month'),
    dayjs(),
  ])
  const [unit, setUnit] = useState<string>('')
  const [appliedParams, setAppliedParams] = useState<SummaryReportParams>({
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
    queryKey: ['finance-report-summary', appliedParams],
    queryFn: () => getSummaryReport(appliedParams),
  })

  const handleApply = () => {
    if (!range || !range[0] || !range[1] || isOver366) return
    setAppliedParams({
      date_from: range[0].format('YYYY-MM-DD'),
      date_to: range[1].format('YYYY-MM-DD'),
      unit: unit || undefined,
    })
  }

  const columns: TableColumnsType<SummaryRow> = [
    {
      title: 'Unit',
      dataIndex: 'name',
      key: 'name',
      render: (val: string) => <Typography.Text strong>{val}</Typography.Text>,
    },
    {
      title: 'Pembayaran Siswa',
      dataIndex: 'student_payments',
      key: 'student_payments',
      align: 'right',
      render: (val: number, record) => (
        <div>
          <div>{formatRupiah(val)}</div>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            {record.student_payment_count} transaksi
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Kas Masuk Lain',
      dataIndex: 'other_income',
      key: 'other_income',
      align: 'right',
      render: (val: number, record) => (
        <div>
          <div>{formatRupiah(val)}</div>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            {record.other_income_count} transaksi
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Total Penerimaan',
      dataIndex: 'total_income',
      key: 'total_income',
      align: 'right',
      render: (val: number) => (
        <Typography.Text strong>{formatRupiah(val)}</Typography.Text>
      ),
    },
    {
      title: 'Pengeluaran',
      dataIndex: 'expense',
      key: 'expense',
      align: 'right',
      render: (val: number, record) => (
        <div>
          <div>{formatRupiah(val)}</div>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            {record.expense_count} transaksi
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Saldo',
      dataIndex: 'balance',
      key: 'balance',
      align: 'right',
      render: (val: number) => (
        <Typography.Text
          strong
          style={{ color: val < 0 ? '#cf1322' : undefined }}
        >
          {formatRupiah(val)}
        </Typography.Text>
      ),
    },
  ]

  return (
    <div>
      {/* Filter Bar */}
      <Flex wrap="wrap" gap={8} align="center" style={{ marginBottom: 16 }}>
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

      {/* Validasi Rentang Tanggal */}
      {isOver366 && (
        <Alert
          type="error"
          showIcon
          message="Rentang tanggal maksimal 366 hari. Silakan persempit filter rentang tanggal."
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Tampilan Galat Server */}
      {error && (
        <Alert
          type="error"
          showIcon
          message={getErrorMessage(error, 'Gagal memuat laporan ringkasan.')}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Indikator Memuat */}
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : data ? (
        data.rows.length === 0 ? (
          <Empty description="Tidak ada data untuk filter ini" style={{ margin: '32px 0' }} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <Table<SummaryRow>
              columns={columns}
              dataSource={data.rows}
              rowKey="key"
              pagination={false}
              size="middle"
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row
                    style={{ backgroundColor: '#fafafa', fontWeight: 'bold' }}
                  >
                    <Table.Summary.Cell index={0}>Total</Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <div>{formatRupiah(data.total.student_payments)}</div>
                      <Typography.Text
                        type="secondary"
                        style={{ fontSize: 11, fontWeight: 'normal' }}
                      >
                        {data.total.student_payment_count} transaksi
                      </Typography.Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right">
                      <div>{formatRupiah(data.total.other_income)}</div>
                      <Typography.Text
                        type="secondary"
                        style={{ fontSize: 11, fontWeight: 'normal' }}
                      >
                        {data.total.other_income_count} transaksi
                      </Typography.Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right">
                      {formatRupiah(data.total.total_income)}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="right">
                      <div>{formatRupiah(data.total.expense)}</div>
                      <Typography.Text
                        type="secondary"
                        style={{ fontSize: 11, fontWeight: 'normal' }}
                      >
                        {data.total.expense_count} transaksi
                      </Typography.Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="right">
                      <span
                        style={{
                          color: data.total.balance < 0 ? '#cf1322' : undefined,
                        }}
                      >
                        {formatRupiah(data.total.balance)}
                      </span>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </div>
        )
      ) : null}

      {/* Komponen Cetak */}
      {isPrinting && data && (
        <ReportPrint
          kind="summary"
          data={data}
          onDone={() => setIsPrinting(false)}
        />
      )}
    </div>
  )
}
