import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { TableColumnsType } from 'antd'
import { PrinterOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { can } from '../../lib/permissions'
import { formatDate, formatDateTime, formatRupiah } from '../../lib/format'
import { useMe } from '../auth/useMe'
import { getErrorMessage } from '../../api/errors'
import { PrintJob } from '../reportcards/components/PrintJob'
import { getPayment, getReceipt } from './api'
import {
  INVOICE_KIND_LABELS,
  PAYMENT_METHOD_COLORS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  RECEIPT_PAGE,
} from './constants'
import type { Payment, PaymentAllocation, Receipt } from './types'
import { ReceiptPrint } from './ReceiptPrint'
import { VoidPaymentModal } from './VoidPaymentModal'

interface Props {
  open: boolean
  paymentId: number | null
  onClose: () => void
  onVoidSuccess: () => void
}

export function PaymentDetailDrawer({ open, paymentId, onClose, onVoidSuccess }: Props) {
  const { data: me } = useMe()
  const canManage = can(me, 'finance.manage')
  const canView = can(me, 'finance.view')

  const [voidOpen, setVoidOpen] = useState(false)
  const [printLoading, setPrintLoading] = useState(false)
  const [printingReceipt, setPrintingReceipt] = useState<Receipt | null>(null)

  const {
    data: payment,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['payment', paymentId],
    queryFn: () => getPayment(paymentId!),
    enabled: open && paymentId !== null,
  })

  const handlePrint = async () => {
    if (!payment) return
    setPrintLoading(true)
    try {
      const receiptData = await getReceipt(payment.id)
      setPrintingReceipt(receiptData)
    } catch (err: unknown) {
      message.error(getErrorMessage(err, 'Gagal mengambil data kwitansi.'))
    } finally {
      setPrintLoading(false)
    }
  }

  const handleVoidSuccess = () => {
    void refetch()
    onVoidSuccess()
  }

  const allocationColumns: TableColumnsType<PaymentAllocation> = [
    {
      title: 'No. Tagihan',
      key: 'invoice_number',
      render: (_, record) => record.invoice?.number ?? '-',
    },
    {
      title: 'Jenis / Periode',
      key: 'invoice_kind',
      render: (_, record) => {
        if (!record.invoice) return '-'
        return (
          <span>
            {INVOICE_KIND_LABELS[record.invoice.kind]}
            {record.invoice.period_month && ` · ${record.invoice.period_month}`}
          </span>
        )
      },
    },
    {
      title: 'Jumlah',
      dataIndex: 'amount',
      key: 'amount',
      width: 140,
      align: 'right',
      render: (v: number) => formatRupiah(v),
    },
  ]

  const renderContent = (pay: Payment) => (
    <>
      {pay.status === 'void' && (
        <Alert
          type="error"
          showIcon
          message="Pembayaran Dibatalkan"
          description={
            <>
              <div>
                <strong>Alasan:</strong> {pay.void_reason ?? '-'}
              </div>
              <div>
                <strong>Dibatalkan:</strong> {formatDateTime(pay.voided_at)}
              </div>
            </>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="No. Kwitansi">
          <Typography.Text strong>{pay.receipt_number}</Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="Siswa">
          {pay.student ? (
            <>
              <Typography.Text strong>{pay.student.name}</Typography.Text>
              {pay.student.nis && (
                <Typography.Text type="secondary"> · NIS: {pay.student.nis}</Typography.Text>
              )}
            </>
          ) : (
            '-'
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Tanggal Bayar">
          {formatDate(pay.payment_date)}
        </Descriptions.Item>
        <Descriptions.Item label="Metode">
          <Tag color={PAYMENT_METHOD_COLORS[pay.method]}>
            {PAYMENT_METHOD_LABELS[pay.method]}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Referensi / Bukti">
          {pay.reference ?? '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Catatan">{pay.notes ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="Penerima">
          {pay.received_by?.name ?? '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Dicatat">{formatDateTime(pay.created_at)}</Descriptions.Item>
      </Descriptions>

      <Typography.Title level={5} style={{ marginBottom: 8 }}>
        Rincian Alokasi Tagihan
      </Typography.Title>
      <Table
        rowKey="id"
        columns={allocationColumns}
        dataSource={pay.allocations ?? []}
        size="small"
        pagination={false}
        scroll={{ x: 'max-content' }}
        summary={() => (
          <Table.Summary>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2} align="right">
                <Typography.Text strong>Total Pembayaran</Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <Typography.Text strong>{formatRupiah(pay.amount)}</Typography.Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
        style={{ marginBottom: 16 }}
      />

      <div
        style={{
          marginTop: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div>
          {canView && (
            <Button
              icon={<PrinterOutlined />}
              onClick={handlePrint}
              loading={printLoading}
            >
              Cetak Kwitansi
            </Button>
          )}
        </div>

        <div>
          {pay.status === 'valid' && canManage && (
            <Button danger onClick={() => setVoidOpen(true)}>
              Batalkan Pembayaran
            </Button>
          )}
        </div>
      </div>

      <VoidPaymentModal
        open={voidOpen}
        payment={pay}
        onClose={() => setVoidOpen(false)}
        onSuccess={handleVoidSuccess}
      />

      {printingReceipt && (
        <PrintJob page={RECEIPT_PAGE} onDone={() => setPrintingReceipt(null)}>
          <ReceiptPrint receipt={printingReceipt} />
        </PrintJob>
      )}
    </>
  )

  return (
    <Drawer
      title={
        payment ? (
          <Space>
            <span>{payment.receipt_number}</span>
            <Tag color={PAYMENT_STATUS_COLORS[payment.status]}>
              {PAYMENT_STATUS_LABELS[payment.status]}
            </Tag>
          </Space>
        ) : (
          'Detail Pembayaran'
        )
      }
      open={open}
      onClose={onClose}
      destroyOnClose
      width="min(600px, 100vw)"
    >
      {isLoading && <Typography.Text type="secondary">Memuat...</Typography.Text>}
      {error && (
        <Alert
          message="Gagal memuat detail pembayaran"
          description={getErrorMessage(error)}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={() => void refetch()}>
              Coba lagi
            </Button>
          }
        />
      )}
      {payment && renderContent(payment)}
    </Drawer>
  )
}
