import { useSyncExternalStore } from 'react'

const QUERY = '(max-width: 991.98px)'

function subscribe(callback: () => void) {
  const media = window.matchMedia(QUERY)
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}

/** True di layar tablet ke bawah (< 992px). Nilai awal langsung benar (tanpa kedipan tata letak). */
export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  )
}
