import {
  Alert,
  Button,
  DatePicker,
  Drawer,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { TableColumnsType } from 'antd'
import { CheckCircleOutlined, PrinterOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { getErrorMessage, getFieldErrors } from '../../api/errors'
import { listStudents } from '../../api/students'
import { formatDate, formatRupiah } from '../../lib/format'
import { applyFieldErrors } from '../../lib/formErrors'
import { PrintJob } from '../reportcards/components/PrintJob'
import { createPayment, getReceipt, listOpenInvoices } from './api'
import { INVOICE_KIND_LABELS, RECEIPT_PAGE } from './constants'
import type {
  Invoice,
  Payment,
  PaymentCreatePayload,
  PaymentMethod,
  Receipt,
} from './types'
import { ReceiptPrint } from './ReceiptPrint'

interface Props {
  open: boolean
  initialStudent?: { id: number; nis: string | null; name: string } | null
  initialInvoiceId?: number
  onClose: () => void
  onSuccess: () => void
}

interface StudentOption {
  value: number
  label: string
}

function debounce<Args extends unknown[]>(fn: (...args: Args) => void, delay: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  return (...args: Args) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

type ModeType = 'allocations' | 'amount'

interface InnerFormProps {
  initialStudent?: { id: number; nis: string | null; name: string } | null
  initialInvoiceId?: number
  onClose: () => void
  onSaved: (payment: Payment) => void
}

function PaymentCreateForm({
  initialStudent,
  initialInvoiceId,
  onClose,
  onSaved,
}: InnerFormProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Student selection state
  const initialStudentOptions: StudentOption[] = initialStudent
    ? [
        {
          value: initialStudent.id,
          label: `${initialStudent.name}${initialStudent.nis ? ` (NIS: ${initialStudent.nis})` : ''}`,
        },
      ]
    : []

  const [studentOptions, setStudentOptions] = useState<StudentOption[]>(initialStudentOptions)
  const [searchingStudents, setSearchingStudents] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<number | undefined>(
    initialStudent?.id,
  )

  // Mode: allocations (pilih tagihan) vs amount (nominal saja)
  const [mode, setMode] = useState<ModeType>('allocations')

  // Mode allocations state
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<number[]>(
    initialInvoiceId ? [initialInvoiceId] : [],
  )
  const [rowAmounts, setRowAmounts] = useState<Record<number, number>>({})
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({})

  // Mode amount state
  const [amountValue, setAmountValue] = useState<number | null>(null)

  // Method watch
  const method = Form.useWatch('method', form) ?? 'cash'

  // Debounced search students
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

  // Fetch open invoices
  const {
    data: openInvoices = [],
    isLoading: loadingInvoices,
    error: openInvoicesError,
  } = useQuery({
    queryKey: ['open-invoices', selectedStudentId],
    queryFn: () => listOpenInvoices(selectedStudentId!),
    enabled: Boolean(selectedStudentId),
  })

  // Total outstanding of all invoices
  const totalOutstanding = useMemo(
    () => openInvoices.reduce((sum, inv) => sum + inv.outstanding, 0),
    [openInvoices],
  )

  // Total payment in allocations mode
  const totalAllocationsAmount = useMemo(
    () =>
      selectedInvoiceIds.reduce((sum, id) => {
        const inv = openInvoices.find((i) => i.id === id)
        const val = rowAmounts[id] ?? inv?.outstanding ?? 0
        return sum + val
      }, 0),
    [selectedInvoiceIds, rowAmounts, openInvoices],
  )

  // Overpayment check in amount mode
  const isOverpayingInAmountMode =
    mode === 'amount' &&
    amountValue !== null &&
    amountValue > 0 &&
    amountValue > totalOutstanding

  // Client-side estimated allocations in amount mode
  const estimatedAllocations = useMemo(() => {
    if (mode !== 'amount' || !amountValue || amountValue <= 0) return []
    let rem = amountValue
    const result: { invoice: Invoice; amount: number }[] = []
    for (const inv of openInvoices) {
      if (rem <= 0) break
      const take = Math.min(inv.outstanding, rem)
      result.push({ invoice: inv, amount: take })
      rem -= take
    }
    return result
  }, [mode, amountValue, openInvoices])

  const handleStudentChange = (val: number) => {
    setSelectedStudentId(val)
    setSelectedInvoiceIds([])
    setRowAmounts({})
    setRowErrors({})
    setAmountValue(null)
    setErrorMsg(null)
  }

  const handleCheckboxChange = (invoice: Invoice, checked: boolean) => {
    setRowErrors((prev) => {
      const next = { ...prev }
      delete next[invoice.id]
      return next
    })

    if (checked) {
      setSelectedInvoiceIds((prev) => [...prev, invoice.id])
      setRowAmounts((prev) => ({
        ...prev,
        [invoice.id]: prev[invoice.id] ?? invoice.outstanding,
      }))
    } else {
      setSelectedInvoiceIds((prev) => prev.filter((id) => id !== invoice.id))
    }
  }

  const handleRowAmountChange = (invoiceId: number, val: number | null) => {
    setRowErrors((prev) => {
      const next = { ...prev }
      delete next[invoiceId]
      return next
    })
    setRowAmounts((prev) => ({
      ...prev,
      [invoiceId]: val ?? 0,
    }))
  }

  const handleSubmit = async () => {
    setErrorMsg(null)
    setRowErrors({})

    let formValues: {
      student_id: number
      payment_date: dayjs.Dayjs
      method: PaymentMethod
      reference?: string
      notes?: string
    }

    try {
      formValues = await form.validateFields()
    } catch {
      return
    }

    if (!selectedStudentId) {
      setErrorMsg('Siswa wajib dipilih.')
      return
    }

    if (openInvoices.length === 0) {
      setErrorMsg('Siswa ini tidak memiliki tagihan terbuka.')
      return
    }

    const payload: PaymentCreatePayload = {
      student_id: selectedStudentId,
      payment_date: formValues.payment_date.format('YYYY-MM-DD'),
      method: formValues.method,
      reference: formValues.reference?.trim() || null,
      notes: formValues.notes?.trim() || null,
    }

    let orderedAllocations: { invoice_id: number; amount: number }[] = []

    if (mode === 'allocations') {
      if (selectedInvoiceIds.length === 0) {
        setErrorMsg('Pilih minimal satu tagihan untuk dibayar.')
        return
      }

      // Preserve the order of openInvoices for consistency
      orderedAllocations = openInvoices
        .filter((inv) => selectedInvoiceIds.includes(inv.id))
        .map((inv) => ({
          invoice_id: inv.id,
          amount: Math.round(rowAmounts[inv.id] ?? inv.outstanding),
        }))

      for (const a of orderedAllocations) {
        if (!a.amount || a.amount < 1) {
          setErrorMsg('Nominal bayar pada baris terpilih minimal Rp 1.')
          return
        }
      }

      payload.allocations = orderedAllocations
      // DO NOT send amount when allocations are present
    } else {
      if (!amountValue || amountValue < 1) {
        setErrorMsg('Nominal pembayaran minimal Rp 1.')
        return
      }
      if (amountValue > totalOutstanding) {
        setErrorMsg(
          `Nominal melebihi total tagihan (${formatRupiah(totalOutstanding)}). Kelebihan bayar tidak diterima.`,
        )
        return
      }
      payload.amount = Math.round(amountValue)
      // DO NOT send allocations in amount mode
    }

    setLoading(true)
    try {
      const payment = await createPayment(payload)
      onSaved(payment)
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.status === 422) {
        const fieldErrors = getFieldErrors(err)
        if (fieldErrors) {
          const newRowErrors: Record<number, string> = {}
          const standardFieldErrors: { name: (string | number)[]; errors: string[] }[] = []

          Object.entries(fieldErrors).forEach(([fieldKey, messages]) => {
            // Check allocations.N.amount or allocations.N.invoice_id
            const match = fieldKey.match(/^allocations\.(\d+)\.(amount|invoice_id)$/)
            if (match && mode === 'allocations') {
              const index = Number(match[1])
              const targetAllocation = orderedAllocations[index]
              if (targetAllocation) {
                newRowErrors[targetAllocation.invoice_id] = messages.join('; ')
              } else {
                standardFieldErrors.push({ name: [fieldKey], errors: messages })
              }
            } else if (fieldKey === 'amount' && mode === 'allocations') {
              // Amount conflict with allocations
              setErrorMsg(messages.join('; '))
            } else {
              standardFieldErrors.push({ name: [fieldKey], errors: messages })
            }
          })

          if (Object.keys(newRowErrors).length > 0) {
            setRowErrors(newRowErrors)
          }

          if (standardFieldErrors.length > 0) {
            form.setFields(standardFieldErrors)
          }

          if (Object.keys(newRowErrors).length === 0 && standardFieldErrors.length === 0) {
            setErrorMsg(getErrorMessage(err))
          }
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

  const columns: TableColumnsType<Invoice> = [
    {
      title: '',
      key: 'checkbox',
      width: 44,
      render: (_, record) => (
        <input
          type="checkbox"
          aria-label={`Pilih tagihan ${record.number}`}
          checked={selectedInvoiceIds.includes(record.id)}
          onChange={(e) => handleCheckboxChange(record, e.target.checked)}
          style={{ cursor: 'pointer', width: 16, height: 16 }}
        />
      ),
    },
    {
      title: 'Nomor',
      dataIndex: 'number',
      key: 'number',
      render: (num: string) => <Typography.Text strong>{num}</Typography.Text>,
    },
    {
      title: 'Jenis / Periode',
      key: 'kind',
      render: (_, record) => (
        <span>
          {INVOICE_KIND_LABELS[record.kind]}
          {record.period_month && ` · ${record.period_month}`}
        </span>
      ),
    },
    {
      title: 'Jatuh Tempo',
      key: 'due_date',
      render: (_, record) => {
        if (!record.due_date) return '-'
        return (
          <Space size={4}>
            <span style={{ color: record.is_overdue ? '#ff4d4f' : undefined }}>
              {formatDate(record.due_date)}
            </span>
            {record.is_overdue && <Tag color="red">Terlambat</Tag>}
          </Space>
        )
      },
    },
    {
      title: 'Sisa',
      key: 'outstanding',
      align: 'right',
      render: (_, record) => (
        <Typography.Text type={record.outstanding > 0 ? 'danger' : undefined}>
          {formatRupiah(record.outstanding)}
        </Typography.Text>
      ),
    },
    {
      title: 'Nominal Dibayar',
      key: 'pay_amount',
      width: 170,
      align: 'right',
      render: (_, record) => {
        const isSelected = selectedInvoiceIds.includes(record.id)
        const rowError = rowErrors[record.id]
        return (
          <div style={{ textAlign: 'right' }}>
            <InputNumber
              disabled={!isSelected}
              min={1}
              max={record.outstanding}
              precision={0}
              value={rowAmounts[record.id] ?? record.outstanding}
              onChange={(val) => handleRowAmountChange(record.id, val)}
              formatter={(v) => (v ? `Rp ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '')}
              parser={(v) => Number(v?.replace(/[^0-9]/g, '') || 0)}
              status={rowError ? 'error' : undefined}
              style={{ width: 140 }}
            />
            {rowError && (
              <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 4 }}>
                {rowError}
              </div>
            )}
          </div>
        )
      },
    },
  ]

  const noOpenInvoices =
    selectedStudentId && !loadingInvoices && openInvoices.length === 0
  const isSaveDisabled =
    loading ||
    Boolean(noOpenInvoices) ||
    !selectedStudentId ||
    isOverpayingInAmountMode ||
    (mode === 'allocations' && selectedInvoiceIds.length === 0) ||
    (mode === 'amount' && (!amountValue || amountValue <= 0))

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

      {openInvoicesError && (
        <Alert
          message="Gagal memuat tagihan terbuka siswa"
          description={getErrorMessage(openInvoicesError)}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          student_id: initialStudent?.id,
          payment_date: dayjs(),
          method: 'cash',
        }}
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
            onChange={handleStudentChange}
            loading={searchingStudents}
            options={studentOptions}
            allowClear
          />
        </Form.Item>

        {selectedStudentId && (
          <>
            {loadingInvoices && (
              <div style={{ margin: '16px 0', textAlign: 'center' }}>
                <Typography.Text type="secondary">Memuat tagihan siswa...</Typography.Text>
              </div>
            )}

            {noOpenInvoices && (
              <Alert
                message="Siswa ini tidak punya tagihan terbuka"
                description="Semua tagihan untuk siswa ini sudah lunas atau belum dibuat."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            {openInvoices.length > 0 && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                    Metode Alokasi Pembayaran
                  </Typography.Text>
                  <Segmented<ModeType>
                    value={mode}
                    onChange={(val) => {
                      setMode(val)
                      setErrorMsg(null)
                    }}
                    block
                    options={[
                      { value: 'allocations', label: 'Pilih tagihan' },
                      {
                        value: 'amount',
                        label: 'Nominal saja (otomatis ke tagihan terlama)',
                      },
                    ]}
                  />
                </div>

                {mode === 'allocations' ? (
                  <div style={{ marginBottom: 20 }}>
                    <Table
                      rowKey="id"
                      columns={columns}
                      dataSource={openInvoices}
                      size="small"
                      pagination={false}
                      scroll={{ x: 'max-content' }}
                      summary={() => (
                        <Table.Summary>
                          <Table.Summary.Row>
                            <Table.Summary.Cell index={0} colSpan={5} align="right">
                              <Typography.Text strong>Total Pembayaran</Typography.Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={1} align="right">
                              <Typography.Text strong style={{ fontSize: 15, color: '#0f766e' }}>
                                {formatRupiah(totalAllocationsAmount)}
                              </Typography.Text>
                            </Table.Summary.Cell>
                          </Table.Summary.Row>
                        </Table.Summary>
                      )}
                      style={{ marginBottom: 8 }}
                    />
                  </div>
                ) : (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ marginBottom: 12 }}>
                      <Typography.Text strong style={{ display: 'block', marginBottom: 4 }}>
                        Nominal Pembayaran
                      </Typography.Text>
                      <InputNumber
                        min={1}
                        max={totalOutstanding}
                        precision={0}
                        value={amountValue}
                        onChange={(val) => setAmountValue(val)}
                        placeholder="Masukkan nominal bayar..."
                        formatter={(v) => (v ? `Rp ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '')}
                        parser={(v) => Number(v?.replace(/[^0-9]/g, '') || 0)}
                        style={{ width: '100%' }}
                      />
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        Total tagihan terbuka: {formatRupiah(totalOutstanding)}
                      </Typography.Text>
                    </div>

                    {isOverpayingInAmountMode && (
                      <Alert
                        type="error"
                        showIcon
                        message={`Nominal melebihi total tagihan (${formatRupiah(totalOutstanding)}). Kelebihan bayar tidak diterima.`}
                        style={{ marginBottom: 12 }}
                      />
                    )}

                    {estimatedAllocations.length > 0 && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <Typography.Text strong style={{ fontSize: 13 }}>
                            Perkiraan Alokasi Tagihan
                          </Typography.Text>
                          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                            Perkiraan; server yang menentukan
                          </Typography.Text>
                        </div>
                        <Table
                          rowKey="id"
                          size="small"
                          pagination={false}
                          dataSource={estimatedAllocations}
                          columns={[
                            {
                              title: 'Nomor',
                              key: 'num',
                              render: (_, rec) => rec.invoice.number,
                            },
                            {
                              title: 'Sisa Tagihan',
                              key: 'out',
                              align: 'right',
                              render: (_, rec) => formatRupiah(rec.invoice.outstanding),
                            },
                            {
                              title: 'Alokasi',
                              key: 'alc',
                              align: 'right',
                              render: (_, rec) => (
                                <Typography.Text strong>{formatRupiah(rec.amount)}</Typography.Text>
                              ),
                            },
                          ]}
                        />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        <Form.Item
          name="payment_date"
          label="Tanggal Pembayaran"
          rules={[{ required: true, message: 'Tanggal pembayaran wajib diisi' }]}
        >
          <DatePicker
            format="DD/MM/YYYY"
            disabledDate={(curr) => curr && curr > dayjs().endOf('day')}
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item
          name="method"
          label="Metode Pembayaran"
          rules={[{ required: true, message: 'Metode pembayaran wajib dipilih' }]}
        >
          <Radio.Group>
            <Radio value="cash">Tunai</Radio>
            <Radio value="transfer">Transfer</Radio>
            <Radio value="other">Lainnya</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="reference"
          label="No. referensi / bukti transfer"
          rules={
            method === 'transfer'
              ? [{ required: true, message: 'Nomor referensi / bukti transfer wajib diisi' }]
              : []
          }
        >
          <Input placeholder="Contoh: No. transaksi / bukti transfer bank" maxLength={100} />
        </Form.Item>

        <Form.Item name="notes" label="Catatan">
          <Input.TextArea
            rows={3}
            maxLength={500}
            showCount
            placeholder="Catatan tambahan pembayaran (opsional)"
          />
        </Form.Item>

        <Flex justify="flex-end" gap={8} style={{ marginTop: 24 }}>
          <Button onClick={onClose} disabled={loading}>
            Batal
          </Button>
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={loading}
            disabled={isSaveDisabled}
          >
            Simpan Pembayaran
          </Button>
        </Flex>
      </Form>
    </>
  )
}

export function PaymentCreateDrawer({
  open,
  initialStudent,
  initialInvoiceId,
  onClose,
  onSuccess,
}: Props) {
  const [savedPayment, setSavedPayment] = useState<Payment | null>(null)
  const [printLoading, setPrintLoading] = useState(false)
  const [printingReceipt, setPrintingReceipt] = useState<Receipt | null>(null)

  const handleSaved = (payment: Payment) => {
    onClose()
    onSuccess()
    setSavedPayment(payment)
  }

  const handlePrintReceipt = async () => {
    if (!savedPayment) return
    setPrintLoading(true)
    try {
      const receipt = await getReceipt(savedPayment.id)
      setPrintingReceipt(receipt)
    } catch (err: unknown) {
      message.error(getErrorMessage(err, 'Gagal mengambil data kwitansi.'))
    } finally {
      setPrintLoading(false)
    }
  }

  return (
    <>
      <Drawer
        title="Catat Pembayaran"
        open={open}
        onClose={onClose}
        destroyOnClose
        width="min(680px, 100vw)"
      >
        <PaymentCreateForm
          initialStudent={initialStudent}
          initialInvoiceId={initialInvoiceId}
          onClose={onClose}
          onSaved={handleSaved}
        />
      </Drawer>

      {/* Modal Sukses Pembayaran */}
      <Modal
        open={savedPayment !== null}
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <span>Pembayaran tersimpan · {savedPayment?.receipt_number}</span>
          </Space>
        }
        footer={[
          <Button key="close" onClick={() => setSavedPayment(null)}>
            Tutup
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            loading={printLoading}
            onClick={handlePrintReceipt}
          >
            Cetak Kwitansi
          </Button>,
        ]}
        onCancel={() => setSavedPayment(null)}
        destroyOnClose
      >
        <p>
          Pembayaran untuk <strong>{savedPayment?.student?.name ?? '-'}</strong> sejumlah{' '}
          <strong>{formatRupiah(savedPayment?.amount ?? 0)}</strong> telah berhasil dicatat.
        </p>
        <p style={{ color: '#666', fontSize: 13 }}>
          Anda dapat langsung mencetak kwitansi pembayaran sekarang atau nanti melalui daftar
          pembayaran.
        </p>
      </Modal>

      {printingReceipt && (
        <PrintJob page={RECEIPT_PAGE} onDone={() => setPrintingReceipt(null)}>
          <ReceiptPrint receipt={printingReceipt} />
        </PrintJob>
      )}
    </>
  )
}
