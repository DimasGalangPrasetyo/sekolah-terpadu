import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  App,
  Button,
  Drawer,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { TableColumnsType } from 'antd'
import { useState } from 'react'
import { getErrorMessage } from '../../api/errors'
import { listUnits } from '../../api/master'
import { useIsMobile } from '../../hooks/useIsMobile'
import { applyFieldErrors } from '../../lib/formErrors'
import { can } from '../../lib/permissions'
import { useMe } from '../auth/useMe'
import { createLocation, deleteLocation, listLocations, updateLocation } from './api'
import type { LocationItem, LocationPayload } from './types'

export function LocationTab() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const isMobile = useIsMobile()
  const { data: me } = useMe()
  const canManage = can(me, 'inventory.manage')

  const [unitFilter, setUnitFilter] = useState<string | undefined>()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<LocationItem | null>(null)
  const [form] = Form.useForm<LocationPayload>()
  const [formError, setFormError] = useState<string | null>(null)

  const unitsQuery = useQuery({
    queryKey: ['units'],
    queryFn: listUnits,
    staleTime: 5 * 60_000,
  })

  const locationsQuery = useQuery({
    queryKey: ['locations', { unit: unitFilter }],
    queryFn: () => listLocations(unitFilter ? { unit: unitFilter } : undefined),
  })

  const saveMutation = useMutation({
    mutationFn: async (values: LocationPayload) => {
      const payload: LocationPayload = {
        unit_id: values.unit_id || null,
        name: values.name.trim(),
        description: values.description?.trim() || null,
      }
      if (selectedLocation) {
        return updateLocation(selectedLocation.id, payload)
      }
      return createLocation(payload)
    },
    onSuccess: () => {
      message.success(
        selectedLocation ? 'Lokasi berhasil diperbarui' : 'Lokasi baru berhasil ditambahkan',
      )
      void queryClient.invalidateQueries({ queryKey: ['locations'] })
      setDrawerOpen(false)
    },
    onError: (err) => {
      if (!applyFieldErrors(form, err)) {
        setFormError(getErrorMessage(err))
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteLocation(id),
    onSuccess: () => {
      message.success('Lokasi berhasil dihapus')
      void queryClient.invalidateQueries({ queryKey: ['locations'] })
    },
    onError: (err) => message.error(getErrorMessage(err)),
  })

  const handleOpenAdd = () => {
    setSelectedLocation(null)
    form.resetFields()
    setFormError(null)
    setDrawerOpen(true)
  }

  const handleOpenEdit = (loc: LocationItem) => {
    setSelectedLocation(loc)
    form.setFieldsValue({
      unit_id: loc.unit_id ?? undefined,
      name: loc.name,
      description: loc.description ?? undefined,
    })
    setFormError(null)
    setDrawerOpen(true)
  }

  const handleDelete = (loc: LocationItem) => {
    Modal.confirm({
      title: `Hapus lokasi ${loc.name}?`,
      content:
        'Aksi ini akan menghapus data ruang/lokasi. Penghapusan akan ditolak jika masih ada aset atau riwayat perpindahan yang merujuk lokasi ini.',
      okText: 'Hapus',
      okType: 'danger',
      cancelText: 'Batal',
      onOk: () => deleteMutation.mutateAsync(loc.id),
    })
  }

  const columns: TableColumnsType<LocationItem> = [
    {
      title: 'Unit',
      key: 'unit',
      width: 120,
      render: (_, record) =>
        record.unit ? (
          <Tag color="blue">{record.unit.code}</Tag>
        ) : (
          <Tag color="cyan">Bersama</Tag>
        ),
    },
    {
      title: 'Nama Lokasi / Ruang',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Typography.Text strong>{name}</Typography.Text>,
    },
    {
      title: 'Keterangan',
      dataIndex: 'description',
      key: 'description',
      responsive: ['sm'],
      render: (desc: string | null) => desc || <Typography.Text type="secondary">-</Typography.Text>,
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      align: 'right',
      render: (_, record) =>
        canManage ? (
          <Space>
            <Button
              type="text"
              icon={<EditOutlined />}
              aria-label={`Ubah lokasi ${record.name}`}
              onClick={() => handleOpenEdit(record)}
            />
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              aria-label={`Hapus lokasi ${record.name}`}
              onClick={() => handleDelete(record)}
            />
          </Space>
        ) : null,
    },
  ]

  return (
    <div>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <div>
          <Typography.Title level={5} style={{ margin: 0 }}>
            Lokasi & Ruangan
          </Typography.Title>
          <Typography.Text type="secondary">
            Daftar ruang penempatan aset per unit atau fasilitas bersama
          </Typography.Text>
        </div>
        {canManage && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
            Tambah Lokasi
          </Button>
        )}
      </Flex>

      <Flex gap={12} wrap align="center" style={{ marginBottom: 16 }}>
        <Select
          allowClear
          placeholder="Semua Unit & Fasilitas Bersama"
          value={unitFilter}
          onChange={setUnitFilter}
          style={{ width: 220 }}
          options={[
            { value: 'shared', label: 'Fasilitas Bersama' },
            ...(unitsQuery.data ?? []).map((u) => ({
              value: u.code,
              label: `Unit ${u.code}`,
            })),
          ]}
        />
      </Flex>

      {locationsQuery.isError && (
        <Alert
          type="error"
          showIcon
          title="Gagal memuat daftar lokasi"
          description={getErrorMessage(locationsQuery.error)}
          action={
            <Button size="small" onClick={() => void locationsQuery.refetch()}>
              Coba lagi
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      <Table<LocationItem>
        rowKey="id"
        columns={columns}
        dataSource={locationsQuery.data ?? []}
        loading={locationsQuery.isFetching}
        size={isMobile ? 'small' : 'middle'}
        pagination={{ pageSize: 20, simple: isMobile }}
        locale={{
          emptyText: <Empty description="Belum ada data lokasi atau ruangan" />,
        }}
        style={{ background: '#fff', borderRadius: 8 }}
      />

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedLocation ? 'Ubah Lokasi' : 'Tambah Lokasi Baru'}
        width={isMobile ? '100%' : 440}
        destroyOnHidden
      >
        <Form<LocationPayload>
          form={form}
          layout="vertical"
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

          <Form.Item
            name="unit_id"
            label="Kepemilikan Unit"
            extra="Pilih unit spesifik, atau kosongkan jika merupakan fasilitas/ruangan bersama."
          >
            <Select
              allowClear
              placeholder="Fasilitas Bersama (Tanpa Unit)"
              options={(unitsQuery.data ?? []).map((u) => ({
                value: u.id,
                label: `${u.code} - ${u.name}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="name"
            label="Nama Lokasi / Ruangan"
            rules={[
              { required: true, message: 'Nama lokasi wajib diisi' },
              { max: 100, message: 'Maksimal 100 karakter' },
            ]}
          >
            <Input placeholder="Contoh: Lab Komputer 1 / Ruang TU" autoComplete="off" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Keterangan Tambahan"
            rules={[{ max: 500, message: 'Maksimal 500 karakter' }]}
          >
            <Input.TextArea rows={3} placeholder="Contoh: Gedung Timur Lantai 2" />
          </Form.Item>

          <Flex justify="end" gap={8} style={{ marginTop: 24 }}>
            <Button onClick={() => setDrawerOpen(false)}>Batal</Button>
            <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>
              Simpan
            </Button>
          </Flex>
        </Form>
      </Drawer>
    </div>
  )
}
