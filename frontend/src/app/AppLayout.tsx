import { KeyOutlined, LogoutOutlined, MenuFoldOutlined, MenuOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import { Avatar, Button, Drawer, Dropdown, Flex, Layout, Menu, Modal, Spin, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { Suspense, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AcademicContextTag } from '../components/AcademicContextTag'
import { UnitSwitcher } from '../components/UnitSwitcher'
import { performLogout } from '../features/auth/actions'
import { useMe } from '../features/auth/useMe'
import { useIdleLogout } from '../hooks/useIdleLogout'
import { useIsMobile } from '../hooks/useIsMobile'
import { IDLE_MINUTES, IDLE_WARNING_SECONDS, ROLE_LABELS } from '../lib/constants'
import { initials } from '../lib/format'
import { can } from '../lib/permissions'
import { useUiStore } from '../stores/ui'
import { activeNavKey, visibleNav } from './navigation'

const { Header, Sider, Content } = Layout

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Flex align="center" gap={10} style={{ padding: '14px 16px', minHeight: 56 }}>
      <div
        aria-hidden
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: '#0f766e',
          color: '#fff',
          display: 'grid',
          placeItems: 'center',
          fontWeight: 700,
          flex: '0 0 auto',
        }}
      >
        ST
      </div>
      {!collapsed && (
        <Typography.Text strong style={{ fontSize: 16, whiteSpace: 'nowrap' }}>
          Sekolah Terpadu
        </Typography.Text>
      )}
    </Flex>
  )
}

export function AppLayout() {
  const { data: user } = useMe()
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const collapsed = useUiStore((s) => s.siderCollapsed)
  const setCollapsed = useUiStore((s) => s.setSiderCollapsed)

  const { secondsLeft, stay } = useIdleLogout(Boolean(user), IDLE_MINUTES * 60, IDLE_WARNING_SECONDS, () => {
    void performLogout()
  })

  const menuItems = useMemo<MenuProps['items']>(() => {
    if (!user) return []
    const items = visibleNav(user)
    const toItem = (item: (typeof items)[number]) => ({ key: item.key, icon: item.icon, label: item.label })
    const main = items.filter((i) => i.group === 'main').map(toItem)
    const settings = items.filter((i) => i.group === 'settings').map(toItem)

    return settings.length > 0 ? [...main, { type: 'divider' as const }, ...settings] : main
  }, [user])

  if (!user) return null

  const pathByKey = Object.fromEntries(visibleNav(user).map((i) => [i.key, i.path]))

  const navigateTo: MenuProps['onClick'] = ({ key }) => {
    const path = pathByKey[key]
    if (path) navigate(path)
    setDrawerOpen(false)
  }

  const menu = (
    <Menu
      mode="inline"
      selectedKeys={[activeNavKey(pathname)]}
      items={menuItems}
      onClick={navigateTo}
      style={{ borderInlineEnd: 0, padding: '0 8px 16px' }}
    />
  )

  const userMenu: MenuProps = {
    items: [
      { key: 'password', icon: <KeyOutlined />, label: 'Ganti password' },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Keluar', danger: true },
    ],
    onClick: ({ key }) => {
      if (key === 'password') navigate('/ganti-password')
      if (key === 'logout') void performLogout().then(() => navigate('/masuk', { replace: true }))
    },
  }

  const roleLabel = ROLE_LABELS[user.roles[0] ?? ''] ?? ''

  return (
    <Layout hasSider style={{ minHeight: '100vh' }}>
      {!isMobile && (
        <Sider
          width={248}
          collapsedWidth={72}
          collapsed={collapsed}
          trigger={null}
          style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'auto', borderInlineEnd: '1px solid #e8eceb' }}
        >
          <Brand collapsed={collapsed} />
          {menu}
        </Sider>
      )}

      {isMobile && (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          placement="left"
          size={280}
          title={null}
          closable={false}
          styles={{ body: { padding: 0 } }}
        >
          <Brand />
          {menu}
        </Drawer>
      )}

      <Layout style={{ minWidth: 0 }}>
        <Header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            borderBottom: '1px solid #e8eceb',
          }}
        >
          <Flex align="center" gap={8} style={{ minWidth: 0 }}>
            {isMobile ? (
              <Button type="text" icon={<MenuOutlined />} onClick={() => setDrawerOpen(true)} aria-label="Buka menu" />
            ) : (
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                aria-label={collapsed ? 'Perluas menu' : 'Ciutkan menu'}
              />
            )}
            <UnitSwitcher compact={isMobile} />
          </Flex>

          <Flex align="center" gap={8}>
          {!isMobile && can(user, 'master.view') && <AcademicContextTag />}
          <Dropdown menu={userMenu} trigger={['click']} placement="bottomRight">
            <Button type="text" style={{ height: 'auto', padding: '4px 8px' }} aria-label="Menu pengguna">
              <Flex align="center" gap={8}>
                <Avatar style={{ background: '#0f766e' }}>{initials(user.name)}</Avatar>
                {!isMobile && (
                  <div style={{ textAlign: 'left', lineHeight: 1.25 }}>
                    <div style={{ fontWeight: 600 }}>{user.name}</div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {roleLabel}
                    </Typography.Text>
                  </div>
                )}
              </Flex>
            </Button>
          </Dropdown>
          </Flex>
        </Header>

        <Content style={{ padding: isMobile ? 12 : 24, minWidth: 0 }}>
          <Suspense fallback={<Flex justify="center" style={{ padding: 48 }}><Spin /></Flex>}>
            <Outlet />
          </Suspense>
        </Content>
      </Layout>

      <Modal
        open={secondsLeft !== null}
        title="Sesi hampir berakhir"
        closable={false}
        mask={{ closable: false }}
        keyboard={false}
        okText="Tetap masuk"
        cancelText="Keluar sekarang"
        onOk={stay}
        onCancel={() => void performLogout().then(() => navigate('/masuk', { replace: true }))}
      >
        Anda tidak aktif beberapa saat. Demi keamanan, Anda akan keluar otomatis dalam{' '}
        <strong>{secondsLeft ?? 0} detik</strong>.
      </Modal>
    </Layout>
  )
}
