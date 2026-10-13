import { ThunderboltOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, DatePicker, Drawer, Flex, Form, Input } from 'antd'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { useState } from 'react'
import { getErrorMessage, getFieldErrors } from '../../api/errors'
import { saveAcademicYear } from '../../api/master'
import { applyFieldErrors } from '../../lib/formErrors'
import type { AcademicYear } from '../../types/api'

const FMT = 'YYYY-MM-DD'

interface Values {
  name: string
  start_date: Dayjs
  end_date: Dayjs
  ganjil: [Dayjs, Dayjs]
  genap: [Dayjs, Dayjs]
}

function initialValues(year: AcademicYear | null): Partial<Values> {
  if (!year) return {}
  const ganjil = year.semesters.find((s) => s.name === 'ganjil')
  const genap = year.semesters.find((s) => s.name === 'genap')

  return {
    name: year.name,
    start_date: dayjs(year.start_date),
    end_date: dayjs(year.end_date),
    ganjil: ganjil ? [dayjs(ganjil.start_date), dayjs(ganjil.end_date)] : undefined,
    genap: genap ? [dayjs(genap.start_date), dayjs(genap.end_date)] : undefined,
  }
}

function YearForm({ year, onClose }: { year: AcademicYear | null; onClose: () => void }) {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<Values>()
  const [semesterError, setSemesterError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (values: Values) =>
      saveAcademicYear(
        {
          name: values.name.trim(),
          start_date: values.start_date.format(FMT),
          end_date: values.end_date.format(FMT),
          semesters: [
            { name: 'ganjil', start_date: values.ganjil[0].format(FMT), end_date: values.ganjil[1].format(FMT) },
            { name: 'genap', start_date: values.genap[0].format(FMT), end_date: values.genap[1].format(FMT) },
          ],
        },
        year?.id,
      ),
    onSuccess: () => {
      message.success(year ? 'Tahun ajaran diperbarui' : 'Tahun ajaran dibuat')
      void queryClient.invalidateQueries({ queryKey: ['academic-years'] })
      void queryClient.invalidateQueries({ queryKey: ['academic-context'] })
      onClose()
    },
    onError: (error) => {
      const fieldErrors = getFieldErrors(error)
      setSemesterError(fieldErrors?.semesters?.[0] ?? null)
      if (!applyFieldErrors(form, error)) message.error(getErrorMessage(error))
    },
  })

  const autoFill = () => {
    const start = form.getFieldValue('start_date') as Dayjs | undefined
    const end = form.getFieldValue('end_date') as Dayjs | undefined
    if (!start || !end) {
      message.info('Isi tanggal mulai dan akhir tahun ajaran dulu.')
      return
    }
    const ganjilEnd = start.add(23, 'week').subtract(1, 'day')
    form.setFieldsValue({ ganjil: [start, ganjilEnd], genap: [ganjilEnd.add(15, 'day'), end] })
  }

  return (
    <Form<Values>
      form={form}
      layout="vertical"
      requiredMark="optional"
      initialValues={initialValues(year)}
      onFinish={(values) => mutation.mutate(values)}
      onValuesChange={() => setSemesterError(null)}
    >
      <Form.Item
        name="name"
        label="Nama tahun ajaran"
        extra="Contoh: 2027/2028"
        rules={[
          { required: true, message: 'Nama wajib diisi' },
          { pattern: /^\d{4}\/\d{4}$/, message: 'Gunakan format 2027/2028' },
        ]}
      >
        <Input autoFocus autoComplete="off" inputMode="numeric" />
      </Form.Item>

      <Flex gap={12} wrap>
        <Form.Item name="start_date" label="Mulai" rules={[{ required: true, message: 'Wajib diisi' }]} style={{ flex: '1 1 180px' }}>
          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} inputReadOnly />
        </Form.Item>
        <Form.Item name="end_date" label="Berakhir" rules={[{ required: true, message: 'Wajib diisi' }]} style={{ flex: '1 1 180px' }}>
          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} inputReadOnly />
        </Form.Item>
      </Flex>

      <Flex justify="space-between" align="center" wrap gap={8} style={{ marginBottom: 8 }}>
        <strong>Semester</strong>
        <Button size="small" icon={<ThunderboltOutlined />} onClick={autoFill}>
          Isi otomatis
        </Button>
      </Flex>

      {semesterError && <Alert type="error" showIcon title={semesterError} style={{ marginBottom: 12 }} />}

      <Form.Item name="ganjil" label="Semester Ganjil" rules={[{ required: true, message: 'Wajib diisi' }]}>
        <DatePicker.RangePicker format="DD/MM/YYYY" style={{ width: '100%' }} inputReadOnly />
      </Form.Item>
      <Form.Item name="genap" label="Semester Genap" rules={[{ required: true, message: 'Wajib diisi' }]}>
        <DatePicker.RangePicker format="DD/MM/YYYY" style={{ width: '100%' }} inputReadOnly />
      </Form.Item>

      <Flex justify="end" gap={8} style={{ marginTop: 8 }}>
        <Button onClick={onClose}>Batal</Button>
        <Button type="primary" htmlType="submit" loading={mutation.isPending}>
          {year ? 'Simpan perubahan' : 'Buat tahun ajaran'}
        </Button>
      </Flex>
    </Form>
  )
}

export function AcademicYearDrawer({ open, year, onClose }: { open: boolean; year: AcademicYear | null; onClose: () => void }) {
  return (
    <Drawer open={open} onClose={onClose} title={year ? 'Ubah tahun ajaran' : 'Tambah tahun ajaran'} size="min(520px, 100vw)" destroyOnHidden>
      <YearForm key={year?.id ?? 'new'} year={year} onClose={onClose} />
    </Drawer>
  )
}
