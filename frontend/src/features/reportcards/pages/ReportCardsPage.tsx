import { PrinterOutlined } from '@ant-design/icons'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Alert, App, Button, Empty, Flex, Progress, Select, Table, Tag, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../../../api/errors'
import { PageHeader } from '../../../components/PageHeader'
import { useIsMobile } from '../../../hooks/useIsMobile'
import { SEMESTER_LABELS } from '../../../lib/constants'
import { formatDateTime } from '../../../lib/format'
import { listReportClassrooms, listReportRows, openReportCard } from '../api'
import type { ReportRow } from '../types'

const STATUS: Record<string, { label: string; color: string }> = {
  none: { label: 'Belum diisi', color: 'default' },
  draft: { label: 'Draft', color: 'processing' },
  final: { label: 'Final', color: 'success' },
}

export function ReportCardsPage() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [classroomId, setClassroomId] = useState<number>()

  const classrooms = useQuery({ queryKey: ['report-classrooms'], queryFn: listReportClassrooms })
  const effectiveId = classroomId ?? classrooms.data?.[0]?.id

  const rows = useQuery({
    queryKey: ['report-rows', effectiveId],
    queryFn: () => listReportRows(effectiveId as number),
    enabled: effectiveId !== undefined,
  })

  const openMutation = useMutation({
    mutationFn: (studentId: number) => openReportCard(studentId),
    onSuccess: (card) => navigate(`/rapor/${card.id}`),
    onError: (error) => message.error(getErrorMessage(error)),
  })

  const counts = rows.data?.meta.counts
  const semester = rows.data?.meta.semester

  const columns: TableColumnsType<ReportRow> = [
    {
      title: 'Siswa',
      key: 'student',
      render: (_, row) => (
        <div>
          <Typography.Text strong>{row.student.name}</Typography.Text>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              {row.student.nis ? `NIS ${row.student.nis}` : 'NIS belum ada'}
            </Typography.Text>
          </div>
          {isMobile && (
            <Tag color={STATUS[row.report_card?.status ?? 'none'].color} style={{ marginTop: 4 }}>
              {STATUS[row.report_card?.status ?? 'none'].label}
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Status rapor',
      key: 'status',
      responsive: ['md'],
      render: (_, row) => <Tag color={STATUS[row.report_card?.status ?? 'none'].color}>{STATUS[row.report_card?.status ?? 'none'].label}</Tag>,
    },
    {
      title: 'Diperbarui',
      key: 'updated',
      responsive: ['lg'],
      render: (_, row) => formatDateTime(row.report_card?.updated_at),
    },
    {
      title: '',
      key: 'action',
      width: 130,
      align: 'right',
      render: (_, row) => (
        <Button
          type={row.report_card ? 'default' : 'primary'}
          loading={openMutation.isPending && openMutation.variables === row.student.id}
          onClick={() => openMutation.mutate(row.student.id)}
        >
          {!row.report_card ? 'Isi rapor' : row.report_card.status === 'final' ? 'Lihat' : 'Lanjutkan'}
        </Button>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Rapor"
        subtitle={semester ? `Semester ${SEMESTER_LABELS[semester.name] ?? semester.name}` : 'Isi dan cetak rapor siswa SD dan SMP'}
        actions={
          effectiveId !== undefined && (
            <Button icon={<PrinterOutlined />} disabled={!counts?.final} onClick={() => navigate(`/rapor/cetak?classroom_id=${effectiveId}`)}>
              Cetak semua yang final
            </Button>
          )
        }
      />

      {classrooms.isError && <Alert type="error" showIcon title="Gagal memuat rombel" description={getErrorMessage(classrooms.error)} style={{ marginBottom: 16 }} />}

      {classrooms.data?.length === 0 && (
        <Alert
          type="info"
          showIcon
          title="Belum ada rombel yang bisa dikerjakan"
          description="Rapor diisi oleh wali kelas SD/SMP. Pastikan Anda sudah ditetapkan sebagai wali kelas pada tahun ajaran aktif, atau hubungi TU."
          style={{ marginBottom: 16 }}
        />
      )}

      {(classrooms.data?.length ?? 0) > 0 && (
        <Flex wrap gap={16} align="center" style={{ marginBottom: 16 }}>
          <Select
            value={effectiveId}
            onChange={setClassroomId}
            options={(classrooms.data ?? []).map((c) => ({
              value: c.id,
              label: `${c.unit.code} ${c.name} (${c.students_count ?? 0} siswa)`,
            }))}
            style={{ flex: '1 1 220px', maxWidth: 320 }}
            aria-label="Pilih rombel"
          />
          {counts && counts.total > 0 && (
            <Flex align="center" gap={12} style={{ flex: '1 1 260px', maxWidth: 420 }}>
              <Progress percent={Math.round((counts.final / counts.total) * 100)} size="small" style={{ flex: 1, margin: 0 }} />
              <Typography.Text type="secondary" style={{ whiteSpace: 'nowrap' }}>
                {counts.final} dari {counts.total} final
              </Typography.Text>
            </Flex>
          )}
        </Flex>
      )}

      {rows.isError && <Alert type="error" showIcon title="Gagal memuat daftar siswa" description={getErrorMessage(rows.error)} style={{ marginBottom: 16 }} />}

      {effectiveId !== undefined && (
        <Table<ReportRow>
          rowKey={(row) => row.student.id}
          columns={columns}
          dataSource={rows.data?.data ?? []}
          loading={rows.isFetching}
          pagination={false}
          size={isMobile ? 'small' : 'middle'}
          locale={{ emptyText: <Empty description="Belum ada siswa aktif di rombel ini" /> }}
          style={{ background: '#fff', borderRadius: 8 }}
        />
      )}
    </>
  )
}
