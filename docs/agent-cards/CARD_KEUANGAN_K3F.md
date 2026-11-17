# KARTU: Keuangan K-3F — Pembayaran dan Kwitansi (frontend)

**Pelaksana:** Antigravity · **Commit:** `feat(finance): tab pembayaran, catat pembayaran, kwitansi cetak, void pembayaran`
**Baca dulu:** `AGENTS.md`, `docs/MODULE_GUIDE.md`, `docs/UI_GUIDE.md`, `docs/API.md` (bagian Pembayaran), contoh `features/finance/InvoiceTab.tsx`, `InvoiceCreateDrawer.tsx`, `InvoiceDetailDrawer.tsx`, `VoidInvoiceModal.tsx`, dan `features/reportcards/components/PrintJob.tsx`
**Simpan kartu ini di:** `docs/agent-cards/CARD_KEUANGAN_K3F.md`

## Tujuan
TU dapat mencatat pembayaran siswa (memilih tagihan atau nominal saja), melihat daftar pembayaran, mencetak kwitansi, dan membatalkan (void) pembayaran.
**Hanya frontend.** Backend `/payments*` sudah selesai dan teruji. Jangan mengubah backend, jangan membuat endpoint, jangan menambah paket npm.

## Lingkup file
- Baru di `frontend/src/features/finance/`: `PaymentTab.tsx`, `PaymentCreateDrawer.tsx`, `PaymentDetailDrawer.tsx`, `VoidPaymentModal.tsx`, `ReceiptPrint.tsx`
- Tambah (jangan hapus isi lama): `types.ts`, `api.ts`, `constants.ts`
- Ubah kecil: `tabs.tsx` (tab **Pembayaran** sebagai tab kedua, setelah Tagihan), `InvoiceTab.tsx` dan `InvoiceDetailDrawer.tsx` (tombol **Bayar**, lihat bawah)
- **Boleh diimpor, jangan diubah:** `features/reportcards/components/PrintJob.tsx`
- Dokumen: satu baris `docs/PROGRESS.md` (`K-3 frontend | Selesai | <tanggal> | Antigravity | Tab Pembayaran, kwitansi`)

## Kontrak API (di bawah `/api/v1`, respons dibungkus `{ data }`; daftar ber-`meta` paginasi)

**Tipe** (tambahkan di `types.ts`):
```ts
type PaymentMethod = 'cash' | 'transfer' | 'other'
type PaymentStatus = 'valid' | 'void'
interface Payment {
  id: number; receipt_number: string; payment_date: string      // 'YYYY-MM-DD'
  method: PaymentMethod; amount: number
  reference: string | null; notes: string | null
  status: PaymentStatus; voided_at: string | null; void_reason: string | null; created_at: string
  student?: { id: number; nis: string | null; name: string } | null
  received_by?: { id: number; name: string } | null
  allocations?: { id: number; amount: number
    invoice: { id: number; number: string; kind: 'monthly' | 'one_time'
               period_month: string | null; status: InvoiceStatus } | null }[]
}
interface Receipt {
  receipt_number: string; payment_date: string; method: PaymentMethod; method_label: string
  reference: string | null; notes: string | null; amount: number; amount_in_words: string
  status: PaymentStatus; voided_at: string | null; void_reason: string | null
  student: { nis: string | null; name: string } | null; received_by: string | null
  allocations: { invoice_number: string | null; unit: string | null; description: string | null; amount: number }[]
  school: { name: string; address: string | null; phone: string | null; email: string | null }
  printed_at: string
}
```

| Fungsi di `api.ts` | Request |
|---|---|
| `listPayments(params)` | `GET /payments` dengan `q`, `student_id`, `method`, `status`, `date_from`, `date_to` (`YYYY-MM-DD`), `page`, `per_page` → `Paginated<Payment>` |
| `getPayment(id)` | `GET /payments/{id}` → `Payment` lengkap dengan `allocations` |
| `listOpenInvoices(studentId)` | `GET /payments/open-invoices?student_id=` → `Invoice[]` (sudah urut terlama; pakai tipe `Invoice` dari K-2F, field `outstanding` = sisa) |
| `createPayment(payload)` | `POST /payments` body `{ student_id, payment_date, method, reference?, notes?, amount?, allocations?: [{ invoice_id, amount }] }` → `Payment` (201) |
| `voidPayment(id, reason)` | `POST /payments/{id}/void` body `{ reason }` → `Payment` |
| `getReceipt(id)` | `GET /payments/{id}/receipt` → `Receipt` |

