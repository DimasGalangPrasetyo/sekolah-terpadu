import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Card, Checkbox, DatePicker, Flex, Form, Input, Radio, Select, Skeleton } from 'antd'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { useNavigate, useParams } from 'react-router-dom'
import { getErrorMessage } from '../../api/errors'
import { listClassrooms } from '../../api/master'
import { getStudent, saveStudent, type StudentPayload } from '../../api/students'
import { PageHeader } from '../../components/PageHeader'
import { GUARDIAN_LABELS, RELIGIONS } from '../../lib/constants'
import { applyFieldErrors } from '../../lib/formErrors'
import type { Guardian, Student } from '../../types/api'

const FMT = 'YYYY-MM-DD'

interface GuardianValues {
  id?: number
  relation: Guardian['relation']
  name: string
  occupation?: string
  phone?: string
  address?: string
  is_primary_contact?: boolean
}

interface Values {
  name: string
  gender: 'L' | 'P'
  nis?: string
  nisn?: string
  birth_place?: string
  birth_date?: Dayjs
  religion?: string
  address?: string
  phone?: string
  previous_school?: string
  entry_date?: Dayjs
  notes?: string
  classroom_id?: number
  guardians: GuardianValues[]
}

const blank = (value?: string) => (value && value.trim() !== '' ? value.trim() : null)

function toInitial(student: Student | undefined): Partial<Values> {
  if (!student) return { gender: 'L', guardians: [{ relation: 'father', name: '', is_primary_contact: true }] }

  return {
    name: student.name,
    gender: student.gender,
    nis: student.nis ?? undefined,
    nisn: student.nisn ?? undefined,
    birth_place: student.birth_place ?? undefined,
    birth_date: student.birth_date ? dayjs(student.birth_date) : undefined,
    religion: student.religion ?? undefined,
    address: student.address ?? undefined,
    phone: student.phone ?? undefined,
    previous_school: student.previous_school ?? undefined,
    entry_date: student.entry_date ? dayjs(student.entry_date) : undefined,
    notes: student.notes ?? undefined,
    guardians: (student.guardians ?? []).map((g) => ({
      id: g.id,
      relation: g.relation,
      name: g.name,
      occupation: g.occupation ?? undefined,
      phone: g.phone ?? undefined,
      address: g.address ?? undefined,
      is_primary_contact: g.is_primary_contact,
    })),
  }
}

