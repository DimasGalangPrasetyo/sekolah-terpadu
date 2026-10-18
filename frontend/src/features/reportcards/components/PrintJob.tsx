import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { EffectivePage } from '../printSettings'

/**
 * Mencetak `children` dengan ukuran kertas dan margin tertentu.
 * Isi dipindahkan ke #print-root (satu-satunya yang tampil saat mencetak), @page diatur dinamis,
 * lalu dialog cetak browser dibuka. `onDone` dipanggil setelah dialog ditutup (cetak atau batal).
 */
export function PrintJob({ page, children, onDone }: { page: EffectivePage; children: ReactNode; onDone: () => void }) {
  const [host] = useState(() => {
    const el = document.createElement('div')
    el.id = 'print-root'
    return el
  })
  const done = useRef(onDone)

  useEffect(() => {
    done.current = onDone
  })

  const { width, height, top, right, bottom, left } = page

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `@page { size: ${width}mm ${height}mm; margin: ${top}mm ${right}mm ${bottom}mm ${left}mm; }`
    document.head.appendChild(style)
    document.body.appendChild(host)
    document.body.classList.add('is-printing')

    const cleanup = () => {
      style.remove()
      host.remove()
      document.body.classList.remove('is-printing')
    }
    const finish = () => {
      cleanup()
      done.current()
    }

    window.addEventListener('afterprint', finish, { once: true })
    const timer = window.setTimeout(() => window.print(), 200)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('afterprint', finish)
      cleanup()
    }
  }, [host, width, height, top, right, bottom, left])

  return createPortal(children, host)
}
