# KARTU: Keuangan K-4 — Kas Masuk/Keluar dan Kategori Kas

**Pelaksana:** Antigravity · **Commit:** `feat(finance): kas masuk/keluar dan kategori kas`
**Baca dulu:** `AGENTS.md`, `docs/MODULE_GUIDE.md`, `docs/UI_GUIDE.md`, `docs/DATABASE.md` §5, dan contoh pola terdekat: `app/Services/PaymentService.php`, `app/Services/DocumentNumberService.php`, `PaymentController.php`, `PaymentRequest.php`, `features/finance/PaymentTab.tsx`, `VoidPaymentModal.tsx`
**Simpan kartu ini di:** `docs/agent-cards/CARD_KEUANGAN_K4.md`
**Syarat:** kerjakan **setelah K-3F di-commit** (kartu ini menambah tab di `tabs.tsx` yang juga diubah K-3F).

## Tujuan
TU dapat mencatat **kas masuk dan kas keluar di luar pembayaran siswa** (donasi, sumbangan, listrik, ATK, gaji, dst.), mengelola kategori kas, melihat ringkasan, dan membatalkan transaksi yang salah.
Tabel `cash_categories` dan `cash_transactions`, model `CashCategory` dan `CashTransaction`, enum `CashType`, serta kategori bawaan (seeder) **sudah ada**. **Jangan membuat migrasi.**
Pembayaran siswa **tidak** disalin ke kas (hindari ganda); laporan gabungan dibuat di paket K-5, bukan di sini.

## Lingkup file (hanya ini)
- Backend baru: `routes/v1/finance_cash.php`, `app/Services/CashService.php`,
  `app/Http/Controllers/Api/V1/Finance/{CashCategoryController,CashTransactionController}.php`,
  `app/Http/Requests/Finance/{CashCategoryRequest,CashTransactionRequest,VoidCashTransactionRequest}.php`,
  `app/Http/Resources/{CashCategoryResource,CashTransactionResource}.php`,
  `tests/Concerns/CashFixtures.php`, `tests/Feature/Finance/{CashCategoryTest,CashTransactionTest}.php`
- Backend ubah (hanya tambah trait `Auditable`): `app/Models/CashCategory.php`, `app/Models/CashTransaction.php`
- Frontend baru di `frontend/src/features/finance/`: `CashTab.tsx`, `CashDrawer.tsx`, `CashDetailDrawer.tsx`, `VoidCashModal.tsx`, `CashCategoryTab.tsx`, `CashCategoryDrawer.tsx`
- Frontend tambah (jangan hapus isi lama): `types.ts`, `api.ts`, `constants.ts`; ubah `tabs.tsx` (tab **Kas** setelah Pembayaran, tab **Kategori Kas** paling akhir)
- Dokumen: `docs/API.md`, satu baris `docs/PROGRESS.md`, dan baris A-37 s.d. A-39 di `docs/ASSUMPTIONS.md` (isi di bawah)

## API (izin: `finance.view` baca, `finance.manage` tulis; respons dibungkus `{ data }`, daftar bertransaksi ber-`meta` paginasi)

### Kategori kas
| Method | Path | Keterangan |
|---|---|---|
| GET | `/cash-categories?type=&is_active=` | Tanpa paginasi, urut `type` lalu `name` |
| POST | `/cash-categories` | `{ name, type }`, dibuat aktif |
| PUT | `/cash-categories/{id}` | **Hanya `name`** yang bisa diubah; `type` dikirim berbeda → 422 |
| POST | `/cash-categories/{id}/deactivate`, `/activate` | |
| DELETE | `/cash-categories/{id}` | 409 bila sudah punya transaksi (sarankan menonaktifkan) |

**Aturan:** `name` wajib, maks 100, **unik per `type`** (nama sama beda jenis boleh; cek di service/validasi, 422). `type` ∈ `income|expense`.

### Transaksi kas
| Method | Path | Keterangan |
|---|---|---|
| GET | `/cash-transactions?type=&cash_category_id=&unit=&status=&date_from=&date_to=&q=&page=&per_page=` | Paginasi 15, `per_page` maks 100, urut `transaction_date` desc lalu `id` desc. `unit` = kode unit (`TK`/`SD`/`SMP`) atau `none` untuk transaksi umum (tanpa unit). `q` mencari nomor atau keterangan. `date_*` format `YYYY-MM-DD` |
| GET | `/cash-transactions/summary` | Filter sama dengan daftar (tanpa paginasi). Respons `data: { income, expense, balance, count }` dari transaksi berstatus **valid** saja; `balance = income − expense` |
| GET | `/cash-transactions/{id}` | Detail |
| POST | `/cash-transactions` | `{ transaction_date, cash_category_id, unit_id?, amount, description }` → 201 |
| POST | `/cash-transactions/{id}/void` | `{ reason }` (min 5, maks 255). 409 bila sudah dibatalkan |

