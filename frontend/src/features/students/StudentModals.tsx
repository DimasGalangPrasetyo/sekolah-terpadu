import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App, Button, DatePicker, Flex, Form, Input, Modal, Select } from 'antd'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { getErrorMessage } from '../../api/errors'
import { listClassrooms } from '../../api/master'
import { changeStudentStatus, placeStudent } from '../../api/students'
import { STUDENT_STATUS_LABELS } from '../../lib/constants'
import { applyFieldErrors } from '../../lib/formErrors'
import type { Student, StudentStatus } from '../../types/api'

interface StatusValues {
  to_status: StudentStatus
  effective_date: Dayjs
  reason?: string
  destination_school?: string
  document_number?: string
}

function StatusForm({ student, onClose }: { student: Student; onClose: () => void }) {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<StatusValues>()
  const toStatus = Form.useWatch('to_status', form)

  const mutation = useMutation({
    mutationFn: (values: StatusValues) =>
      changeStudentStatus(student.id, {
        to_status: values.to_status,
        effective_date: values.effective_date.format('YYYY-MM-DD'),
        reason: values.reason?.trim() || null,
        destination_school: values.destination_school?.trim() || null,
        document_number: values.document_number?.trim() || null,
      }),
    onSuccess: () => {
      message.success('Status siswa diperbarui')
      void queryClient.invalidateQueries({ queryKey: ['student', student.id] })
      void queryClient.invalidateQueries({ queryKey: ['students'] })
      void queryClient.invalidateQueries({ queryKey: ['classrooms'] })
      onClose()
    },
    onError: (error) => {
      if (!applyFieldErrors(form, error)) message.error(getErrorMessage(error))
    },
  })

  return (
    <Form<StatusValues>
      form={form}
      layout="vertical"
      requiredMark="optional"
      initialValues={{ effective_date: dayjs() }}
      onFinish={(values) => mutation.mutate(values)}
    >
      <Form.Item name="to_status" label="Status baru" rules={[{ required: true, message: 'Pilih status baru' }]}>
        <Select
          placeholder="Pilih status"
          options={Object.entries(STUDENT_STATUS_LABELS)
            .filter(([value]) => value !== student.status)
            .map(([value, label]) => ({ value, label }))}
        />
      </Form.Item>
      <Form.Item name="effective_date" label="Berlaku sejak" rules={[{ required: true, message: 'Wajib diisi' }]}>
        <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
      </Form.Item>
      {toStatus === 'transferred' && (
        <Form.Item name="destination_school" label="Sekolah tujuan" rules={[{ required: true, message: 'Sekolah tujuan wajib diisi' }]}>
          <Input autoComplete="off" />
        </Form.Item>
      )}
      <Form.Item name="reason" label="Alasan / keterangan">
        <Input.TextArea rows={2} maxLength={500} />
      </Form.Item>
      <Form.Item name="document_number" label="Nomor surat (jika ada)">
        <Input autoComplete="off" />
      </Form.Item>
      <Flex justify="end" gap={8}>
        <Button onClick={onClose}>Batal</Button>
        <Button type="primary" htmlType="submit" loading={mutation.isPending}>
          Simpan status
        </Button>
      </Flex>
    </Form>
  )
}

export function StudentStatusModal({ student, open, onClose }: { student: Student; open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onCancel={onClose} title={`Ubah status: ${student.name}`} footer={null} destroyOnHidden>
      <StatusForm student={student} onClose={onClose} />
    </Modal>
  )
}

function PlaceForm({ student, onClose }: { student: Student; onClose: () => void }) {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<{ classroom_id: number }>()
  const classrooms = useQuery({ queryKey: ['classrooms', { scope: 'place-modal' }], queryFn: () => listClassrooms() })

  const mutation = useMutation({
    mutationFn: (values: { classroom_id: number }) => placeStudent(student.id, values.classroom_id),
    onSuccess: () => {
      message.success('Penempatan kelas diperbarui')
      void queryClient.invalidateQueries({ queryKey: ['student', student.id] })
      void queryClient.invalidateQueries({ queryKey: ['students'] })
      void queryClient.invalidateQueries({ queryKey: ['classrooms'] })
      onClose()
    },
    onError: (error) => {
      if (!applyFieldErrors(form, error)) message.error(getErrorMessage(error))
    },
  })

  return (
    <Form form={form} layout="vertical" onFinish={(values) => mutation.mutate(values)}>
      <Form.Item
        name="classroom_id"
        label="Rombel (tahun ajaran aktif)"
        extra={student.classroom ? `Saat ini: ${student.classroom.unit} ${student.classroom.name}` : 'Siswa ini belum ditempatkan.'}
        rules={[{ required: true, message: 'Pilih rombel' }]}
      >
        <Select
          showSearch={{ optionFilterProp: 'label' }}
          placeholder="Pilih rombel"
          loading={classrooms.isFetching}
          notFoundContent="Belum ada rombel di tahun ajaran aktif"
          options={(classrooms.data ?? [])
            .filter((c) => c.id !== student.classroom?.id)
            .map((c) => ({ value: c.id, label: `${c.unit.code} ${c.name}` }))}
        />
      </Form.Item>
      <Flex justify="end" gap={8}>
        <Button onClick={onClose}>Batal</Button>
        <Button type="primary" htmlType="submit" loading={mutation.isPending}>
          Simpan
        </Button>
      </Flex>
    </Form>
  )
}

export function StudentPlaceModal({ student, open, onClose }: { student: Student; open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onCancel={onClose} title={student.classroom ? 'Pindah rombel' : 'Tempatkan di rombel'} footer={null} destroyOnHidden>
      <PlaceForm student={student} onClose={onClose} />
    </Modal>
  )
}
