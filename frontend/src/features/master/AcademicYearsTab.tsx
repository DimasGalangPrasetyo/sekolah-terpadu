import { CheckCircleOutlined, DeleteOutlined, EditOutlined, MoreOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Dropdown, Empty, Flex, Table, Tag, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import { useState } from 'react'
import { getErrorMessage } from '../../api/errors'
import { activateAcademicYear, activateSemester, deleteAcademicYear, listAcademicYears } from '../../api/master'
import { useIsMobile } from '../../hooks/useIsMobile'
import { SEMESTER_LABELS } from '../../lib/constants'
import { formatDate } from '../../lib/format'
import type { AcademicYear } from '../../types/api'
import { AcademicYearDrawer } from './AcademicYearDrawer'

export function AcademicYearsTab() {
  const { message, modal } = App.useApp()
  const queryClient = useQueryClient()
  const isMobile = useIsMobile()
  const [editing, setEditing] = useState<AcademicYear | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const years = useQuery({ queryKey: ['academic-years'], queryFn: listAcademicYears })

  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['academic-years'] })
    void queryClient.invalidateQueries({ queryKey: ['academic-context'] })
    void queryClient.invalidateQueries({ queryKey: ['classrooms'] })
    void queryClient.invalidateQueries({ queryKey: ['students'] })
  }

  const activateMutation = useMutation({
    mutationFn: ({ kind, id }: { kind: 'year' | 'semester'; id: number }) =>
      kind === 'year' ? activateAcademicYear(id) : activateSemester(id),
    onSuccess: () => {
      message.success('Perubahan diterapkan')
      refreshAll()
    },
    onError: (error) => message.error(getErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: (year: AcademicYear) => deleteAcademicYear(year.id),
    onSuccess: () => {
      message.success('Tahun ajaran dihapus')
      refreshAll()
    },
    onError: (error) => message.error(getErrorMessage(error)),
  })

  const confirmActivate = (kind: 'year' | 'semester', id: number, label: string) =>
    modal.confirm({
      title: `Aktifkan ${label}?`,
      content: 'Tahun ajaran dan semester aktif menentukan data yang tampil di seluruh aplikasi (rombel, penempatan siswa, rapor).',
      okText: 'Aktifkan',
      cancelText: 'Batal',
      onOk: () => activateMutation.mutateAsync({ kind, id }).catch(() => undefined),
    })

  const confirmDelete = (year: AcademicYear) =>
    modal.confirm({
      title: `Hapus tahun ajaran ${year.name}?`,
      content: 'Hanya tahun ajaran yang belum memiliki rombel yang dapat dihapus.',
      okText: 'Hapus',
      okButtonProps: { danger: true },
      cancelText: 'Batal',
      onOk: () => deleteMutation.mutateAsync(year).catch(() => undefined),
    })

  const columns: TableColumnsType<AcademicYear> = [
    {
      title: 'Tahun ajaran',
      key: 'name',
      render: (_, year) => (
        <div>
          <Typography.Text strong>{year.name}</Typography.Text> {year.is_active && <Tag color="success">Aktif</Tag>}
          {isMobile && (
            <div>
              <Typography.Text type="secondary">
                {formatDate(year.start_date)} - {formatDate(year.end_date)}
              </Typography.Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Periode',
      key: 'period',
      responsive: ['md'],
      render: (_, year) => `${formatDate(year.start_date)} - ${formatDate(year.end_date)}`,
    },
    {
      title: 'Semester',
      key: 'semesters',
      responsive: ['md'],
      render: (_, year) => (
        <Flex vertical gap={2}>
          {year.semesters.map((s) => (
            <span key={s.id}>
              <Tag color={s.is_active ? 'success' : 'default'}>{SEMESTER_LABELS[s.name]}{s.is_active ? ' (aktif)' : ''}</Tag>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {formatDate(s.start_date)} - {formatDate(s.end_date)}
              </Typography.Text>
            </span>
          ))}
        </Flex>
      ),
    },
    { title: 'Rombel', dataIndex: 'classrooms_count', key: 'classrooms', responsive: ['lg'], render: (v: number | undefined) => v ?? 0 },
    {
      title: '',
      key: 'actions',
      width: 56,
      align: 'right',
      render: (_, year) => {
        const semesterItems = year.semesters.map((s) => ({
          key: `sem-${s.id}`,
          icon: <CheckCircleOutlined />,
          label: `Aktifkan semester ${SEMESTER_LABELS[s.name]}`,
          disabled: s.is_active,
        }))

        return (
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            menu={{
              items: [
                { key: 'edit', icon: <EditOutlined />, label: 'Ubah' },
                { key: 'year', icon: <CheckCircleOutlined />, label: 'Jadikan tahun ajaran aktif', disabled: year.is_active },
                ...semesterItems,
                { type: 'divider' },
                { key: 'delete', icon: <DeleteOutlined />, label: 'Hapus', danger: true, disabled: year.is_active || (year.classrooms_count ?? 0) > 0 },
              ],
              onClick: ({ key }) => {
                if (key === 'edit') {
                  setEditing(year)
                  setDrawerOpen(true)
                } else if (key === 'year') {
                  confirmActivate('year', year.id, `tahun ajaran ${year.name}`)
                } else if (key === 'delete') {
                  confirmDelete(year)
                } else if (typeof key === 'string' && key.startsWith('sem-')) {
                  const semester = year.semesters.find((s) => `sem-${s.id}` === key)
                  if (semester) confirmActivate('semester', semester.id, `semester ${SEMESTER_LABELS[semester.name]} ${year.name}`)
                }
              },
            }}
          >
            <Button type="text" icon={<MoreOutlined />} aria-label={`Aksi untuk ${year.name}`} />
          </Dropdown>
        )
      },
    },
  ]

  return (
    <>
      <Flex justify="space-between" align="center" wrap gap={8} style={{ marginBottom: 12 }}>
        <Typography.Text type="secondary">Satu tahun ajaran dan satu semester aktif pada satu waktu.</Typography.Text>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditing(null)
            setDrawerOpen(true)
          }}
        >
          Tambah tahun ajaran
        </Button>
      </Flex>

      {years.isError && (
        <Alert
          type="error"
          showIcon
          title="Gagal memuat tahun ajaran"
          description={getErrorMessage(years.error)}
          action={<Button size="small" onClick={() => void years.refetch()}>Coba lagi</Button>}
          style={{ marginBottom: 12 }}
        />
      )}

      <Table<AcademicYear>
        rowKey="id"
        columns={columns}
        dataSource={years.data ?? []}
        loading={years.isFetching}
        pagination={false}
        size={isMobile ? 'small' : 'middle'}
        locale={{ emptyText: <Empty description="Belum ada tahun ajaran. Tambahkan yang pertama." /> }}
        style={{ background: '#fff', borderRadius: 8 }}
      />

      <AcademicYearDrawer open={drawerOpen} year={editing} onClose={() => setDrawerOpen(false)} />
    </>
  )
}
