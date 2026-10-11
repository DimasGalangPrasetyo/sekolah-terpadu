import { isAxiosError } from 'axios'
import type { ApiErrorBody } from '../types/api'

export function getStatus(error: unknown): number | undefined {
  return isAxiosError(error) ? error.response?.status : undefined
}

export function getErrorMessage(error: unknown, fallback = 'Terjadi kesalahan. Silakan coba lagi.'): string {
  if (isAxiosError<ApiErrorBody>(error)) {
    if (!error.response) return 'Tidak dapat terhubung ke server. Periksa koneksi Anda.'

    const data = error.response.data
    const firstFieldError = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined

    return firstFieldError ?? data?.message ?? fallback
  }
  return fallback
}

export function getFieldErrors(error: unknown): Record<string, string[]> | null {
  if (isAxiosError<ApiErrorBody>(error) && error.response?.status === 422) {
    return error.response.data?.errors ?? null
  }
  return null
}
