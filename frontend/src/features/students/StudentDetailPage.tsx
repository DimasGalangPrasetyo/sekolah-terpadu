import { DeleteOutlined, EditOutlined, RetweetOutlined, SwapOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Card, Col, Empty, Flex, Row, Skeleton, Tag, Timeline, Typography } from 'antd'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getErrorMessage, getStatus } from '../../api/errors'
import { deleteStudent, getStudent } from '../../api/students'
import { PageHeader } from '../../components/PageHeader'
import { StudentStatusTag } from '../../components/StudentStatusTag'
import { GENDER_LABELS, GUARDIAN_LABELS, STUDENT_STATUS_LABELS } from '../../lib/constants'
import { formatDate } from '../../lib/format'
import { can } from '../../lib/permissions'
import { useMe } from '../auth/useMe'
import { StudentPlaceModal, StudentStatusModal } from './StudentModals'

function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <Col xs={24} sm={wide ? 24 : 12}>
      <Typography.Text type="secondary" style={{ fontSize: 13 }}>
        {label}
      </Typography.Text>
      <div style={{ wordBreak: 'break-word' }}>{children}</div>
    </Col>
  )
}

export function StudentDetailPage() {
  const { id } = useParams()
  const studentId = Number(id)
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const queryClient = useQueryClient()
  const { data: me } = useMe()
  const canManage = can(me, 'students.manage')
  const [statusOpen, setStatusOpen] = useState(false)
  const [placeOpen, setPlaceOpen] = useState(false)

  const query = useQuery({ queryKey: ['student', studentId], queryFn: () => getStudent(studentId) })

  const deleteMutation = useMutation({
    mutationFn: () => deleteStudent(studentId),
    onSuccess: () => {
      message.success('Siswa dihapus')
      void queryClient.invalidateQueries({ queryKey: ['students'] })
      navigate('/siswa', { replace: true })
    },
    onError: (error) => message.error(getErrorMessage(error)),
  })

  if (query.isPending) return <Skeleton active paragraph={{ rows: 10 }} />

  if (query.isError) {
    const forbidden = getStatus(query.error) === 403
    return (
      <Alert
        type={forbidden ? 'warning' : 'error'}
        showIcon
        title={forbidden ? 'Anda tidak berhak melihat siswa ini' : 'Gagal memuat data siswa'}
        description={getErrorMessage(query.error)}
        action={<Button size="small" onClick={() => navigate('/siswa')}>Kembali ke daftar</Button>}
      />
    )
  }

  const student = query.data
  const confirmDelete = () =>
    modal.confirm({
      title: `Hapus ${student.name}?`,
      content: 'Siswa yang sudah punya data keuangan atau rapor tidak dapat dihapus; ubah statusnya menjadi nonaktif.',
      okText: 'Hapus',
      okButtonProps: { danger: true },
      cancelText: 'Batal',
      onOk: () => deleteMutation.mutateAsync().catch(() => undefined),
    })

  return (
    <>
      <PageHeader
        title={student.name}
        subtitle={student.nis ? `NIS ${student.nis}` : undefined}
        actions={
          canManage && (
            <Flex gap={8} wrap>
              <Button icon={<EditOutlined />} onClick={() => navigate(`/siswa/${student.id}/ubah`)}>Ubah</Button>
              <Button icon={<SwapOutlined />} onClick={() => setPlaceOpen(true)}>{student.classroom ? 'Pindah rombel' : 'Tempatkan'}</Button>
              <Button icon={<RetweetOutlined />} onClick={() => setStatusOpen(true)}>Ubah status</Button>
              <Button danger icon={<DeleteOutlined />} onClick={confirmDelete}>Hapus</Button>
            </Flex>
          )
        }
      />

      <Flex vertical gap={16}>
        <Card title="Data siswa">
          <Row gutter={[24, 12]}>
            <Field label="Status"><StudentStatusTag status={student.status} /></Field>
            <Field label="Rombel">
              {student.classroom ? <Tag color="blue">{student.classroom.unit} {student.classroom.name}</Tag> : <Tag>Belum ditempatkan</Tag>}
            </Field>
            <Field label="NISN">{student.nisn ?? '-'}</Field>
            <Field label="Jenis kelamin">{GENDER_LABELS[student.gender]}</Field>
            <Field label="Tempat, tanggal lahir">
              {[student.birth_place, formatDate(student.birth_date)].filter((v) => v && v !== '-').join(', ') || '-'}
            </Field>
            <Field label="Agama">{student.religion ?? '-'}</Field>
            <Field label="Telepon">{student.phone ?? '-'}</Field>
            <Field label="Tanggal masuk">{formatDate(student.entry_date)}</Field>
            <Field label="Asal sekolah" wide>{student.previous_school ?? '-'}</Field>
            <Field label="Alamat" wide>{student.address ?? '-'}</Field>
            <Field label="Catatan" wide>{student.notes ?? '-'}</Field>
          </Row>
        </Card>

        <Card title="Orang tua / wali">
          {student.guardians && student.guardians.length > 0 ? (
            <Flex vertical gap={12}>
              {student.guardians.map((g) => (
                <div key={g.id}>
                  <Typography.Text strong>{g.name}</Typography.Text>{' '}
                  <Tag>{GUARDIAN_LABELS[g.relation]}</Tag>
                  {g.is_primary_contact && <Tag color="green">Kontak utama</Tag>}
                  <div>
                    <Typography.Text type="secondary">
                      {[g.occupation, g.phone].filter(Boolean).join(' · ') || 'Tidak ada keterangan'}
                    </Typography.Text>
                  </div>
                </div>
              ))}
            </Flex>
          ) : (
            <Empty description="Belum ada data wali" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Card>

        <Card title="Riwayat status">
          {student.status_logs && student.status_logs.length > 0 ? (
            <Timeline
              items={student.status_logs.map((log) => ({
                key: log.id,
                content: (
                  <div>
                    <Typography.Text strong>
                      {log.from_status ? STUDENT_STATUS_LABELS[log.from_status] : '-'} → {STUDENT_STATUS_LABELS[log.to_status]}
                    </Typography.Text>{' '}
                    <Typography.Text type="secondary">({formatDate(log.effective_date)})</Typography.Text>
                    {log.destination_school && <div>Sekolah tujuan: {log.destination_school}</div>}
                    {log.reason && <div>{log.reason}</div>}
                    {log.document_number && <div>No. surat: {log.document_number}</div>}
                    {log.created_by && (
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        Dicatat oleh {log.created_by}
                      </Typography.Text>
                    )}
                  </div>
                ),
              }))}
            />
          ) : (
            <Empty description="Belum ada perubahan status" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Card>
      </Flex>

      {canManage && <StudentStatusModal student={student} open={statusOpen} onClose={() => setStatusOpen(false)} />}
      {canManage && <StudentPlaceModal student={student} open={placeOpen} onClose={() => setPlaceOpen(false)} />}
    </>
  )
}
