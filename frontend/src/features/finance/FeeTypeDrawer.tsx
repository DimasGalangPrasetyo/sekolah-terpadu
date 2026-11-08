import { useState } from 'react'
import { Alert, Button, Drawer, Form, Input, Select, Space } from 'antd'
import { getErrorMessage } from '../../api/errors'
import { applyFieldErrors } from '../../lib/formErrors'
import { createFeeType, updateFeeType } from './api'
import { FEE_CATEGORY_LABELS } from './constants'
import type { FeeCategory, FeeType, FeeTypePayload } from './types'

interface Props {
  open: boolean
  feeType: FeeType | null
  onClose: () => void
  onSuccess: () => void
}

function FeeTypeForm({
  feeType,
  onClose,
  onSuccess,
}: {
  feeType: FeeType | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [form] = Form.useForm<FeeTypePayload>()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const isEdit = feeType !== null

  const handleSubmit = async (values: FeeTypePayload) => {
    setLoading(true)
    setErrorMsg(null)
    try {
      if (isEdit) {
        await updateFeeType(feeType.id, {
          name: values.name,
          category: values.category,
        })
      } else {
        await createFeeType(values)
      }
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const applied = applyFieldErrors(form, err)
      if (!applied) {
        setErrorMsg(getErrorMessage(err))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {errorMsg && (
        <Alert
          message={errorMsg}
          type="error"
          showIcon
          closable
          onClose={() => setErrorMsg(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          code: feeType?.code,
          name: feeType?.name,
          category: feeType?.category,
        }}
        onFinish={handleSubmit}
      >
        <Form.Item
          name="code"
          label="Kode Jenis Biaya"
          tooltip="Hanya huruf kapital, angka, dan garis bawah. Tidak dapat diubah setelah disimpan."
          rules={
            isEdit
              ? []
              : [
                  { required: true, message: 'Kode wajib diisi' },
                  {
                    pattern: /^[A-Z][A-Z0-9_]{1,29}$/,
                    message: 'Format harus diawali huruf kapital, 2-30 karakter (contoh: SPP_SMA)',
                  },
                ]
          }
        >
          <Input placeholder="Contoh: SPP_SMA" disabled={isEdit} style={{ textTransform: 'uppercase' }} />
        </Form.Item>

        <Form.Item
          name="name"
          label="Nama Jenis Biaya"
          rules={[{ required: true, message: 'Nama jenis biaya wajib diisi' }]}
        >
          <Input placeholder="Contoh: SPP Bulanan SMA" />
        </Form.Item>

        <Form.Item
          name="category"
          label="Kategori"
          rules={[{ required: true, message: 'Kategori wajib dipilih' }]}
        >
          <Select placeholder="Pilih kategori">
            {(Object.keys(FEE_CATEGORY_LABELS) as FeeCategory[]).map((cat) => (
              <Select.Option key={cat} value={cat}>
                {FEE_CATEGORY_LABELS[cat]}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <div style={{ marginTop: 24, textAlign: 'right' }}>
          <Space>
            <Button onClick={onClose} disabled={loading}>
              Batal
            </Button>
            <Button type="primary" onClick={() => form.submit()} loading={loading}>
              Simpan
            </Button>
          </Space>
        </div>
      </Form>
    </>
  )
}

export function FeeTypeDrawer({ open, feeType, onClose, onSuccess }: Props) {
  const isEdit = feeType !== null

  return (
    <Drawer
      title={isEdit ? 'Ubah Jenis Biaya' : 'Tambah Jenis Biaya'}
      open={open}
      onClose={onClose}
      destroyOnClose
      width="min(480px, 100vw)"
    >
      {open && <FeeTypeForm feeType={feeType} onClose={onClose} onSuccess={onSuccess} />}
    </Drawer>
  )
}
