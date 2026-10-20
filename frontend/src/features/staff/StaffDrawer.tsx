import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Drawer,
  Flex,
  Form,
  Input,
  Select,
  Switch,
  Typography,
} from 'antd'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { useState } from 'react'
import { getErrorMessage } from '../../api/errors'
import { listUnits } from '../../api/master'
import { applyFieldErrors } from '../../lib/formErrors'
import { createStaff, updateStaff } from './api'
import type { EmploymentStatus, Staff, StaffPayload } from './types'

const FMT = 'YYYY-MM-DD'

interface AssignmentFormValue {
  id?: number
  unit_id: number
  role_title: string
  start_date?: Dayjs
  end_date?: Dayjs
}

interface FormValues {
  name: string
  gender: 'L' | 'P'
  position: string
  employment_status: EmploymentStatus
  nip?: string
  nuptk?: string
  birth_place?: string
  birth_date?: Dayjs
  phone?: string
  email?: string
  address?: string
  join_date?: Dayjs
  education?: string
  is_teacher: boolean
  is_active: boolean
  assignments: AssignmentFormValue[]
}

interface StaffDrawerProps {
  open: boolean
  staff: Staff | null
  onClose: () => void
  onSaved: () => void
}

function toInitial(staff: Staff | null): Partial<FormValues> {
  if (!staff) {
    return {
      gender: 'L',
      employment_status: 'permanent',
      is_teacher: true,
      is_active: true,
      assignments: [],
    }
  }

  return {
    name: staff.name,
    gender: staff.gender,
    position: staff.position,
    employment_status: staff.employment_status,
    nip: staff.nip ?? undefined,
    nuptk: staff.nuptk ?? undefined,
    birth_place: staff.birth_place ?? undefined,
    birth_date: staff.birth_date ? dayjs(staff.birth_date) : undefined,
    phone: staff.phone ?? undefined,
    email: staff.email ?? undefined,
    address: staff.address ?? undefined,
    join_date: staff.join_date ? dayjs(staff.join_date) : undefined,
    education: staff.education ?? undefined,
    is_teacher: staff.is_teacher,
    is_active: staff.is_active,
    assignments: (staff.assignments ?? []).map((a) => ({
      id: a.id,
      unit_id: a.unit_id,
      role_title: a.role_title,
      start_date: a.start_date ? dayjs(a.start_date) : undefined,
      end_date: a.end_date ? dayjs(a.end_date) : undefined,
    })),
  }
}

