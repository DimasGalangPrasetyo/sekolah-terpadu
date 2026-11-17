import { ExclamationCircleOutlined } from '@ant-design/icons'
import { Alert, Form, Input, Modal, message } from 'antd'
import { useState } from 'react'
import { getErrorMessage } from '../../api/errors'
import { voidPayment } from './api'
import type { Payment } from './types'

interface Props {
  open: boolean
  payment: Payment | null
  onClose: () => void
  onSuccess: () => void
}

export function VoidPaymentModal({ open, payment, onClose, onSuccess }: Props) {
  const [form] = Form.useForm<{ reason: string }>()
  const [loading, setLoading] = useState(false)
  const [conflictMsg, setConflictMsg] = useState<string | null>(null)

  const handleClose = () => {
    form.resetFields()
    setConflictMsg(null)
    onClose()
  }

  const handleOk = async () => {
    if (!payment) return
    let values: { reason: string }
    try {
      values = await form.validateFields()
    } catch {
      return
    }

    setLoading(true)
    setConflictMsg(null)
    try {
      await voidPayment(payment.id, values.reason)
      message.success('Pembayaran berhasil dibatalkan')
      onSuccess()
      handleClose()
    } catch (err: unknown) {
      setConflictMsg(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      title={
        <span>
          <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
          Batalkan Pembayaran
        </span>
      }
      okText="Batalkan Pembayaran"
      cancelText="Tutup"
      okButtonProps={{ danger: true, loading }}
      cancelButtonProps={{ disabled: loading }}
      onOk={handleOk}
      onCancel={handleClose}
      destroyOnClose
    >
      <p style={{ marginBottom: 12 }}>
        Pembatalan pembayaran <strong>{payment?.receipt_number}</strong> tidak dapat diurungkan. Nominal
        pembayaran akan dikembalikan ke tagihan terkait.
      </p>

      {conflictMsg && (
        <Alert
          message={conflictMsg}
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
        />
      )}

      <Form form={form} layout="vertical">
        <Form.Item
          name="reason"
          label="Alasan Pembatalan"
          rules={[
            { required: true, message: 'Alasan wajib diisi' },
            { min: 5, message: 'Alasan minimal 5 karakter' },
            { max: 255, message: 'Alasan maksimal 255 karakter' },
          ]}
        >
          <Input.TextArea
            rows={3}
            maxLength={255}
            showCount
            placeholder="Contoh: Kesalahan input nominal / bukti transfer tidak valid"
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
