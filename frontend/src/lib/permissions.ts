import type { AuthUser } from '../types/api'

/** True bila pengguna punya salah satu izin yang diminta. Server tetap penentu akhir. */
export function can(user: AuthUser | null | undefined, permission: string | string[]): boolean {
  if (!user) return false
  const wanted = Array.isArray(permission) ? permission : [permission]
  return wanted.some((p) => user.permissions.includes(p))
}
