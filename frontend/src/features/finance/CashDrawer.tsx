import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Segmented,
  Select,
  Space,
  message,
} from 'antd'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { useState } from 'react'
import { getErrorMessage } from '../../api/errors'
import { listUnits } from '../../api/master'
import { applyFieldErrors } from '../../lib/formErrors'
import { createCashTransaction, listCashCategories } from './api'
import type { CashType } from './types'

interface FormValues {
  transaction_date: Dayjs
  type: CashType
  cash_category_id: number
  unit_id: number | null
  amount: number
  description: string
}

interface Props {
  open: boolean
  initialType?: CashType
  onClose: () => void
  onSuccess: () => void
}

function CashForm({
  initialType,
  onClose,
  onSuccess,
}: {
  initialType: CashType
  onClose: () => void
  onSuccess: () => void
}) {
  const [form] = Form.useForm<FormValues>()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const selectedType = Form.useWatch('type', form) ?? initialType

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => listUnits(),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['cash-categories', selectedType, true],
    queryFn: () => listCashCategories({ type: selectedType, is_active: true }),
  })

  const handleTypeChange = (newType: CashType) => {
    form.setFieldsValue({
      type: newType,
      cash_category_id: undefined,
    })
  }

  const handleSubmit = async () => {
    let values: FormValues
    try {
      values = await form.validateFields()
    } catch {
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      await createCashTransaction({
        transaction_date: values.transaction_date.format('YYYY-MM-DD'),
        cash_category_id: values.cash_category_id,
        unit_id: values.unit_id ?? null,
        amount: values.amount,
        description: values.description.trim(),
      })

      message.success('Transaksi kas berhasil dicatat')
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const handled = applyFieldErrors(form, err)
      if (!handled) {
        setErrorMsg(getErrorMessage(err, 'Gagal mencatat transaksi kas.'))
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
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          transaction_date: dayjs(),
          type: initialType,
          unit_id: null,
        }}
      >
        <Form.Item label="Jenis Transaksi" name="type" required>
          <Segmented<CashType>
            block
            value={selectedType}
            onChange={(val) => handleTypeChange(val)}
            options={[
              { label: 'Kas Masuk (Pemasukan)', value: 'income' },
              { label: 'Kas Keluar (Pengeluaran)', value: 'expense' },
            ]}
          />
        </Form.Item>

        <Form.Item
          label="Tanggal Transaksi"
          name="transaction_date"
          rules={[{ required: true, message: 'Tanggal transaksi wajib diisi' }]}
        >
          <DatePicker
            format="DD/MM/YYYY"
            style={{ width: '100%' }}
            disabledDate={(current) => current && current > dayjs().endOf('day')}
          />
        </Form.Item>

        <Form.Item
          label="Kategori Kas"
          name="cash_category_id"
          rules={[{ required: true, message: 'Kategori kas wajib dipilih' }]}
        >
          <Select
            placeholder="Pilih kategori kas"
            showSearch
            optionFilterProp="label"
            options={categories.map((c) => ({
              label: c.name,
              value: c.id,
            }))}
          />
        </Form.Item>

        <Form.Item label="Unit" name="unit_id">
          <Select
            placeholder="Pilih unit"
            options={[
              { label: 'Umum (Tanpa Unit)', value: null },
              ...units.map((u) => ({
                label: `${u.code} - ${u.name}`,
                value: u.id,
              })),
            ]}
          />
        </Form.Item>

        <Form.Item
          label="Nominal (Rp)"
          name="amount"
          rules={[
            { required: true, message: 'Nominal wajib diisi' },
            {
              type: 'number',
              min: 1,
              message: 'Nominal minimal Rp 1',
            },
            {
              type: 'number',
              max: 9999999999,
              message: 'Nominal melebihi batas maksimal',
            },
          ]}
        >
          <InputNumber<number>
            style={{ width: '100%' }}
            prefix="Rp"
            min={1}
            max={9999999999}
            step={1000}
            formatter={(value) =>
              value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''
            }
            parser={(value) =>
              Number(value ? value.replace(/\./g, '') : 0)
            }
          />
        </Form.Item>

        <Form.Item
          label="Keterangan"
          name="description"
          rules={[
            { required: true, message: 'Keterangan transaksi wajib diisi' },
            { max: 255, message: 'Keterangan maksimal 255 karakter' },
          ]}
        >
          <Input.TextArea
            rows={3}
            maxLength={255}
            showCount
            placeholder="Contoh: Donasi sukarela hamba Allah / Pembelian ATK dan kertas"
          />
        </Form.Item>

        <div style={{ marginTop: 24, textAlign: 'right' }}>
          <Space>
            <Button onClick={onClose} disabled={loading}>
              Batal
            </Button>
            <Button type="primary" onClick={handleSubmit} loading={loading}>
              Simpan
            </Button>
          </Space>
        </div>
      </Form>
    </>
  )
}

export function CashDrawer({ open, initialType = 'income', onClose, onSuccess }: Props) {
  const title = initialType === 'income' ? 'Catat Kas Masuk' : 'Catat Kas Keluar'

  return (
    <Drawer
      title={title}
      open={open}
      onClose={onClose}
      destroyOnClose
      width="min(480px, 100vw)"
    >
      {open && (
        <CashForm
          initialType={initialType}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      )}
    </Drawer>
  )
}
