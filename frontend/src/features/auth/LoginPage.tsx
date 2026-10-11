import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Card, Flex, Form, Input, Typography } from 'antd'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { login } from '../../api/auth'
import { getErrorMessage, getStatus } from '../../api/errors'
import { meKey } from './meKey'

interface LoginValues {
  username: string
  password: string
}

export function LoginPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const [notice, setNotice] = useState<{ type: 'error' | 'warning'; text: string } | null>(null)

  const mutation = useMutation({
    mutationFn: (values: LoginValues) => login(values.username.trim(), values.password),
    onSuccess: (user) => {
      queryClient.setQueryData(meKey, user)
      navigate(user.must_change_password ? '/ganti-password' : from, { replace: true })
    },
    onError: (error) => {
      const status = getStatus(error)
      setNotice({
        type: status === 423 || status === 429 ? 'warning' : 'error',
        text: getErrorMessage(error, 'Gagal masuk. Silakan coba lagi.'),
      })
    },
  })

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
        background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdfa 50%, #f4f7f6 100%)',
      }}
    >
      <Card variant="borderless" style={{ width: '100%', maxWidth: 420, boxShadow: '0 8px 30px rgba(15, 118, 110, 0.12)' }}>
        <Flex vertical align="center" gap={4} style={{ marginBottom: 24, textAlign: 'center' }}>
          <div
            aria-hidden
            style={{ width: 52, height: 52, borderRadius: 12, background: '#0f766e', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 20 }}
          >
            ST
          </div>
          <Typography.Title level={3} style={{ margin: '8px 0 0' }}>
            Sekolah Terpadu
          </Typography.Title>
          <Typography.Text type="secondary">Masuk untuk melanjutkan</Typography.Text>
        </Flex>

        {notice && <Alert type={notice.type} showIcon title={notice.text} style={{ marginBottom: 16 }} />}

        <Form<LoginValues> layout="vertical" requiredMark={false} onFinish={(v) => mutation.mutate(v)} onValuesChange={() => setNotice(null)}>
          <Form.Item name="username" label="Username" rules={[{ required: true, message: 'Username wajib diisi' }]}>
            <Input
              prefix={<UserOutlined />}
              size="large"
              autoFocus
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="contoh: tu.sekolah"
            />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Password wajib diisi' }]}>
            <Input.Password prefix={<LockOutlined />} size="large" autoComplete="current-password" placeholder="Password Anda" />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={mutation.isPending}>
            Masuk
          </Button>
        </Form>

        <Typography.Paragraph type="secondary" style={{ margin: '16px 0 0', textAlign: 'center', fontSize: 13 }}>
          Lupa password atau akun terkunci? Hubungi pengelola sistem sekolah.
        </Typography.Paragraph>
      </Card>
    </div>
  )
}
