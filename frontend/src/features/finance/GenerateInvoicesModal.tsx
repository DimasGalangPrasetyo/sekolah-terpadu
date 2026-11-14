import {
  Alert,
  Button,
  Collapse,
  DatePicker,
  Descriptions,
  Form,
  Modal,
  Select,
  Space,
  Spin,
  Typography,
  message,
} from 'antd'
import dayjs from 'dayjs'
import { useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getErrorMessage } from '../../api/errors'
import { listAcademicYears, listUnits } from '../../api/master'
import { formatRupiah } from '../../lib/format'
import { useUiStore } from '../../stores/ui'
import { generateInvoices } from './api'
import type { GenerateResult } from './types'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

interface FormValues {
  unit_id: number
  month: dayjs.Dayjs
  due_date?: dayjs.Dayjs
  academic_year_id?: number
}

function GenerateInvoicesForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [form] = Form.useForm<FormValues>()
  const unitFilter = useUiStore((s) => s.unit)

  const [previewResult, setPreviewResult] = useState<GenerateResult | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [publishLoading, setPublishLoading] = useState(false)
  const [previewStale, setPreviewStale] = useState(false)
  const [lastPreviewValues, setLastPreviewValues] = useState<FormValues | null>(null)

  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: listUnits })
  const { data: academicYears = [] } = useQuery({
    queryKey: ['academic-years'],
    queryFn: listAcademicYears,
  })

  // Set default unit when units load, based on global filter
  const defaultUnitId =
    unitFilter !== 'ALL'
      ? (units.find((u) => u.code === unitFilter)?.id ?? undefined)
      : undefined

  const handleValuesChange = () => {
    setPreviewStale(true)
  }

  const buildPayload = useCallback(
    (values: FormValues, dry: boolean) => ({
      unit_id: values.unit_id,
      month: values.month.format('YYYY-MM'),
      due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : undefined,
      academic_year_id: values.academic_year_id,
      dry_run: dry,
    }),
    [],
  )

  const handlePreview = async () => {
    let values: FormValues
    try {
      values = await form.validateFields()
    } catch {
      return
    }

    setPreviewLoading(true)
    setPreviewError(null)
    setPreviewResult(null)
    try {
      const result = await generateInvoices(buildPayload(values, true))
      setPreviewResult(result)
      setLastPreviewValues(values)
      setPreviewStale(false)
    } catch (err: unknown) {
      setPreviewError(getErrorMessage(err, 'Gagal memuat pratinjau'))
    } finally {
      setPreviewLoading(false)
    }
  }

  const canPublish = previewResult !== null && !previewStale && previewResult.created > 0

  const handlePublish = async () => {
    if (!lastPreviewValues) return
    setPublishLoading(true)
    try {
      const result = await generateInvoices(buildPayload(lastPreviewValues, false))
      message.success(`${result.created} tagihan berhasil diterbitkan`)
      onSuccess()
      onClose()
    } catch (err: unknown) {
      message.error(getErrorMessage(err, 'Gagal menerbitkan tagihan'))
    } finally {
      setPublishLoading(false)
    }
  }

  const noRateStudents = previewResult?.skipped_no_rate_students ?? []

  return (
    <>
      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleValuesChange}
        initialValues={{ unit_id: defaultUnitId }}
        style={{ marginTop: 8 }}
      >
        <Form.Item
          name="unit_id"
          label="Unit"
          rules={[{ required: true, message: 'Unit wajib dipilih' }]}
        >
          <Select
            placeholder="Pilih unit"
            options={units.map((u) => ({ value: u.id, label: u.name }))}
          />
        </Form.Item>

        <Form.Item
          name="month"
          label="Bulan"
          rules={[{ required: true, message: 'Bulan wajib dipilih' }]}
        >
          <DatePicker
            picker="month"
            style={{ width: '100%' }}
            format="MM/YYYY"
            placeholder="Pilih bulan"
          />
        </Form.Item>

        <Form.Item name="due_date" label="Jatuh Tempo (opsional)">
          <DatePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            placeholder="Tanggal 10 bulan tersebut"
          />
        </Form.Item>

        <Form.Item name="academic_year_id" label="Tahun Ajaran (opsional)">
          <Select
            allowClear
            placeholder="Gunakan tahun ajaran aktif"
            options={academicYears.map((ay) => ({
              value: ay.id,
              label: ay.name + (ay.is_active ? ' (Aktif)' : ''),
            }))}
          />
        </Form.Item>
      </Form>

      {previewLoading && (
        <div style={{ textAlign: 'center', padding: 16 }}>
          <Spin tip="Memuat pratinjau..." />
        </div>
      )}

      {previewError && !previewLoading && (
        <Alert message={previewError} type="error" showIcon style={{ marginTop: 8 }} />
      )}

      {previewResult && !previewLoading && (
        <div style={{ marginTop: 12 }}>
          {previewStale && (
            <Alert
              message="Isian berubah — pratinjau ulang sebelum menerbitkan."
              type="warning"
              showIcon
              style={{ marginBottom: 8 }}
            />
          )}

          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Memenuhi syarat">{previewResult.eligible}</Descriptions.Item>
            <Descriptions.Item label="Akan dibuat">
              <Typography.Text type="success" strong>
                {previewResult.created}
              </Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="Sudah ada (dilewati)">
              {previewResult.skipped_existing}
            </Descriptions.Item>
            <Descriptions.Item label="Tanpa tarif (dilewati)">
              {previewResult.skipped_no_rate}
            </Descriptions.Item>
            <Descriptions.Item label="Total nominal" span={2}>
              <Typography.Text strong>{formatRupiah(previewResult.total_amount)}</Typography.Text>
            </Descriptions.Item>
          </Descriptions>

          {previewResult.created === 0 && (
            <Alert
              message="Tidak ada tagihan baru yang akan dibuat"
              type="info"
              showIcon
              style={{ marginTop: 8 }}
            />
          )}

          {noRateStudents.length > 0 && (
            <Alert
              type="warning"
              showIcon
              style={{ marginTop: 8 }}
              message={`${previewResult.skipped_no_rate} siswa dilewati karena tarifnya belum diatur (atur di tab Tarif)`}
              description={
                <Collapse
                  ghost
                  size="small"
                  items={[
                    {
                      key: '1',
                      label: 'Lihat daftar siswa',
                      children: (
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                          {noRateStudents.map((s) => (
                            <li key={s.id}>
                              {s.name}
                              {s.nis ? ` (NIS: ${s.nis})` : ''}
                            </li>
                          ))}
                        </ul>
                      ),
                    },
                  ]}
                />
              }
            />
          )}
        </div>
      )}

      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Space>
          <Button onClick={onClose} disabled={previewLoading || publishLoading}>
            Batal
          </Button>
          <Button loading={previewLoading} disabled={publishLoading} onClick={handlePreview}>
            Pratinjau
          </Button>
          <Button
            type="primary"
            loading={publishLoading}
            disabled={!canPublish}
            onClick={handlePublish}
            title={
              previewStale
                ? 'Pratinjau kedaluwarsa — pratinjau ulang sebelum menerbitkan'
                : previewResult?.created === 0
                  ? 'Tidak ada tagihan baru'
                  : undefined
            }
          >
            Terbitkan Tagihan
          </Button>
        </Space>
      </div>
    </>
  )
}

export function GenerateInvoicesModal({ open, onClose, onSuccess }: Props) {
  return (
    <Modal
      open={open}
      title="Buat Tagihan Bulanan"
      onCancel={onClose}
      destroyOnClose
      width={560}
      footer={null}
    >
      {open && <GenerateInvoicesForm onClose={onClose} onSuccess={onSuccess} />}
    </Modal>
  )
}
