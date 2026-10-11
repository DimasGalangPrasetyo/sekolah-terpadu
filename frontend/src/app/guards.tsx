import { Button, Result, Spin } from 'antd'
import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useMe } from '../features/auth/useMe'
import { can } from '../lib/permissions'

function FullPageSpin() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <Spin size="large" description="Memuat..." />
    </div>
  )
}

/** Hanya untuk yang sudah masuk. Password sementara harus diganti lebih dulu. */
export function RequireAuth({
  children,
  allowPasswordChange = false,
}: {
  children: ReactNode
  allowPasswordChange?: boolean
}) {
  const { data: user, isPending, isError, refetch } = useMe()
  const location = useLocation()

  if (isPending) return <FullPageSpin />

  if (isError) {
    return (
      <Result
        status="warning"
        title="Tidak dapat terhubung ke server"
        subTitle="Periksa koneksi internet atau pastikan server berjalan, lalu coba lagi."
        extra={<Button type="primary" onClick={() => void refetch()}>Coba lagi</Button>}
      />
    )
  }

  if (!user) return <Navigate to="/masuk" replace state={{ from: location.pathname }} />

  if (user.must_change_password && !allowPasswordChange) {
    return <Navigate to="/ganti-password" replace />
  }

  return <>{children}</>
}

/** Halaman masuk: bila sudah masuk, langsung ke beranda. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { data: user, isPending } = useMe()

  if (isPending) return <FullPageSpin />
  if (user) return <Navigate to="/" replace />

  return <>{children}</>
}

/** Halaman yang butuh izin tertentu (salah satu dari daftar). */
export function RequirePermission({
  permission,
  children,
}: {
  permission: string | string[]
  children: ReactNode
}) {
  const { data: user } = useMe()

  if (!can(user, permission)) {
    return (
      <Result
        status="403"
        title="Tidak punya akses"
        subTitle="Akun Anda tidak diizinkan membuka halaman ini."
        extra={<Link to="/"><Button type="primary">Kembali ke beranda</Button></Link>}
      />
    )
  }

  return <>{children}</>
}
