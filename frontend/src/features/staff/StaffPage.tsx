import { EditOutlined, ExclamationCircleOutlined, MoreOutlined, PlusOutlined, StopOutlined, CheckCircleOutlined, DeleteOutlined } from '@ant-design/icons'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Dropdown, Empty, Flex, Input, Modal, Select, Table, Tag, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import { useState } from 'react'
import { getErrorMessage } from '../../api/errors'
import { PageHeader } from '../../components/PageHeader'
import { useIsMobile } from '../../hooks/useIsMobile'
import { can } from '../../lib/permissions'
import { useUiStore } from '../../stores/ui'
import { useMe } from '../auth/useMe'
import { activateStaff, deactivateStaff, deleteStaff, listStaff } from './api'
import { StaffDrawer } from './StaffDrawer'
import type { Staff } from './types'

const PER_PAGE = 15
const filterStyle = { flex: '1 1 170px', minWidth: 150, maxWidth: 300 } as const

const EMPLOYMENT_LABELS: Record<string, string> = {
  permanent: 'Tetap',
  honorary: 'Honorer',
  contract: 'Kontrak',
}

export function StaffPage() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const isMobile = useIsMobile()
  const { data: me } = useMe()
  const canManage = can(me, 'staff.manage')
  const unit = useUiStore((s) => s.unit)

  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [isTeacher, setIsTeacher] = useState<string>()
  const [isActive, setIsActive] = useState<string>()
  const [employmentStatus, setEmploymentStatus] = useState<string>()

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)

  const params = {
    page,
    per_page: PER_PAGE,
    q: q || undefined,
    is_teacher: isTeacher !== undefined && isTeacher !== '' ? isTeacher : undefined,
    is_active: isActive !== undefined && isActive !== '' ? isActive : undefined,
    employment_status: employmentStatus || undefined,
    unit: unit === 'ALL' ? undefined : unit,
  }

  const staffQuery = useQuery({
    queryKey: ['staff', params],
    queryFn: () => listStaff(params),
    placeholderData: keepPreviousData,
  })

  const resetPage = () => setPage(1)

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => deactivateStaff(id),
    onSuccess: () => {
      message.success('Staf berhasil dinonaktifkan')
      void queryClient.invalidateQueries({ queryKey: ['staff'] })
    },
    onError: (err) => message.error(getErrorMessage(err)),
  })

  const activateMutation = useMutation({
    mutationFn: (id: number) => activateStaff(id),
    onSuccess: () => {
      message.success('Staf berhasil diaktifkan')
      void queryClient.invalidateQueries({ queryKey: ['staff'] })
    },
    onError: (err) => message.error(getErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteStaff(id),
    onSuccess: () => {
      message.success('Data staf berhasil dihapus')
      void queryClient.invalidateQueries({ queryKey: ['staff'] })
    },
    onError: (err) => message.error(getErrorMessage(err)),
  })

  const handleDeactivate = (staff: Staff) => {
    Modal.confirm({
      title: `Nonaktifkan ${staff.name}?`,
      icon: <ExclamationCircleOutlined />,
      content: 'Staf nonaktif tidak dapat ditugaskan sebagai wali kelas baru.',
      okText: 'Nonaktifkan',
      okType: 'danger',
      cancelText: 'Batal',
      onOk: () => deactivateMutation.mutateAsync(staff.id),
    })
  }

  const handleActivate = (staff: Staff) => {
    activateMutation.mutate(staff.id)
  }

  const handleDelete = (staff: Staff) => {
    Modal.confirm({
      title: `Hapus staf ${staff.name}?`,
      icon: <ExclamationCircleOutlined />,
      content: 'Data staf akan dihapus (soft delete). Aksi ini akan ditolak jika staf memiliki akun pengguna, pernah menjadi wali kelas, bertanggung jawab atas aset, atau mengepalai unit.',
      okText: 'Hapus',
      okType: 'danger',
      cancelText: 'Batal',
      onOk: () => deleteMutation.mutateAsync(staff.id),
    })
  }

  const columns: TableColumnsType<Staff> = [
    {
      title: 'Nama',
      key: 'name',
      render: (_, staff) => (
        <div>
          <Typography.Text strong>{staff.name}</Typography.Text>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              {staff.nip ? `NIP ${staff.nip}` : 'NIP belum ada'}
            </Typography.Text>
          </div>
          {isMobile && (
            <Flex gap={4} wrap style={{ marginTop: 4 }}>
              <Tag>{staff.position}</Tag>
              {staff.assignments.length > 0 ? (
                staff.assignments.map((a) => (
                  <Tag key={a.id} color="blue">
                    {a.unit?.code ?? a.unit_id}
                  </Tag>
                ))
              ) : (
                <Tag>Tanpa unit</Tag>
              )}
              {staff.is_active ? <Tag color="success">Aktif</Tag> : <Tag>Nonaktif</Tag>}
            </Flex>
          )}
        </div>
      ),
    },
    {
      title: 'Jabatan',
      dataIndex: 'position',
      key: 'position',
      responsive: ['sm'],
    },
    {
      title: 'Unit',
      key: 'unit',
      render: (_, staff) => (
        <Flex gap={4} wrap>
          {staff.assignments.length > 0 ? (
            staff.assignments.map((a) => (
              <Tag key={a.id} color="blue">
                {a.unit?.code ?? a.unit_id}
              </Tag>
            ))
          ) : (
            <Tag>Belum ditugaskan</Tag>
          )}
        </Flex>
      ),
    },
    {
      title: 'Status Kepegawaian',
      key: 'employment_status',
      responsive: ['md'],
      render: (_, staff) => EMPLOYMENT_LABELS[staff.employment_status] ?? staff.employment_status,
    },
    {
      title: 'Guru',
      key: 'is_teacher',
      responsive: ['lg'],
      render: (_, staff) =>
        staff.is_teacher ? <Tag color="cyan">Guru</Tag> : <Tag>Bukan</Tag>,
    },
    {
      title: 'Wali Kelas',
      key: 'homeroom',
      responsive: ['md'],
      render: (_, staff) =>
        staff.homerooms && staff.homerooms.length > 0 ? (
          <Flex gap={4} wrap>
            {staff.homerooms.map((h) => (
              <Tag key={h.id} color="purple">
                {h.unit} {h.name}
              </Tag>
            ))}
          </Flex>
        ) : (
          '-'
        ),
    },
    {
      title: 'Akun',
      key: 'account',
      responsive: ['lg'],
      render: (_, staff) =>
        staff.has_account ? (
          <Tag color="green">{staff.account_username ?? 'Ada'}</Tag>
        ) : (
          <Tag>Belum ada</Tag>
        ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, staff) =>
        staff.is_active ? <Tag color="success">Aktif</Tag> : <Tag>Nonaktif</Tag>,
    },
    {
      title: '',
      key: 'actions',
      width: 56,
      align: 'right',
      render: (_, staff) => (
        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          menu={{
            items: [
              ...(canManage
                ? [
                    {
                      key: 'edit',
                      icon: <EditOutlined />,
                      label: 'Ubah data',
                    },
                    staff.is_active
                      ? {
                          key: 'deactivate',
                          icon: <StopOutlined />,
                          label: 'Nonaktifkan',
                          danger: true,
                        }
                      : {
                          key: 'activate',
                          icon: <CheckCircleOutlined />,
                          label: 'Aktifkan',
                        },
                    {
                      type: 'divider' as const,
                    },
                    {
                      key: 'delete',
                      icon: <DeleteOutlined />,
                      label: 'Hapus staf',
                      danger: true,
                    },
                  ]
                : []),
            ],
            onClick: ({ key, domEvent }) => {
              domEvent.stopPropagation()
              if (key === 'edit') {
                setSelectedStaff(staff)
                setDrawerOpen(true)
              } else if (key === 'deactivate') {
                handleDeactivate(staff)
              } else if (key === 'activate') {
                handleActivate(staff)
              } else if (key === 'delete') {
                handleDelete(staff)
              }
            },
          }}
        >
          <Button
            type="text"
            icon={<MoreOutlined />}
            aria-label={`Menu aksi untuk ${staff.name}`}
            onClick={(e) => e.stopPropagation()}
          />
        </Dropdown>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Staf"
        subtitle={unit === 'ALL' ? 'Data guru dan tenaga kependidikan semua unit (TK, SD, SMP)' : `Data guru dan tenaga kependidikan Unit ${unit}`}
        actions={
          canManage && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setSelectedStaff(null)
                setDrawerOpen(true)
              }}
            >
              Tambah Staf
            </Button>
          )
        }
      />

      <Flex wrap gap={12} align="center" style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Cari nama, NIP, atau NUPTK"
          allowClear
          onSearch={(value) => {
            setQ(value.trim())
            resetPage()
          }}
          style={{ ...filterStyle, maxWidth: 320 }}
        />

        <Select
          allowClear
          placeholder="Semua peran (Guru/Staf)"
          value={isTeacher}
          onChange={(val) => {
            setIsTeacher(val)
            resetPage()
          }}
          options={[
            { value: '1', label: 'Hanya Guru' },
            { value: '0', label: 'Tenaga Kependidikan / Staf' },
          ]}
          style={filterStyle}
        />

        <Select
          allowClear
          placeholder="Semua kepegawaian"
          value={employmentStatus}
          onChange={(val) => {
            setEmploymentStatus(val)
            resetPage()
          }}
          options={[
            { value: 'permanent', label: 'Pegawai Tetap' },
            { value: 'honorary', label: 'Pegawai Honorer' },
            { value: 'contract', label: 'Pegawai Kontrak' },
          ]}
          style={filterStyle}
        />

        <Select
          allowClear
          placeholder="Semua status"
          value={isActive}
          onChange={(val) => {
            setIsActive(val)
            resetPage()
          }}
          options={[
            { value: '1', label: 'Aktif' },
            { value: '0', label: 'Nonaktif' },
          ]}
          style={filterStyle}
        />
      </Flex>

      {staffQuery.isError && (
        <Alert
          type="error"
          showIcon
          title="Gagal memuat daftar staf"
          description={getErrorMessage(staffQuery.error)}
          action={
            <Button size="small" onClick={() => void staffQuery.refetch()}>
              Coba lagi
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      <Table<Staff>
        rowKey="id"
        columns={columns}
        dataSource={staffQuery.data?.data ?? []}
        loading={staffQuery.isFetching}
        size={isMobile ? 'small' : 'middle'}
        locale={{
          emptyText: <Empty description="Belum ada data staf yang cocok" />,
        }}
        pagination={{
          current: page,
          pageSize: PER_PAGE,
          total: staffQuery.data?.meta.total ?? 0,
          showSizeChanger: false,
          simple: isMobile,
          onChange: setPage,
        }}
        style={{ background: '#fff', borderRadius: 8 }}
      />

      <StaffDrawer
        open={drawerOpen}
        staff={selectedStaff}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => void queryClient.invalidateQueries({ queryKey: ['staff'] })}
      />
    </>
  )
}
