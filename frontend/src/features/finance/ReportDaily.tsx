import { useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  DatePicker,
  Empty,
  Flex,
  Row,
  Select,
  Skeleton,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd'
import { PrinterOutlined, SearchOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { getErrorMessage } from '../../api/errors'
import { formatRupiah } from '../../lib/format'
import { getDailyReport } from './api'
import {
  PAYMENT_METHOD_COLORS,
  PAYMENT_METHOD_LABELS,
} from './constants'
import { ReportPrint } from './ReportPrint'
import type {
  DailyPaymentRow,
  DailyReportParams,
} from './types'

export function ReportDaily() {
  const [date, setDate] = useState<Dayjs | null>(dayjs())
  const [unit, setUnit] = useState<string>('')
  const [appliedParams, setAppliedParams] = useState<DailyReportParams>({
    date: dayjs().format('YYYY-MM-DD'),
    unit: undefined,
  })
  const [isPrinting, setIsPrinting] = useState(false)

  const {
    data,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ['finance-report-daily', appliedParams],
    queryFn: () => getDailyReport(appliedParams),
  })

  const handleApply = () => {
    if (!date) return
    setAppliedParams({
      date: date.format('YYYY-MM-DD'),
      unit: unit || undefined,
    })
  }

  const columns: TableColumnsType<DailyPaymentRow> = [
    {
      title: 'No. Kwitansi',
      dataIndex: 'receipt_number',
      key: 'receipt_number',
      width: 140,
      render: (num: string) => <Typography.Text strong>{num}</Typography.Text>,
    },
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
      title: 'Metode',
      dataIndex: 'method',
      key: 'method',
      width: 110,
      render: (m: 'cash' | 'transfer' | 'other') => (
        <Tag color={PAYMENT_METHOD_COLORS[m] ?? 'default'}>
          {PAYMENT_METHOD_LABELS[m] ?? m}
        </Tag>
      ),
    },
    {
      title: 'Referensi',
      dataIndex: 'reference',
      key: 'reference',
      width: 130,
      render: (val: string | null) => val ?? '-',
    },
    {
      title: 'Nominal',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      width: 140,
      render: (amt: number) => (
        <Typography.Text strong>{formatRupiah(amt)}</Typography.Text>
      ),
    },
    {
      title: 'Penerima',
      dataIndex: 'received_by',
      key: 'received_by',
      width: 140,
      render: (val: string | null) => val ?? '-',
    },
  ]

  const voidedColumns: TableColumnsType<DailyPaymentRow & { void_reason: string | null }> = [
    {
      title: 'No. Kwitansi',
      dataIndex: 'receipt_number',
      key: 'receipt_number',
      width: 140,
      render: (num: string) => <Typography.Text delete>{num}</Typography.Text>,
    },
    {
      title: 'Siswa',
      key: 'student',
      render: (_, record) => (
        <div>
          <span>{record.student?.name ?? '-'}</span>
          {record.student?.nis && (
            <Typography.Text type="secondary" style={{ marginLeft: 6 }}>
              (NIS: {record.student.nis})
            </Typography.Text>
          )}
        </div>
      ),
    },
    {
      title: 'Metode',
      dataIndex: 'method',
      key: 'method',
      width: 100,
      render: (m: 'cash' | 'transfer' | 'other') => (
        <Tag>{PAYMENT_METHOD_LABELS[m] ?? m}</Tag>
      ),
    },
    {
      title: 'Nominal',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      width: 130,
      render: (amt: number) => formatRupiah(amt),
    },
    {
      title: 'Penerima',
      dataIndex: 'received_by',
      key: 'received_by',
      width: 120,
      render: (val: string | null) => val ?? '-',
    },
    {
      title: 'Alasan Pembatalan',
      dataIndex: 'void_reason',
      key: 'void_reason',
      render: (reason: string | null) => (
        <span style={{ color: '#cf1322' }}>{reason ?? '-'}</span>
      ),
    },
  ]

  return (
    <div>
      {/* Filter Bar */}
      <Flex wrap="wrap" gap={8} align="center" style={{ marginBottom: 16 }}>
        <DatePicker
          value={date}
          onChange={(d) => setDate(d)}
          allowClear={false}
          format="DD/MM/YYYY"
        />

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

        <Button
          type="primary"
          icon={<SearchOutlined />}
          onClick={handleApply}
          disabled={!date || isLoading || isFetching}
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
          message={getErrorMessage(error, 'Gagal memuat laporan kasir harian.')}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Indikator Memuat */}
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : data ? (
        <>
          {/* Tiga Statistik Metode + Total */}
          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12} md={6}>
              <Card size="small" style={{ borderLeft: '4px solid #52c41a' }}>
                <Statistic
                  title="Pembayaran Tunai"
                  value={data.by_method.cash}
                  formatter={(val) => formatRupiah(Number(val))}
                  valueStyle={{ fontSize: 18, color: '#389e0d' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card size="small" style={{ borderLeft: '4px solid #1890ff' }}>
                <Statistic
                  title="Pembayaran Transfer"
                  value={data.by_method.transfer}
                  formatter={(val) => formatRupiah(Number(val))}
                  valueStyle={{ fontSize: 18, color: '#096dd9' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card size="small" style={{ borderLeft: '4px solid #d9d9d9' }}>
                <Statistic
                  title="Metode Lainnya"
                  value={data.by_method.other}
                  formatter={(val) => formatRupiah(Number(val))}
                  valueStyle={{ fontSize: 18, color: '#595959' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card size="small" style={{ borderLeft: '4px solid #0f766e' }}>
                <Statistic
                  title="Total Penerimaan Hari Ini"
                  value={data.total}
                  formatter={(val) => formatRupiah(Number(val))}
                  valueStyle={{ fontSize: 18, color: '#0f766e' }}
                />
                <div style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
                  {data.count} transaksi pembayaran
                </div>
              </Card>
            </Col>
          </Row>

          {/* Tabel Pembayaran Valid */}
          {data.payments.length === 0 ? (
            <Empty
              description="Tidak ada data untuk filter ini"
              style={{ margin: '32px 0' }}
            />
          ) : (
            <div style={{ overflowX: 'auto', marginBottom: 20 }}>
              <Table<DailyPaymentRow>
                columns={columns}
                dataSource={data.payments}
                rowKey="id"
                pagination={false}
                size="middle"
                summary={() => (
                  <Table.Summary fixed>
                    <Table.Summary.Row
                      style={{ backgroundColor: '#fafafa', fontWeight: 'bold' }}
                    >
                      <Table.Summary.Cell index={0} colSpan={4}>
                        Total ({data.count} transaksi)
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={4} align="right">
                        {formatRupiah(data.total)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5} />
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            </div>
          )}

          {/* Bagian Lipat Pembayaran Dibatalkan (bila voided_count > 0) */}
          {data.voided_count > 0 && (
            <div style={{ marginTop: 16 }}>
              <Collapse
                items={[
                  {
                    key: 'voided_payments',
                    label: (
                      <Typography.Text type="danger" strong>
                        Pembayaran Dibatalkan ({data.voided_count} transaksi · Total {formatRupiah(data.voided_amount)})
                      </Typography.Text>
                    ),
                    children: (
                      <div style={{ overflowX: 'auto' }}>
                        <Table<DailyPaymentRow & { void_reason: string | null }>
                          columns={voidedColumns}
                          dataSource={data.voided}
                          rowKey="id"
                          pagination={false}
                          size="small"
                        />
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          )}
        </>
      ) : null}

      {/* Cetak */}
      {isPrinting && data && (
        <ReportPrint
          kind="daily"
          data={data}
          onDone={() => setIsPrinting(false)}
        />
      )}
    </div>
  )
}
