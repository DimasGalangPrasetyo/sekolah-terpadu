import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd'
import { useState } from 'react'
import { formatDate, formatDateTime, formatRupiah } from '../../lib/format'
import { can } from '../../lib/permissions'
import { useMe } from '../auth/useMe'
import { getCashTransaction } from './api'
import {
  CASH_STATUS_COLORS,
  CASH_STATUS_LABELS,
  CASH_TYPE_COLORS,
  CASH_TYPE_LABELS,
} from './constants'
import type { CashTransaction } from './types'
import { VoidCashModal } from './VoidCashModal'

interface Props {
  open: boolean
  transactionId: number | null
  onClose: () => void
  onVoidSuccess: () => void
}

export function CashDetailDrawer({
  open,
  transactionId,
  onClose,
  onVoidSuccess,
}: Props) {
  const { data: me } = useMe()
  const canManage = can(me, 'finance.manage')
  const [voidOpen, setVoidOpen] = useState(false)

  const {
    data: transaction,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['cash-transaction', transactionId],
    queryFn: () => getCashTransaction(transactionId!),
    enabled: open && transactionId !== null,
  })

  const handleVoidSuccess = () => {
    void refetch()
    onVoidSuccess()
  }

  const renderContent = (tx: CashTransaction) => (
    <>
      {tx.status === 'void' && (
        <Alert
          type="error"
          showIcon
          message="Transaksi Kas Dibatalkan"
          style={{ marginBottom: 16 }}
          description={
            <div style={{ marginTop: 4 }}>
              <div>
                <strong>Alasan:</strong> {tx.void_reason ?? '-'}
              </div>
              {tx.voided_at && (
                <div>
                  <strong>Waktu Pembatalan:</strong> {formatDateTime(tx.voided_at)}
                </div>
              )}
              {tx.voided_by?.name && (
                <div>
                  <strong>Dibatalkan Oleh:</strong> {tx.voided_by.name}
                </div>
              )}
            </div>
          }
        />
      )}

      <Alert
        type="info"
        showIcon
        message="Transaksi tidak dapat diubah. Jika salah input, batalkan lalu catat ulang."
        style={{ marginBottom: 16 }}
      />

      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="Nomor Transaksi">
          <Typography.Text strong copyable>
            {tx.number}
          </Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="Tanggal">
          {formatDate(tx.transaction_date)}
        </Descriptions.Item>
        <Descriptions.Item label="Jenis">
          <Tag color={CASH_TYPE_COLORS[tx.type]}>
            {CASH_TYPE_LABELS[tx.type]}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Kategori">
          {tx.category?.name ?? '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Unit">
          {tx.unit ? (
            <Tag color="cyan">
              {tx.unit.code} - {tx.unit.name}
            </Tag>
          ) : (
            <span style={{ color: '#8c8c8c' }}>Umum (Tanpa Unit)</span>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Nominal">
          <Typography.Text
            strong
            style={{
              fontSize: 16,
              color: tx.type === 'income' ? '#389e0d' : '#cf1322',
            }}
          >
            {formatRupiah(tx.amount)}
          </Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="Keterangan">
          <span style={{ whiteSpace: 'pre-wrap' }}>{tx.description}</span>
        </Descriptions.Item>
        <Descriptions.Item label="Status">
          <Tag color={CASH_STATUS_COLORS[tx.status]}>
            {CASH_STATUS_LABELS[tx.status]}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Dicatat Oleh">
          {tx.created_by?.name ?? '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Waktu Dicatat">
          {formatDateTime(tx.created_at)}
        </Descriptions.Item>
      </Descriptions>
    </>
  )

  return (
    <>
      <Drawer
        title="Rincian Transaksi Kas"
        open={open}
        onClose={onClose}
        width="min(520px, 100vw)"
        footer={
          <Space style={{ float: 'right' }}>
            <Button onClick={onClose}>Tutup</Button>
            {canManage && transaction?.status === 'valid' && (
              <Button danger onClick={() => setVoidOpen(true)}>
                Batalkan Transaksi
              </Button>
            )}
          </Space>
        }
      >
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin tip="Memuat rincian transaksi..." />
          </div>
        )}

        {!isLoading && transaction && renderContent(transaction)}
      </Drawer>

      <VoidCashModal
        open={voidOpen}
        transaction={transaction ?? null}
        onClose={() => setVoidOpen(false)}
        onSuccess={handleVoidSuccess}
      />
    </>
  )
}
