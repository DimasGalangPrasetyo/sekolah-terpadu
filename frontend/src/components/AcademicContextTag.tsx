import { Tag } from 'antd'
import { useAcademicContext } from '../hooks/useAcademicContext'
import { SEMESTER_LABELS } from '../lib/constants'

/** Tahun ajaran dan semester aktif (tampil di bilah atas pada layar lebar). */
export function AcademicContextTag() {
  const { data } = useAcademicContext()

  if (!data?.year) return <Tag color="warning">Tahun ajaran belum aktif</Tag>

  return (
    <Tag color="green" style={{ marginInlineEnd: 0 }}>
      TA {data.year.name}
      {data.semester ? ` · ${SEMESTER_LABELS[data.semester.name] ?? data.semester.name}` : ''}
    </Tag>
  )
}
