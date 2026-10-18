import dayjs from 'dayjs'
import 'dayjs/locale/id'

dayjs.locale('id')

const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

export function formatRupiah(value: number): string {
  return rupiah.format(value).replace(/\s/g, ' ')
}

export function formatDate(iso: string | null | undefined): string {
  return iso ? dayjs(iso).format('DD MMM YYYY') : '-'
}

export function formatDateTime(iso: string | null | undefined): string {
  return iso ? dayjs(iso).format('DD MMM YYYY HH:mm') : '-'
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function formatLongDate(iso: string | Date | null | undefined): string {
  return iso ? dayjs(iso).format('D MMMM YYYY') : '-'
}
