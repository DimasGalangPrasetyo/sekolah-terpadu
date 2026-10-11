import { Alert, Card, Col, Flex, Row, Tag, Typography } from 'antd'
import { Link } from 'react-router-dom'
import { visibleNav } from '../../app/navigation'
import { PageHeader } from '../../components/PageHeader'
import { ROLE_LABELS } from '../../lib/constants'
import { useMe } from '../auth/useMe'

export function DashboardPage() {
  const { data: user } = useMe()
  if (!user) return null

  const shortcuts = visibleNav(user).filter((item) => item.key !== 'home')

  return (
    <>
      <PageHeader title={`Selamat datang, ${user.name}`} subtitle={ROLE_LABELS[user.roles[0] ?? ''] ?? undefined} />

      <Alert
        type="info"
        showIcon
        title="Versi prototype"
        description="Data yang tampil adalah data contoh untuk keperluan demo. Fitur akan bertambah bertahap sesuai masukan dari sekolah."
        style={{ marginBottom: 16 }}
      />

      {user.homerooms.length > 0 && (
        <Card title="Kelas yang Anda walikan" style={{ marginBottom: 16 }}>
          <Flex wrap gap={8}>
            {user.homerooms.map((room) => (
              <Tag key={room.id} color="green" style={{ fontSize: 14, padding: '4px 12px' }}>
                {room.unit} {room.name}
              </Tag>
            ))}
          </Flex>
        </Card>
      )}

      <Typography.Title level={5}>Menu</Typography.Title>
      <Row gutter={[16, 16]}>
        {shortcuts.map((item) => (
          <Col key={item.key} xs={24} sm={12} xl={8}>
            <Link to={item.path} style={{ display: 'block' }}>
              <Card hoverable styles={{ body: { padding: 16 } }}>
                <Flex gap={14} align="center">
                  <span style={{ fontSize: 26, color: '#0f766e', lineHeight: 1 }}>{item.icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <Typography.Text strong style={{ fontSize: 16 }}>
                      {item.label}
                    </Typography.Text>
                    <div>
                      <Typography.Text type="secondary">{item.description}</Typography.Text>
                    </div>
                  </div>
                </Flex>
              </Card>
            </Link>
          </Col>
        ))}
      </Row>
    </>
  )
}
