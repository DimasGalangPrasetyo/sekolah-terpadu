import { GENDER_LABELS, SEMESTER_LABELS } from '../../../lib/constants'
import { formatDate, formatLongDate } from '../../../lib/format'
import { getGroup, getRows, getText } from '../data'
import '../report.css'
import type { FieldsSection, ReportCardDetail, ReportData, SignatureSection, TableSection, TextSection } from '../types'

function Identity({ card }: { card: ReportCardDetail }) {
  const s = card.student
  const left: [string, string][] = [
    ['Nama Siswa', s.name],
    ['NIS / NISN', [s.nis, s.nisn].filter(Boolean).join(' / ') || '-'],
    ['Jenis Kelamin', GENDER_LABELS[s.gender] ?? '-'],
    ['Tempat, Tgl. Lahir', [s.birth_place, s.birth_date ? formatDate(s.birth_date) : null].filter(Boolean).join(', ') || '-'],
  ]
  const right: [string, string][] = [
    ['Kelas', `${card.classroom.grade ?? ''} ${card.classroom.name}`.trim()],
    ['Semester', SEMESTER_LABELS[card.semester.name] ?? card.semester.name],
    ['Tahun Pelajaran', card.semester.year],
    ['Agama', s.religion ?? '-'],
  ]

  return (
    <table className="rp-plain">
      <tbody>
        {left.map(([label, value], i) => (
          <tr key={label}>
            <td style={{ width: '20%' }}>{label}</td>
            <td style={{ width: '32%' }}>: {value}</td>
            <td style={{ width: '16%' }}>{right[i][0]}</td>
            <td>: {right[i][1]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TableBlock({ section, data }: { section: TableSection; data: ReportData }) {
  const rows = getRows(data, section.key)

  return (
    <table className="rp-grid">
      <thead>
        <tr>
          <th style={{ width: '6%' }}>No</th>
          {section.columns.map((c) => (
            <th key={c.key}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr>
            <td colSpan={section.columns.length + 1} className="rp-center">-</td>
          </tr>
        )}
        {rows.map((row, i) => (
          <tr key={i}>
            <td className="rp-center">{i + 1}</td>
            {section.columns.map((c) => (
              <td key={c.key} className={c.key === 'score' ? 'rp-center' : undefined}>
                {row[c.key] ?? ''}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function FieldsBlock({ section, data }: { section: FieldsSection; data: ReportData }) {
  const values = getGroup(data, section.key)

  return (
    <table className="rp-plain" style={{ width: 'auto' }}>
      <tbody>
        {section.fields.map((f) => (
          <tr key={f.key}>
            <td style={{ paddingRight: 16 }}>{f.label}</td>
            <td>: {values[f.key] || '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function SignatureBlock({ section, data, card }: { section: SignatureSection; data: ReportData; card: ReportCardDetail }) {
  const names = getGroup(data, section.key)

  return (
    <>
      <div className="rp-date">{formatLongDate(card.finalized_at ?? new Date())}</div>
      <div className="rp-sign">
        {section.signers.map((signer) => (
          <div key={signer}>
            <div>{signer}</div>
            <div className="rp-space" />
            <div className="rp-name">{names[signer] ?? ''}</div>
          </div>
        ))}
      </div>
    </>
  )
}

/** Isi satu lembar rapor (tanpa margin). Dipakai untuk pratinjau dan cetak. */
export function ReportPaperContent({
  card,
  data,
  fontFamily,
  fontSizePt,
}: {
  card: ReportCardDetail
  data: ReportData
  fontFamily: string
  fontSizePt: number
}) {
  const unit = card.classroom.unit

  return (
    <div className="rp" style={{ fontFamily, fontSize: `${fontSizePt}pt` }}>
      <div className="rp-kop">
        <div className="rp-org">{card.school.foundation_name || 'Nama Yayasan'}</div>
        <div className="rp-unit">{unit.name}</div>
        {(card.school.address || card.school.phone) && (
          <div className="rp-small">{[card.school.address, card.school.phone ? `Telp. ${card.school.phone}` : null].filter(Boolean).join(' | ')}</div>
        )}
      </div>

      <div className="rp-title">
        Laporan Hasil Belajar
        <small>
          Semester {SEMESTER_LABELS[card.semester.name] ?? card.semester.name} · Tahun Pelajaran {card.semester.year}
        </small>
      </div>

      {card.template.definition.sections.map((section) => {
        const heading = 'title' in section && section.title ? section.title : section.type === 'text' ? section.label : undefined

        return (
          <div key={section.key} className="rp-section">
            {heading && section.type !== 'student_identity' && <div className="rp-heading">{heading}</div>}
            {section.type === 'student_identity' && <Identity card={card} />}
            {section.type === 'table' && <TableBlock section={section} data={data} />}
            {section.type === 'fields' && <FieldsBlock section={section} data={data} />}
            {section.type === 'text' && <div className="rp-text">{getText(data, (section as TextSection).key)}</div>}
            {section.type === 'signature' && <SignatureBlock section={section} data={data} card={card} />}
          </div>
        )
      })}
    </div>
  )
}
