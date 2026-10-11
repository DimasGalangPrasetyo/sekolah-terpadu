import { Button, Result } from 'antd'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <Result
      status="404"
      title="Halaman tidak ditemukan"
      subTitle="Alamat yang Anda buka tidak ada atau sudah dipindahkan."
      extra={
        <Link to="/">
          <Button type="primary">Kembali ke beranda</Button>
        </Link>
      }
    />
  )
}
