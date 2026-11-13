# KARTU: Keuangan K-2F — Tab Tagihan (frontend)

**Pelaksana:** Antigravity · **Commit:** `feat(finance): tab tagihan (daftar, generate bulanan, manual, detail, void)`
**Baca dulu:** `AGENTS.md`, `docs/MODULE_GUIDE.md`, `docs/UI_GUIDE.md`, `docs/API.md` (bagian Tagihan), dan contoh `features/finance/DiscountTab.tsx` + `DiscountDrawer.tsx`
**Simpan kartu ini di:** `docs/agent-cards/CARD_KEUANGAN_K2F.md`

## Tujuan
TU dapat melihat tagihan, menerbitkan SPP bulanan massal (dengan pratinjau), membuat tagihan manual, melihat detail, dan membatalkan (void) tagihan.
**Hanya frontend.** Backend (`/invoices*`) sudah selesai dan teruji. Jangan mengubah backend, jangan membuat endpoint, dan **jangan membuat UI pembayaran** (itu paket K-3).

## Lingkup file
- Baru di `frontend/src/features/finance/`: `InvoiceTab.tsx`, `GenerateInvoicesModal.tsx`, `InvoiceCreateDrawer.tsx`, `InvoiceDetailDrawer.tsx`, `VoidInvoiceModal.tsx`
- Tambah (jangan hapus isi lama) di: `api.ts`, `types.ts`, `constants.ts`
- Ubah satu hal di `tabs.tsx`: tambahkan tab **Tagihan** sebagai tab **pertama** (key `invoices`), sehingga menjadi tab awal
- Dokumen: satu baris di `docs/PROGRESS.md` (`K-2 frontend | Selesai | <tanggal> | Antigravity | Tab Tagihan`)

## Kontrak API (semua di bawah `/api/v1`, bungkus respons `{ data }`; daftar ber-`meta` paginasi)

**Tipe** (tambahkan di `types.ts`):
```ts
type InvoiceStatus = 'unpaid' | 'partial' | 'paid' | 'void'
type InvoiceKind = 'monthly' | 'one_time'
interface Invoice {
  id: number; number: string; kind: InvoiceKind
  period_month: string | null          // 'YYYY-MM'
  due_date: string | null              // 'YYYY-MM-DD'
  total_amount: number; paid_amount: number; outstanding: number
  status: InvoiceStatus; is_overdue: boolean
  notes: string | null; voided_at: string | null; void_reason: string | null; created_at: string
  student?: { id: number; nis: string | null; name: string } | null
  unit?: { id: number; code: string; name: string }
  academic_year?: { id: number; name: string }
  items?: { id: number; fee_type: { id: number; code: string; name: string } | null; description: string
            quantity: number; unit_price: number; discount_amount: number; subtotal: number }[]
  allocations?: { id: number; amount: number
                  payment: { id: number; receipt_number: string; payment_date: string; status: string } | null }[]
}
interface GenerateResult {
  dry_run: boolean; period: string; unit: { id: number; code: string }
  eligible: number; created: number; skipped_existing: number; skipped_no_rate: number
  skipped_no_rate_students: { id: number; nis: string | null; name: string }[]; total_amount: number
}
```

| Fungsi di `api.ts` | Request |
|---|---|
| `listInvoices(params)` | `GET /invoices` dengan `unit` (kode, mis. `SD`), `status`, `kind`, `period` (`YYYY-MM`), `student_id`, `q`, `overdue` (1), `academic_year_id`, `page`, `per_page` → `Paginated<Invoice>` |
| `getInvoice(id)` | `GET /invoices/{id}` → memuat `items` dan `allocations` |
| `generateInvoices(payload)` | `POST /invoices/generate` body `{ unit_id, month: 'YYYY-MM', due_date?: 'YYYY-MM-DD', academic_year_id?, student_ids?, dry_run?: boolean }` → `GenerateResult` |
| `createInvoice(payload)` | `POST /invoices` body `{ student_id, due_date?, notes?, items: [{ fee_type_id, quantity?, unit_price?, description? }] }` → `Invoice` (201) |
| `voidInvoice(id, reason)` | `POST /invoices/{id}/void` body `{ reason }` → `Invoice` |

Galat: 422 berisi `errors` per kolom (termasuk `items.0.unit_price`, `items.1.fee_type_id`, `month`); 409 berisi `message` (void ditolak karena sudah ada pembayaran / sudah dibatalkan). Gunakan `getErrorMessage` yang sudah ada.

## Perilaku UI

### Tab Tagihan (`InvoiceTab`)
- Filter: cari `q` (debounce), tahun ajaran (default aktif; pola sama dengan `DiscountTab`), status, jenis (Bulanan/Sekali bayar), bulan (`DatePicker picker="month"` → `YYYY-MM`), saklar "Jatuh tempo terlewat" (`overdue=1`). **Unit mengikuti pemilih unit di bilah atas** lewat `useUiStore` seperti `FeeRateTab`.
- Tabel server-side, 15 per halaman: Nomor, Siswa (nama + NIS), Unit (Tag), Jenis + periode (mis. "Bulanan · 10/2026"), Jatuh tempo (merah dan Tag "Terlambat" bila `is_overdue`), Total, Terbayar, Sisa (`outstanding`), Status (Tag: Belum bayar, Sebagian, Lunas, Dibatalkan). Semua nominal dengan `formatRupiah`. Baris dibatalkan tampil redup.
- Klik baris membuka `InvoiceDetailDrawer`. Di layar sempit sembunyikan kolom Unit, Terbayar, dan Jenis (ikuti pola `useIsMobile` di `DiscountTab`).
- Tombol `Buat Tagihan Bulanan` dan `Tagihan Manual` hanya tampil bila `finance.manage`.

