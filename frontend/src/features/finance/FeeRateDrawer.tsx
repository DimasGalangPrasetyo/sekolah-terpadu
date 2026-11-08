import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Drawer, Form, InputNumber, Select, Space } from 'antd'
import { getErrorMessage } from '../../api/errors'
import { listAcademicYears, listGradeLevels, listUnits } from '../../api/master'
import { applyFieldErrors } from '../../lib/formErrors'
import { createFeeRate, listFeeTypes, updateFeeRate } from './api'
import type { FeeRate, FeeRatePayload } from './types'

interface Props {
  open: boolean
  feeRate: FeeRate | null
  defaultAcademicYearId?: number
  defaultUnitId?: number
  onClose: () => void
  onSuccess: () => void
}

function FeeRateForm({
  feeRate,
  defaultAcademicYearId,
  defaultUnitId,
  onClose,
  onSuccess,
}: {
  feeRate: FeeRate | null
  defaultAcademicYearId?: number
  defaultUnitId?: number
  onClose: () => void
  onSuccess: () => void
}) {
  const [form] = Form.useForm<FeeRatePayload>()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const isEdit = feeRate !== null

  const { data: feeTypes = [] } = useQuery({
    queryKey: ['fee-types', true],
    queryFn: () => listFeeTypes(true),
  })

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => listUnits(),
  })

  const { data: gradeLevels = [] } = useQuery({
    queryKey: ['grade-levels'],
    queryFn: () => listGradeLevels(),
  })

  const { data: academicYears = [] } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => listAcademicYears(),
  })

  const selectedUnitId = Form.useWatch('unit_id', form) ?? feeRate?.unit.id ?? defaultUnitId
  const availableGradeLevels = gradeLevels.filter((gl) => gl.unit_id === selectedUnitId)

  const handleSubmit = async (values: FeeRatePayload) => {
    setLoading(true)
    setErrorMsg(null)
    try {
      if (isEdit) {
        await updateFeeRate(feeRate.id, values.amount)
      } else {
        await createFeeRate({
          fee_type_id: values.fee_type_id,
          unit_id: values.unit_id,
          grade_level_id: values.grade_level_id || null,
          academic_year_id: values.academic_year_id,
          amount: values.amount,
        })
      }
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const applied = applyFieldErrors(form, err)
      if (!applied) {
        setErrorMsg(getErrorMessage(err))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {errorMsg && (
        <Alert
          message={errorMsg}
          type="error"
          showIcon
          closable
          onClose={() => setErrorMsg(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          fee_type_id: feeRate?.fee_type.id,
          unit_id: feeRate?.unit.id ?? defaultUnitId,
          grade_level_id: feeRate?.grade_level ? feeRate.grade_level.id : null,
          academic_year_id: feeRate?.academic_year.id ?? defaultAcademicYearId,
          amount: feeRate?.amount,
        }}
        onFinish={handleSubmit}
      >
        <Form.Item
          name="fee_type_id"
          label="Jenis Biaya"
          rules={[{ required: true, message: 'Jenis biaya wajib dipilih' }]}
        >
          <Select
            placeholder="Pilih jenis biaya"
            disabled={isEdit}
            options={feeTypes.map((ft) => ({
              value: ft.id,
              label: `${ft.name} (${ft.code})`,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="unit_id"
          label="Unit"
          rules={[{ required: true, message: 'Unit wajib dipilih' }]}
        >
          <Select
            placeholder="Pilih unit"
            disabled={isEdit}
            onChange={() => form.setFieldValue('grade_level_id', null)}
            options={units.map((u) => ({
              value: u.id,
              label: `${u.name} (${u.code})`,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="grade_level_id"
          label="Tingkat Kelas"
          tooltip="Biarkan 'Semua Tingkat' jika tarif berlaku sama untuk semua tingkat di unit ini."
        >
          <Select
            placeholder="Semua Tingkat"
            disabled={isEdit || !selectedUnitId}
            allowClear
            options={[
              { value: null, label: 'Semua Tingkat' },
              ...availableGradeLevels.map((gl) => ({
                value: gl.id,
                label: `Tingkat ${gl.name}`,
              })),
            ]}
          />
        </Form.Item>

        <Form.Item
          name="academic_year_id"
          label="Tahun Ajaran"
          rules={[{ required: true, message: 'Tahun ajaran wajib dipilih' }]}
        >
          <Select
            placeholder="Pilih tahun ajaran"
            disabled={isEdit}
            options={academicYears.map((ay) => ({
              value: ay.id,
              label: ay.name + (ay.is_active ? ' (Aktif)' : ''),
            }))}
          />
        </Form.Item>

        <Form.Item
          name="amount"
          label="Nominal Tarif (Rp)"
          rules={[
            { required: true, message: 'Nominal wajib diisi' },
            {
              type: 'number',
              min: 1,
              message: 'Nominal minimal Rp 1 (tidak boleh Rp 0)',
            },
          ]}
        >
          <InputNumber<number>
            min={1}
            max={9999999999}
            style={{ width: '100%' }}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
            parser={(value) => (value ? Number(value.replace(/\./g, '')) : 0)}
            prefix="Rp"
            placeholder="Contoh: 250.000"
          />
        </Form.Item>

        <div style={{ marginTop: 24, textAlign: 'right' }}>
          <Space>
            <Button onClick={onClose} disabled={loading}>
              Batal
            </Button>
            <Button type="primary" onClick={() => form.submit()} loading={loading}>
              Simpan
            </Button>
          </Space>
        </div>
      </Form>
    </>
  )
}

export function FeeRateDrawer({
  open,
  feeRate,
  defaultAcademicYearId,
  defaultUnitId,
  onClose,
  onSuccess,
}: Props) {
  const isEdit = feeRate !== null

  return (
    <Drawer
      title={isEdit ? 'Ubah Tarif Biaya' : 'Tambah Tarif Biaya'}
      open={open}
      onClose={onClose}
      destroyOnClose
      width="min(480px, 100vw)"
    >
      {open && (
        <FeeRateForm
          feeRate={feeRate}
          defaultAcademicYearId={defaultAcademicYearId}
          defaultUnitId={defaultUnitId}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      )}
    </Drawer>
  )
}
