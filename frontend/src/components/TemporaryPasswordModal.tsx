import { CopyOutlined } from '@ant-design/icons'
import { App, Alert, Button, Flex, Modal, Typography } from 'antd'

export interface TemporarySecret {
  name: string
  username: string
  password: string
}

/** Menampilkan password sementara satu kali, dengan tombol salin. */
export function TemporaryPasswordModal({ secret, onClose }: { secret: TemporarySecret | null; onClose: () => void }) {
  const { message } = App.useApp()

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      message.success('Tersalin')
    } catch {
      message.warning('Tidak bisa menyalin otomatis. Salin secara manual.')
    }
  }

  return (
    <Modal
      open={secret !== null}
      title="Password sementara"
      onCancel={onClose}
      mask={{ closable: false }}
      footer={<Button type="primary" onClick={onClose}>Sudah saya catat</Button>}
      destroyOnHidden
    >
      {secret && (
        <Flex vertical gap={12}>
          <Alert
            type="warning"
            showIcon
            title="Password ini hanya tampil sekali"
            description="Catat atau salin sekarang, lalu berikan kepada pemilik akun. Ia wajib menggantinya saat masuk pertama."
          />
          <div>
            <Typography.Text type="secondary">Akun</Typography.Text>
            <div>
              <strong>{secret.name}</strong> ({secret.username})
            </div>
          </div>
          <div>
            <Typography.Text type="secondary">Password sementara</Typography.Text>
            <Flex align="center" gap={8} wrap>
              <Typography.Text code style={{ fontSize: 20, letterSpacing: 1, wordBreak: 'break-all' }}>
                {secret.password}
              </Typography.Text>
              <Button icon={<CopyOutlined />} onClick={() => void copy(secret.password)} aria-label="Salin password">
                Salin
              </Button>
            </Flex>
          </div>
        </Flex>
      )}
    </Modal>
  )
}
