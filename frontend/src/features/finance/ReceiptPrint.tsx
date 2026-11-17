import type { Receipt } from './types'
import { formatDateTime, formatRupiah } from '../../lib/format'

interface Props {
  receipt: Receipt
}

function formatReceiptDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date)
  } catch {
    return dateStr
  }
}

export function ReceiptPrint({ receipt }: Props) {
  const isVoid = receipt.status === 'void'
  const contact = [
    receipt.school.phone ? `Telp: ${receipt.school.phone}` : null,
    receipt.school.email ? `Email: ${receipt.school.email}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '190mm',
        minHeight: '128mm',
        boxSizing: 'border-box',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '9.5pt',
        lineHeight: 1.35,
        color: '#000',
        backgroundColor: '#fff',
        position: 'relative',
      }}
    >
      {/* Watermark bila void */}
      {isVoid && (
        <div
          style={{
            position: 'absolute',
            top: '48%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-24deg)',
            fontSize: '44pt',
            fontWeight: 'bold',
            color: 'rgba(200, 30, 30, 0.28)',
            border: '3px dashed rgba(200, 30, 30, 0.35)',
            padding: '6px 28px',
            letterSpacing: '6px',
            pointerEvents: 'none',
            zIndex: 10,
            textAlign: 'center',
            textTransform: 'uppercase',
          }}
        >
          Dibatalkan
        </div>
      )}

      {/* Kop Sekolah */}
      <div
        style={{
          borderBottom: '2px solid #000',
          paddingBottom: '4px',
          marginBottom: '8px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '13pt', fontWeight: 'bold', textTransform: 'uppercase' }}>
          {receipt.school.name}
        </div>
        {receipt.school.address && (
          <div style={{ fontSize: '8.5pt' }}>{receipt.school.address}</div>
        )}
        {contact && <div style={{ fontSize: '8.5pt' }}>{contact}</div>}
      </div>

      {/* Judul & Nomor Kwitansi */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <div
          style={{
            fontSize: '13pt',
            fontWeight: 'bold',
            letterSpacing: '2px',
            textTransform: 'uppercase',
          }}
        >
          Kwitansi Pembayaran
        </div>
        <div style={{ fontSize: '9pt', fontWeight: 'bold' }}>
          No. {receipt.receipt_number}
        </div>
        {isVoid && (
          <div
            style={{
              marginTop: '2px',
              fontSize: '8.5pt',
              color: '#b91c1c',
              fontWeight: 'bold',
            }}
          >
            [ DIBATALKAN: {receipt.void_reason ?? '-'} · {formatDateTime(receipt.voided_at)} ]
          </div>
        )}
      </div>

      {/* Isi Rincian */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px' }}>
        <tbody>
          <tr>
            <td style={{ width: '130px', verticalAlign: 'top', padding: '2px 0' }}>
              Telah terima dari
            </td>
            <td style={{ width: '12px', verticalAlign: 'top', padding: '2px 0' }}>:</td>
            <td style={{ verticalAlign: 'top', padding: '2px 0', fontWeight: 'bold' }}>
              {receipt.student ? (
                <>
                  {receipt.student.name}
                  {receipt.student.nis && (
                    <span style={{ fontWeight: 'normal' }}> (NIS: {receipt.student.nis})</span>
                  )}
                </>
              ) : (
                '-'
              )}
            </td>
          </tr>
          <tr>
            <td style={{ verticalAlign: 'top', padding: '2px 0' }}>Uang sejumlah</td>
            <td style={{ verticalAlign: 'top', padding: '2px 0' }}>:</td>
            <td
              style={{
                verticalAlign: 'top',
                padding: '2px 0',
                fontStyle: 'italic',
                textTransform: 'capitalize',
              }}
            >
              {receipt.amount_in_words}
            </td>
          </tr>
          <tr>
            <td style={{ verticalAlign: 'top', padding: '2px 0' }}>Untuk pembayaran</td>
            <td style={{ verticalAlign: 'top', padding: '2px 0' }}>:</td>
            <td style={{ verticalAlign: 'top', padding: '2px 0' }}>
              {receipt.allocations && receipt.allocations.length > 0 ? (
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    marginTop: '2px',
                    fontSize: '8.5pt',
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: '1px solid #ccc', backgroundColor: '#f9f9f9' }}>
                      <th style={{ textAlign: 'left', padding: '2px 4px' }}>No. Tagihan</th>
                      <th style={{ textAlign: 'left', padding: '2px 4px' }}>Keterangan</th>
                      <th style={{ textAlign: 'right', padding: '2px 4px' }}>Nominal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipt.allocations.map((a, i) => (
                      <tr key={i} style={{ borderBottom: '1px dashed #e5e5e5' }}>
                        <td style={{ padding: '2px 4px' }}>{a.invoice_number ?? '-'}</td>
                        <td style={{ padding: '2px 4px' }}>{a.description ?? '-'}</td>
                        <td style={{ textAlign: 'right', padding: '2px 4px' }}>
                          {formatRupiah(a.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                '-'
              )}
            </td>
          </tr>
          <tr>
            <td style={{ verticalAlign: 'top', padding: '2px 0' }}>Metode</td>
            <td style={{ verticalAlign: 'top', padding: '2px 0' }}>:</td>
            <td style={{ verticalAlign: 'top', padding: '2px 0' }}>
              {receipt.method_label}
              {receipt.reference ? ` (No. Ref: ${receipt.reference})` : ''}
              {receipt.notes ? ` · Catatan: ${receipt.notes}` : ''}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Bagian Bawah: Nominal & Tanda Tangan */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginTop: '10px',
        }}
      >
        <div
          style={{
            border: '2px solid #000',
            padding: '6px 14px',
            fontSize: '12pt',
            fontWeight: 'bold',
            alignSelf: 'center',
          }}
        >
          {formatRupiah(receipt.amount)}
        </div>

        <div style={{ textAlign: 'center', minWidth: '150px' }}>
          <div>{formatReceiptDate(receipt.payment_date)}</div>
          <div style={{ marginTop: '2px' }}>Penerima,</div>
          <div style={{ height: '44px' }} />
          <div style={{ fontWeight: 'bold', borderTop: '1px dotted #666', paddingTop: '2px' }}>
            ( {receipt.received_by ?? '........................'} )
          </div>
        </div>
      </div>
    </div>
  )
}
