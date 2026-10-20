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
  Space,
  Table,
  Typography,
} from 'antd'
import type { TableColumnsType } from 'antd'
import { useState } from 'react'
import { getErrorMessage } from '../../api/errors'
import { useIsMobile } from '../../hooks/useIsMobile'
import { applyFieldErrors } from '../../lib/formErrors'
import { can } from '../../lib/permissions'
import { useMe } from '../auth/useMe'
import {
  createAssetCategory,
  deleteAssetCategory,
  listAssetCategories,
  updateAssetCategory,
} from './api'
import type { AssetCategory, AssetCategoryPayload } from './types'

export function CategoryTab() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const isMobile = useIsMobile()
  const { data: me } = useMe()
  const canManage = can(me, 'inventory.manage')

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | null>(null)
  const [form] = Form.useForm<AssetCategoryPayload>()
  const [formError, setFormError] = useState<string | null>(null)

  const categoriesQuery = useQuery({
    queryKey: ['asset-categories'],
    queryFn: listAssetCategories,
  })

  const saveMutation = useMutation({
    mutationFn: async (values: AssetCategoryPayload) => {
      if (selectedCategory) {
        return updateAssetCategory(selectedCategory.id, values)
      }
      return createAssetCategory(values)
    },
    onSuccess: () => {
      message.success(
        selectedCategory ? 'Kategori berhasil diperbarui' : 'Kategori baru berhasil ditambahkan',
      )
      void queryClient.invalidateQueries({ queryKey: ['asset-categories'] })
      setDrawerOpen(false)
    },
    onError: (err) => {
      if (!applyFieldErrors(form, err)) {
        setFormError(getErrorMessage(err))
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAssetCategory(id),
    onSuccess: () => {
      message.success('Kategori berhasil dihapus')
      void queryClient.invalidateQueries({ queryKey: ['asset-categories'] })
    },
    onError: (err) => message.error(getErrorMessage(err)),
  })

  const handleOpenAdd = () => {
    setSelectedCategory(null)
    form.resetFields()
    setFormError(null)
    setDrawerOpen(true)
  }

  const handleOpenEdit = (category: AssetCategory) => {
    setSelectedCategory(category)
    form.setFieldsValue({
      code: category.code,
      name: category.name,
    })
    setFormError(null)
    setDrawerOpen(true)
  }

  const handleDelete = (category: AssetCategory) => {
    Modal.confirm({
      title: `Hapus kategori ${category.name}?`,
      content:
        'Aksi ini akan menghapus kategori aset. Penghapusan akan ditolak jika masih ada data aset yang menggunakan kategori ini.',
      okText: 'Hapus',
      okType: 'danger',
      cancelText: 'Batal',
      onOk: () => deleteMutation.mutateAsync(category.id),
    })
  }

  const columns: TableColumnsType<AssetCategory> = [
    {
      title: 'Kode',
      dataIndex: 'code',
      key: 'code',
      width: 130,
      render: (code: string) => <Typography.Text strong>{code}</Typography.Text>,
    },
    {
      title: 'Nama Kategori',
      dataIndex: 'name',
      key: 'name',
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
              aria-label={`Ubah kategori ${record.name}`}
              onClick={() => handleOpenEdit(record)}
            />
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              aria-label={`Hapus kategori ${record.name}`}
              onClick={() => handleDelete(record)}
            />
          </Space>
        ) : null,
    },
  ]

  return (
    <div>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <div>
          <Typography.Title level={5} style={{ margin: 0 }}>
            Kategori Aset
          </Typography.Title>
          <Typography.Text type="secondary">
            Pengelompokan jenis aset untuk inventaris sekolah
          </Typography.Text>
        </div>
        {canManage && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
            Tambah Kategori
          </Button>
        )}
      </Flex>

      {categoriesQuery.isError && (
        <Alert
          type="error"
          showIcon
          title="Gagal memuat kategori aset"
          description={getErrorMessage(categoriesQuery.error)}
          action={
            <Button size="small" onClick={() => void categoriesQuery.refetch()}>
              Coba lagi
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      <Table<AssetCategory>
        rowKey="id"
        columns={columns}
        dataSource={categoriesQuery.data ?? []}
        loading={categoriesQuery.isFetching}
        size={isMobile ? 'small' : 'middle'}
        pagination={{ pageSize: 20, simple: isMobile }}
        locale={{
          emptyText: <Empty description="Belum ada data kategori aset" />,
        }}
        style={{ background: '#fff', borderRadius: 8 }}
      />

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedCategory ? 'Ubah Kategori Aset' : 'Tambah Kategori Aset'}
        width={isMobile ? '100%' : 440}
        destroyOnHidden
      >
        <Form<AssetCategoryPayload>
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
            name="code"
            label="Kode Kategori"
            rules={[
              { required: true, message: 'Kode kategori wajib diisi' },
              { max: 20, message: 'Maksimal 20 karakter' },
            ]}
            extra="Contoh: ELK, FRN, BUK. Harus unik."
          >
            <Input placeholder="Contoh: ELK" autoComplete="off" />
          </Form.Item>

          <Form.Item
            name="name"
            label="Nama Kategori"
            rules={[
              { required: true, message: 'Nama kategori wajib diisi' },
              { max: 100, message: 'Maksimal 100 karakter' },
            ]}
          >
            <Input placeholder="Contoh: Elektronik & Komputer" autoComplete="off" />
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
