import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { getSchoolProfile } from '../school/api'
import { PrintJob } from '../reportcards/components/PrintJob'
import { formatDate, formatRupiah } from '../../lib/format'
import { REPORT_PAGE_A4_LANDSCAPE, REPORT_PAGE_A4_PORTRAIT } from './constants'
import type {
  ArrearsReport,
  CashBookReport,
  DailyReport,
  SummaryReport,
} from './types'

export type ReportKind = 'summary' | 'arrears' | 'cash-book' | 'daily'

interface Props {
  kind: ReportKind
  data: SummaryReport | ArrearsReport | CashBookReport | DailyReport
  onDone: () => void
}

function formatWib(isoStr?: string): string {
  if (!isoStr) return '-'
  try {
    return dayjs(isoStr).format('DD MMM YYYY HH:mm') + ' WIB'
  } catch {
    return (isoStr ?? '-') + ' WIB'
  }
}

export function ReportPrint({ kind, data, onDone }: Props) {
  const { data: school, isLoading } = useQuery({
    queryKey: ['school-profile'],
    queryFn: getSchoolProfile,
  })

  if (isLoading || !school) {
    return null
  }

  const page =
    kind === 'cash-book' || kind === 'arrears'
      ? REPORT_PAGE_A4_LANDSCAPE
      : REPORT_PAGE_A4_PORTRAIT

  const contact = [
    school.phone ? `Telp: ${school.phone}` : null,
    school.email ? `Email: ${school.email}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  let title = ''
  let filterText = ''

  if (kind === 'summary') {
    const report = data as SummaryReport
    title = 'Laporan Ringkasan Keuangan'
    filterText = `Periode: ${formatDate(report.period.from)} s.d. ${formatDate(report.period.to)} | Unit: ${report.unit}`
  } else if (kind === 'arrears') {
    const report = data as ArrearsReport
    title = 'Laporan Tunggakan Siswa'
    filterText = `Per Tanggal: ${formatDate(report.as_of)} | Unit: ${report.unit} | ${report.include_not_due ? 'Termasuk belum jatuh tempo' : 'Hanya yang sudah jatuh tempo'}`
  } else if (kind === 'cash-book') {
    const report = data as CashBookReport
    title = 'Laporan Buku Kas Gabungan'
    filterText = `Periode: ${formatDate(report.period.from)} s.d. ${formatDate(report.period.to)} | Unit: ${report.unit}`
  } else if (kind === 'daily') {
    const report = data as DailyReport
    title = 'Laporan Kasir Harian'
    filterText = `Tanggal: ${formatDate(report.date)} | Unit: ${report.unit}`
  }

  const thStyle: React.CSSProperties = {
    border: '1px solid #333',
    padding: '4px 6px',
    backgroundColor: '#f2f2f2',
    fontWeight: 'bold',
    fontSize: '8.5pt',
  }

  const tdStyle: React.CSSProperties = {
    border: '1px solid #333',
    padding: '4px 6px',
    fontSize: '8pt',
  }

  return (
    <PrintJob page={page} onDone={onDone}>
      <div
        style={{
          width: '100%',
          boxSizing: 'border-box',
          fontFamily: 'Arial, Helvetica, sans-serif',
          color: '#000',
          backgroundColor: '#fff',
        }}
      >
        {/* Kop Sekolah */}
        <div
          style={{
            borderBottom: '2px solid #000',
            paddingBottom: '4px',
            marginBottom: '8px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '12pt', fontWeight: 'bold', textTransform: 'uppercase' }}>
            {school.foundation_name}
          </div>
          {school.address && (
            <div style={{ fontSize: '8.5pt', marginTop: '2px' }}>{school.address}</div>
          )}
          {contact && <div style={{ fontSize: '8.5pt' }}>{contact}</div>}
        </div>

        {/* Judul & Filter */}
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <div
            style={{
              fontSize: '11pt',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: '8.5pt', marginTop: '2px', color: '#222' }}>
            {filterText}
          </div>
        </div>

        {/* Isi Laporan */}
        {kind === 'summary' && (() => {
          const report = data as SummaryReport
          return (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: 'left', width: '22%' }}>Unit</th>
                  <th style={{ ...thStyle, textAlign: 'right', width: '16%' }}>Pembayaran Siswa</th>
                  <th style={{ ...thStyle, textAlign: 'right', width: '16%' }}>Kas Masuk Lain</th>
                  <th style={{ ...thStyle, textAlign: 'right', width: '16%' }}>Total Penerimaan</th>
                  <th style={{ ...thStyle, textAlign: 'right', width: '15%' }}>Pengeluaran</th>
                  <th style={{ ...thStyle, textAlign: 'right', width: '15%' }}>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr key={row.key}>
                    <td style={tdStyle}>{row.name}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {formatRupiah(row.student_payments)}
                      <div style={{ fontSize: '7pt', color: '#555' }}>
                        {row.student_payment_count} transaksi
                      </div>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {formatRupiah(row.other_income)}
                      <div style={{ fontSize: '7pt', color: '#555' }}>
                        {row.other_income_count} transaksi
                      </div>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>
                      {formatRupiah(row.total_income)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {formatRupiah(row.expense)}
                      <div style={{ fontSize: '7pt', color: '#555' }}>
                        {row.expense_count} transaksi
                      </div>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>
                      {formatRupiah(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>
                  <td style={{ ...tdStyle, fontWeight: 'bold' }}>Total</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>
                    {formatRupiah(report.total.student_payments)}
                    <div style={{ fontSize: '7pt', color: '#555' }}>
                      {report.total.student_payment_count} transaksi
                    </div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>
                    {formatRupiah(report.total.other_income)}
                    <div style={{ fontSize: '7pt', color: '#555' }}>
                      {report.total.other_income_count} transaksi
                    </div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>
                    {formatRupiah(report.total.total_income)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>
                    {formatRupiah(report.total.expense)}
                    <div style={{ fontSize: '7pt', color: '#555' }}>
                      {report.total.expense_count} transaksi
                    </div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>
                    {formatRupiah(report.total.balance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )
        })()}

        {kind === 'arrears' && (() => {
          const report = data as ArrearsReport
          return (
            <div>
              {/* Ringkasan per unit */}
              <div style={{ marginBottom: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px' }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, textAlign: 'left' }}>Unit</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Jumlah Siswa</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Jumlah Tagihan</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Total Tunggakan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.by_unit.map((u, i) => (
                      <tr key={i}>
                        <td style={tdStyle}>{u.unit ?? 'Semua Unit'}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{u.students}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{u.invoices}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>
                          {formatRupiah(u.outstanding)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>
                      <td style={{ ...tdStyle, fontWeight: 'bold' }}>Total Keseluruhan</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>
                        {report.total.students}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>
                        {report.total.invoices}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>
                        {formatRupiah(report.total.outstanding)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Rincian Siswa */}
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, textAlign: 'center', width: '30px' }}>No</th>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Siswa (NIS)</th>
                    <th style={{ ...thStyle, textAlign: 'left', width: '70px' }}>Kelas</th>
                    <th style={{ ...thStyle, textAlign: 'left', width: '50px' }}>Unit</th>
                    <th style={{ ...thStyle, textAlign: 'right', width: '70px' }}>Jml Tagihan</th>
                    <th style={{ ...thStyle, textAlign: 'left', width: '130px' }}>Jatuh Tempo Terlama</th>
                    <th style={{ ...thStyle, textAlign: 'right', width: '110px' }}>Total Tunggakan</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ ...tdStyle, textAlign: 'center' }}>
                        Tidak ada data tunggakan untuk filter ini.
                      </td>
                    </tr>
                  ) : (
                    report.rows.map((row, idx) => (
                      <tr key={idx}>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>{idx + 1}</td>
                        <td style={tdStyle}>
                          <span style={{ fontWeight: 'bold' }}>{row.student?.name ?? '-'}</span>
                          {row.student?.nis ? ` (${row.student.nis})` : ''}
                        </td>
                        <td style={tdStyle}>{row.classroom ?? '-'}</td>
                        <td style={tdStyle}>{row.unit ?? '-'}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{row.invoice_count}</td>
                        <td style={tdStyle}>
                          {row.oldest_due_date
                            ? `${formatDate(row.oldest_due_date)} (${row.days_overdue} hari)`
                            : 'Tanpa jatuh tempo'}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>
                          {formatRupiah(row.outstanding)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )
        })()}

        {kind === 'cash-book' && (() => {
          const report = data as CashBookReport
          return (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: 'center', width: '80px' }}>Tanggal</th>
                  <th style={{ ...thStyle, textAlign: 'left', width: '110px' }}>Referensi</th>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Uraian</th>
                  <th style={{ ...thStyle, textAlign: 'left', width: '60px' }}>Unit</th>
                  <th style={{ ...thStyle, textAlign: 'right', width: '100px' }}>Masuk</th>
                  <th style={{ ...thStyle, textAlign: 'right', width: '100px' }}>Keluar</th>
                  <th style={{ ...thStyle, textAlign: 'right', width: '110px' }}>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {/* Baris Saldo Awal */}
                <tr style={{ backgroundColor: '#fcfcfc', fontStyle: 'italic' }}>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{formatDate(report.period.from)}</td>
                  <td style={tdStyle}>-</td>
                  <td style={{ ...tdStyle, fontWeight: 'bold' }}>Saldo awal sebelum periode</td>
                  <td style={tdStyle}>-</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>-</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>-</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>
                    {formatRupiah(report.opening_balance)}
                  </td>
                </tr>

                {report.entries.map((entry, idx) => (
                  <tr key={idx}>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{formatDate(entry.date)}</td>
                    <td style={tdStyle}>{entry.reference}</td>
                    <td style={tdStyle}>{entry.description}</td>
                    <td style={tdStyle}>{entry.unit ?? 'Umum'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {entry.income > 0 ? formatRupiah(entry.income) : '-'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {entry.expense > 0 ? formatRupiah(entry.expense) : '-'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>
                      {formatRupiah(entry.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>
                  <td colSpan={4} style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>
                    Total Mutasi & Saldo Akhir:
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>
                    {formatRupiah(report.total_income)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>
                    {formatRupiah(report.total_expense)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>
                    {formatRupiah(report.closing_balance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )
        })()}

        {kind === 'daily' && (() => {
          const report = data as DailyReport
          return (
            <div>
              {/* Ringkasan Metode */}
              <div style={{ display: 'flex', gap: '16px', marginBottom: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px' }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Tunai</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Transfer</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Lainnya</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Total Pembayaran</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Jumlah Transaksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        {formatRupiah(report.by_method.cash)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        {formatRupiah(report.by_method.transfer)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        {formatRupiah(report.by_method.other)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>
                        {formatRupiah(report.total)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>
                        {report.count} transaksi
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Tabel Transaksi Pembayaran */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px' }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, textAlign: 'center', width: '28px' }}>No</th>
                    <th style={{ ...thStyle, textAlign: 'left', width: '110px' }}>No. Kwitansi</th>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Siswa</th>
                    <th style={{ ...thStyle, textAlign: 'center', width: '70px' }}>Metode</th>
                    <th style={{ ...thStyle, textAlign: 'left', width: '90px' }}>Referensi</th>
                    <th style={{ ...thStyle, textAlign: 'right', width: '100px' }}>Nominal</th>
                    <th style={{ ...thStyle, textAlign: 'left', width: '100px' }}>Penerima</th>
                  </tr>
                </thead>
                <tbody>
                  {report.payments.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ ...tdStyle, textAlign: 'center' }}>
                        Tidak ada data pembayaran untuk tanggal ini.
                      </td>
                    </tr>
                  ) : (
                    report.payments.map((p, idx) => (
                      <tr key={p.id}>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>{idx + 1}</td>
                        <td style={{ ...tdStyle, fontWeight: 'bold' }}>{p.receipt_number}</td>
                        <td style={tdStyle}>
                          {p.student?.name ?? '-'}
                          {p.student?.nis ? ` (${p.student.nis})` : ''}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center', textTransform: 'capitalize' }}>
                          {p.method}
                        </td>
                        <td style={tdStyle}>{p.reference ?? '-'}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>
                          {formatRupiah(p.amount)}
                        </td>
                        <td style={tdStyle}>{p.received_by ?? '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {report.payments.length > 0 && (
                  <tfoot>
                    <tr style={{ backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>
                      <td colSpan={5} style={{ ...tdStyle, textAlign: 'right' }}>
                        Total:
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{formatRupiah(report.total)}</td>
                      <td style={tdStyle} />
                    </tr>
                  </tfoot>
                )}
              </table>

              {/* Pembayaran Dibatalkan bila ada */}
              {report.voided_count > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '9pt', fontWeight: 'bold', marginBottom: '4px', color: '#b91c1c' }}>
                    Pembayaran Dibatalkan ({report.voided_count} transaksi · Total: {formatRupiah(report.voided_amount)})
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, textAlign: 'left', width: '110px' }}>No. Kwitansi</th>
                        <th style={{ ...thStyle, textAlign: 'left' }}>Siswa</th>
                        <th style={{ ...thStyle, textAlign: 'center', width: '60px' }}>Metode</th>
                        <th style={{ ...thStyle, textAlign: 'right', width: '90px' }}>Nominal</th>
                        <th style={{ ...thStyle, textAlign: 'left' }}>Alasan Pembatalan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.voided.map((v, i) => (
                        <tr key={i}>
                          <td style={tdStyle}>{v.receipt_number}</td>
                          <td style={tdStyle}>
                            {v.student?.name ?? '-'}
                            {v.student?.nis ? ` (${v.student.nis})` : ''}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center', textTransform: 'capitalize' }}>
                            {v.method}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>{formatRupiah(v.amount)}</td>
                          <td style={{ ...tdStyle, color: '#b91c1c' }}>{v.void_reason ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })()}

        {/* Waktu Cetak */}
        <div style={{ fontSize: '8pt', color: '#555', marginTop: '10px', marginBottom: '16px' }}>
          Dicetak pada {formatWib(data.generated_at)}
        </div>

        {/* Ruang Tanda Tangan */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '20px',
            pageBreakInside: 'avoid',
          }}
        >
          <div style={{ textAlign: 'center', width: '180px' }}>
            <div style={{ fontSize: '8.5pt' }}>Dibuat oleh,</div>
            <div style={{ height: '48px' }} />
            <div style={{ borderTop: '1px solid #000', paddingTop: '3px', fontWeight: 'bold', fontSize: '8.5pt' }}>
              ( .................................... )
            </div>
          </div>
          <div style={{ textAlign: 'center', width: '180px' }}>
            <div style={{ fontSize: '8.5pt' }}>Mengetahui,</div>
            <div style={{ height: '48px' }} />
            <div style={{ borderTop: '1px solid #000', paddingTop: '3px', fontWeight: 'bold', fontSize: '8.5pt' }}>
              ( .................................... )
            </div>
          </div>
        </div>
      </div>
    </PrintJob>
  )
}
