import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Drawer, Form, Input, InputNumber, Radio, Select, Space } from 'antd'
import { getErrorMessage } from '../../api/errors'
import { listAcademicYears } from '../../api/master'
import { listStudents } from '../../api/students'
import { applyFieldErrors } from '../../lib/formErrors'
import { createStudentDiscount, listFeeTypes, updateStudentDiscount } from './api'
import type { StudentDiscount, StudentDiscountPayload } from './types'

function debounce<Args extends unknown[]>(fn: (...args: Args) => void, delay: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  return (...args: Args) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

interface Props {
  open: boolean
  discount: StudentDiscount | null
  defaultAcademicYearId?: number
  onClose: () => void
  onSuccess: () => void
}

interface StudentOption {
  value: number
  label: string
}

function DiscountForm({
  discount,
  defaultAcademicYearId,
  onClose,
  onSuccess,
}: {
  discount: StudentDiscount | null
  defaultAcademicYearId?: number
  onClose: () => void
  onSuccess: () => void
}) {
  const [form] = Form.useForm<StudentDiscountPayload>()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const isEdit = discount !== null
  const discountType = Form.useWatch('type', form) ?? discount?.type ?? 'percent'

  const initialStudentOptions: StudentOption[] = discount
    ? [
        {
          value: discount.student.id,
          label: `${discount.student.name}${discount.student.nis ? ` (NIS: ${discount.student.nis})` : ''}`,
        },
      ]
    : []

  const [studentOptions, setStudentOptions] = useState<StudentOption[]>(initialStudentOptions)
  const [searchingStudents, setSearchingStudents] = useState(false)

  const { data: feeTypes = [] } = useQuery({
    queryKey: ['fee-types', true],
    queryFn: () => listFeeTypes(true),
  })

  const { data: academicYears = [] } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => listAcademicYears(),
  })

  // Debounced student search
  const fetchStudents = useMemo(
    () =>
      debounce(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
          return
        }
        setSearchingStudents(true)
        try {
          const res = await listStudents({ q: searchQuery, page: 1, per_page: 20 })
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

  const handleSubmit = async (values: StudentDiscountPayload) => {
    setLoading(true)
    setErrorMsg(null)
    try {
      if (isEdit) {
        await updateStudentDiscount(discount.id, {
          fee_type_id: values.fee_type_id || null,
          type: values.type,
          value: values.value,
          reason: values.reason || null,
        })
      } else {
        await createStudentDiscount({
          student_id: values.student_id,
          fee_type_id: values.fee_type_id || null,
          academic_year_id: values.academic_year_id,
          type: values.type,
          value: values.value,
          reason: values.reason || null,
        })
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
          student_id: discount?.student.id,
          fee_type_id: discount?.fee_type ? discount.fee_type.id : null,
          academic_year_id: discount?.academic_year.id ?? defaultAcademicYearId,
          type: discount?.type ?? 'percent',
          value: discount?.value,
          reason: discount?.reason,
        }}
        onFinish={handleSubmit}
      >
        <Form.Item
          name="student_id"
          label="Siswa"
          rules={[{ required: true, message: 'Siswa wajib dipilih' }]}
        >
          <Select
            showSearch
            placeholder="Ketik nama atau NIS siswa..."
            disabled={isEdit}
            filterOption={false}
            onSearch={fetchStudents}
            loading={searchingStudents}
            options={studentOptions}
            notFoundContent={searchingStudents ? 'Mencari...' : 'Siswa tidak ditemukan'}
          />
        </Form.Item>

        <Form.Item
          name="fee_type_id"
          label="Jenis Biaya"
          tooltip="Pilih 'Semua Jenis Biaya' jika diskon berlaku umum untuk segala tagihan siswa ini di tahun ajaran bersangkutan."
        >
          <Select
            placeholder="Semua Jenis Biaya"
            allowClear
            options={[
              { value: null, label: 'Semua Jenis Biaya' },
              ...feeTypes.map((ft) => ({
                value: ft.id,
                label: `${ft.name} (${ft.code})`,
              })),
            ]}
          />
        </Form.Item>

        <Form.Item
          name="academic_year_id"
          label="Tahun Ajaran"
          rules={[{ required: true, message: 'Tahun ajaran wajib dipilih' }]}
        >
          <Select
            placeholder="Pilih tahun ajaran"
            disabled={isEdit}
            options={academicYears.map((ay) => ({
              value: ay.id,
              label: ay.name + (ay.is_active ? ' (Aktif)' : ''),
            }))}
          />
        </Form.Item>

        <Form.Item
          name="type"
          label="Tipe Potongan"
          rules={[{ required: true, message: 'Tipe potongan wajib dipilih' }]}
        >
          <Radio.Group>
            <Radio value="percent">Persentase (%)</Radio>
            <Radio value="fixed">Nominal Tetap (Rp)</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="value"
          label={discountType === 'percent' ? 'Besar Diskon (%)' : 'Besar Diskon (Rp)'}
          rules={[
            { required: true, message: 'Besar diskon wajib diisi' },
            {
              type: 'number',
              min: 1,
              max: discountType === 'percent' ? 100 : 9999999999,
              message:
                discountType === 'percent'
                  ? 'Diskon persen harus antara 1 sampai 100'
                  : 'Diskon nominal minimal Rp 1',
            },
          ]}
        >
          {discountType === 'percent' ? (
            <InputNumber<number>
              min={1}
              max={100}
              style={{ width: '100%' }}
              addonAfter="%"
              placeholder="Contoh: 25"
            />
          ) : (
            <InputNumber<number>
              min={1}
              max={9999999999}
              style={{ width: '100%' }}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
              parser={(value) => (value ? Number(value.replace(/\./g, '')) : 0)}
              prefix="Rp"
              placeholder="Contoh: 50.000"
            />
          )}
        </Form.Item>

        <Form.Item
          name="reason"
          label="Alasan Keringanan / Diskon"
          tooltip="Alasan ini bersifat privat dan tidak dicatat ke riwayat audit log."
        >
          <Input.TextArea
            rows={3}
            maxLength={500}
            showCount
            placeholder="Contoh: Beasiswa prestasi akademik / keringanan ekonomi"
          />
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

export function DiscountDrawer({
  open,
  discount,
  defaultAcademicYearId,
  onClose,
  onSuccess,
}: Props) {
  const isEdit = discount !== null

  return (
    <Drawer
      title={isEdit ? 'Ubah Diskon Siswa' : 'Tambah Diskon Siswa'}
      open={open}
      onClose={onClose}
      destroyOnClose
      width="min(480px, 100vw)"
    >
      {open && (
        <DiscountForm
          discount={discount}
          defaultAcademicYearId={defaultAcademicYearId}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      )}
    </Drawer>
  )
}
