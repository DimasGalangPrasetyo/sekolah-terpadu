import { Card, Empty, Typography } from 'antd'
import { PageHeader } from './PageHeader'

/** Penanda modul yang akan dibangun pada tahap berikutnya. */
export function ComingSoon({ title, description, planned }: { title: string; description: string; planned: string[] }) {
  return (
    <>
      <PageHeader title={title} subtitle={description} />
      <Card>
        <Empty description="Modul ini sedang disiapkan">
          <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
            Rencana isi:
          </Typography.Paragraph>
          <ul style={{ textAlign: 'left', display: 'inline-block', margin: 0 }}>
            {planned.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Empty>
      </Card>
    </>
  )
}