function StudentForm({ student }: { student?: Student }) {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<Values>()
  const isEdit = student !== undefined

  const classrooms = useQuery({ queryKey: ['classrooms', { scope: 'student-form' }], queryFn: () => listClassrooms(), enabled: !isEdit })

  const mutation = useMutation({
    mutationFn: (values: Values) => {
      const payload: StudentPayload = {
        name: values.name.trim(),
        gender: values.gender,
        nis: blank(values.nis),
        nisn: blank(values.nisn),
        birth_place: blank(values.birth_place),
        birth_date: values.birth_date ? values.birth_date.format(FMT) : null,
        religion: values.religion ?? null,
        address: blank(values.address),
        phone: blank(values.phone),
        previous_school: blank(values.previous_school),
        entry_date: values.entry_date ? values.entry_date.format(FMT) : null,
        notes: blank(values.notes),
        guardians: (values.guardians ?? []).map((g) => ({
          id: g.id,
          relation: g.relation,
          name: g.name.trim(),
          occupation: blank(g.occupation),
          phone: blank(g.phone),
          address: blank(g.address),
          is_primary_contact: Boolean(g.is_primary_contact),
        })),
        ...(isEdit ? {} : { classroom_id: values.classroom_id ?? null }),
      }
      return saveStudent(payload, student?.id)
    },
    onSuccess: (saved) => {
      message.success(isEdit ? 'Data siswa disimpan' : 'Siswa ditambahkan')
      void queryClient.invalidateQueries({ queryKey: ['students'] })
      void queryClient.invalidateQueries({ queryKey: ['student', saved.id] })
      void queryClient.invalidateQueries({ queryKey: ['classrooms'] })
      navigate(`/siswa/${saved.id}`)
    },
    onError: (error) => {
      if (!applyFieldErrors(form, error)) message.error(getErrorMessage(error))
    },
  })

  const setPrimary = (index: number, checked: boolean) => {
    const guardians = (form.getFieldValue('guardians') ?? []) as GuardianValues[]
    form.setFieldValue(
      'guardians',
      guardians.map((g, i) => ({ ...g, is_primary_contact: checked ? i === index : i === index ? false : g.is_primary_contact })),
    )
  }

  return (
    <Form<Values>
      form={form}
      layout="vertical"
      requiredMark="optional"
      initialValues={toInitial(student)}
      onFinish={(values) => mutation.mutate(values)}
      scrollToFirstError
    >
      <Card title="Data siswa" style={{ marginBottom: 16 }}>
        <Flex gap={16} wrap>
          <Form.Item name="name" label="Nama lengkap" rules={[{ required: true, message: 'Nama wajib diisi' }]} style={{ flex: '2 1 280px' }}>
            <Input autoFocus autoComplete="off" />
          </Form.Item>
          <Form.Item name="gender" label="Jenis kelamin" rules={[{ required: true, message: 'Pilih jenis kelamin' }]} style={{ flex: '1 1 200px' }}>
            <Radio.Group optionType="button" buttonStyle="solid" options={[{ value: 'L', label: 'Laki-laki' }, { value: 'P', label: 'Perempuan' }]} />
          </Form.Item>
        </Flex>

        <Flex gap={16} wrap>
          <Form.Item name="nis" label="NIS" style={{ flex: '1 1 200px' }}>
            <Input autoComplete="off" inputMode="numeric" />
          </Form.Item>
          <Form.Item name="nisn" label="NISN" style={{ flex: '1 1 200px' }}>
            <Input autoComplete="off" inputMode="numeric" />
          </Form.Item>
          <Form.Item name="religion" label="Agama" style={{ flex: '1 1 200px' }}>
            <Select allowClear placeholder="Pilih agama" options={RELIGIONS.map((r) => ({ value: r, label: r }))} />
          </Form.Item>
        </Flex>

        <Flex gap={16} wrap>
          <Form.Item name="birth_place" label="Tempat lahir" style={{ flex: '1 1 200px' }}>
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item name="birth_date" label="Tanggal lahir" style={{ flex: '1 1 200px' }}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} disabledDate={(d) => d.isAfter(dayjs())} />
          </Form.Item>
          <Form.Item name="entry_date" label="Tanggal masuk" style={{ flex: '1 1 200px' }}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
        </Flex>

        <Form.Item name="address" label="Alamat">
          <Input.TextArea rows={2} maxLength={500} />
        </Form.Item>

        <Flex gap={16} wrap>
          <Form.Item name="phone" label="Telepon siswa/rumah" style={{ flex: '1 1 200px' }}>
            <Input autoComplete="off" inputMode="tel" />
          </Form.Item>
          <Form.Item name="previous_school" label="Asal sekolah" style={{ flex: '2 1 280px' }}>
            <Input autoComplete="off" />
          </Form.Item>
        </Flex>

        <Form.Item name="notes" label="Catatan" style={{ marginBottom: 0 }}>
          <Input.TextArea rows={2} maxLength={1000} />
        </Form.Item>
      </Card>

      <Card title="Orang tua / wali" style={{ marginBottom: 16 }}>
        <Form.List name="guardians">
          {(fields, { add, remove }) => (
            <Flex vertical gap={12}>
              {fields.map((field, index) => (
                <Card key={field.key} size="small" type="inner" title={`Wali ${index + 1}`} extra={
                  <Button type="text" danger icon={<DeleteOutlined />} aria-label={`Hapus wali ${index + 1}`} onClick={() => remove(field.name)} />
                }>
                  <Form.Item name={[field.name, 'id']} hidden>
                    <Input />
                  </Form.Item>
                  <Flex gap={16} wrap>
                    <Form.Item name={[field.name, 'relation']} label="Hubungan" rules={[{ required: true, message: 'Pilih hubungan' }]} style={{ flex: '1 1 140px' }}>
                      <Select options={Object.entries(GUARDIAN_LABELS).map(([value, label]) => ({ value, label }))} />
                    </Form.Item>
                    <Form.Item name={[field.name, 'name']} label="Nama" rules={[{ required: true, message: 'Nama wali wajib diisi' }]} style={{ flex: '2 1 240px' }}>
                      <Input autoComplete="off" />
                    </Form.Item>
                  </Flex>
                  <Flex gap={16} wrap>
                    <Form.Item name={[field.name, 'occupation']} label="Pekerjaan" style={{ flex: '1 1 200px' }}>
                      <Input autoComplete="off" />
                    </Form.Item>
                    <Form.Item name={[field.name, 'phone']} label="Telepon" style={{ flex: '1 1 200px' }}>
                      <Input autoComplete="off" inputMode="tel" />
                    </Form.Item>
                  </Flex>
                  <Form.Item name={[field.name, 'is_primary_contact']} valuePropName="checked" style={{ marginBottom: 0 }}>
                    <Checkbox onChange={(e) => setPrimary(index, e.target.checked)}>Kontak utama</Checkbox>
                  </Form.Item>
                </Card>
              ))}
              {fields.length < 4 && (
                <Button icon={<PlusOutlined />} onClick={() => add({ relation: 'mother', name: '' })} style={{ alignSelf: 'flex-start' }}>
                  Tambah wali
                </Button>
              )}
            </Flex>
          )}
        </Form.List>
      </Card>

      {!isEdit && (
        <Card title="Penempatan kelas" style={{ marginBottom: 16 }}>
          <Form.Item
            name="classroom_id"
            label="Rombel (tahun ajaran aktif)"
            extra="Boleh dikosongkan dan ditempatkan nanti."
            style={{ marginBottom: 0 }}
          >
            <Select
              allowClear
              showSearch={{ optionFilterProp: 'label' }}
              placeholder="Pilih rombel"
              loading={classrooms.isFetching}
              notFoundContent="Belum ada rombel di tahun ajaran aktif"
              options={(classrooms.data ?? []).map((c) => ({ value: c.id, label: `${c.unit.code} ${c.name}` }))}
              style={{ maxWidth: 320 }}
            />
          </Form.Item>
        </Card>
      )}

      <Flex justify="end" gap={8} wrap>
        <Button onClick={() => navigate(-1)}>Batal</Button>
        <Button type="primary" htmlType="submit" size="large" loading={mutation.isPending}>
          {isEdit ? 'Simpan perubahan' : 'Simpan siswa'}
        </Button>
      </Flex>
    </Form>
  )
}

export function StudentFormPage() {
  const { id } = useParams()
  const studentId = id ? Number(id) : undefined

  const query = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => getStudent(studentId as number),
    enabled: studentId !== undefined,
  })

  return (
    <>
      <PageHeader title={studentId ? 'Ubah data siswa' : 'Tambah siswa'} />
      {studentId !== undefined && query.isPending && <Skeleton active paragraph={{ rows: 8 }} />}
      {query.isError && <Alert type="error" showIcon title="Gagal memuat data siswa" description={getErrorMessage(query.error)} />}
      {(studentId === undefined || query.data) && <StudentForm key={query.data?.id ?? 'new'} student={query.data} />}
    </>
  )
}
