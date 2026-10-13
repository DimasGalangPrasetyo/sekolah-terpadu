import { useQuery } from '@tanstack/react-query'
import { fetchAcademicContext } from '../api/master'

export function useAcademicContext(enabled = true) {
  return useQuery({ queryKey: ['academic-context'], queryFn: fetchAcademicContext, enabled, staleTime: 60_000 })
}
