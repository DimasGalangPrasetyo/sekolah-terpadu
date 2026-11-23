import { useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Flex,
  Row,
  Select,
  Skeleton,
  Statistic,
  Switch,
  Table,
  Typography,
} from 'antd'
import { PrinterOutlined, SearchOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { getErrorMessage } from '../../api/errors'
import { formatDate, formatRupiah } from '../../lib/format'
import { getArrearsReport } from './api'
import { ReportPrint } from './ReportPrint'
import type {
  ArrearsInvoice,
  ArrearsReportParams,
  ArrearsRow,
} from './types'

export function ReportArrears() {
  const [unit, setUnit] = useState<string>('')
  const [asOf, setAsOf] = useState<Dayjs | null>(dayjs())
  const [includeNotDue, setIncludeNotDue] = useState(false)

  const [appliedParams, setAppliedParams] = useState<ArrearsReportParams>({
    unit: undefined,
    as_of: dayjs().format('YYYY-MM-DD'),
    include_not_due: false,
  })
  const [isPrinting, setIsPrinting] = useState(false)

  const {
    data,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ['finance-report-arrears', appliedParams],
    queryFn: () => getArrearsReport(appliedParams),
  })

  const handleApply = () => {
    setAppliedParams({
      unit: unit || undefined,
      as_of: asOf ? asOf.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      include_not_due: includeNotDue,
    })
  }

  const columns: TableColumnsType<ArrearsRow> = [
    {
      title: 'Siswa',
      key: 'student',
      render: (_, record) => (
        <div>
          <Typography.Text strong>{record.student?.name ?? '-'}</Typography.Text>
          {record.student?.nis && (
            <Typography.Text type="secondary" style={{ marginLeft: 6 }}>
              (NIS: {record.student.nis})
            </Typography.Text>
          )}
        </div>
      ),
    },
    {
      title: 'Kelas',
      dataIndex: 'classroom',
      key: 'classroom',
      width: 100,
      render: (val: string | null) => val ?? '-',
    },
    {
      title: 'Unit',
      dataIndex: 'unit',
      key: 'unit',
      width: 90,
      render: (val: string | null) => val ?? '-',
    },
    {
      title: 'Jumlah Tagihan',
      dataIndex: 'invoice_count',
      key: 'invoice_count',
      width: 130,
      align: 'right',
      render: (val: number) => `${val} tagihan`,
    },
    {
      title: 'Jatuh Tempo Terlama',
      key: 'oldest_due_date',
      render: (_, record) => {
        if (!record.oldest_due_date) {
          return <span style={{ color: '#888' }}>Tanpa jatuh tempo</span>
        }
        const isLate = record.days_overdue > 30
        return (
          <span style={{ color: isLate ? '#cf1322' : undefined, fontWeight: isLate ? 'bold' : 'normal' }}>
            {formatDate(record.oldest_due_date)} ({record.days_overdue} hari)
          </span>
        )
      },
    },
    {
      title: 'Total Tunggakan',
      dataIndex: 'outstanding',
      key: 'outstanding',
      align: 'right',
      render: (val: number) => (
        <Typography.Text strong style={{ color: '#cf1322' }}>
          {formatRupiah(val)}
        </Typography.Text>
      ),
    },
  ]

  const expandedRowRender = (record: ArrearsRow) => {
    const invoiceColumns: TableColumnsType<ArrearsInvoice> = [
      {
        title: 'No. Tagihan',
        dataIndex: 'number',
        key: 'number',
      },
      {
        title: 'Jenis / Periode',
        key: 'kind',
        render: (_, inv) =>
          inv.kind === 'monthly'
            ? `Bulanan (${inv.period_month ?? '-'})`
            : 'Sekali Bayar',
      },
      {
        title: 'Jatuh Tempo',
        dataIndex: 'due_date',
        key: 'due_date',
        render: (d: string | null) => (d ? formatDate(d) : 'Tanpa jatuh tempo'),
      },
      {
        title: 'Total',
        dataIndex: 'total_amount',
        key: 'total_amount',
        align: 'right',
        render: (amt: number) => formatRupiah(amt),
      },
      {
        title: 'Terbayar',
        dataIndex: 'paid_amount',
        key: 'paid_amount',
        align: 'right',
        render: (amt: number) => formatRupiah(amt),
      },
      {
        title: 'Sisa (Tunggakan)',
        dataIndex: 'outstanding',
        key: 'outstanding',
        align: 'right',
        render: (amt: number) => (
          <Typography.Text strong style={{ color: '#cf1322' }}>
            {formatRupiah(amt)}
          </Typography.Text>
        ),
      },
    ]

    return (
      <Table<ArrearsInvoice>
        columns={invoiceColumns}
        dataSource={record.invoices}
        rowKey="number"
        pagination={false}
        size="small"
      />
    )
  }

  return (
    <div>
      {/* Filter Bar */}
      <Flex wrap="wrap" gap={12} align="center" style={{ marginBottom: 16 }}>
        <Select<string>
          value={unit}
          onChange={setUnit}
          style={{ width: 160 }}
          options={[
            { value: '', label: 'Semua Unit' },
            { value: 'TK', label: 'Unit TK' },
            { value: 'SD', label: 'Unit SD' },
            { value: 'SMP', label: 'Unit SMP' },
          ]}
        />

        <Flex align="center" gap={6}>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            Per Tanggal:
          </Typography.Text>
          <DatePicker
            value={asOf}
            onChange={(d) => setAsOf(d)}
            allowClear={false}
            format="DD/MM/YYYY"
          />
        </Flex>

        <Flex align="center" gap={6}>
          <Switch
            checked={includeNotDue}
            onChange={setIncludeNotDue}
            id="include-not-due-switch"
          />
          <Typography.Text style={{ fontSize: 13, cursor: 'pointer' }}>
            Sertakan yang belum jatuh tempo
          </Typography.Text>
        </Flex>

        <Button
          type="primary"
          icon={<SearchOutlined />}
          onClick={handleApply}
          disabled={isLoading || isFetching}
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

      {/* Tampilan Galat */}
      {error && (
        <Alert
          type="error"
          showIcon
          message={getErrorMessage(error, 'Gagal memuat laporan tunggakan.')}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Indikator Memuat */}
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : data ? (
        <>
          {/* Ringkasan Per Unit & Total */}
          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            {data.by_unit.map((u, idx) => (
              <Col xs={24} sm={12} md={6} key={idx}>
                <Card size="small" style={{ borderLeft: '4px solid #13c2c2' }}>
                  <Statistic
                    title={`Unit ${u.unit ?? 'Semua'}`}
                    value={u.outstanding}
                    formatter={(val) => formatRupiah(Number(val))}
                    valueStyle={{ fontSize: 18, color: '#08979c' }}
                  />
                  <div style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
                    {u.students} Siswa · {u.invoices} Tagihan
                  </div>
                </Card>
              </Col>
            ))}
            <Col xs={24} sm={12} md={6}>
              <Card size="small" style={{ borderLeft: '4px solid #cf1322' }}>
                <Statistic
                  title="Total Tunggakan"
                  value={data.total.outstanding}
                  formatter={(val) => formatRupiah(Number(val))}
                  valueStyle={{ fontSize: 18, color: '#cf1322' }}
                />
                <div style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
                  {data.total.students} Siswa · {data.total.invoices} Tagihan
                </div>
              </Card>
            </Col>
          </Row>

          {/* Tabel Siswa */}
          {data.rows.length === 0 ? (
            <Empty
              description="Tidak ada data untuk filter ini"
              style={{ margin: '32px 0' }}
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <Table<ArrearsRow>
                columns={columns}
                dataSource={data.rows}
                rowKey={(r) => `${r.unit}-${r.student?.id ?? Math.random()}`}
                expandable={{
                  expandedRowRender,
                  rowExpandable: (r) => r.invoices.length > 0,
                }}
                pagination={false}
                size="middle"
              />
            </div>
          )}
        </>
      ) : null}

      {/* Cetak */}
      {isPrinting && data && (
        <ReportPrint
          kind="arrears"
          data={data}
          onDone={() => setIsPrinting(false)}
        />
      )}
    </div>
  )
}
