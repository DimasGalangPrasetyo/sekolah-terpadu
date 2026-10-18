import { ArrowLeftOutlined, CheckOutlined, PrinterOutlined, UnlockOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Col, Flex, Input, Row, Segmented, Skeleton, Tag, Typography } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getErrorMessage, getStatus } from '../../../api/errors'
import { useIsMobile } from '../../../hooks/useIsMobile'
import { SEMESTER_LABELS } from '../../../lib/constants'
import { can } from '../../../lib/permissions'
import { useMe } from '../../auth/useMe'
import { finalizeReportCard, getReportCard, logPrinted, saveReportCard, unlockReportCard } from '../api'
import { PrintJob } from '../components/PrintJob'
import { PrintSettingsDrawer } from '../components/PrintSettingsDrawer'
import { ReportForm } from '../components/ReportForm'
import { ReportPaperContent } from '../components/ReportPaperContent'
import { ReportPreview } from '../components/ReportPreview'
import { TestSheet } from '../components/TestSheet'
import { clearSettings, effectivePage, loadSettings, saveSettings, settingsFromTemplate, type PrintSettings } from '../printSettings'
import type { ReportCardDetail, ReportData } from '../types'

type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

const SAVE_TEXT: Record<SaveState, string> = {
  idle: '',
  pending: 'Perubahan belum disimpan…',
  saving: 'Menyimpan…',
  saved: 'Tersimpan',
  error: 'Gagal menyimpan',
}