**Aturan backend yang harus tercermin di UI:**
- Kirim **salah satu**: `allocations` (mode pilih tagihan; jangan kirim `amount`) **atau** `amount` saja (mode otomatis ke tagihan terlama).
- Kelebihan bayar ditolak (422 pada `amount` atau `allocations.N.amount`). `reference` wajib bila `method = 'transfer'`. `payment_date` tidak boleh melewati hari ini.
- Galat 422: `errors` per kolom (`amount`, `allocations.N.amount`, `allocations.N.invoice_id`, `reference`, `payment_date`). Galat 409 (void): `message`. Gunakan `getErrorMessage` dari `api/errors` pada semua catch.
- **Setiap pemanggilan `getReceipt` dicatat di audit.** Panggil hanya saat TU menekan tombol cetak, bukan saat drawer dibuka.

## Perilaku UI

### Tab Pembayaran (`PaymentTab`)
- Filter: cari `q` (nomor kwitansi/nama/NIS, debounce), metode, status, rentang tanggal (`DatePicker.RangePicker` → `date_from`/`date_to`).
- Tabel server-side 15 per halaman: Nomor kwitansi, Tanggal, Siswa (nama + NIS), Metode (Tag), Nominal (`formatRupiah`), Penerima, Status (Tag: Valid hijau, Dibatalkan abu; baris dibatalkan redup). Klik baris membuka `PaymentDetailDrawer`. Sembunyikan kolom Penerima dan Metode di layar sempit (pola `useIsMobile` seperti K-2F).
- Tombol `Catat Pembayaran` hanya tampil bila `finance.manage`.

### `PaymentCreateDrawer`
Props: `initialStudent?: { id; nis; name }` dan `initialInvoiceId?: number` (terisi saat dibuka dari tombol Bayar di detail tagihan).
1. **Siswa:** pemilih dengan pencarian debounce `GET /students?q=` (pola `DiscountDrawer`). Setelah dipilih, muat `listOpenInvoices(student_id)`. Bila kosong tampilkan "Siswa ini tidak punya tagihan terbuka" dan nonaktifkan tombol simpan.
2. **Mode** (`Segmented`): **Pilih tagihan** (bawaan) dan **Nominal saja (otomatis ke tagihan terlama)**.
   - *Pilih tagihan:* tabel tagihan terbuka dengan kotak centang: nomor, jenis/periode, jatuh tempo (merah bila `is_overdue`), sisa. Baris yang dicentang menampilkan `InputNumber` nominal dibayar (bawaan = sisa; bilangan bulat, min 1, maks sisa). Tampilkan **Total pembayaran** = jumlah nominal terpilih. Bila `initialInvoiceId` ada, baris itu sudah tercentang.
   - *Nominal saja:* satu `InputNumber` nominal. Tampilkan **perkiraan alokasi** (hitung di klien dengan urutan daftar yang sama: isi sisa tagihan satu per satu sampai nominal habis) dengan label "Perkiraan; server yang menentukan". Bila nominal melebihi total sisa semua tagihan: tampilkan Alert "Nominal melebihi total tagihan (Rp …). Kelebihan bayar tidak diterima." dan nonaktifkan simpan.
3. **Tanggal bayar** (`DatePicker`, bawaan hari ini, tanggal setelah hari ini dinonaktifkan), **Metode** (`Radio.Group`: Tunai, Transfer, Lainnya), **Referensi** (wajib dan bertanda bintang bila Transfer; label "No. referensi / bukti transfer"), **Catatan** (opsional, maks 500).
4. Simpan → `createPayment` (mode pilih tagihan mengirim `allocations`; mode nominal mengirim `amount`). Galat 422 dipetakan ke kolom/baris tagihan yang bersangkutan (termasuk `allocations.N.amount` di bawah baris yang dicentang; hitung N dari urutan baris terpilih yang dikirim).
5. Sukses: tutup drawer, refresh daftar pembayaran dan tagihan, lalu tampilkan `Modal` "Pembayaran tersimpan · {receipt_number}" dengan tombol **Cetak Kwitansi** dan **Tutup**.

### `PaymentDetailDrawer`
- Judul: nomor kwitansi + Tag status. Rincian: siswa, tanggal, metode, referensi, catatan, penerima.
- Tabel alokasi: nomor tagihan, jenis/periode, jumlah; di bawahnya Total.
- Bila `status = void`: Alert menampilkan alasan dan waktu pembatalan.
- Tombol **Cetak Kwitansi** (selalu tampil untuk yang punya `finance.view`; kwitansi void ikut tercetak dengan tanda "DIBATALKAN"). Tombol **Batalkan Pembayaran** (danger) hanya bila `finance.manage` dan status `valid`, membuka `VoidPaymentModal`.

