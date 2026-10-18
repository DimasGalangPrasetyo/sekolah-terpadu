import { useEffect, useState } from 'react'

/** Ukuran elemen (px, sebelum transformasi) yang diperbarui otomatis. Pakai: <div ref={ref} /> */
export function useElementSize<T extends HTMLElement>() {
  const [node, setNode] = useState<T | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (!node) return

    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(node)

    return () => observer.disconnect()
  }, [node])

  return [setNode, size] as const
}