function Workspace({ card }: { card: ReportCardDetail }) {
  const { message, modal } = App.useApp()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { data: me } = useMe()

  const [data, setData] = useState<ReportData>(card.answers)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [view, setView] = useState<'form' | 'preview'>('form')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [printKind, setPrintKind] = useState<'card' | 'test' | null>(null)

  const defaults = settingsFromTemplate(card.template.page)
  const [settings, setSettings] = useState<PrintSettings>(() => loadSettings(card.template.id, defaults))
  const page = effectivePage(settings)

  // Status simpan disimpan di satu objek agar mudah dibaca dari penangan peristiwa dan pembersihan.
  const store = useRef({ timer: 0, dirty: false, latest: card.answers as ReportData })
  const cardKey = ['report-card', card.id]

  const persist = async (next: ReportData) => {
    setSaveState('saving')
    try {
      const updated = await saveReportCard(card.id, next)
      store.current.dirty = store.current.latest !== next
      queryClient.setQueryData(cardKey, updated)
      setSaveState(store.current.dirty ? 'pending' : 'saved')
    } catch (error) {
      setSaveState('error')
      message.error(getErrorMessage(error, 'Gagal menyimpan isian rapor.'))
    }
  }

  const change = (next: ReportData) => {
    const s = store.current
    setData(next)
    s.latest = next
    s.dirty = true
    window.clearTimeout(s.timer)
    s.timer = window.setTimeout(() => void persist(next), 1200)
    setSaveState('pending')
  }

  /** Menyimpan perubahan yang tertunda. True bila semuanya tersimpan. */
  const flush = async (): Promise<boolean> => {
    const s = store.current
    if (s.dirty) {
      window.clearTimeout(s.timer)
      await persist(s.latest)
    }
    return !store.current.dirty
  }

  useEffect(() => {
    const s = store.current
    return () => {
      window.clearTimeout(s.timer)
      if (s.dirty) void saveReportCard(card.id, s.latest).catch(() => undefined)
    }
  }, [card.id])

  const onDone = (updated: ReportCardDetail, text: string) => {
    queryClient.setQueryData(cardKey, updated)
    void queryClient.invalidateQueries({ queryKey: ['report-rows'] })
    message.success(text)
  }

  const finalizeMutation = useMutation({
    mutationFn: () => finalizeReportCard(card.id),
    onSuccess: (updated) => onDone(updated, 'Rapor difinalkan'),
    onError: (error) => message.error(getErrorMessage(error)),
  })

  const unlockMutation = useMutation({
    mutationFn: (reason: string) => unlockReportCard(card.id, reason),
    onSuccess: (updated) => onDone(updated, 'Kunci rapor dibuka'),
    onError: (error) => message.error(getErrorMessage(error)),
  })

  const confirmFinalize = () =>
    modal.confirm({
      title: 'Finalkan rapor ini?',
      content: 'Setelah final, rapor tidak dapat diubah (hanya TU yang dapat membuka kunci). Pastikan semua isian sudah benar.',
      okText: 'Finalkan',
      cancelText: 'Batal',
      onOk: async () => {
        if (!(await flush())) {
          message.error('Perubahan belum tersimpan. Coba lagi.')
          return
        }
        await finalizeMutation.mutateAsync().catch(() => undefined)
      },
    })

  const confirmUnlock = () => {
    let reason = ''
    modal.confirm({
      title: 'Buka kunci rapor',
      content: (
        <Input.TextArea rows={3} maxLength={300} placeholder="Alasan membuka kunci (wajib)" onChange={(e) => { reason = e.target.value }} />
      ),
      okText: 'Buka kunci',
      cancelText: 'Batal',
      onOk: async () => {
        if (!reason.trim()) {
          message.warning('Alasan wajib diisi.')
          return Promise.reject()
        }
        await unlockMutation.mutateAsync(reason.trim()).catch(() => undefined)
      },
    })
  }

  const updateSettings = (next: PrintSettings) => {
    setSettings(next)
    saveSettings(card.template.id, next)
  }

  const startPrint = async (kind: 'card' | 'test') => {
    if (kind === 'card' && !(await flush())) {
      message.error('Perubahan belum tersimpan. Coba lagi sebelum mencetak.')
      return
    }
    setSettingsOpen(false)
    setPrintKind(kind)
  }

  const finishPrint = () => {
    const kind = printKind
    setPrintKind(null)
    if (kind === 'card') void logPrinted(card.id).catch(() => undefined)
  }

  const readOnly = !card.editable
  const canUnlock = can(me, 'reportcards.unlock')
  const form = <ReportForm definition={card.template.definition} data={data} onChange={change} disabled={readOnly} />
  const preview = (
    <ReportPreview page={page}>
      <ReportPaperContent card={card} data={data} fontFamily={page.fontFamily} fontSizePt={page.fontSizePt} />
    </ReportPreview>
  )

  return (
    <>
      <Flex justify="space-between" align="center" wrap gap={8} style={{ marginBottom: 12 }}>
        <Flex align="center" gap={10} wrap style={{ minWidth: 0 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/rapor')} aria-label="Kembali ke daftar rapor" />
          <div style={{ minWidth: 0 }}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {card.student.name}
            </Typography.Title>
            <Typography.Text type="secondary">
              {card.classroom.unit.code} {card.classroom.name} · Semester {SEMESTER_LABELS[card.semester.name]} {card.semester.year}
            </Typography.Text>
          </div>
          <Tag color={card.status === 'final' ? 'success' : 'processing'}>{card.status === 'final' ? 'Final' : 'Draft'}</Tag>
        </Flex>

        <Flex gap={8} align="center" wrap>
          <Typography.Text type={saveState === 'error' ? 'danger' : 'secondary'} style={{ fontSize: 13 }} aria-live="polite">
            {SAVE_TEXT[saveState]}
          </Typography.Text>
          {card.editable && (
            <Button type="primary" icon={<CheckOutlined />} onClick={confirmFinalize} loading={finalizeMutation.isPending}>
              Finalkan
            </Button>
          )}
          {card.status === 'final' && canUnlock && (
            <Button icon={<UnlockOutlined />} onClick={confirmUnlock}>
              Buka kunci
            </Button>
          )}
          <Button icon={<PrinterOutlined />} onClick={() => setSettingsOpen(true)}>
            Cetak
          </Button>
        </Flex>
      </Flex>

      {readOnly && (
        <Alert
          type="info"
          showIcon
          title={card.status === 'final' ? 'Rapor sudah final dan terkunci' : 'Anda hanya dapat melihat rapor ini'}
          description={card.status === 'final' ? 'TU dapat membuka kunci bila perlu diubah.' : undefined}
          style={{ marginBottom: 12 }}
        />
      )}

      {isMobile ? (
        <>
          <Segmented
            block
            value={view}
            onChange={(value) => setView(value as 'form' | 'preview')}
            options={[{ value: 'form', label: 'Isian' }, { value: 'preview', label: 'Pratinjau' }]}
            style={{ marginBottom: 12 }}
          />
          {view === 'form' ? form : preview}
        </>
      ) : (
        <Row gutter={16} align="top">
          <Col lg={10}>
            <div style={{ maxHeight: 'calc(100vh - 190px)', overflowY: 'auto', paddingRight: 4 }}>{form}</div>
          </Col>
          <Col lg={14}>
            <div style={{ position: 'sticky', top: 72, maxHeight: 'calc(100vh - 90px)', overflowY: 'auto' }}>{preview}</div>
          </Col>
        </Row>
      )}

      <PrintSettingsDrawer
        open={settingsOpen}
        settings={settings}
        onChange={updateSettings}
        onReset={() => {
          clearSettings(card.template.id)
          setSettings(defaults)
        }}
        onClose={() => setSettingsOpen(false)}
        onPrint={() => void startPrint('card')}
        onTestPrint={() => void startPrint('test')}
        printLabel="Cetak rapor"
      />

      {printKind && (
        <PrintJob page={page} onDone={finishPrint}>
          {printKind === 'test' ? (
            <TestSheet page={page} />
          ) : (
            <ReportPaperContent card={card} data={data} fontFamily={page.fontFamily} fontSizePt={page.fontSizePt} />
          )}
        </PrintJob>
      )}
    </>
  )
}

export function ReportWorkspacePage() {
  const { id } = useParams()
  const cardId = Number(id)
  const navigate = useNavigate()

  const query = useQuery({ queryKey: ['report-card', cardId], queryFn: () => getReportCard(cardId) })

  if (query.isPending) return <Skeleton active paragraph={{ rows: 12 }} />

  if (query.isError) {
    return (
      <Alert
        type={getStatus(query.error) === 403 ? 'warning' : 'error'}
        showIcon
        title="Rapor tidak dapat dibuka"
        description={getErrorMessage(query.error)}
        action={<Button size="small" onClick={() => navigate('/rapor')}>Kembali</Button>}
      />
    )
  }

  return <Workspace key={query.data.id} card={query.data} />
}
