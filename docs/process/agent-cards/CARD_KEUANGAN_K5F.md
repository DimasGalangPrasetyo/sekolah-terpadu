# KARTU: Keuangan K-5F — Tab Laporan (frontend)

**Pelaksana:** Antigravity · **Commit:** `feat(finance): tab laporan keuangan (ringkasan, tunggakan, buku kas, kasir harian)`
**Baca dulu:** `AGENTS.md`, `docs/guides/MODULE_GUIDE.md`, `docs/guides/UI_GUIDE.md`, `docs/architecture/API.md` (bagian laporan), contoh `features/finance/PaymentTab.tsx`, `ReceiptPrint.tsx`, `features/reportcards/components/PrintJob.tsx`
**Syarat:** backend K-5 (`/reports/finance/*`) sudah terpasang dan ter-commit.

## Tujuan
TU dapat melihat dan mencetak empat laporan keuangan: **Ringkasan**, **Tunggakan**, **Buku Kas**, dan **Kasir Harian**.
**Hanya frontend.** Jangan mengubah backend, jangan membuat endpoint, jangan menambah paket npm, jangan membuat ekspor CSV.

## Lingkup file
- Baru di `frontend/src/features/finance/`: `ReportTab.tsx`, `ReportSummary.tsx`, `ReportArrears.tsx`, `ReportCashBook.tsx`, `ReportDaily.tsx`, `ReportPrint.tsx`
- Tambah (jangan hapus isi lama): `types.ts`, `api.ts`, `constants.ts`
- Ubah kecil: `tabs.tsx` (tab **Laporan** setelah tab Kas, key `reports`) dan `FinancePage.tsx` (lihat "Izin tab")
- **Boleh diimpor, jangan diubah:** `PrintJob.tsx`, `getSchoolProfile` dari `features/school/api.ts`
- Dokumen: satu baris `docs/process/PROGRESS.md` (`K-5 frontend | Selesai | <tanggal> | Antigravity | Tab Laporan keuangan`)

## Kontrak API (di bawah `/api/v1`, respons `{ data }`, semua GET, izin `reports.view`)
Nominal berupa bilangan bulat rupiah. Tanggal `YYYY-MM-DD`. Parameter `unit` = `TK` / `SD` / `SMP` / `none` (`none` = hanya kas tanpa unit, "Umum"); kosong = semua.

```ts
interface SummaryRow {            // GET /reports/finance/summary?date_from=&date_to=&unit=
  key: string; name: string       // key: 'TK' | 'SD' | 'SMP' | 'UMUM'
  student_payments: number; student_payment_count: number
  other_income: number; other_income_count: number
  total_income: number; expense: number; expense_count: number; balance: number
}
interface SummaryReport {
  period: { from: string; to: string }; unit: string
  rows: SummaryRow[]; total: Omit<SummaryRow, 'key' | 'name'>; generated_at: string
}

interface ArrearsInvoice { number: string; kind: 'monthly' | 'one_time'; period_month: string | null
  due_date: string | null; total_amount: number; paid_amount: number; outstanding: number; status: string }
interface ArrearsRow {            // GET /reports/finance/arrears?unit=&academic_year_id=&as_of=&include_not_due=1
  student: { id: number; nis: string | null; name: string } | null
  unit: string | null; classroom: string | null
  invoice_count: number; outstanding: number
  oldest_due_date: string | null; days_overdue: number; invoices: ArrearsInvoice[]
}
interface ArrearsReport {
  as_of: string; include_not_due: boolean; unit: string
  rows: ArrearsRow[]
  by_unit: { unit: string | null; students: number; invoices: number; outstanding: number }[]
  total: { students: number; invoices: number; outstanding: number }; generated_at: string
}

interface CashBookEntry {         // GET /reports/finance/cash-book?date_from=&date_to=&unit=
  date: string; kind: 'student_payment' | 'cash_income' | 'cash_expense'
  reference: string; description: string; unit: string | null
  income: number; expense: number; balance: number
}
interface CashBookReport {
  period: { from: string; to: string }; unit: string
  opening_balance: number; entries: CashBookEntry[]
  total_income: number; total_expense: number; closing_balance: number; generated_at: string
}

interface DailyPaymentRow { id: number; receipt_number: string
  student: { nis: string | null; name: string } | null
  method: 'cash' | 'transfer' | 'other'; reference: string | null; amount: number; received_by: string | null }
interface DailyReport {           // GET /reports/finance/daily-payments?date=&unit=
  date: string; unit: string
  payments: DailyPaymentRow[]
  by_method: { cash: number; transfer: number; other: number }; total: number; count: number
  voided: (DailyPaymentRow & { void_reason: string | null })[]; voided_count: number; voided_amount: number
  generated_at: string
}
```
Tambahkan fungsi di `api.ts`: `getSummaryReport`, `getArrearsReport`, `getCashBookReport`, `getDailyReport` (masing-masing menerima objek parameter).