### `VoidPaymentModal`
Sama polanya dengan `VoidInvoiceModal`: peringatan bahwa nominal akan dikembalikan ke tagihan terkait dan tidak dapat diurungkan, kolom alasan wajib (min 5, maks 255), galat 409 tampil sebagai Alert di dalam modal. Sukses: tutup, refresh daftar pembayaran dan tagihan.

### Tombol Bayar di tagihan (ubah kecil K-2F)
Di `InvoiceDetailDrawer`, bila `finance.manage` dan status tagihan `unpaid` atau `partial`, tambahkan tombol **Bayar**. Klik membuka `PaymentCreateDrawer` dengan `initialStudent` dan `initialInvoiceId` dari tagihan itu. Kelola state drawer di `InvoiceTab` (angkat state lewat props/callback `onPay`). Setelah pembayaran sukses, detail tagihan harus menampilkan data terbaru (invalidate query tagihan).

### Cetak kwitansi (`ReceiptPrint`)
- Alur: tombol cetak → `getReceipt(id)` (tampilkan loading di tombol) → render `<PrintJob page={...} onDone={...}>` dengan komponen `ReceiptPrint`. Gunakan `PrintJob` **apa adanya**.
- Halaman: A5 lanskap, `{ width: 210, height: 148, top: 10, right: 10, bottom: 10, left: 10 }` (sesuaikan dengan bentuk `EffectivePage` di `printSettings.ts`).
- Tata letak (HTML + CSS biasa, hitam-putih, tanpa komponen AntD):
  1. Kop: nama yayasan (tebal), alamat, telepon/email bila ada.
  2. Judul **KWITANSI** dan **No. {receipt_number}**.
  3. Baris berlabel: *Telah terima dari* (nama siswa + NIS), *Uang sejumlah* (`amount_in_words`, miring), *Untuk pembayaran* (daftar alokasi: nomor tagihan, deskripsi, jumlah per baris), *Metode* (`method_label`; plus referensi bila ada).
  4. Kotak nominal besar `formatRupiah(amount)`.
  5. Kanan bawah: tanggal dengan format "D MMMM YYYY" (gunakan `Intl.DateTimeFormat('id-ID', …)`; jangan menambah paket), "Penerima", ruang tanda tangan, lalu `received_by`.
  6. Bila `status = void`: watermark miring besar **DIBATALKAN** dan baris alasan pembatalan.
- Tersedia dari `PaymentDetailDrawer`, dari tombol Cetak di baris tabel (menu aksi), dan dari modal sukses setelah catat pembayaran.

## Aturan umum
- Teks antarmuka Indonesia; responsif sesuai `docs/UI_GUIDE.md` (uji 375/768/1280); Drawer penuh lebar di layar sempit.
- Tombol tulis hanya bila `finance.manage`. Nonaktifkan tombol selama mutasi berjalan (cegah klik ganda; ini uang).
- Jangan menyentuh berkas di luar lingkup. Jangan menambah paket npm. Jangan mengubah backend.

## Selesai bila
`npm run lint` dan `npm run build` lulus. Uji manual sebagai `tu`:
1. Dari detail tagihan klik **Bayar**, bayar sebagian; status tagihan menjadi Sebagian dan sisa berkurang.
2. Catat pembayaran mode **Nominal saja** untuk sisa tagihan itu; tagihan menjadi Lunas.
3. Nominal melebihi total tagihan: tombol simpan nonaktif dengan pesan jelas; coba paksa lewat nominal pada baris melebihi sisa, galat tampil di baris itu.
4. Transfer tanpa referensi ditolak; tanggal besok tidak bisa dipilih.
5. Cetak kwitansi: pratinjau A5 menampilkan kop, terbilang, rincian, dan nominal.
6. Batalkan pembayaran: tagihan kembali ke status sebelumnya; cetak ulang kwitansi menampilkan **DIBATALKAN**.
7. Sebagai `guru1`: menu Keuangan tidak muncul. Tab dan drawer rapi di lebar 375 px.

## Berhenti dan laporkan jika
Kontrak API di atas tidak cocok dengan respons nyata, perlu menyentuh backend atau `PrintJob`, atau instruksi ambigu. Jangan `git push`.
