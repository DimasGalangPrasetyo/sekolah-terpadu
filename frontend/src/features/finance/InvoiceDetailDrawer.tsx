import { Alert, Button, Descriptions, Drawer, Space, Table, Tag, Typography, message } from 'antd'
import type { TableColumnsType } from 'antd'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { can } from '../../lib/permissions'
import { formatDate, formatDateTime, formatRupiah } from '../../lib/format'
import { useMe } from '../auth/useMe'
import { getInvoice } from './api'
import {
  INVOICE_KIND_LABELS,
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
} from './constants'
import type { Invoice, InvoiceAllocation, InvoiceItem } from './types'
import { VoidInvoiceModal } from './VoidInvoiceModal'

interface Props {
  open: boolean
  invoiceId: number | null
  onClose: () => void
  onVoidSuccess: () => void
}

export function InvoiceDetailDrawer({ open, invoiceId, onClose, onVoidSuccess }: Props) {
  const { data: me } = useMe()
  const canManage = can(me, 'finance.manage')
  const [voidOpen, setVoidOpen] = useState(false)

  const {
    data: invoice,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => getInvoice(invoiceId!),
    enabled: open && invoiceId !== null,
  })

  const handleVoidSuccess = () => {
    void refetch()
    onVoidSuccess()
    message.success('Tagihan berhasil dibatalkan')
  }

  const itemColumns: TableColumnsType<InvoiceItem> = [
    {
      title: 'Deskripsi',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Jumlah',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 70,
      align: 'right',
    },
    {
      title: 'Harga Satuan',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 130,
      align: 'right',
      render: (v: number) => formatRupiah(v),
    },
    {
      title: 'Potongan',
      dataIndex: 'discount_amount',
      key: 'discount_amount',
      width: 120,
      align: 'right',
      render: (v: number) => (v > 0 ? formatRupiah(v) : '-'),
    },
    {
      title: 'Subtotal',
      dataIndex: 'subtotal',
      key: 'subtotal',
      width: 130,
      align: 'right',
      render: (v: number) => <Typography.Text strong>{formatRupiah(v)}</Typography.Text>,
    },
  ]

  const allocationColumns: TableColumnsType<InvoiceAllocation> = [
    {
      title: 'No. Kwitansi',
      key: 'receipt',
      render: (_, record) => record.payment?.receipt_number ?? '-',
    },
    {
      title: 'Tanggal',
      key: 'date',
      width: 120,
      render: (_, record) => formatDate(record.payment?.payment_date ?? null),
    },
    {
      title: 'Jumlah',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      align: 'right',
      render: (v: number) => formatRupiah(v),
    },
  ]

  const renderContent = (inv: Invoice) => (
    <>
      {inv.status === 'void' && (
        <Alert
          type="error"
          showIcon
          message="Tagihan Dibatalkan"
          description={
            <>
              <div>
                <strong>Alasan:</strong> {inv.void_reason ?? '-'}
              </div>
              <div>
                <strong>Dibatalkan:</strong> {formatDateTime(inv.voided_at)}
              </div>
            </>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Nomor">{inv.number}</Descriptions.Item>
        <Descriptions.Item label="Siswa">
          {inv.student ? (
            <>
              <Typography.Text strong>{inv.student.name}</Typography.Text>
              {inv.student.nis && (
                <Typography.Text type="secondary"> · NIS: {inv.student.nis}</Typography.Text>
              )}
            </>
          ) : (
            '-'
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Unit">
          {inv.unit ? <Tag>{inv.unit.code}</Tag> : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Tahun Ajaran">
          {inv.academic_year?.name ?? '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Jenis">
          {INVOICE_KIND_LABELS[inv.kind]}
          {inv.period_month && ` · ${inv.period_month.slice(5, 7)}/${inv.period_month.slice(0, 4)}`}
        </Descriptions.Item>
        <Descriptions.Item label="Jatuh Tempo">
          {inv.due_date ? (
            <span>
              {formatDate(inv.due_date)}
              {inv.is_overdue && inv.status !== 'void' && (
                <Tag color="red" style={{ marginLeft: 8 }}>
                  Terlambat
                </Tag>
              )}
            </span>
          ) : (
            '-'
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Dibuat">{formatDate(inv.created_at)}</Descriptions.Item>
        {inv.notes && <Descriptions.Item label="Catatan">{inv.notes}</Descriptions.Item>}
      </Descriptions>

      <Typography.Title level={5} style={{ marginBottom: 8 }}>
        Rincian Item
      </Typography.Title>
      <Table
        rowKey="id"
        columns={itemColumns}
        dataSource={inv.items ?? []}
        size="small"
        pagination={false}
        scroll={{ x: 'max-content' }}
        summary={() => (
          <Table.Summary>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={4} align="right">
                <Typography.Text strong>Total</Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <Typography.Text strong>{formatRupiah(inv.total_amount)}</Typography.Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={4} align="right">
                <Typography.Text type="secondary">Terbayar</Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <Typography.Text type="secondary">{formatRupiah(inv.paid_amount)}</Typography.Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={4} align="right">
                <Typography.Text strong>Sisa</Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <Typography.Text strong type={inv.outstanding > 0 ? 'danger' : undefined}>
                  {formatRupiah(inv.outstanding)}
                </Typography.Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
        style={{ marginBottom: 16 }}
      />

      <Typography.Title level={5} style={{ marginBottom: 8 }}>
        Riwayat Pembayaran
      </Typography.Title>
      {inv.allocations && inv.allocations.length > 0 ? (
        <Table
          rowKey="id"
          columns={allocationColumns}
          dataSource={inv.allocations}
          size="small"
          pagination={false}
          scroll={{ x: 'max-content' }}
          style={{ marginBottom: 16 }}
        />
      ) : (
        <Typography.Text type="secondary">Belum ada pembayaran</Typography.Text>
      )}

      {inv.status !== 'void' && canManage && (
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Button danger onClick={() => setVoidOpen(true)}>
            Batalkan Tagihan
          </Button>
        </div>
      )}

      <VoidInvoiceModal
        open={voidOpen}
        invoice={inv}
        onClose={() => setVoidOpen(false)}
        onSuccess={handleVoidSuccess}
      />
    </>
  )

  return (
    <Drawer
      title={
        invoice ? (
          <Space>
            <span>{invoice.number}</span>
            <Tag color={INVOICE_STATUS_COLORS[invoice.status]}>
              {INVOICE_STATUS_LABELS[invoice.status]}
            </Tag>
          </Space>
        ) : (
          'Detail Tagihan'
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
          message="Gagal memuat detail tagihan"
          type="error"
          showIcon
          action={
            <Button size="small" onClick={() => void refetch()}>
              Coba lagi
            </Button>
          }
        />
      )}
      {invoice && renderContent(invoice)}
    </Drawer>
  )
}