**Tidak ada PUT dan tidak ada DELETE** untuk transaksi (koreksi lewat batalkan + catat ulang). Permintaan PUT/DELETE harus berujung 405.

**Aturan pencatatan (di `CashService`, dalam satu `DB::transaction`):**
- `type` transaksi **diambil dari kategori** (klien tidak mengirim `type`). Kategori harus aktif (422 pada `cash_category_id`).
- `transaction_date`: format `Y-m-d`, **tidak boleh melewati hari ini**: gunakan `'before_or_equal:'.now()->toDateString()` di `rules()` (jangan memakai kata `today`, supaya tes dengan `Carbon::setTestNow` berlaku).
- `amount`: bilangan bulat 1 s.d. 9.999.999.999. `description`: wajib, maks 255. `unit_id`: opsional, harus ada di `units` (kosong = umum).
- `number`: `app(DocumentNumberService::class)->next('KAS', now())` → `KAS/2026/11/0001`. Nomor dibuat di dalam transaksi yang sama.
- `status = valid`, `created_by = pengguna login`.
- **Void:** dalam `DB::transaction`, ambil baris dengan `lockForUpdate`, tolak 409 bila sudah `void`, lalu isi `status=void`, `voided_at=now()`, `voided_by`, `void_reason`.
- Pola kode: ikuti `PaymentService`/`PaymentController` (galat 422 lewat `ValidationException::withMessages`, 409 lewat `abort(409, '...')`). Tambahkan `Auditable` pada kedua model.

**Resource:**
- `CashCategoryResource`: `id, name, type, is_active`.
- `CashTransactionResource`: `id, number, transaction_date (Y-m-d), type, amount (int), description, status, voided_at, void_reason, created_at`, `category {id, name, type}`, `unit {id, code, name} | null`, `created_by {id, name}` (pakai `whenLoaded`, kembalikan null bila relasi kosong).

**Izin:** `admin_tu_keuangan` boleh baca dan tulis; `superadmin` hanya baca (403 saat menulis); `guru` 403 untuk semuanya; belum login 401.

## Tes wajib (minimal 30), di `tests/Feature/Finance/`
Gunakan `SchoolFixtures` dan `CoreSeeder` (kategori seperti "Donasi" dan "Listrik dan Air" sudah ada dari seeder). Buat trait `CashFixtures` untuk helper (mis. `cashCategory(name, type)` dan `recordCash(array)`).
**Penting untuk tes izin:** cek "belum login → 401" harus dilakukan **paling awal**, sebelum `actingAs` apa pun, karena `actingAs` bertahan sampai tes selesai.
- **Kategori:** daftar + filter type/aktif · buat · nama duplikat pada jenis sama ditolak · nama sama beda jenis diperbolehkan · ubah nama · ubah type ditolak · nonaktif/aktifkan · hapus berhasil · hapus ditolak 409 bila punya transaksi · izin (401/403 guru/superadmin baca saja)
- **Transaksi:** catat kas masuk (type otomatis income) · catat kas keluar (type expense) · nomor `KAS/\d{4}/\d{2}/\d{4}` berurutan dan unik · `unit_id` kosong = umum · unit tertentu · kategori nonaktif ditolak · tanggal masa depan ditolak dan tanggal "hari ini WIB" diterima (`Carbon::setTestNow(Carbon::parse('2026-11-14 18:30:00', 'UTC')->setTimezone('Asia/Jakarta'))` lalu tanggal 2026-11-15 diterima dan 2026-11-16 ditolak) · amount 0 ditolak · deskripsi wajib · unit tidak ada ditolak · audit `created` tercatat
- **Daftar dan ringkasan:** filter type, kategori, `unit=SD`, `unit=none`, status, rentang tanggal, `q` (nomor dan keterangan) · `per_page=1000` dibatasi 100 · detail memuat kategori/unit/pembuat · `summary` menghitung income/expense/balance hanya dari transaksi valid dan mengikuti filter · transaksi void tidak masuk ringkasan
- **Void:** berhasil (status, alasan, `voided_by`) · void dua kali 409 · alasan wajib dan minimal 5 karakter · nomor tidak dipakai ulang setelah void · PUT dan DELETE transaksi menghasilkan 405 · izin tulis (401 lebih dulu, lalu guru 403 dan superadmin 403)

## Frontend (`/keuangan`)

