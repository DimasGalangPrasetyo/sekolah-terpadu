import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Alert, Button, DatePicker, Empty, Flex, Select, Table, Tag, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import type { Dayjs } from 'dayjs'
import { useState } from 'react'
import { listAuditLogs } from '../../api/audit'
import { getErrorMessage } from '../../api/errors'
import { PageHeader } from '../../components/PageHeader'
import { useIsMobile } from '../../hooks/useIsMobile'
import { AUDIT_EVENT_LABELS } from '../../lib/constants'
import { formatDateTime } from '../../lib/format'
import type { AuditLogEntry } from '../../types/api'

const PER_PAGE = 25

const EVENT_COLORS: Record<string, string> = {
  login: 'green',
  logout: 'default',
  login_failed: 'orange',
  login_throttled: 'orange',
  login_inactive: 'orange',
  account_locked: 'red',
  deleted: 'red',
  user_deactivated: 'red',
  password_reset: 'gold',
  password_changed: 'blue',
}

function JsonBlock({ title, value }: { title: string; value: Record<string, unknown> | null }) {
  if (!value || Object.keys(value).length === 0) return null

  return (
    <div style={{ marginBottom: 8 }}>
      <Typography.Text type="secondary">{title}</Typography.Text>
      <pre style={{ margin: '4px 0 0', fontSize: 12 }}>{JSON.stringify(value, null, 2)}</pre>
    </div>
  )
}

export function AuditLogPage() {
  const isMobile = useIsMobile()
  const [page, setPage] = useState(1)
  const [event, setEvent] = useState<string>()
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)

  const params = {
    page,
    per_page: PER_PAGE,
    event,
    from: range?.[0]?.format('YYYY-MM-DD'),
    to: range?.[1]?.format('YYYY-MM-DD'),
  }

  const logs = useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => listAuditLogs(params),
    placeholderData: keepPreviousData,
  })

  const columns: TableColumnsType<AuditLogEntry> = [
    { title: 'Waktu', dataIndex: 'created_at', key: 'created_at', render: (value: string | null) => formatDateTime(value) },
    {
      title: 'Aksi',
      dataIndex: 'event',
      key: 'event',
      render: (value: string) => <Tag color={EVENT_COLORS[value]}>{AUDIT_EVENT_LABELS[value] ?? value}</Tag>,
    },
    {
      title: 'Pengguna',
      key: 'user',
      responsive: ['md'],
      render: (_, row) => (row.user ? `${row.user.name} (${row.user.username})` : '-'),
    },
    {
      title: 'Objek',
      key: 'object',
      responsive: ['lg'],
      render: (_, row) => (row.auditable_type ? `${row.auditable_type} #${row.auditable_id}` : '-'),
    },
    { title: 'IP', dataIndex: 'ip_address', key: 'ip', responsive: ['xl'], render: (value: string | null) => value ?? '-' },
  ]

  return (
    <>
      <PageHeader title="Audit Log" subtitle="Jejak aktivitas penting. Hanya dapat dilihat, tidak dapat diubah." />

      <Flex wrap gap={12} style={{ marginBottom: 16 }}>
        <Select
          allowClear
          showSearch={{ optionFilterProp: 'label' }}
          placeholder="Semua aksi"
          value={event}
          onChange={(value) => {
            setEvent(value)
            setPage(1)
          }}
          options={Object.entries(AUDIT_EVENT_LABELS).map(([value, label]) => ({ value, label }))}
          style={{ flex: '1 1 200px', minWidth: 180, maxWidth: 280 }}
        />
        <DatePicker.RangePicker
          format="DD/MM/YYYY"
          allowClear
          onChange={(value) => {
            setRange(value)
            setPage(1)
          }}
          style={{ flex: '1 1 260px', maxWidth: 360 }}
        />
      </Flex>

      {logs.isError && (
        <Alert
          type="error"
          showIcon
          title="Gagal memuat audit log"
          description={getErrorMessage(logs.error)}
          action={<Button size="small" onClick={() => void logs.refetch()}>Coba lagi</Button>}
          style={{ marginBottom: 16 }}
        />
      )}

      <Table<AuditLogEntry>
        rowKey="id"
        columns={columns}
        dataSource={logs.data?.data ?? []}
        loading={logs.isFetching}
        size={isMobile ? 'small' : 'middle'}
        locale={{ emptyText: <Empty description="Belum ada catatan" /> }}
        expandable={{
          expandedRowRender: (row) => (
            <div>
              <Typography.Paragraph style={{ marginBottom: 8 }}>
                <strong>{row.user ? `${row.user.name} (${row.user.username})` : 'Tanpa pengguna'}</strong>
                {row.auditable_type ? ` · ${row.auditable_type} #${row.auditable_id}` : ''}
                {row.ip_address ? ` · ${row.ip_address}` : ''}
              </Typography.Paragraph>
              <JsonBlock title="Sebelum" value={row.old_values} />
              <JsonBlock title="Sesudah" value={row.new_values} />
            </div>
          ),
        }}
        pagination={{
          current: page,
          pageSize: PER_PAGE,
          total: logs.data?.meta.total ?? 0,
          showSizeChanger: false,
          simple: isMobile,
          onChange: setPage,
        }}
        style={{ background: '#fff', borderRadius: 8 }}
      />
    </>
  )
}
