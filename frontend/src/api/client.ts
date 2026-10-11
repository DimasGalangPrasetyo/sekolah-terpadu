import axios, { isAxiosError, type InternalAxiosRequestConfig } from 'axios'
import { queryClient } from '../app/queryClient'
import { meKey } from '../features/auth/meKey'
import type { ApiErrorBody } from '../types/api'

/**
 * Klien HTTP. Sesi memakai cookie (bukan token di localStorage).
 * Dev: /api dan /sanctum diteruskan Vite ke Laravel; produksi: satu domain lewat Nginx.
 */
export const http = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  withXSRFToken: true,
  headers: { Accept: 'application/json' },
})

export function ensureCsrfCookie() {
  return axios.get('/sanctum/csrf-cookie', { withCredentials: true })
}

type RetriableConfig = InternalAxiosRequestConfig & { _csrfRetried?: boolean }

const PUBLIC_PATHS = ['/auth/login', '/auth/me']

http.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!isAxiosError<ApiErrorBody>(error) || !error.config) throw error

    const config = error.config as RetriableConfig
    const status = error.response?.status
    const url = config.url ?? ''

    // Token CSRF kedaluwarsa (419): ambil yang baru, ulangi satu kali.
    if (status === 419 && !config._csrfRetried) {
      config._csrfRetried = true
      await ensureCsrfCookie()
      return http.request(config)
    }

    // Sesi berakhir: tandai belum masuk; penjaga rute akan mengarahkan ke halaman masuk.
    if (status === 401 && !PUBLIC_PATHS.some((p) => url.endsWith(p))) {
      queryClient.setQueryData(meKey, null)
    }

    // Password sementara belum diganti: segarkan profil agar penjaga rute mengarahkan ke ganti password.
    if (status === 403 && error.response?.data?.code === 'password_change_required') {
      void queryClient.invalidateQueries({ queryKey: meKey })
    }

    throw error
  },
)
