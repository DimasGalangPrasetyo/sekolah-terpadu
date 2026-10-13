import { Tag } from 'antd'
import { STUDENT_STATUS_COLORS, STUDENT_STATUS_LABELS } from '../lib/constants'

export function StudentStatusTag({ status }: { status: string }) {
  return <Tag color={STUDENT_STATUS_COLORS[status]}>{STUDENT_STATUS_LABELS[status] ?? status}</Tag>
}
