import { useState } from 'react'
import { Alert, Button, Drawer, Form, Input, Segmented, Space, message } from 'antd'
import { getErrorMessage } from '../../api/errors'
import { applyFieldErrors } from '../../lib/formErrors'
import { createCashCategory, updateCashCategory } from './api'
import type { CashCategory, CashCategoryPayload, CashType } from './types'

interface Props {
  open: boolean
  category: CashCategory | null
  onClose: () => void
  onSuccess: () => void
}

function CashCategoryForm({
  category,
  onClose,
  onSuccess,
}: {
  category: CashCategory | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [form] = Form.useForm<CashCategoryPayload>()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const isEdit = category !== null

  const handleSubmit = async (values: CashCategoryPayload) => {
    setLoading(true)
    setErrorMsg(null)
    try {
      if (isEdit) {
        await updateCashCategory(category.id, {
          name: values.name.trim(),
        })
        message.success('Kategori kas berhasil diperbarui')
      } else {
        await createCashCategory({
          name: values.name.trim(),
          type: values.type,
        })
        message.success('Kategori kas berhasil ditambahkan')
      }
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const applied = applyFieldErrors(form, err)
      if (!applied) {
        setErrorMsg(getErrorMessage(err, 'Gagal menyimpan kategori kas.'))
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
          name: category?.name,
          type: category?.type ?? 'income',
        }}
        onFinish={handleSubmit}
      >
        <Form.Item
          name="type"
          label="Jenis Kategori Kas"
          tooltip={isEdit ? 'Jenis kategori tidak dapat diubah setelah dibuat.' : undefined}
          rules={[{ required: true, message: 'Jenis kategori kas wajib dipilih' }]}
        >
          <Segmented<CashType>
            block
            disabled={isEdit}
            options={[
              { label: 'Kas Masuk (Pemasukan)', value: 'income' },
              { label: 'Kas Keluar (Pengeluaran)', value: 'expense' },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="name"
          label="Nama Kategori Kas"
          rules={[
            { required: true, message: 'Nama kategori kas wajib diisi' },
            { max: 100, message: 'Nama kategori maksimal 100 karakter' },
          ]}
        >
          <Input placeholder="Contoh: Donasi Alumni / Pembelian ATK" maxLength={100} />
        </Form.Item>

        <div style={{ marginTop: 24, textAlign: 'right' }}>
          <Space>
            <Button onClick={onClose} disabled={loading}>
              Batal
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Simpan
            </Button>
          </Space>
        </div>
      </Form>
    </>
  )
}

export function CashCategoryDrawer({ open, category, onClose, onSuccess }: Props) {
  const isEdit = category !== null

  return (
    <Drawer
      title={isEdit ? 'Ubah Kategori Kas' : 'Tambah Kategori Kas'}
      open={open}
      onClose={onClose}
      destroyOnClose
      width="min(440px, 100vw)"
    >
      {open && (
        <CashCategoryForm
          category={category}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      )}
    </Drawer>
  )
}
