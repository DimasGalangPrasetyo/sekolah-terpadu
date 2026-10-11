import { meKey } from '../features/auth/meKey'
import { queryClient } from './queryClient'

/**
 * Tandai pengguna belum masuk, lalu buang data milik sesi sebelumnya (supaya tidak terlihat oleh akun berikutnya).
 *
 * Penting: JANGAN memakai queryClient.clear(). Itu melepas query profil dari komponen yang sedang tampil,
 * sehingga layar tidak berpindah ke halaman masuk. Cukup set profil ke null, lalu hapus query lain.
 */
export function clearClientSession(): void {
  queryClient.setQueryData(meKey, null)
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== meKey[0] })
}
