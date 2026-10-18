import type { TemplatePage } from './types'

export const MM_TO_PX = 96 / 25.4

export const PAPER_PRESETS: Record<string, { label: string; width: number; height: number }> = {
  A4: { label: 'A4 (210 × 297 mm)', width: 210, height: 297 },
  F4: { label: 'F4 / Folio (215 × 330 mm)', width: 215, height: 330 },
  Letter: { label: 'Letter (216 × 279 mm)', width: 215.9, height: 279.4 },
  Legal: { label: 'Legal (216 × 356 mm)', width: 215.9, height: 355.6 },
}

export interface PrintSettings {
  size: string
  width_mm: number
  height_mm: number
  orientation: 'portrait' | 'landscape'
  margin_top_mm: number
  margin_right_mm: number
  margin_bottom_mm: number
  margin_left_mm: number
  offset_x_mm: number
  offset_y_mm: number
  font_family: string
  font_size_pt: number
}

export interface EffectivePage {
  width: number
  height: number
  top: number
  right: number
  bottom: number
  left: number
  fontFamily: string
  fontSizePt: number
}

export function settingsFromTemplate(page: TemplatePage): PrintSettings {
  const preset = PAPER_PRESETS[page.size]

  return {
    size: preset ? page.size : 'Custom',
    width_mm: preset ? preset.width : page.width_mm,
    height_mm: preset ? preset.height : page.height_mm,
    orientation: page.orientation,
    margin_top_mm: page.margin_top_mm,
    margin_right_mm: page.margin_right_mm,
    margin_bottom_mm: page.margin_bottom_mm,
    margin_left_mm: page.margin_left_mm,
    offset_x_mm: page.offset_x_mm,
    offset_y_mm: page.offset_y_mm,
    font_family: page.font_family,
    font_size_pt: page.font_size_pt,
  }
}

const storageKey = (templateId: number) => `sekolah-terpadu-print-${templateId}`

export function loadSettings(templateId: number, fallback: PrintSettings): PrintSettings {
  try {
    const raw = window.localStorage.getItem(storageKey(templateId))
    return raw ? { ...fallback, ...(JSON.parse(raw) as Partial<PrintSettings>) } : fallback
  } catch {
    return fallback
  }
}

export function saveSettings(templateId: number, settings: PrintSettings): void {
  try {
    window.localStorage.setItem(storageKey(templateId), JSON.stringify(settings))
  } catch {
    // penyimpanan tidak tersedia: pengaturan hanya berlaku selama halaman terbuka
  }
}

export function clearSettings(templateId: number): void {
  try {
    window.localStorage.removeItem(storageKey(templateId))
  } catch {
    // abaikan
  }
}

/**
 * Ukuran kertas (sesuai orientasi) dan margin efektif. Offset menggeser isi tanpa mengubah lebar area cetak:
 * kiri/atas bertambah, kanan/bawah berkurang (tidak kurang dari 0).
 */
export function effectivePage(s: PrintSettings): EffectivePage {
  const long = Math.max(s.width_mm, s.height_mm)
  const short = Math.min(s.width_mm, s.height_mm)
  const landscape = s.orientation === 'landscape'

  return {
    width: landscape ? long : short,
    height: landscape ? short : long,
    top: Math.max(0, s.margin_top_mm + s.offset_y_mm),
    right: Math.max(0, s.margin_right_mm - s.offset_x_mm),
    bottom: Math.max(0, s.margin_bottom_mm - s.offset_y_mm),
    left: Math.max(0, s.margin_left_mm + s.offset_x_mm),
    fontFamily: s.font_family,
    fontSizePt: s.font_size_pt,
  }
}