### Tab Kas (`CashTab`)
- Di atas tabel: tiga `Statistic` (Pemasukan hijau, Pengeluaran merah, Selisih) dari `getCashSummary` dengan filter aktif yang sama, plus catatan kecil "Tidak termasuk pembayaran siswa."
- Filter: cari `q` (debounce), jenis (Semua/Masuk/Keluar), kategori (mengikuti jenis), **unit milik tab ini sendiri** (Semua / Umum / TK / SD / SMP; Umum → `unit=none`; **tidak** mengikuti pemilih unit di bilah atas), status, rentang tanggal.
- Tabel server-side 15 per halaman: Nomor, Tanggal, Jenis (Tag hijau "Masuk" / merah "Keluar"), Kategori, Unit (Tag atau "Umum"), Keterangan (ellipsis), Nominal (`formatRupiah`, berwarna sesuai jenis), Status (Tag; baris dibatalkan redup). Klik baris membuka `CashDetailDrawer`. Sembunyikan Kategori, Unit, dan Keterangan di layar sempit (pola `useIsMobile`).
- Dua tombol: **Catat Kas Masuk** dan **Catat Kas Keluar** (hanya bila `finance.manage`); keduanya membuka `CashDrawer` dengan jenis terisi.

### `CashDrawer`
Tanggal (bawaan hari ini, tanggal setelah hari ini dinonaktifkan), jenis (`Segmented` Masuk/Keluar, bawaan dari tombol; mengganti jenis mengosongkan kategori), kategori (hanya yang aktif dan sesuai jenis), unit (Select dengan opsi "Umum" bernilai kosong, TK, SD, SMP; bawaan Umum), nominal (`InputNumber` bilangan bulat min 1, pemisah ribuan), keterangan (wajib, maks 255). Galat 422 dipetakan ke kolom. Sukses: `message.success`, tutup, refresh daftar dan ringkasan.

### `CashDetailDrawer` dan `VoidCashModal`
Rincian lengkap (nomor, tanggal, jenis, kategori, unit, nominal, keterangan, dicatat oleh). Bila void: Alert berisi alasan dan waktu. Tombol **Batalkan Transaksi** (danger) hanya bila `finance.manage` dan status valid; `VoidCashModal` mengikuti pola `VoidPaymentModal` (alasan wajib min 5, galat 409 di dalam modal). Tampilkan petunjuk: "Transaksi tidak dapat diubah. Jika salah input, batalkan lalu catat ulang."

### Tab Kategori Kas (`CashCategoryTab`)
Tabel (nama, jenis sebagai Tag, status), filter jenis dan status, tombol Tambah Kategori. Aksi baris: Ubah, Nonaktifkan/Aktifkan, Hapus (konfirmasi; tampilkan pesan 409 dari server). `CashCategoryDrawer`: nama dan jenis; **jenis tidak bisa diubah saat ubah** (disabled).

### Umum
Teks Indonesia; responsif (375/768/1280) sesuai `docs/UI_GUIDE.md`; tombol tulis hanya bila `finance.manage`; nonaktifkan tombol selama mutasi berjalan; gunakan `getErrorMessage` untuk semua galat; tanpa paket npm baru. Lampiran bukti (`proof_path`) **belum** dibuat: jangan menambah unggah berkas.

## Dokumen yang ditambahkan
`docs/API.md` (semua endpoint di atas), satu baris `docs/PROGRESS.md` (`K-4 | Selesai | <tanggal> | Antigravity | Kas masuk/keluar dan kategori kas`), dan di `docs/ASSUMPTIONS.md` (status **BELUM**, catatan "Usulan PM, menunggu review sekolah"):
- **A-37** Keuangan: transaksi kas tidak dapat diubah setelah dicatat; kesalahan dikoreksi dengan membatalkan (void, wajib alasan) lalu mencatat ulang
- **A-38** Keuangan: tanggal kas tidak boleh melewati hari ini (WIB); jenis kategori kas (masuk/keluar) tetap setelah dibuat; kategori nonaktif tidak dapat dipakai untuk transaksi baru
- **A-39** Keuangan: kas masuk/keluar hanya untuk transaksi di luar pembayaran siswa; lampiran bukti belum tersedia (nomor nota boleh ditulis di keterangan)

## Selesai bila
`php artisan test` semua lulus · `php vendor/bin/pint --test` bersih (rapikan hanya berkas K-4 bila ada keluhan) · `npm run lint` dan `npm run build` lulus · uji manual sebagai `tu`: catat kas masuk dan keluar, ringkasan berubah dan mengikuti filter, batalkan satu transaksi (ringkasan ikut berubah), tambah/ubah/nonaktifkan/hapus kategori (hapus kategori bertransaksi ditolak dengan pesan jelas) · `guru1` tidak melihat menu Keuangan · tampilan rapi di lebar 375 px.

## Berhenti dan laporkan jika
Perlu mengubah berkas di luar lingkup, membuat migrasi, tes lama gagal, atau instruksi ambigu. Jangan `git push`, `migrate:fresh`, atau menyentuh `.env`. **Jangan menambah laporan gabungan, unggah bukti, atau hubungan ke pembayaran siswa.**
