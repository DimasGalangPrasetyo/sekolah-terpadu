import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Card, Flex, Form, Input, Skeleton, Typography } from 'antd'
import { getErrorMessage } from '../../api/errors'
import { PageHeader } from '../../components/PageHeader'
import { applyFieldErrors } from '../../lib/formErrors'
import { getSchoolProfile, saveSchoolProfile, type SchoolProfile } from './api'

function ProfileForm({ profile }: { profile: SchoolProfile }) {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<SchoolProfile>()

  const mutation = useMutation({
    mutationFn: saveSchoolProfile,
    onSuccess: (saved) => {
      queryClient.setQueryData(['school-profile'], saved)
      message.success('Profil sekolah disimpan')
    },
    onError: (error) => {
      if (!applyFieldErrors(form, error)) message.error(getErrorMessage(error))
    },
  })

  return (
    <Form<SchoolProfile> form={form} layout="vertical" requiredMark="optional" initialValues={profile} onFinish={(values) => mutation.mutate(values)}>
      <Card title="Yayasan / sekolah" style={{ marginBottom: 16 }}>
        <Form.Item name="foundation_name" label="Nama yayasan" rules={[{ required: true, message: 'Nama wajib diisi' }]}>
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item name="address" label="Alamat">
          <Input.TextArea rows={2} maxLength={500} />
        </Form.Item>
        <Flex gap={16} wrap>
          <Form.Item name="phone" label="Telepon" style={{ flex: '1 1 200px' }}>
            <Input inputMode="tel" autoComplete="off" />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Format email tidak valid' }]} style={{ flex: '1 1 240px' }}>
            <Input inputMode="email" autoComplete="off" />
          </Form.Item>
        </Flex>
      </Card>

      <Card title="Kepala sekolah" style={{ marginBottom: 16 }}>
        <Typography.Paragraph type="secondary">Nama ini terisi otomatis pada tanda tangan rapor setiap unit.</Typography.Paragraph>
        <Flex gap={16} wrap>
          <Form.Item name={['headmasters', 'TK']} label="Kepala TK" style={{ flex: '1 1 220px' }}>
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item name={['headmasters', 'SD']} label="Kepala SD" style={{ flex: '1 1 220px' }}>
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item name={['headmasters', 'SMP']} label="Kepala SMP" style={{ flex: '1 1 220px' }}>
            <Input autoComplete="off" />
          </Form.Item>
        </Flex>
      </Card>

      <Flex justify="end">
        <Button type="primary" htmlType="submit" size="large" loading={mutation.isPending}>
          Simpan profil
        </Button>
      </Flex>
    </Form>
  )
}

export function SchoolProfilePage() {
  const query = useQuery({ queryKey: ['school-profile'], queryFn: getSchoolProfile })

  return (
    <>
      <PageHeader title="Profil Sekolah" subtitle="Dipakai pada kop rapor, laporan, dan kwitansi." />
      {query.isPending && <Skeleton active paragraph={{ rows: 6 }} />}
      {query.isError && <Alert type="error" showIcon title="Gagal memuat profil" description={getErrorMessage(query.error)} />}
      {query.data && <ProfileForm profile={query.data} />}
    </>
  )
}