function StaffForm({ staff, onClose, onSaved }: { staff: Staff | null; onClose: () => void; onSaved: () => void }) {
  const { message } = App.useApp()
  const [form] = Form.useForm<FormValues>()
  const [formError, setFormError] = useState<string | null>(null)

  const unitsQuery = useQuery({
    queryKey: ['units'],
    queryFn: listUnits,
    staleTime: 5 * 60_000,
  })

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: StaffPayload = {
        name: values.name.trim(),
        gender: values.gender,
        position: values.position.trim(),
        employment_status: values.employment_status,
        nip: values.nip?.trim() || null,
        nuptk: values.nuptk?.trim() || null,
        birth_place: values.birth_place?.trim() || null,
        birth_date: values.birth_date ? values.birth_date.format(FMT) : null,
        phone: values.phone?.trim() || null,
        email: values.email?.trim() || null,
        address: values.address?.trim() || null,
        join_date: values.join_date ? values.join_date.format(FMT) : null,
        education: values.education?.trim() || null,
        is_teacher: values.is_teacher,
        is_active: values.is_active,
        assignments: (values.assignments ?? []).map((a) => ({
          id: a.id,
          unit_id: a.unit_id,
          role_title: a.role_title.trim(),
          start_date: a.start_date ? a.start_date.format(FMT) : null,
          end_date: a.end_date ? a.end_date.format(FMT) : null,
        })),
      }

      if (staff) {
        await updateStaff(staff.id, payload)
      } else {
        await createStaff(payload)
      }
    },
    onSuccess: () => {
      message.success(staff ? 'Data staf berhasil diperbarui' : 'Staf baru berhasil ditambahkan')
      onSaved()
      onClose()
    },
    onError: (error) => {
      if (!applyFieldErrors(form, error)) {
        setFormError(getErrorMessage(error))
      }
    },
  })

  return (
    <Form<FormValues>
      form={form}
      layout="vertical"
      requiredMark="optional"
      initialValues={toInitial(staff)}
      onFinish={(values) => {
        setFormError(null)
        mutation.mutate(values)
      }}
    >
      {formError && (
        <Alert
          type="error"
          showIcon
          message={formError}
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setFormError(null)}
        />
      )}

      <Typography.Title level={5} style={{ marginTop: 0 }}>
        Identitas Dasar
      </Typography.Title>

      <Form.Item
        name="name"
        label="Nama Lengkap"
        rules={[{ required: true, message: 'Nama lengkap wajib diisi' }, { max: 150 }]}
      >
        <Input placeholder="Contoh: Budi Santoso, S.Pd." autoComplete="off" />
      </Form.Item>

      <Flex gap={12} wrap>
        <Form.Item
          name="gender"
          label="Jenis Kelamin"
          rules={[{ required: true, message: 'Pilih jenis kelamin' }]}
          style={{ flex: '1 1 180px' }}
        >
          <Select
            options={[
              { value: 'L', label: 'Laki-laki (L)' },
              { value: 'P', label: 'Perempuan (P)' },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="position"
          label="Jabatan / Peran Utama"
          rules={[{ required: true, message: 'Jabatan wajib diisi' }, { max: 100 }]}
          style={{ flex: '1 1 220px' }}
        >
          <Input placeholder="Contoh: Guru Matematika / Staf TU" autoComplete="off" />
        </Form.Item>
      </Flex>

      <Flex gap={12} wrap>
        <Form.Item
          name="employment_status"
          label="Status Kepegawaian"
          rules={[{ required: true, message: 'Pilih status kepegawaian' }]}
          style={{ flex: '1 1 180px' }}
        >
          <Select
            options={[
              { value: 'permanent', label: 'Tetap' },
              { value: 'honorary', label: 'Honorer' },
              { value: 'contract', label: 'Kontrak' },
            ]}
          />
        </Form.Item>

        <Form.Item name="is_teacher" label="Apakah Guru?" valuePropName="checked" style={{ flex: '1 1 140px' }}>
          <Switch checkedChildren="Ya" unCheckedChildren="Bukan" />
        </Form.Item>

        {staff && (
          <Form.Item name="is_active" label="Status Aktif" valuePropName="checked" style={{ flex: '1 1 140px' }}>
            <Switch checkedChildren="Aktif" unCheckedChildren="Nonaktif" />
          </Form.Item>
        )}
      </Flex>

      <Flex gap={12} wrap>
        <Form.Item name="nip" label="NIP" rules={[{ max: 50 }]} style={{ flex: '1 1 200px' }}>
          <Input placeholder="Nomor Induk Pegawai" autoComplete="off" />
        </Form.Item>

        <Form.Item name="nuptk" label="NUPTK" rules={[{ max: 50 }]} style={{ flex: '1 1 200px' }}>
          <Input placeholder="NUPTK jika ada" autoComplete="off" />
        </Form.Item>
      </Flex>

      <Flex gap={12} wrap>
        <Form.Item name="birth_place" label="Tempat Lahir" rules={[{ max: 100 }]} style={{ flex: '1 1 200px' }}>
          <Input placeholder="Kota tempat lahir" autoComplete="off" />
        </Form.Item>

        <Form.Item name="birth_date" label="Tanggal Lahir" style={{ flex: '1 1 200px' }}>
          <DatePicker format={FMT} placeholder="Pilih tanggal" style={{ width: '100%' }} />
        </Form.Item>
      </Flex>

      <Typography.Title level={5} style={{ marginTop: 12 }}>
        Kontak & Riwayat
      </Typography.Title>

      <Flex gap={12} wrap>
        <Form.Item name="phone" label="Nomor Telepon / WhatsApp" rules={[{ max: 30 }]} style={{ flex: '1 1 200px' }}>
          <Input placeholder="08xxxxxxxxxx" autoComplete="off" inputMode="tel" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[{ type: 'email', message: 'Format email tidak valid' }, { max: 150 }]}
          style={{ flex: '1 1 200px' }}
        >
          <Input type="email" placeholder="nama@domain.com" autoComplete="off" inputMode="email" />
        </Form.Item>
      </Flex>

      <Form.Item name="address" label="Alamat Tempat Tinggal" rules={[{ max: 500 }]}>
        <Input.TextArea rows={2} placeholder="Alamat lengkap staf" />
      </Form.Item>

      <Flex gap={12} wrap>
        <Form.Item name="join_date" label="Tanggal Mulai Bergabung" style={{ flex: '1 1 200px' }}>
          <DatePicker format={FMT} placeholder="Pilih tanggal" style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="education" label="Pendidikan Terakhir" rules={[{ max: 100 }]} style={{ flex: '1 1 200px' }}>
          <Input placeholder="Contoh: S1 Pendidikan Biologi" autoComplete="off" />
        </Form.Item>
      </Flex>

      <Typography.Title level={5} style={{ marginTop: 12 }}>
        Penugasan Unit (TK / SD / SMP)
      </Typography.Title>

      <Form.List name="assignments">
        {(fields, { add, remove }) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            {fields.map(({ key, name, ...restField }) => (
              <Card
                key={key}
                size="small"
                styles={{ body: { padding: 12 } }}
                extra={
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => remove(name)}
                    aria-label="Hapus penugasan ini"
                  />
                }
                title={`Penugasan #${name + 1}`}
              >
                <Form.Item name={[name, 'id']} hidden>
                  <Input />
                </Form.Item>

                <Flex gap={12} wrap>
                  <Form.Item
                    {...restField}
                    name={[name, 'unit_id']}
                    label="Unit"
                    rules={[{ required: true, message: 'Pilih unit' }]}
                    style={{ flex: '1 1 140px' }}
                  >
                    <Select
                      placeholder="Pilih unit"
                      loading={unitsQuery.isFetching}
                      options={(unitsQuery.data ?? []).map((u) => ({
                        value: u.id,
                        label: `${u.code} - ${u.name}`,
                      }))}
                    />
                  </Form.Item>

                  <Form.Item
                    {...restField}
                    name={[name, 'role_title']}
                    label="Peran / Tugas di Unit"
                    rules={[{ required: true, message: 'Peran wajib diisi' }, { max: 100 }]}
                    style={{ flex: '2 1 200px' }}
                  >
                    <Input placeholder="Contoh: Guru Kelas / Kepala Lab" />
                  </Form.Item>
                </Flex>

                <Flex gap={12} wrap>
                  <Form.Item
                    {...restField}
                    name={[name, 'start_date']}
                    label="Tanggal Mulai"
                    style={{ flex: '1 1 180px' }}
                  >
                    <DatePicker format={FMT} placeholder="Mulai bertugas" style={{ width: '100%' }} />
                  </Form.Item>

                  <Form.Item
                    {...restField}
                    name={[name, 'end_date']}
                    label="Tanggal Selesai"
                    style={{ flex: '1 1 180px' }}
                  >
                    <DatePicker format={FMT} placeholder="Selesai (opsional)" style={{ width: '100%' }} />
                  </Form.Item>
                </Flex>
              </Card>
            ))}

            <Button
              type="dashed"
              onClick={() => add({ unit_id: (unitsQuery.data?.[0]?.id ?? 1), role_title: 'Guru' })}
              icon={<PlusOutlined />}
              block
            >
              Tambah Penugasan Unit
            </Button>
          </div>
        )}
      </Form.List>

      <Flex justify="end" gap={8} style={{ marginTop: 24 }}>
        <Button onClick={onClose}>Batal</Button>
        <Button type="primary" htmlType="submit" loading={mutation.isPending}>
          {staff ? 'Simpan Perubahan' : 'Tambah Staf'}
        </Button>
      </Flex>
    </Form>
  )
}

export function StaffDrawer({ open, staff, onClose, onSaved }: StaffDrawerProps) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={staff ? 'Ubah Data Staf' : 'Tambah Staf Baru'}
      size="large"
      style={{ maxWidth: '100vw' }}
      destroyOnHidden
    >
      <StaffForm staff={staff} onClose={onClose} onSaved={onSaved} />
    </Drawer>
  )
}
