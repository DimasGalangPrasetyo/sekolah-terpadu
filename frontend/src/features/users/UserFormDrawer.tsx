import { useMutation, useQuery } from '@tanstack/react-query'
import { App, Button, Drawer, Flex, Form, Input, Select } from 'antd'
import { useDeferredValue, useState } from 'react'
import { getErrorMessage } from '../../api/errors'
import { createUser, searchStaffOptions, updateUser, type UserPayload } from '../../api/users'
import type { TemporarySecret } from '../../components/TemporaryPasswordModal'
import { applyFieldErrors } from '../../lib/formErrors'
import type { ManagedUser, RoleOption } from '../../types/api'

interface FormValues {
  name: string
  username?: string
  email?: string
  role: string
  staff_id?: number
}

interface FormProps {
  user: ManagedUser | null
  roles: RoleOption[]
  onClose: () => void
  onCreated: (secret: TemporarySecret) => void
  onUpdated: () => void
}

function UserForm({ user, roles, onClose, onCreated, onUpdated }: FormProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<FormValues>()
  const isEdit = user !== null
  const role = Form.useWatch('role', form)
  const [staffSearch, setStaffSearch] = useState('')
  const deferredSearch = useDeferredValue(staffSearch)

  const staffQuery = useQuery({
    queryKey: ['staff-options', deferredSearch, user?.staff?.id ?? null],
    queryFn: () => searchStaffOptions(deferredSearch, user?.staff?.id),
    enabled: role === 'guru',
  })

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: UserPayload = {
        name: values.name.trim(),
        email: values.email?.trim() || null,
        role: values.role,
        // Peran selain guru: pertahankan tautan staf yang ada (jangan terhapus tanpa sengaja).
        staff_id: values.role === 'guru' ? (values.staff_id ?? null) : (user?.staff?.id ?? null),
      }

      if (isEdit) {
        await updateUser(user.id, payload)
        return null
      }

      const created = await createUser({ ...payload, username: values.username })
      return {
        name: created.data.name,
        username: created.data.username,
        password: created.temporary_password,
      } satisfies TemporarySecret
    },
    onSuccess: (secret) => {
      if (secret) onCreated(secret)
      else onUpdated()
    },
    onError: (error) => {
      if (!applyFieldErrors(form, error)) message.error(getErrorMessage(error))
    },
  })

  return (
    <Form<FormValues>
      form={form}
      layout="vertical"
      requiredMark="optional"
      initialValues={{
        name: user?.name,
        username: user?.username,
        email: user?.email ?? undefined,
        role: user?.role ?? undefined,
        staff_id: user?.staff?.id,
      }}
      onFinish={(values) => mutation.mutate(values)}
    >
      <Form.Item name="name" label="Nama lengkap" rules={[{ required: true, message: 'Nama wajib diisi' }, { max: 150 }]}>
        <Input autoFocus autoComplete="off" />
      </Form.Item>

      <Form.Item
        name="username"
        label="Username"
        extra={isEdit ? 'Username tidak dapat diubah.' : 'Huruf kecil, angka, titik, garis bawah, atau tanda hubung.'}
        normalize={(value: string | undefined) => value?.toLowerCase()}
        rules={[
          { required: !isEdit, message: 'Username wajib diisi' },
          { min: 3, message: 'Minimal 3 karakter' },
          { max: 40 },
          { pattern: /^[a-z0-9._-]+$/, message: 'Hanya huruf kecil, angka, titik, garis bawah, dan tanda hubung' },
        ]}
      >
        <Input disabled={isEdit} autoComplete="off" autoCapitalize="none" spellCheck={false} />
      </Form.Item>

      <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Format email tidak valid' }]}>
        <Input type="email" autoComplete="off" inputMode="email" />
      </Form.Item>

      <Form.Item name="role" label="Peran" rules={[{ required: true, message: 'Pilih peran' }]}>
        <Select
          placeholder="Pilih peran"
          options={roles.map((r) => ({ value: r.name, label: r.label }))}
          onChange={() => form.setFieldValue('staff_id', undefined)}
        />
      </Form.Item>

      {role === 'guru' && (
        <Form.Item
          name="staff_id"
          label="Data staf (guru)"
          extra="Akun guru harus ditautkan ke data staf. Staf yang sudah punya akun tidak ditampilkan."
          rules={[{ required: true, message: 'Pilih data staf' }]}
        >
          <Select
            showSearch={{ filterOption: false, onSearch: setStaffSearch }}
            placeholder="Cari nama guru"
            loading={staffQuery.isFetching}
            notFoundContent="Tidak ada guru yang tersedia"
            options={(staffQuery.data ?? []).map((s) => ({
              value: s.id,
              label: s.position ? `${s.name} (${s.position})` : s.name,
            }))}
          />
        </Form.Item>
      )}

      <Flex justify="end" gap={8} style={{ marginTop: 8 }}>
        <Button onClick={onClose}>Batal</Button>
        <Button type="primary" htmlType="submit" loading={mutation.isPending}>
          {isEdit ? 'Simpan perubahan' : 'Buat akun'}
        </Button>
      </Flex>
    </Form>
  )
}

export function UserFormDrawer({ open, ...props }: FormProps & { open: boolean }) {
  return (
    <Drawer
      open={open}
      onClose={props.onClose}
      title={props.user ? 'Ubah akun' : 'Tambah akun'}
      size="min(480px, 100vw)"
      destroyOnHidden
    >
      <UserForm {...props} />
    </Drawer>
  )
}