**Aturan backend yang harus tercermin di UI:**
- `summary` dan `cash-book` wajib `date_from` dan `date_to`; rentang **maksimal 366 hari** (kirim 422 di server, tapi cegah juga di UI: nonaktifkan "Tampilkan" dan tampilkan Alert bila lebih).
- `daily-payments` wajib `date`. `arrears` tidak punya parameter wajib; `as_of` bawaan hari ini.
- Opsi unit **"Umum"** (`none`) hanya ditawarkan di Ringkasan dan Buku Kas. Di Tunggakan dan Kasir Harian hanya Semua/TK/SD/SMP (tagihan dan pembayaran selalu punya unit).
- Galat 422 berisi `errors` per kolom (mis. `date_to`, `unit`); gunakan `getErrorMessage` dan tampilkan sebagai `Alert` di atas hasil.
- Laporan bisa kosong; tampilkan keadaan kosong yang jelas ("Tidak ada data untuk filter ini"), bukan tabel hampa.

## Perilaku UI

### Kerangka (`ReportTab`)
`Segmented` untuk memilih laporan: **Ringkasan · Tunggakan · Buku Kas · Kasir Harian**. Setiap laporan punya bilah filter sendiri, tombol **Tampilkan** (atau muat otomatis saat filter berubah, pilih satu pola dan konsisten), dan tombol **Cetak** (aktif hanya bila data sudah termuat). Gunakan TanStack Query dengan kunci yang memuat parameter.

### Ringkasan (`ReportSummary`)
- Filter: rentang tanggal (`DatePicker.RangePicker`, bawaan awal bulan ini sampai hari ini), unit (Semua/TK/SD/SMP/Umum).
- Tabel: Unit, Pembayaran Siswa, Kas Masuk Lain, **Total Penerimaan**, Pengeluaran, **Saldo**, dengan baris **Total** di bawah. Jumlah transaksi (`*_count`) ditampilkan kecil di bawah nominal atau lewat tooltip. Saldo negatif berwarna merah.

### Tunggakan (`ReportArrears`)
- Filter: unit, tanggal acuan (`DatePicker`, bawaan hari ini), saklar **Sertakan yang belum jatuh tempo**.
- Tabel per siswa: Siswa (nama + NIS), Kelas, Unit, Jumlah tagihan, Terlama (tanggal jatuh tempo + "N hari"; merah bila lebih dari 30 hari; "Tanpa jatuh tempo" bila kosong), **Total tunggakan**. Baris dapat dibuka (`expandable`) untuk melihat rincian `invoices` (nomor, periode/jenis, jatuh tempo, total, terbayar, sisa).
- Di atas tabel: ringkasan **per unit** (`by_unit`) dan **total** (siswa, tagihan, tunggakan).

### Buku Kas (`ReportCashBook`)
- Filter: rentang tanggal (bawaan awal bulan ini sampai hari ini), unit (Semua/TK/SD/SMP/Umum).
- Tabel kronologis: Tanggal, Referensi, Uraian, Unit ("Umum" bila kosong), **Masuk**, **Keluar**, **Saldo**. Baris pertama **Saldo awal** (`opening_balance`) dan baris terakhir **Total + Saldo akhir** (`total_income`, `total_expense`, `closing_balance`).
- Catatan kecil di bawah judul: "Saldo awal dihitung dari seluruh transaksi valid di sistem sebelum periode."

