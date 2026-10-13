import { EditOutlined, EyeOutlined, MoreOutlined, PlusOutlined } from '@ant-design/icons'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Alert, Button, Dropdown, Empty, Flex, Input, Select, Switch, Table, Tag, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../../api/errors'
import { listClassrooms } from '../../api/master'
import { listStudents } from '../../api/students'
import { PageHeader } from '../../components/PageHeader'
import { StudentStatusTag } from '../../components/StudentStatusTag'
import { useIsMobile } from '../../hooks/useIsMobile'
import { GENDER_LABELS, STUDENT_STATUS_LABELS } from '../../lib/constants'
import { formatDate } from '../../lib/format'
import { can } from '../../lib/permissions'
import { useUiStore } from '../../stores/ui'
import type { Student } from '../../types/api'
import { useMe } from '../auth/useMe'

const PER_PAGE = 15
const filterStyle = { flex: '1 1 170px', minWidth: 150, maxWidth: 300 } as const

export function StudentsPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { data: me } = useMe()
  const canManage = can(me, 'students.manage')
  const unit = useUiStore((s) => s.unit)

  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<string>()
  const [classroomId, setClassroomId] = useState<number>()
  const [unplaced, setUnplaced] = useState(false)

  const params = {
    page,
    per_page: PER_PAGE,
    q: q || undefined,
    status,
    unit: unit === 'ALL' ? undefined : unit,
    classroom_id: classroomId,
    unplaced: unplaced || undefined,
  }

  const students = useQuery({
    queryKey: ['students', params],
    queryFn: () => listStudents(params),
    placeholderData: keepPreviousData,
  })

  const classrooms = useQuery({
    queryKey: ['classrooms', { unit: unit === 'ALL' ? undefined : unit, scope: 'students-filter' }],
    queryFn: () => listClassrooms({ unit: unit === 'ALL' ? undefined : unit }),
    staleTime: 60_000,
  })

  const columns: TableColumnsType<Student> = [
    {
      title: 'Nama',
      key: 'name',
      render: (_, student) => (
        <div>
          <Typography.Text strong>{student.name}</Typography.Text>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              {student.nis ? `NIS ${student.nis}` : 'NIS belum ada'}
            </Typography.Text>
          </div>
          {isMobile && (
            <Flex gap={4} wrap style={{ marginTop: 4 }}>
              {student.classroom ? <Tag color="blue">{student.classroom.unit} {student.classroom.name}</Tag> : <Tag>Belum ditempatkan</Tag>}
              <StudentStatusTag status={student.status} />
            </Flex>
          )}
        </div>
      ),
    },
    {
      title: 'Kelas',
      key: 'classroom',
      responsive: ['md'],
      render: (_, student) =>
        student.classroom ? <Tag color="blue">{student.classroom.unit} {student.classroom.name}</Tag> : <Tag>Belum ditempatkan</Tag>,
    },
    { title: 'JK', dataIndex: 'gender', key: 'gender', responsive: ['lg'], render: (value: string) => GENDER_LABELS[value] ?? value },
    { title: 'Tanggal lahir', dataIndex: 'birth_date', key: 'birth_date', responsive: ['lg'], render: (value: string | null) => formatDate(value) },
    {
      title: 'Kontak wali',
      key: 'guardian',
      responsive: ['xl'],
      render: (_, student) => {
        const primary = student.guardians?.find((g) => g.is_primary_contact) ?? student.guardians?.[0]
        return primary ? `${primary.name}${primary.phone ? ` (${primary.phone})` : ''}` : '-'
      },
    },
    { title: 'Status', dataIndex: 'status', key: 'status', responsive: ['md'], render: (value: string) => <StudentStatusTag status={value} /> },
    {
      title: '',
      key: 'actions',
      width: 56,
      align: 'right',
      render: (_, student) => (
        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          menu={{
            items: [
              { key: 'view', icon: <EyeOutlined />, label: 'Lihat detail' },
              ...(canManage ? [{ key: 'edit', icon: <EditOutlined />, label: 'Ubah data' }] : []),
            ],
            onClick: ({ key, domEvent }) => {
              domEvent.stopPropagation()
              navigate(key === 'edit' ? `/siswa/${student.id}/ubah` : `/siswa/${student.id}`)
            },
          }}
        >
          <Button type="text" icon={<MoreOutlined />} aria-label={`Aksi untuk ${student.name}`} onClick={(e) => e.stopPropagation()} />
        </Dropdown>
      ),
    },
  ]

  const resetPage = () => setPage(1)

  return (
    <>
      <PageHeader
        title="Siswa"
        subtitle={unit === 'ALL' ? 'Semua unit (TK, SD, SMP)' : `Unit ${unit}`}
        actions={
          canManage && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/siswa/baru')}>
              Tambah siswa
            </Button>
          )
        }
      />

      <Flex wrap gap={12} align="center" style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Cari nama, NIS, atau NISN"
          allowClear
          onSearch={(value) => {
            setQ(value.trim())
            resetPage()
          }}
          style={{ ...filterStyle, maxWidth: 340 }}
        />
        <Select
          allowClear
          placeholder="Semua status"
          value={status}
          onChange={(value) => {
            setStatus(value)
            resetPage()
          }}
          options={Object.entries(STUDENT_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          style={filterStyle}
        />
        {canManage && (
          <Select
            allowClear
            showSearch={{ optionFilterProp: 'label' }}
            placeholder="Semua rombel"
            value={classroomId}
            onChange={(value) => {
              setClassroomId(value)
              resetPage()
            }}
            options={(classrooms.data ?? []).map((c) => ({ value: c.id, label: `${c.unit.code} ${c.name}` }))}
            style={filterStyle}
          />
        )}
        {canManage && (
          <Flex align="center" gap={8}>
            <Switch
              checked={unplaced}
              onChange={(checked) => {
                setUnplaced(checked)
                resetPage()
              }}
              aria-label="Hanya siswa yang belum ditempatkan"
            />
            <Typography.Text>Belum ditempatkan</Typography.Text>
          </Flex>
        )}
      </Flex>

      {students.isError && (
        <Alert
          type="error"
          showIcon
          title="Gagal memuat daftar siswa"
          description={getErrorMessage(students.error)}
          action={<Button size="small" onClick={() => void students.refetch()}>Coba lagi</Button>}
          style={{ marginBottom: 16 }}
        />
      )}

      <Table<Student>
        rowKey="id"
        columns={columns}
        dataSource={students.data?.data ?? []}
        loading={students.isFetching}
        size={isMobile ? 'small' : 'middle'}
        locale={{
          emptyText: (
            <Empty description={me && !canManage ? 'Belum ada siswa di kelas yang Anda walikan' : 'Belum ada siswa yang cocok'} />
          ),
        }}
        onRow={(student) => ({ onClick: () => navigate(`/siswa/${student.id}`), style: { cursor: 'pointer' } })}
        pagination={{
          current: page,
          pageSize: PER_PAGE,
          total: students.data?.meta.total ?? 0,
          showSizeChanger: false,
          simple: isMobile,
          onChange: setPage,
        }}
        style={{ background: '#fff', borderRadius: 8 }}
      />
    </>
  )
}
