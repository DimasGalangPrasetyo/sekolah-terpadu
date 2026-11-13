import { ExclamationCircleOutlined } from '@ant-design/icons'
import { Alert, Form, Input, Modal } from 'antd'
import { useState } from 'react'
import { getErrorMessage, getStatus } from '../../api/errors'
import { voidInvoice } from './api'
import type { Invoice } from './types'

interface Props {
  open: boolean
  invoice: Invoice | null
  onClose: () => void
  onSuccess: () => void
}

export function VoidInvoiceModal({ open, invoice, onClose, onSuccess }: Props) {
  const [form] = Form.useForm<{ reason: string }>()
  const [loading, setLoading] = useState(false)
  const [conflictMsg, setConflictMsg] = useState<string | null>(null)

  const handleClose = () => {
    form.resetFields()
    setConflictMsg(null)
    onClose()
  }

  const handleOk = async () => {
    if (!invoice) return
    let values: { reason: string }
    try {
      values = await form.validateFields()
    } catch {
      return
    }

    setLoading(true)
    setConflictMsg(null)
    try {
      await voidInvoice(invoice.id, values.reason)
      onSuccess()
      handleClose()
    } catch (err: unknown) {
      if (getStatus(err) === 409) {
        setConflictMsg(getErrorMessage(err))
      } else {
        setConflictMsg(getErrorMessage(err))
      }
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
          Batalkan Tagihan
        </span>
      }
      okText="Batalkan Tagihan"
      cancelText="Tutup"
      okButtonProps={{ danger: true, loading }}
      cancelButtonProps={{ disabled: loading }}
      onOk={handleOk}
      onCancel={handleClose}
      destroyOnClose
    >
      <p style={{ marginBottom: 12 }}>
        Pembatalan tagihan <strong>{invoice?.number}</strong> tidak dapat diurungkan. Tagihan yang
        dibatalkan tidak dapat lagi menerima pembayaran.
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
            placeholder="Contoh: Tagihan dobel / data salah / permintaan wali siswa"
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
