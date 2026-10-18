import { ArrowLeftOutlined, PrinterOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Empty, Flex, Skeleton, Tag, Typography } from 'antd'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getErrorMessage } from '../../../api/errors'
import { PageHeader } from '../../../components/PageHeader'
import { listBatchCards, logPrinted } from '../api'
import { PrintJob } from '../components/PrintJob'
import { PrintSettingsDrawer } from '../components/PrintSettingsDrawer'
import { ReportPaperContent } from '../components/ReportPaperContent'
import { ReportPreview } from '../components/ReportPreview'
import { TestSheet } from '../components/TestSheet'
import { clearSettings, effectivePage, loadSettings, saveSettings, settingsFromTemplate, type PrintSettings } from '../printSettings'
import type { ReportCardDetail } from '../types'

function BatchPrint({ cards }: { cards: ReportCardDetail[] }) {
  const first = cards[0]
  const defaults = settingsFromTemplate(first.template.page)
  const [settings, setSettings] = useState<PrintSettings>(() => loadSettings(first.template.id, defaults))
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<'cards' | 'test' | null>(null)
  const page = effectivePage(settings)

  const update = (next: PrintSettings) => {
    setSettings(next)
    saveSettings(first.template.id, next)
  }

  const finish = () => {
    const current = kind
    setKind(null)
    if (current === 'cards') void Promise.allSettled(cards.map((c) => logPrinted(c.id)))
  }

  return (
    <>
      <Flex gap={8} wrap align="center" style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PrinterOutlined />} onClick={() => setOpen(true)}>
          Cetak {cards.length} rapor
        </Button>
        <Typography.Text type="secondary">Pratinjau di bawah menampilkan rapor pertama.</Typography.Text>
      </Flex>

      <Flex gap={6} wrap style={{ marginBottom: 16 }}>
        {cards.map((c) => (
          <Tag key={c.id}>{c.student.name}</Tag>
        ))}
      </Flex>

      <ReportPreview page={page}>
        <ReportPaperContent card={first} data={first.answers} fontFamily={page.fontFamily} fontSizePt={page.fontSizePt} />
      </ReportPreview>

      <PrintSettingsDrawer
        open={open}
        settings={settings}
        onChange={update}
        onReset={() => {
          clearSettings(first.template.id)
          setSettings(defaults)
        }}
        onClose={() => setOpen(false)}
        onPrint={() => {
          setOpen(false)
          setKind('cards')
        }}
        onTestPrint={() => {
          setOpen(false)
          setKind('test')
        }}
        printLabel={`Cetak ${cards.length} rapor`}
      />

      {kind && (
        <PrintJob page={page} onDone={finish}>
          {kind === 'test' ? (
            <TestSheet page={page} />
          ) : (
            cards.map((c) => (
              <div key={c.id} className="rp-batch-page">
                <ReportPaperContent card={c} data={c.answers} fontFamily={page.fontFamily} fontSizePt={page.fontSizePt} />
              </div>
            ))
          )}
        </PrintJob>
      )}
    </>
  )
}

export function ReportBatchPrintPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const classroomId = Number(params.get('classroom_id'))

  const query = useQuery({
    queryKey: ['report-batch', classroomId],
    queryFn: () => listBatchCards(classroomId),
    enabled: Number.isFinite(classroomId) && classroomId > 0,
  })

  return (
    <>
      <PageHeader
        title="Cetak rapor sekaligus"
        subtitle="Hanya rapor yang sudah final"
        actions={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/rapor')}>Kembali</Button>}
      />
      {query.isPending && query.fetchStatus !== 'idle' && <Skeleton active paragraph={{ rows: 8 }} />}
      {query.isError && <Alert type="error" showIcon title="Gagal memuat rapor" description={getErrorMessage(query.error)} />}
      {query.data && query.data.length === 0 && <Empty description="Belum ada rapor final di rombel ini" />}
      {query.data && query.data.length > 0 && <BatchPrint cards={query.data} />}
    </>
  )
}
