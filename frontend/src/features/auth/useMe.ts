import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { fetchMe } from '../../api/auth'
import type { AuthUser } from '../../types/api'
import { meKey } from './meKey'

/** Profil pengguna saat ini; null bila belum masuk atau sesi berakhir. */
export function useMe() {
  return useQuery<AuthUser | null>({
    queryKey: meKey,
    queryFn: async () => {
      try {
        return await fetchMe()
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 401) return null
        throw error
      }
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  })
}
