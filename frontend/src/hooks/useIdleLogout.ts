import { useEffect, useRef, useState } from 'react'

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const

/**
 * Peringatan setelah `idleSeconds` tanpa aktivitas, lalu keluar otomatis setelah `warnSeconds`.
 * Mengembalikan sisa detik saat peringatan tampil (null = tidak ada peringatan) dan fungsi `stay`.
 */
export function useIdleLogout(enabled: boolean, idleSeconds: number, warnSeconds: number, onTimeout: () => void) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const lastActivity = useRef(0)
  const warning = useRef(false)
  const timeoutCallback = useRef(onTimeout)

  useEffect(() => {
    timeoutCallback.current = onTimeout
  })

  useEffect(() => {
    if (!enabled) return

    lastActivity.current = Date.now()
    warning.current = false

    const markActivity = () => {
      if (!warning.current) lastActivity.current = Date.now()
    }

    const tick = window.setInterval(() => {
      const idle = (Date.now() - lastActivity.current) / 1000

      if (idle >= idleSeconds + warnSeconds) {
        window.clearInterval(tick)
        timeoutCallback.current()
      } else if (idle >= idleSeconds) {
        warning.current = true
        setSecondsLeft(Math.ceil(idleSeconds + warnSeconds - idle))
      }
    }, 1000)

    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, markActivity, { passive: true }))

    return () => {
      window.clearInterval(tick)
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, markActivity))
    }
  }, [enabled, idleSeconds, warnSeconds])

  const stay = () => {
    lastActivity.current = Date.now()
    warning.current = false
    setSecondsLeft(null)
  }

  return { secondsLeft, stay }
}
