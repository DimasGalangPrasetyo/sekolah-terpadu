import {
  Alert,
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Typography,
  message,
} from 'antd'
import type { FormInstance } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listStudents } from '../../api/students'
import { applyFieldErrors } from '../../lib/formErrors'
import { getErrorMessage, getFieldErrors } from '../../api/errors'
import { isAxiosError } from 'axios'
import { createInvoice, listFeeTypes } from './api'
import type { InvoiceCreatePayload } from './types'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

interface StudentOption {
  value: number
  label: string
}

interface FormValues {
  student_id: number
  due_date?: import('dayjs').Dayjs
  notes?: string
  items: {
    fee_type_id: number
    quantity?: number
    unit_price?: number
    description?: string
  }[]
}

function debounce<Args extends unknown[]>(fn: (...args: Args) => void, delay: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  return (...args: Args) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

function InvoiceCreateForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form] = Form.useForm<FormValues>()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([])
  const [searchingStudents, setSearchingStudents] = useState(false)

  // Active fee types that are NOT monthly
  const { data: allFeeTypes = [] } = useQuery({
    queryKey: ['fee-types', true],
    queryFn: () => listFeeTypes(true),
  })
  const feeTypes = allFeeTypes.filter((ft) => ft.category !== 'monthly')

  const fetchStudents = useMemo(
    () =>
      debounce(async (q: string) => {
        if (!q.trim()) return
        setSearchingStudents(true)
        try {
          const res = await listStudents({ q, page: 1, per_page: 20 })
          setStudentOptions(
            res.data.map((s) => ({
              value: s.id,
              label: `${s.name}${s.nis ? ` (NIS: ${s.nis})` : ''}`,
            })),
          )
        } finally {
          setSearchingStudents(false)
        }
      }, 400),
    [],
  )

  const handleSubmit = async (values: FormValues) => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const payload: InvoiceCreatePayload = {
        student_id: values.student_id,
        due_date: values.due_date?.format('YYYY-MM-DD'),
        notes: values.notes || undefined,
        items: values.items.map((item) => ({
          fee_type_id: item.fee_type_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          description: item.description || undefined,
        })),
      }
      await createInvoice(payload)
      message.success('Tagihan berhasil dibuat')
      onSuccess()
      onClose()
    } catch (err: unknown) {
      // Map per-row item errors like items.0.unit_price → items.0.unit_price
      if (isAxiosError(err) && err.response?.status === 422) {
        const fieldErrors = getFieldErrors(err)
        if (fieldErrors) {
          const mapped = Object.entries(fieldErrors).map(([name, errors]) => {
            // antd Form.List uses name as array path: items.0.unit_price → ['items', 0, 'unit_price']
            const parts = name.split('.')
            const namePath: (string | number)[] =
              parts[0] === 'items' && parts.length === 3
                ? ['items', Number(parts[1]), parts[2]]
                : [name]
            return { name: namePath, errors }
          })
          ;(form as FormInstance).setFields(mapped)
          return
        }
      }
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
        onFinish={handleSubmit}
        initialValues={{ items: [{}] }}
      >
        <Form.Item
          name="student_id"
          label="Siswa"
          rules={[{ required: true, message: 'Siswa wajib dipilih' }]}
        >
          <Select
            showSearch
            placeholder="Ketik nama atau NIS siswa..."
            filterOption={false}
            onSearch={fetchStudents}
            loading={searchingStudents}
            options={studentOptions}
            notFoundContent={searchingStudents ? 'Mencari...' : 'Siswa tidak ditemukan'}
          />
        </Form.Item>

        <Form.Item name="due_date" label="Jatuh Tempo (opsional)">
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Pilih tanggal" />
        </Form.Item>

        <Form.Item
          name="notes"
          label="Catatan (opsional)"
          rules={[{ max: 500, message: 'Catatan maksimal 500 karakter' }]}
        >
          <Input.TextArea rows={2} maxLength={500} showCount placeholder="Catatan tambahan" />
        </Form.Item>

        <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
          Item Tagihan
        </Typography.Text>

        <Form.List
          name="items"
          rules={[
            {
              validator: async (_, items) => {
                if (!items || items.length < 1) {
                  return Promise.reject(new Error('Minimal 1 item'))
                }
              },
            },
          ]}
        >
          {(fields, { add, remove }, { errors }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <div
                  key={key}
                  style={{
                    border: '1px solid #f0f0f0',
                    borderRadius: 6,
                    padding: 12,
                    marginBottom: 12,
                    background: '#fafafa',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Item {name + 1}
                    </Typography.Text>
                    {fields.length > 1 && (
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => remove(name)}
                        aria-label={`Hapus item ${name + 1}`}
                      />
                    )}
                  </div>

                  <Form.Item
                    {...restField}
                    name={[name, 'fee_type_id']}
                    label="Jenis Biaya"
                    rules={[{ required: true, message: 'Jenis biaya wajib dipilih' }]}
                    style={{ marginBottom: 8 }}
                  >
                    <Select
                      placeholder="Pilih jenis biaya..."
                      options={feeTypes.map((ft) => ({ value: ft.id, label: `${ft.name} (${ft.code})` }))}
                      showSearch
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                    />
                  </Form.Item>

                  <Space style={{ width: '100%' }} align="start">
                    <Form.Item
                      {...restField}
                      name={[name, 'quantity']}
                      label="Jumlah"
                      style={{ marginBottom: 8, flex: 1 }}
                    >
                      <InputNumber<number>
                        min={1}
                        precision={0}
                        style={{ width: '100%' }}
                        placeholder="1"
                      />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, 'unit_price']}
                      label="Nominal Satuan (opsional)"
                      style={{ marginBottom: 8, flex: 2 }}
                    >
                      <InputNumber<number>
                        min={1}
                        precision={0}
                        style={{ width: '100%' }}
                        prefix="Rp"
                        placeholder="Otomatis dari tarif"
                        formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                        parser={(v) => (v ? Number(v.replace(/\./g, '')) : ('' as unknown as number))}
                      />
                    </Form.Item>
                  </Space>

                  <Form.Item
                    {...restField}
                    name={[name, 'description']}
                    label="Deskripsi (opsional)"
                    style={{ marginBottom: 0 }}
                  >
                    <Input placeholder="Keterangan item" />
                  </Form.Item>
                </div>
              ))}

              <Form.ErrorList errors={errors} />

              {fields.length < 20 && (
                <Button
                  type="dashed"
                  onClick={() => add()}
                  block
                  icon={<PlusOutlined />}
                  style={{ marginBottom: 16 }}
                >
                  Tambah Item
                </Button>
              )}
            </>
          )}
        </Form.List>

        <div style={{ marginTop: 8, textAlign: 'right' }}>
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

export function InvoiceCreateDrawer({ open, onClose, onSuccess }: Props) {
  return (
    <Drawer
      title="Buat Tagihan Manual"
      open={open}
      onClose={onClose}
      destroyOnClose
      width="min(520px, 100vw)"
    >
      {open && <InvoiceCreateForm onClose={onClose} onSuccess={onSuccess} />}
    </Drawer>
  )
}
