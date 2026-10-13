import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App, Button, Drawer, Flex, Form, Input, InputNumber, Select } from 'antd'
import { useDeferredValue, useState } from 'react'
import { getErrorMessage } from '../../api/errors'
import { listGradeLevels, listTeacherOptions, listUnits, saveClassroom, type ClassroomPayload } from '../../api/master'
import { applyFieldErrors } from '../../lib/formErrors'
import type { AcademicYear, Classroom } from '../../types/api'

interface Values {
  academic_year_id: number
  unit_id: number
  grade_level_id: number
  name: string
  homeroom_staff_id?: number
  capacity?: number
}

function ClassroomForm({
  classroom,
  years,
  defaultYearId,
  onClose,
}: {
  classroom: Classroom | null
  years: AcademicYear[]
  defaultYearId?: number
  onClose: () => void
}) {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<Values>()
  const unitId = Form.useWatch('unit_id', form)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)

  const units = useQuery({ queryKey: ['units'], queryFn: listUnits, staleTime: Infinity })
  const grades = useQuery({ queryKey: ['grade-levels'], queryFn: listGradeLevels, staleTime: Infinity })
  const teachers = useQuery({ queryKey: ['teacher-options', deferredSearch], queryFn: () => listTeacherOptions(deferredSearch) })

  const mutation = useMutation({
    mutationFn: (values: Values) => {
      const payload: ClassroomPayload = {
        academic_year_id: values.academic_year_id,
        unit_id: values.unit_id,
        grade_level_id: values.grade_level_id,
        name: values.name.trim(),
        homeroom_staff_id: values.homeroom_staff_id ?? null,
        capacity: values.capacity ?? null,
      }
      return saveClassroom(payload, classroom?.id)
    },
    onSuccess: () => {
      message.success(classroom ? 'Rombel diperbarui' : 'Rombel dibuat')
      void queryClient.invalidateQueries({ queryKey: ['classrooms'] })
      void queryClient.invalidateQueries({ queryKey: ['teacher-options'] })
      onClose()
    },
    onError: (error) => {
      if (!applyFieldErrors(form, error)) message.error(getErrorMessage(error))
    },
  })

  const currentTeacherId = classroom?.homeroom?.id

  return (
    <Form<Values>
      form={form}
      layout="vertical"
      requiredMark="optional"
      initialValues={{
        academic_year_id: classroom?.academic_year_id ?? defaultYearId,
        unit_id: classroom?.unit.id,
        grade_level_id: classroom?.grade_level.id,
        name: classroom?.name,
        homeroom_staff_id: classroom?.homeroom?.id,
        capacity: classroom?.capacity ?? 30,
      }}
      onFinish={(values) => mutation.mutate(values)}
    >
      <Form.Item name="academic_year_id" label="Tahun ajaran" rules={[{ required: true, message: 'Pilih tahun ajaran' }]}>
        <Select options={years.map((y) => ({ value: y.id, label: y.is_active ? `${y.name} (aktif)` : y.name }))} />
      </Form.Item>

      <Flex gap={12} wrap>
        <Form.Item name="unit_id" label="Unit" rules={[{ required: true, message: 'Pilih unit' }]} style={{ flex: '1 1 160px' }}>
          <Select
            placeholder="Pilih unit"
            options={(units.data ?? []).map((u) => ({ value: u.id, label: u.code }))}
            onChange={() => form.setFieldValue('grade_level_id', undefined)}
          />
        </Form.Item>
        <Form.Item name="grade_level_id" label="Tingkat" rules={[{ required: true, message: 'Pilih tingkat' }]} style={{ flex: '1 1 160px' }}>
          <Select
            placeholder={unitId ? 'Pilih tingkat' : 'Pilih unit dulu'}
            disabled={!unitId}
            options={(grades.data ?? []).filter((g) => g.unit_id === unitId).map((g) => ({ value: g.id, label: g.name }))}
          />
        </Form.Item>
      </Flex>

      <Form.Item name="name" label="Nama rombel" extra="Contoh: 1A, 7B, atau TK A" rules={[{ required: true, message: 'Nama wajib diisi' }, { max: 30 }]}>
        <Input autoComplete="off" />
      </Form.Item>

      <Form.Item name="homeroom_staff_id" label="Wali kelas" extra="Satu guru hanya dapat menjadi wali kelas satu rombel per tahun ajaran.">
        <Select
          allowClear
          showSearch={{ filterOption: false, onSearch: setSearch }}
          placeholder="Cari nama guru"
          loading={teachers.isFetching}
          notFoundContent="Tidak ada guru"
          options={(teachers.data ?? []).map((t) => ({
            value: t.id,
            label: t.homeroom_classroom && t.id !== currentTeacherId ? `${t.name} (sudah wali ${t.homeroom_classroom})` : t.name,
            disabled: Boolean(t.homeroom_classroom) && t.id !== currentTeacherId,
          }))}
        />
      </Form.Item>

      <Form.Item name="capacity" label="Kapasitas">
        <InputNumber min={1} max={100} style={{ width: 140 }} inputMode="numeric" />
      </Form.Item>

      <Flex justify="end" gap={8} style={{ marginTop: 8 }}>
        <Button onClick={onClose}>Batal</Button>
        <Button type="primary" htmlType="submit" loading={mutation.isPending}>
          {classroom ? 'Simpan perubahan' : 'Buat rombel'}
        </Button>
      </Flex>
    </Form>
  )
}

export function ClassroomDrawer(props: {
  open: boolean
  classroom: Classroom | null
  years: AcademicYear[]
  defaultYearId?: number
  onClose: () => void
}) {
  const { open, ...rest } = props
  return (
    <Drawer open={open} onClose={props.onClose} title={props.classroom ? 'Ubah rombel' : 'Tambah rombel'} size="min(480px, 100vw)" destroyOnHidden>
      <ClassroomForm key={props.classroom?.id ?? 'new'} {...rest} />
    </Drawer>
  )
}