### `GenerateInvoicesModal` (dua langkah, wajib pratinjau)
1. Isian: unit (Select; bawaan dari pemilih unit atas bila spesifik), bulan (wajib), jatuh tempo (opsional, placeholder "Tanggal 10 bulan tersebut").
2. Tombol **Pratinjau** memanggil `generateInvoices({..., dry_run: true})` lalu menampilkan: siswa memenuhi syarat, **akan dibuat**, **sudah ada (dilewati)**, **tanpa tarif (dilewati)**, dan total nominal. Bila `skipped_no_rate > 0`, tampilkan Alert kuning "N siswa dilewati karena tarifnya belum diatur (atur di tab Tarif)" dengan daftar nama + NIS (boleh dilipat).
3. Tombol **Terbitkan Tagihan** hanya aktif **setelah pratinjau berhasil dan isian belum berubah** (ubah isian apa pun → pratinjau dianggap kedaluwarsa). Klik memanggil `generateInvoices({..., dry_run: false})`, lalu `message.success` ("N tagihan diterbitkan"), menutup modal, dan me-refresh daftar.
4. Bila `created = 0` pada pratinjau, tombol Terbitkan dinonaktifkan dengan keterangan "Tidak ada tagihan baru".

### `InvoiceCreateDrawer` (tagihan manual)
- Pemilih siswa dengan pencarian debounce `GET /students?q=` (pola `DiscountDrawer`).
- Daftar item dinamis (`Form.List`, minimal 1, maksimal 20): **jenis biaya** (hanya yang aktif dan **bukan kategori bulanan**; ambil dari `listFeeTypes(true)` lalu saring `category !== 'monthly'`), jumlah (bilangan bulat, min 1, bawaan 1), nominal satuan (opsional; placeholder "Otomatis dari tarif"; bilangan bulat min 1 bila diisi), deskripsi (opsional). Jenis biaya tidak boleh dobel antarbaris.
- Jatuh tempo (opsional), catatan (opsional, maks 500).
- Galat 422 dipetakan ke kolom, termasuk galat per-baris (`items.N.unit_price`, `items.N.fee_type_id`). Sukses: `message.success`, tutup, refresh daftar.

### `InvoiceDetailDrawer`
- Judul: nomor + Tag status. Rincian: siswa, unit, tahun ajaran, jenis/periode, jatuh tempo, dibuat, catatan.
- Tabel item: deskripsi, jumlah, harga satuan, potongan, subtotal; di bawahnya Total, Terbayar, Sisa.
- Bagian "Riwayat pembayaran": daftar `allocations` (nomor kwitansi, tanggal, jumlah); kosong → "Belum ada pembayaran".
- Bila `status = void`: Alert menampilkan alasan dan waktu pembatalan. Bila bukan void dan `finance.manage`: tombol **Batalkan Tagihan** (danger) membuka `VoidInvoiceModal`.

### `VoidInvoiceModal`
- Peringatan singkat bahwa pembatalan tidak dapat diurungkan. Kolom alasan wajib (min 5 karakter, maks 255). Galat 409 ditampilkan sebagai Alert di dalam modal (mis. "sudah ada pembayarannya"), bukan toast. Sukses: tutup, refresh daftar dan detail.

## Aturan umum
- Teks antarmuka Indonesia; responsif sesuai `docs/UI_GUIDE.md` (uji 375/768/1280); Drawer penuh lebar di layar sempit.
- Tombol tulis hanya bila `finance.manage`. Tombol aksi dinonaktifkan selama mutasi berjalan (cegah klik ganda).
- Jangan menambah paket npm. Jangan mengubah file di luar lingkup.

## Selesai bila
`npm run lint` dan `npm run build` lulus. Uji manual:
1. Sebagai `tu`: pratinjau lalu terbitkan SPP untuk satu unit dan bulan; ulangi, harus memberi "sudah ada (dilewati)" dan tombol Terbitkan nonaktif.
2. Siswa tanpa tarif muncul di daftar "dilewati".
3. Buat tagihan manual (nominal otomatis dan nominal sendiri); coba uang pangkal dua kali untuk siswa yang sama, harus ditolak dengan pesan di baris item.
4. Buka detail, batalkan dengan alasan, lalu terbitkan ulang bulan yang sama; harus berhasil dibuat lagi.
5. Sebagai `guru1`: menu Keuangan tidak muncul. Tab tampil rapi di lebar 375 px.

## Berhenti dan laporkan jika
Kontrak API di atas tidak cocok dengan respons nyata, perlu menyentuh backend, atau instruksi ambigu. Jangan `git push`.
