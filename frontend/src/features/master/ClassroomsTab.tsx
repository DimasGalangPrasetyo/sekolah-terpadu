import { DeleteOutlined, EditOutlined, MoreOutlined, PlusOutlined } from '@ant-design/icons'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Dropdown, Empty, Flex, Select, Table, Tag, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import { useState } from 'react'
import { getErrorMessage } from '../../api/errors'
import { deleteClassroom, listAcademicYears, listClassrooms } from '../../api/master'
import { useIsMobile } from '../../hooks/useIsMobile'
import { UNIT_OPTIONS } from '../../lib/constants'
import { useUiStore } from '../../stores/ui'
import type { Classroom } from '../../types/api'
import { ClassroomDrawer } from './ClassroomDrawer'

export function ClassroomsTab() {
  const { message, modal } = App.useApp()
  const queryClient = useQueryClient()
  const isMobile = useIsMobile()
  const globalUnit = useUiStore((s) => s.unit)
  const [yearId, setYearId] = useState<number>()
  const [unit, setUnit] = useState<string>(globalUnit)
  const [editing, setEditing] = useState<Classroom | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const years = useQuery({ queryKey: ['academic-years'], queryFn: listAcademicYears })
  const activeYear = years.data?.find((y) => y.is_active)
  const effectiveYearId = yearId ?? activeYear?.id

  const params = { academic_year_id: effectiveYearId, unit: unit === 'ALL' ? undefined : unit }
  const classrooms = useQuery({
    queryKey: ['classrooms', params],
    queryFn: () => listClassrooms(params),
    enabled: effectiveYearId !== undefined,
    placeholderData: keepPreviousData,
  })

  const deleteMutation = useMutation({
    mutationFn: (classroom: Classroom) => deleteClassroom(classroom.id),
    onSuccess: () => {
      message.success('Rombel dihapus')
      void queryClient.invalidateQueries({ queryKey: ['classrooms'] })
      void queryClient.invalidateQueries({ queryKey: ['academic-years'] })
    },
    onError: (error) => message.error(getErrorMessage(error)),
  })

  const confirmDelete = (classroom: Classroom) =>
    modal.confirm({
      title: `Hapus rombel ${classroom.name}?`,
      content: 'Hanya rombel yang belum memiliki siswa yang dapat dihapus.',
      okText: 'Hapus',
      okButtonProps: { danger: true },
      cancelText: 'Batal',
      onOk: () => deleteMutation.mutateAsync(classroom).catch(() => undefined),
    })

  const columns: TableColumnsType<Classroom> = [
    {
      title: 'Rombel',
      key: 'name',
      render: (_, room) => (
        <div>
          <Tag color="blue">{room.unit.code}</Tag>
          <Typography.Text strong>{room.name}</Typography.Text>
          {isMobile && (
            <div>
              <Typography.Text type="secondary">{room.homeroom ? `Wali: ${room.homeroom.name}` : 'Belum ada wali kelas'}</Typography.Text>
            </div>
          )}
        </div>
      ),
    },
    { title: 'Tingkat', key: 'grade', responsive: ['md'], render: (_, room) => room.grade_level.name },
    {
      title: 'Wali kelas',
      key: 'homeroom',
      responsive: ['md'],
      render: (_, room) => room.homeroom?.name ?? <Tag color="warning">Belum ada</Tag>,
    },
    {
      title: 'Siswa',
      key: 'students',
      render: (_, room) => `${room.students_count ?? 0}${room.capacity ? ` / ${room.capacity}` : ''}`,
    },
    {
      title: '',
      key: 'actions',
      width: 56,
      align: 'right',
      render: (_, room) => (
        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          menu={{
            items: [
              { key: 'edit', icon: <EditOutlined />, label: 'Ubah' },
              { key: 'delete', icon: <DeleteOutlined />, label: 'Hapus', danger: true, disabled: (room.students_count ?? 0) > 0 },
            ],
            onClick: ({ key }) => {
              if (key === 'edit') {
                setEditing(room)
                setDrawerOpen(true)
              }
              if (key === 'delete') confirmDelete(room)
            },
          }}
        >
          <Button type="text" icon={<MoreOutlined />} aria-label={`Aksi untuk rombel ${room.name}`} />
        </Dropdown>
      ),
    },
  ]

  return (
    <>
      <Flex wrap gap={12} justify="space-between" style={{ marginBottom: 12 }}>
        <Flex wrap gap={12} style={{ flex: '1 1 320px' }}>
          <Select
            value={effectiveYearId}
            onChange={setYearId}
            placeholder="Tahun ajaran"
            options={(years.data ?? []).map((y) => ({ value: y.id, label: y.is_active ? `${y.name} (aktif)` : y.name }))}
            style={{ flex: '1 1 170px', maxWidth: 240 }}
          />
          <Select value={unit} onChange={setUnit} options={[...UNIT_OPTIONS]} style={{ flex: '1 1 110px', maxWidth: 140 }} />
        </Flex>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          disabled={!years.data?.length}
          onClick={() => {
            setEditing(null)
            setDrawerOpen(true)
          }}
        >
          Tambah rombel
        </Button>
      </Flex>

      {!years.isPending && !activeYear && (
        <Alert
          type="warning"
          showIcon
          title="Belum ada tahun ajaran aktif"
          description="Buat dan aktifkan tahun ajaran di tab Tahun Ajaran agar rombel dan penempatan siswa dapat dipakai."
          style={{ marginBottom: 12 }}
        />
      )}

      {classrooms.isError && (
        <Alert type="error" showIcon title="Gagal memuat rombel" description={getErrorMessage(classrooms.error)} style={{ marginBottom: 12 }} />
      )}

      <Table<Classroom>
        rowKey="id"
        columns={columns}
        dataSource={classrooms.data ?? []}
        loading={classrooms.isFetching}
        pagination={false}
        size={isMobile ? 'small' : 'middle'}
        locale={{ emptyText: <Empty description="Belum ada rombel pada pilihan ini" /> }}
        style={{ background: '#fff', borderRadius: 8 }}
      />

      <ClassroomDrawer
        open={drawerOpen}
        classroom={editing}
        years={years.data ?? []}
        defaultYearId={effectiveYearId}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  )
}
