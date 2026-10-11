import { logoutRequest } from '../../api/auth'
import { clearClientSession } from '../../app/session'

/** Keluar: abaikan galat jaringan (sesi di server kedaluwarsa sendiri), selalu bersihkan sisi klien. */
export async function performLogout(): Promise<void> {
  try {
    await logoutRequest()
  } catch {
    // tetap bersihkan sisi klien
  } finally {
    clearClientSession()
  }
}
