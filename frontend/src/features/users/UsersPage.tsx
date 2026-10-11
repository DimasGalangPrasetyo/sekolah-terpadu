import {
  CheckCircleOutlined,
  EditOutlined,
  KeyOutlined,
  MoreOutlined,
  PlusOutlined,
  StopOutlined,
} from '@ant-design/icons'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Dropdown, Empty, Flex, Input, Select, Table, Tag, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import { useState } from 'react'
import { getErrorMessage } from '../../api/errors'
import { listRoles, listUsers, resetUserPassword, setUserActive } from '../../api/users'
import { PageHeader } from '../../components/PageHeader'
import { TemporaryPasswordModal, type TemporarySecret } from '../../components/TemporaryPasswordModal'
import { useIsMobile } from '../../hooks/useIsMobile'
import { ROLE_COLORS, ROLE_LABELS } from '../../lib/constants'
import { formatDateTime } from '../../lib/format'
import type { ManagedUser } from '../../types/api'
import { useMe } from '../auth/useMe'
import { UserFormDrawer } from './UserFormDrawer'

const PER_PAGE = 15

const filterStyle = { flex: '1 1 180px', minWidth: 160, maxWidth: 320 } as const

export function UsersPage() {
  const { message, modal } = App.useApp()
  const queryClient = useQueryClient()
  const { data: me } = useMe()
  const isMobile = useIsMobile()

  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [role, setRole] = useState<string>()
  const [status, setStatus] = useState<'active' | 'inactive'>()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<ManagedUser | null>(null)
  const [secret, setSecret] = useState<TemporarySecret | null>(null)

  const params = {
    page,
    per_page: PER_PAGE,
    q: q || undefined,
    role,
    is_active: status === undefined ? undefined : status === 'active',
  }

  const users = useQuery({
    queryKey: ['users', params],
    queryFn: () => listUsers(params),
    placeholderData: keepPreviousData,
  })
  const roles = useQuery({ queryKey: ['roles'], queryFn: listRoles, staleTime: Infinity })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['users'] })

  const resetMutation = useMutation({
    mutationFn: async (user: ManagedUser) => ({ user, password: await resetUserPassword(user.id) }),
    onSuccess: ({ user, password }) => {
      setSecret({ name: user.name, username: user.username, password })
      void refresh()
    },
    onError: (error) => message.error(getErrorMessage(error)),
  })

  const activeMutation = useMutation({
    mutationFn: ({ user, active }: { user: ManagedUser; active: boolean }) => setUserActive(user.id, active),
    onSuccess: (_, { active }) => {
      message.success(active ? 'Akun diaktifkan' : 'Akun dinonaktifkan')
      void refresh()
    },
    onError: (error) => message.error(getErrorMessage(error)),
  })

  const openCreate = () => {
    setEditing(null)
    setDrawerOpen(true)
  }

  const confirmReset = (user: ManagedUser) =>
    modal.confirm({
      title: `Reset password ${user.name}?`,
      content: 'Password lama tidak berlaku lagi dan semua sesi akun ini diakhiri. Password sementara baru akan ditampilkan satu kali.',
      okText: 'Reset password',
      cancelText: 'Batal',
      onOk: () => resetMutation.mutateAsync(user).catch(() => undefined),
    })

  const confirmToggle = (user: ManagedUser) => {
    const activate = !user.is_active
    modal.confirm({
      title: activate ? `Aktifkan akun ${user.name}?` : `Nonaktifkan akun ${user.name}?`,
      content: activate ? 'Pemilik akun dapat masuk kembali.' : 'Pemilik akun tidak dapat masuk dan sesinya diakhiri. Riwayat tetap tersimpan.',
      okText: activate ? 'Aktifkan' : 'Nonaktifkan',
      okButtonProps: { danger: !activate },
      cancelText: 'Batal',
      onOk: () => activeMutation.mutateAsync({ user, active: activate }).catch(() => undefined),
    })
  }

  const columns: TableColumnsType<ManagedUser> = [
    {
      title: 'Nama',
      key: 'name',
      render: (_, user) => (
        <div>
          <Typography.Text strong>{user.name}</Typography.Text>{' '}
          {!user.is_active && <Tag>Nonaktif</Tag>}
          <div>
            <Typography.Text type="secondary">{user.username}</Typography.Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Peran',
      dataIndex: 'role',
      key: 'role',
      render: (value: string | null) =>
        value ? <Tag color={ROLE_COLORS[value]}>{ROLE_LABELS[value] ?? value}</Tag> : '-',
    },
    { title: 'Staf', key: 'staff', responsive: ['md'], render: (_, user) => user.staff?.name ?? '-' },
    {
      title: 'Status',
      key: 'status',
      responsive: ['md'],
      render: (_, user) => (
        <Flex gap={4} wrap>
          <Tag color={user.is_active ? 'success' : 'default'}>{user.is_active ? 'Aktif' : 'Nonaktif'}</Tag>
          {user.must_change_password && <Tag color="warning">Password sementara</Tag>}
        </Flex>
      ),
    },
    {
      title: 'Terakhir masuk',
      dataIndex: 'last_login_at',
      key: 'last_login_at',
      responsive: ['lg'],
      render: (value: string | null) => formatDateTime(value),
    },
    {
      title: '',
      key: 'actions',
      width: 56,
      align: 'right',
      render: (_, user) => (
        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          menu={{
            items: [
              { key: 'edit', icon: <EditOutlined />, label: 'Ubah data' },
              {
                key: 'reset',
                icon: <KeyOutlined />,
                label: user.id === me?.id ? 'Reset password (akun sendiri: pakai Ganti password)' : 'Reset password',
                disabled: user.id === me?.id,
              },
              {
                key: 'toggle',
                icon: user.is_active ? <StopOutlined /> : <CheckCircleOutlined />,
                label: user.is_active ? 'Nonaktifkan' : 'Aktifkan',
                danger: user.is_active,
                disabled: user.id === me?.id,
              },
            ],
            onClick: ({ key }) => {
              if (key === 'edit') {
                setEditing(user)
                setDrawerOpen(true)
              }
              if (key === 'reset') confirmReset(user)
              if (key === 'toggle') confirmToggle(user)
            },
          }}
        >
          <Button type="text" icon={<MoreOutlined />} aria-label={`Aksi untuk ${user.name}`} />
        </Dropdown>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Akun dan Peran"
        subtitle="Kelola akun pengguna. Satu akun untuk satu orang."
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Tambah akun
          </Button>
        }
      />

      <Flex wrap gap={12} style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Cari nama atau username"
          allowClear
          onSearch={(value) => {
            setQ(value.trim())
            setPage(1)
          }}
          style={filterStyle}
        />
        <Select
          allowClear
          placeholder="Semua peran"
          value={role}
          onChange={(value) => {
            setRole(value)
            setPage(1)
          }}
          options={(roles.data ?? []).map((r) => ({ value: r.name, label: r.label }))}
          style={filterStyle}
        />
        <Select
          allowClear
          placeholder="Semua status"
          value={status}
          onChange={(value) => {
            setStatus(value)
            setPage(1)
          }}
          options={[
            { value: 'active', label: 'Aktif' },
            { value: 'inactive', label: 'Nonaktif' },
          ]}
          style={filterStyle}
        />
      </Flex>

      {users.isError && (
        <Alert
          type="error"
          showIcon
          title="Gagal memuat daftar akun"
          description={getErrorMessage(users.error)}
          action={<Button size="small" onClick={() => void users.refetch()}>Coba lagi</Button>}
          style={{ marginBottom: 16 }}
        />
      )}

      <Table<ManagedUser>
        rowKey="id"
        columns={columns}
        dataSource={users.data?.data ?? []}
        loading={users.isFetching}
        size={isMobile ? 'small' : 'middle'}
        locale={{ emptyText: <Empty description="Belum ada akun yang cocok" /> }}
        pagination={{
          current: page,
          pageSize: PER_PAGE,
          total: users.data?.meta.total ?? 0,
          showSizeChanger: false,
          simple: isMobile,
          onChange: setPage,
        }}
        style={{ background: '#fff', borderRadius: 8 }}
      />

      <UserFormDrawer
        open={drawerOpen}
        user={editing}
        roles={roles.data ?? []}
        onClose={() => setDrawerOpen(false)}
        onCreated={(created) => {
          setDrawerOpen(false)
          setSecret(created)
          void refresh()
        }}
        onUpdated={() => {
          setDrawerOpen(false)
          message.success('Perubahan disimpan')
          void refresh()
        }}
      />

      <TemporaryPasswordModal secret={secret} onClose={() => setSecret(null)} />
    </>
  )
}
