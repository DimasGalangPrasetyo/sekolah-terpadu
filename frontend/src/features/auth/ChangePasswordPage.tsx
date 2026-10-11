import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Card, Flex, Form, Input, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import { changePassword } from '../../api/auth'
import { getErrorMessage } from '../../api/errors'
import { PasswordRules } from '../../components/PasswordRules'
import { applyFieldErrors } from '../../lib/formErrors'
import { performLogout } from './actions'
import { meKey } from './meKey'
import { useMe } from './useMe'

interface Values {
  current_password: string
  password: string
  password_confirmation: string
}

export function ChangePasswordPage() {
  const { data: user } = useMe()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [form] = Form.useForm<Values>()
  const values = Form.useWatch([], form) as Partial<Values> | undefined

  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: (updated) => {
      queryClient.setQueryData(meKey, updated)
      message.success('Password berhasil diganti')
      navigate('/', { replace: true })
    },
    onError: (error) => {
      if (!applyFieldErrors(form, error)) message.error(getErrorMessage(error))
    },
  })

  if (!user) return null

  const current = values?.current_password ?? ''
  const next = values?.password ?? ''
  const confirm = values?.password_confirmation ?? ''
  const filled = next.length > 0

  const rules = [
    { label: 'Minimal 10 karakter', passed: next.length >= 10 },
    { label: 'Mengandung huruf', passed: /[A-Za-z]/.test(next) },
    { label: 'Mengandung angka', passed: /\d/.test(next) },
    { label: 'Tidak sama dengan username', passed: filled && next.toLowerCase() !== user.username.toLowerCase() },
    { label: 'Berbeda dari password saat ini', passed: filled && next !== current },
    { label: 'Konfirmasi password cocok', passed: filled && next === confirm },
  ]
  const ready = current.length > 0 && rules.every((r) => r.passed)

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <Card style={{ width: '100%', maxWidth: 460 }}>
        <Typography.Title level={4} style={{ marginTop: 0 }}>
          Ganti password
        </Typography.Title>

        {user.must_change_password && (
          <Alert
            type="info"
            showIcon
            title="Anda masuk dengan password sementara"
            description="Buat password baru yang hanya Anda ketahui untuk melanjutkan."
            style={{ marginBottom: 16 }}
          />
        )}

        <Form<Values> form={form} layout="vertical" requiredMark={false} onFinish={(v) => mutation.mutate(v)}>
          <Form.Item name="current_password" label="Password saat ini" rules={[{ required: true, message: 'Wajib diisi' }]}>
            <Input.Password size="large" autoComplete="current-password" autoFocus />
          </Form.Item>
          <Form.Item name="password" label="Password baru" rules={[{ required: true, message: 'Wajib diisi' }]}>
            <Input.Password size="large" autoComplete="new-password" />
          </Form.Item>
          <Form.Item name="password_confirmation" label="Ulangi password baru" rules={[{ required: true, message: 'Wajib diisi' }]}>
            <Input.Password size="large" autoComplete="new-password" />
          </Form.Item>

          <PasswordRules rules={rules} />

          <Flex gap={8} wrap justify="space-between">
            <Button
              type="text"
              onClick={() => (user.must_change_password ? void performLogout() : navigate(-1))}
            >
              {user.must_change_password ? 'Keluar' : 'Kembali'}
            </Button>
            <Button type="primary" htmlType="submit" size="large" disabled={!ready} loading={mutation.isPending}>
              Simpan password
            </Button>
          </Flex>
        </Form>
      </Card>
    </div>
  )
}
