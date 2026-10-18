import '../report.css'
import type { EffectivePage } from '../printSettings'

/** Lembar cetak uji: kotak area cetak dan garis bantu 10 mm untuk mengkalibrasi posisi pada kertas khusus. */
export function TestSheet({ page }: { page: EffectivePage }) {
  const height = page.height - page.top - page.bottom - 1.5
  const label = { fontFamily: 'Arial, sans-serif' } as const

  return (
    <div className="rp-test" style={{ width: '100%', height: `${height}mm`, ...label }}>
      <span className="rp-test-label" style={{ top: 0, left: 0 }}>Kiri atas</span>
      <span className="rp-test-label" style={{ top: 0, right: 0 }}>Kanan atas</span>
      <span className="rp-test-label" style={{ bottom: 0, left: 0 }}>Kiri bawah</span>
      <span className="rp-test-label" style={{ bottom: 0, right: 0 }}>Kanan bawah</span>
      <div className="rp-test-label" style={{ top: '40%', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', width: '80%' }}>
        <strong>CETAK UJI</strong>
        <div>
          Kertas {page.width} × {page.height} mm · margin atas {page.top.toFixed(1)}, kanan {page.right.toFixed(1)}, bawah {page.bottom.toFixed(1)}, kiri {page.left.toFixed(1)} mm
        </div>
        <div>Kotak ini seharusnya sejajar dengan tepi kertas. Ukur jaraknya dengan penggaris; bila bergeser, atur Offset X/Y (garis bantu = 10 mm).</div>
      </div>
    </div>
  )
}
