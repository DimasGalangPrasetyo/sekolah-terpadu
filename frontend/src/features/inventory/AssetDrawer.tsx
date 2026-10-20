import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Alert,
  App,
  Button,
  DatePicker,
  Drawer,
  Flex,
  Form,
  Input,
  InputNumber,
  Select,
  Typography,
} from 'antd'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { useState } from 'react'
import { getErrorMessage } from '../../api/errors'
import { listUnits } from '../../api/master'
import { listStaff } from '../staff/api'
import { applyFieldErrors } from '../../lib/formErrors'
import { createAsset, listAssetCategories, listLocations, updateAsset } from './api'
import { CONDITION_CONFIG, STATUS_CONFIG } from './constants'
import type { Asset, AssetCondition, AssetPayload, AssetStatus } from './types'

const FMT = 'YYYY-MM-DD'

interface AssetFormValues {
  code?: string
  name: string
  asset_category_id: number
  unit_id?: number
  location_id?: number
  quantity: number
  unit_label: string
  acquisition_date?: Dayjs
  acquisition_source?: string
  acquisition_cost?: number
  item_condition: AssetCondition
  responsible_staff_id?: number
  status?: AssetStatus
  notes?: string
}

interface AssetDrawerProps {
  open: boolean
  asset: Asset | null
  onClose: () => void
  onSaved: () => void
}

function toInitial(asset: Asset | null): Partial<AssetFormValues> {
  if (!asset) {
    return {
      quantity: 1,
      unit_label: 'unit',
      item_condition: 'good',
      status: 'active',
    }
  }

  return {
    code: asset.code,
    name: asset.name,
    asset_category_id: asset.asset_category_id,
    unit_id: asset.unit_id ?? undefined,
    location_id: asset.location_id ?? undefined,
    quantity: asset.quantity,
    unit_label: asset.unit_label,
    acquisition_date: asset.acquisition_date ? dayjs(asset.acquisition_date) : undefined,
    acquisition_source: asset.acquisition_source ?? undefined,
    acquisition_cost: asset.acquisition_cost ?? undefined,
    item_condition: asset.item_condition,
    responsible_staff_id: asset.responsible_staff_id ?? undefined,
    status: asset.status,
    notes: asset.notes ?? undefined,
  }
}

