import { useState } from 'react'
import { Segmented } from 'antd'
import { ReportSummary } from './ReportSummary'
import { ReportArrears } from './ReportArrears'
import { ReportCashBook } from './ReportCashBook'
import { ReportDaily } from './ReportDaily'

type ReportType = 'summary' | 'arrears' | 'cash-book' | 'daily'

const REPORT_OPTIONS: { label: string; value: ReportType }[] = [
  { label: 'Ringkasan', value: 'summary' },
  { label: 'Tunggakan', value: 'arrears' },
  { label: 'Buku Kas', value: 'cash-book' },
  { label: 'Kasir Harian', value: 'daily' },
]

export function ReportTab() {
  const [activeReport, setActiveReport] = useState<ReportType>('summary')

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Segmented<ReportType>
          value={activeReport}
          onChange={(val) => setActiveReport(val)}
          options={REPORT_OPTIONS}
          size="middle"
        />
      </div>

      <div>
        {activeReport === 'summary' && <ReportSummary />}
        {activeReport === 'arrears' && <ReportArrears />}
        {activeReport === 'cash-book' && <ReportCashBook />}
        {activeReport === 'daily' && <ReportDaily />}
      </div>
    </div>
  )
}