### Kasir Harian (`ReportDaily`)
- Filter: tanggal (bawaan hari ini), unit (Semua/TK/SD/SMP).
- Tiga `Statistic`: Tunai, Transfer, Lainnya, plus Total dan Jumlah pembayaran.
- Tabel pembayaran: No. kwitansi, Siswa, Metode (Tag), Referensi, Nominal, Penerima.
- Bagian lipat **Pembayaran dibatalkan** (hanya tampil bila `voided_count > 0`): tabel yang sama ditambah alasan, dengan total `voided_amount`.

### Cetak (`ReportPrint`)
- Gunakan `PrintJob` apa adanya dengan halaman **A4 potret** `{ width: 210, height: 297, top: 12, right: 12, bottom: 12, left: 12 }` (sesuaikan dengan bentuk `EffectivePage`); simpan konstantanya di `constants.ts`. Buku Kas dan Tunggakan boleh memakai **A4 lanskap** bila tabelnya terlalu lebar, tetapi tetap lewat konstanta.
- Isi: kop dari `getSchoolProfile` (nama yayasan tebal, alamat, telepon/email bila ada), judul laporan, keterangan filter (periode/tanggal acuan, unit), tabel yang **sama dengan layar** memakai data yang sudah dimuat (jangan memanggil API lagi), "Dicetak pada {generated_at dalam WIB}", dan ruang tanda tangan ("Dibuat oleh" dan "Mengetahui").
- HTML + CSS biasa, hitam-putih, tanpa komponen AntD, nominal dengan `formatRupiah`, baris ringkasan/total dibuat tebal.

### Izin tab
Tambahkan properti opsional `permission?: string` pada `FinanceTabItem`, isi `'reports.view'` untuk tab Laporan, dan saring di `FinancePage.tsx` dengan `can(me, tab.permission)` (pola yang sama dengan `PaymentTab`). Tab lain tidak berubah. Perbarui `subtitle` `PageHeader` menjadi "Tagihan, pembayaran, kas, laporan, tarif, dan diskon".

## Aturan umum
- Teks Indonesia; responsif sesuai `docs/guides/UI_GUIDE.md` (uji 375/768/1280). Tabel lebar boleh digulir **di dalam** pembungkusnya, halaman tidak boleh bergulir ke samping. Di layar sempit sembunyikan kolom yang tidak esensial, jangan memotong angka.
- Tampilkan `Skeleton`/loading saat memuat dan nonaktifkan tombol selama memuat.
- Jangan menyentuh berkas di luar lingkup. Jangan menambah paket npm. Jangan mengubah backend.

## Selesai bila
`npm run lint` dan `npm run build` lulus. Uji manual sebagai `tu`:
1. Ringkasan: angka satu unit cocok dengan jumlah pada tab Pembayaran dan tab Kas untuk periode dan unit yang sama.
2. Tunggakan: total tunggakan satu unit cocok dengan jumlah **sisa** tagihan belum lunas yang jatuh tempo di tab Tagihan. Menyalakan "Sertakan yang belum jatuh tempo" menambah angka.
3. Buku Kas: saldo akhir = saldo awal + total masuk − total keluar; membatalkan satu transaksi kas atau pembayaran membuat barisnya hilang dan saldo berubah.
4. Kasir Harian: total per metode cocok dengan tab Pembayaran pada tanggal itu; pembayaran yang dibatalkan muncul di bagian terpisah dan tidak masuk total.
5. Cetak keempat laporan: pratinjau menampilkan kop, filter, tabel, dan waktu cetak.
6. Rentang lebih dari 366 hari tidak bisa ditampilkan dan pesannya jelas.
7. Sebagai `guru1` menu Keuangan tidak muncul; tampilan rapi di lebar 375 px.

## Berhenti dan laporkan jika
Kontrak API di atas tidak cocok dengan respons nyata, perlu menyentuh backend atau `PrintJob`, atau instruksi ambigu. Jangan `git push`.
