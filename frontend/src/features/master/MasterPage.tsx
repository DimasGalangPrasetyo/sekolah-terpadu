import { Tabs } from 'antd'
import { PageHeader } from '../../components/PageHeader'
import { AcademicYearsTab } from './AcademicYearsTab'
import { ClassroomsTab } from './ClassroomsTab'

export function MasterPage() {
  return (
    <>
      <PageHeader title="Data Master" subtitle="Tahun ajaran, semester, dan rombel." />
      <Tabs
        items={[
          { key: 'years', label: 'Tahun Ajaran', children: <AcademicYearsTab /> },
          { key: 'classrooms', label: 'Rombel', children: <ClassroomsTab /> },
        ]}
      />
    </>
  )
}