export function AssetDrawer({ open, asset, onClose, onSaved }: AssetDrawerProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<AssetFormValues>()
  const [formError, setFormError] = useState<string | null>(null)

  const unitsQuery = useQuery({
    queryKey: ['units'],
    queryFn: listUnits,
    staleTime: 5 * 60_000,
  })

  const categoriesQuery = useQuery({
    queryKey: ['asset-categories'],
    queryFn: listAssetCategories,
  })

  const locationsQuery = useQuery({
    queryKey: ['locations'],
    queryFn: () => listLocations(),
  })

  const staffQuery = useQuery({
    queryKey: ['staff', { is_active: '1', per_page: 100 }],
    queryFn: () => listStaff({ is_active: '1', per_page: 100 }),
    staleTime: 2 * 60_000,
  })

  const saveMutation = useMutation({
    mutationFn: async (values: AssetFormValues) => {
      const payload: AssetPayload = {
        name: values.name.trim(),
        code: values.code?.trim() || null,
        asset_category_id: values.asset_category_id,
        unit_id: values.unit_id || null,
        location_id: values.location_id || null,
        quantity: values.quantity,
        unit_label: values.unit_label?.trim() || 'unit',
        acquisition_date: values.acquisition_date ? values.acquisition_date.format(FMT) : null,
        acquisition_source: values.acquisition_source?.trim() || null,
        acquisition_cost: values.acquisition_cost !== undefined ? values.acquisition_cost : null,
        item_condition: values.item_condition,
        responsible_staff_id: values.responsible_staff_id || null,
        status: values.status,
        notes: values.notes?.trim() || null,
      }

      if (asset) {
        return updateAsset(asset.id, payload)
      }
      return createAsset(payload)
    },
    onSuccess: () => {
      message.success(asset ? 'Data aset berhasil diperbarui' : 'Aset baru berhasil ditambahkan')
      onSaved()
      onClose()
    },
    onError: (err) => {
      if (!applyFieldErrors(form, err)) {
        setFormError(getErrorMessage(err))
      }
    },
  })

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={asset ? `Ubah Data Aset: ${asset.code}` : 'Tambah Aset Baru'}
      width="min(560px, 100vw)"
      destroyOnHidden
    >
      <Form<AssetFormValues>
        form={form}
        layout="vertical"
        initialValues={toInitial(asset)}
        onFinish={(values) => {
          setFormError(null)
          saveMutation.mutate(values)
        }}
      >
        {formError && (
          <Alert
            type="error"
            showIcon
            message={formError}
            style={{ marginBottom: 16 }}
            closable
            onClose={() => setFormError(null)}
          />
        )}

        <Typography.Title level={5} style={{ marginTop: 0 }}>
          Identitas Barang
        </Typography.Title>

        <Form.Item
          name="name"
          label="Nama Barang / Aset"
          rules={[
            { required: true, message: 'Nama aset wajib diisi' },
            { max: 150, message: 'Maksimal 150 karakter' },
          ]}
        >
          <Input placeholder="Contoh: Laptop Lenovo ThinkPad E14" autoComplete="off" />
        </Form.Item>

        <Flex gap={12} wrap>
          <Form.Item
            name="code"
            label="Kode Aset"
            rules={[{ max: 40, message: 'Maksimal 40 karakter' }]}
            extra="Kosongkan jika ingin dibuatkan otomatis (AST-XXXX)"
            style={{ flex: '1 1 200px' }}
          >
            <Input placeholder="Contoh: AST-0012" autoComplete="off" />
          </Form.Item>

          <Form.Item
            name="asset_category_id"
            label="Kategori"
            rules={[{ required: true, message: 'Pilih kategori aset' }]}
            style={{ flex: '1 1 200px' }}
          >
            <Select
              placeholder="Pilih kategori"
              loading={categoriesQuery.isFetching}
              options={(categoriesQuery.data ?? []).map((c) => ({
                value: c.id,
                label: `${c.code} - ${c.name}`,
              }))}
            />
          </Form.Item>
        </Flex>

        <Typography.Title level={5} style={{ marginTop: 12 }}>
          Penempatan & Kuantitas
        </Typography.Title>

        <Flex gap={12} wrap>
          <Form.Item
            name="unit_id"
            label="Unit Sekolah"
            extra="Pilih Bersama jika fasilitas dipakai lintas unit"
            style={{ flex: '1 1 200px' }}
          >
            <Select
              allowClear
              placeholder="Fasilitas Bersama"
              loading={unitsQuery.isFetching}
              options={(unitsQuery.data ?? []).map((u) => ({
                value: u.id,
                label: `${u.code} - ${u.name}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="location_id"
            label="Lokasi / Ruangan"
            style={{ flex: '1 1 200px' }}
          >
            <Select
              allowClear
              placeholder="Pilih lokasi penempatan"
              loading={locationsQuery.isFetching}
              options={(locationsQuery.data ?? []).map((loc) => ({
                value: loc.id,
                label: loc.unit ? `[${loc.unit.code}] ${loc.name}` : `[Bersama] ${loc.name}`,
              }))}
            />
          </Form.Item>
        </Flex>

        <Flex gap={12} wrap>
          <Form.Item
            name="quantity"
            label="Jumlah"
            rules={[
              { required: true, message: 'Jumlah wajib diisi' },
              { type: 'number', min: 1, message: 'Jumlah minimal 1' },
            ]}
            style={{ flex: '1 1 140px' }}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="unit_label"
            label="Satuan"
            rules={[{ required: true, message: 'Satuan wajib diisi' }]}
            style={{ flex: '1 1 140px' }}
          >
            <Input placeholder="unit / buah / set" />
          </Form.Item>

          <Form.Item
            name="item_condition"
            label="Kondisi Barang"
            rules={[{ required: true, message: 'Pilih kondisi' }]}
            style={{ flex: '1 1 160px' }}
          >
            <Select
              options={Object.entries(CONDITION_CONFIG).map(([val, conf]) => ({
                value: val,
                label: conf.label,
              }))}
            />
          </Form.Item>

          {asset && (
            <Form.Item
              name="status"
              label="Status Aset"
              rules={[{ required: true, message: 'Pilih status' }]}
              style={{ flex: '1 1 160px' }}
            >
              <Select
                options={Object.entries(STATUS_CONFIG).map(([val, conf]) => ({
                  value: val,
                  label: conf.label,
                }))}
              />
            </Form.Item>
          )}
        </Flex>

        <Typography.Title level={5} style={{ marginTop: 12 }}>
          Perolehan & Penanggung Jawab
        </Typography.Title>

        <Flex gap={12} wrap>
          <Form.Item
            name="acquisition_date"
            label="Tanggal Perolehan"
            style={{ flex: '1 1 200px' }}
          >
            <DatePicker format={FMT} placeholder="Pilih tanggal" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="acquisition_source"
            label="Sumber Perolehan"
            rules={[{ max: 100, message: 'Maksimal 100 karakter' }]}
            style={{ flex: '1 1 200px' }}
          >
            <Input placeholder="Contoh: BOS / Yayasan / Hibah" autoComplete="off" />
          </Form.Item>
        </Flex>

        <Flex gap={12} wrap>
          <Form.Item
            name="acquisition_cost"
            label="Harga / Biaya Perolehan"
            style={{ flex: '1 1 200px' }}
          >
            <InputNumber<number>
              min={0}
              step={50000}
              addonBefore="Rp"
              style={{ width: '100%' }}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
              parser={(value) => (value ? Number(value.replace(/\./g, '')) : 0)}
              placeholder="0"
            />
          </Form.Item>

          <Form.Item
            name="responsible_staff_id"
            label="Penanggung Jawab"
            style={{ flex: '1 1 200px' }}
          >
            <Select
              allowClear
              showSearch
              placeholder="Pilih staf penanggung jawab"
              loading={staffQuery.isFetching}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={(staffQuery.data?.data ?? []).map((s) => ({
                value: s.id,
                label: s.nip ? `${s.name} (${s.nip})` : s.name,
              }))}
            />
          </Form.Item>
        </Flex>

        <Form.Item name="notes" label="Catatan Tambahan">
          <Input.TextArea rows={3} placeholder="Keterangan spesifikasi, nomor seri, dll." />
        </Form.Item>

        <Flex justify="end" gap={8} style={{ marginTop: 24 }}>
          <Button onClick={onClose}>Batal</Button>
          <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>
            {asset ? 'Simpan Perubahan' : 'Tambah Aset'}
          </Button>
        </Flex>
      </Form>
    </Drawer>
  )
}
