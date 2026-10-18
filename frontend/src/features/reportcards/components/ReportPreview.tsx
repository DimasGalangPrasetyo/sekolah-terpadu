import { Alert } from 'antd'
import type { ReactNode } from 'react'
import { useElementSize } from '../../../hooks/useElementSize'
import { MM_TO_PX, type EffectivePage } from '../printSettings'

/**
 * Pratinjau lembar rapor sebesar kertas sebenarnya (mm), diskalakan agar muat di panel.
 * Garis putus merah menandai perkiraan batas halaman saat dicetak.
 */
export function ReportPreview({ page, children }: { page: EffectivePage; children: ReactNode }) {
  const [frameRef, frame] = useElementSize<HTMLDivElement>()
  const [contentRef, content] = useElementSize<HTMLDivElement>()

  const paperWidth = page.width * MM_TO_PX
  const pageHeight = page.height * MM_TO_PX
  const printable = Math.max(1, (page.height - page.top - page.bottom) * MM_TO_PX)
  const scale = frame.width > 0 ? Math.min(1, frame.width / paperWidth) : 1
  const pages = Math.max(1, Math.ceil(content.height / printable))
  const paperHeight = Math.max(pageHeight, content.height + (page.top + page.bottom) * MM_TO_PX)

  return (
    <div>
      {pages > 1 && (
        <Alert
          type="info"
          showIcon
          title={`Isi akan dicetak pada perkiraan ${pages} halaman`}
          description="Ringkas isian atau perkecil ukuran huruf di Pengaturan cetak bila ingin lebih sedikit halaman."
          style={{ marginBottom: 8 }}
        />
      )}
      <div ref={frameRef} style={{ width: '100%', height: paperHeight * scale, overflow: 'hidden' }}>
        <div
          style={{
            position: 'relative',
            width: paperWidth,
            minHeight: pageHeight,
            padding: `${page.top}mm ${page.right}mm ${page.bottom}mm ${page.left}mm`,
            background: '#fff',
            boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
          aria-label="Pratinjau rapor"
        >
          <div ref={contentRef}>{children}</div>
          {Array.from({ length: pages - 1 }, (_, i) => (
            <div
              key={i}
              aria-hidden
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: page.top * MM_TO_PX + (i + 1) * printable,
                borderTop: '1px dashed #f5222d',
                color: '#f5222d',
                fontSize: 11,
                textAlign: 'right',
                paddingRight: 6,
              }}
            >
              batas halaman {i + 1}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
