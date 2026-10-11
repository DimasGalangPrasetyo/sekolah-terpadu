import { logoutRequest } from '../../api/auth'
import { queryClient } from '../../app/queryClient'
import { meKey } from './meKey'

/** Keluar: abaikan galat jaringan (sesi di sisi server akan kedaluwarsa sendiri), bersihkan cache lokal. */
export async function performLogout(): Promise<void> {
  try {
    await logoutRequest()
  } catch {
    // tetap bersihkan sisi klien
  } finally {
    queryClient.clear()
    queryClient.setQueryData(meKey, null)
  }
}
