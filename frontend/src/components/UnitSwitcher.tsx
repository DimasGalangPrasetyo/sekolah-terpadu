import { Segmented, Select } from 'antd'
import { UNIT_OPTIONS, type UnitFilter } from '../lib/constants'
import { useUiStore } from '../stores/ui'

/** Pemilih unit (Semua/TK/SD/SMP). Layar lebar: tombol segmen; layar sempit: pilihan ringkas. */
export function UnitSwitcher({ compact }: { compact: boolean }) {
  const unit = useUiStore((s) => s.unit)
  const setUnit = useUiStore((s) => s.setUnit)

  if (compact) {
    return (
      <Select
        value={unit}
        onChange={(value: UnitFilter) => setUnit(value)}
        options={[...UNIT_OPTIONS]}
        style={{ width: 96 }}
        aria-label="Pilih unit"
      />
    )
  }

  return <Segmented value={unit} onChange={(value) => setUnit(value as UnitFilter)} options={[...UNIT_OPTIONS]} />
}
