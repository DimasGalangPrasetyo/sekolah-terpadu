# KARTU: Keuangan K-1 — Jenis Biaya, Tarif, Diskon Siswa

**Pelaksana:** Antigravity · **Commit:** `feat(finance): jenis biaya, tarif, dan diskon siswa` · **Baca dulu:** `AGENTS.md`, `docs/MODULE_GUIDE.md`, `docs/UI_GUIDE.md`, `docs/DATABASE.md` §5 dan §7
**Simpan kartu ini di:** `docs/agent-cards/CARD_KEUANGAN_K1.md`

## Tujuan
TU dapat mengatur **jenis biaya**, **tarif** per unit/tingkat/tahun ajaran, dan **diskon/keringanan siswa**.
Ini fondasi tagihan (K-2) dan pembayaran (K-3). **Tidak ada tagihan atau pembayaran di kartu ini.**
Tabel `fee_types`, `fee_rates`, `student_discounts` dan modelnya **sudah ada**. Jangan membuat migrasi baru.
Seeder sudah mengisi jenis biaya awal (SPP, UANG_PANGKAL, SERAGAM, KEGIATAN) dan tarif dummy.

## Lingkup file (hanya ini)
- Backend baru: `routes/v1/finance_setup.php` (nama ini disengaja; paket K berikutnya memakai berkas rute sendiri),
  `app/Http/Controllers/Api/V1/Finance/{FeeTypeController,FeeRateController,StudentDiscountController}.php`,
  `app/Http/Requests/Finance/{FeeTypeRequest,FeeRateRequest,StudentDiscountRequest}.php`,
  `app/Http/Resources/{FeeTypeResource,FeeRateResource,StudentDiscountResource}.php`,
  `app/Services/FeeService.php`, `tests/Feature/Finance/`, `tests/Concerns/FinanceFixtures.php`
- Backend ubah (hanya menambah trait `Auditable` dan `$auditExclude`): `app/Models/FeeType.php`, `app/Models/FeeRate.php`, `app/Models/StudentDiscount.php`
- Frontend baru: `frontend/src/features/finance/` (`module.tsx`, `lazyPages.tsx`, `api.ts`, `types.ts`, `constants.ts`, `tabs.tsx`, `FinancePage.tsx`, `FeeTypeTab.tsx`, `FeeRateTab.tsx`, `DiscountTab.tsx`, dan drawer yang diperlukan)
- Dokumen: bagian di `docs/API.md`, satu baris di `docs/PROGRESS.md`, baris A-26 s.d. A-29 di `docs/ASSUMPTIONS.md` (isi di bawah)

## API (izin: `finance.view` baca, `finance.manage` tulis)

### Jenis biaya
| Method | Path | Keterangan |
|---|---|---|
| GET | `/fee-types?is_active=` | Tanpa paginasi, urut `name` |
| POST | `/fee-types` | Buat |
| PUT | `/fee-types/{feeType}` | Ubah `name`, `category` |
| POST | `/fee-types/{feeType}/deactivate`, `/activate` | Nonaktif/aktifkan |
| DELETE | `/fee-types/{feeType}` | Hapus |

**Aturan:**
- `code` wajib, unik, format `^[A-Z][A-Z0-9_]{1,29}$`. **Tidak bisa diubah setelah dibuat** (bila dikirim berbeda saat ubah → 422).
- `category` ∈ `monthly|one_time|annual|other`.
- Hapus ditolak (409, pesan Indonesia) bila dipakai `fee_rates`, `student_discounts`, atau `invoice_items`. Sarankan "Nonaktifkan" di pesan.
- Jenis biaya nonaktif tidak boleh dipakai untuk tarif atau diskon **baru** (422), tetapi data lama tetap tampil.

### Tarif
| Method | Path | Keterangan |
|---|---|---|
| GET | `/fee-rates?academic_year_id=&unit=&fee_type_id=&grade_level_id=` | Tanpa paginasi. `academic_year_id` kosong = tahun ajaran aktif (lewat `AcademicContext`). `unit` = kode unit |
| POST | `/fee-rates` | Buat |
| PUT | `/fee-rates/{feeRate}` | **Hanya `amount` yang bisa diubah**; kunci lain dikirim berbeda → 422 |
| DELETE | `/fee-rates/{feeRate}` | Hapus (tagihan lama tidak terpengaruh karena nominal disalin ke tagihan) |

**Aturan:**
- Isi: `fee_type_id*`, `unit_id*`, `grade_level_id` (kosong = berlaku untuk semua tingkat di unit itu), `academic_year_id*`, `amount*`.
- `amount` bilangan bulat rupiah, **minimal 1** (tidak ada tarif Rp 0), maksimal 9.999.999.999.
- `grade_level_id` bila diisi harus milik `unit_id` yang sama.
- **Duplikat kunci ditolak (422)** untuk kombinasi `(fee_type_id, unit_id, grade_level_id, academic_year_id)`.
  Awas: batas unik di MySQL **tidak** mencegah duplikat bila `grade_level_id` NULL, jadi pemeriksaan wajib dilakukan di `FeeService` dan diuji.
- Respons memuat `fee_type`, `unit: {id, code}`, `grade_level` (atau null), `academic_year`.

### Resolver tarif (dipakai K-2, wajib diuji sekarang)
Di `FeeService`: `resolveRate(FeeType $type, int $unitId, ?int $gradeLevelId, int $academicYearId): ?FeeRate`.
Urutan: tarif dengan `grade_level_id` sama persis → bila tidak ada, tarif `grade_level_id` NULL untuk unit itu → bila tidak ada, `null`. Tidak ada tarif bawaan Rp 0.

### Diskon siswa
| Method | Path | Keterangan |
|---|---|---|
| GET | `/student-discounts?q=&academic_year_id=&fee_type_id=&is_active=&page=&per_page=` | Paginasi 15. `q` mencari nama/NIS siswa. `academic_year_id` kosong = tahun ajaran aktif |
| POST | `/student-discounts` | Buat |
| PUT | `/student-discounts/{studentDiscount}` | Ubah `fee_type_id`, `type`, `value`, `reason` (siswa dan tahun ajaran tidak bisa diubah) |
| POST | `/student-discounts/{studentDiscount}/deactivate`, `/activate` | Nonaktif/aktifkan |

**Tidak ada DELETE** (jejak keuangan; gunakan nonaktifkan).

**Aturan:**
- Isi: `student_id*`, `fee_type_id` (kosong = semua jenis biaya), `academic_year_id*`, `type*` (`fixed|percent`), `value*`, `reason`.
- `percent`: `value` 1–100. `fixed`: `value` ≥ 1 (rupiah bulat).
- Hanya **satu diskon aktif** per `(student_id, fee_type_id atau semua, academic_year_id)`; duplikat → 422. Berlaku juga saat mengaktifkan kembali dan saat ubah (abaikan diri sendiri).
- Siswa harus ada (belum dihapus). Jenis biaya (bila diisi) harus aktif.
- **`reason` tidak disalin ke audit log** (bisa memuat kondisi ekonomi keluarga). Tambahkan ke `$auditExclude`.

### Izin
- `finance.view`: baca. `finance.manage`: tulis.
- `admin_tu_keuangan` boleh keduanya; `superadmin` hanya baca (**403** saat menulis); `guru` **403** untuk semuanya; belum login **401**.

## Tes wajib (minimal 22), di `tests/Feature/Finance/`
Gunakan `SchoolFixtures`, `CoreSeeder`, dan trait baru `FinanceFixtures`.
- **Jenis biaya:** daftar + filter aktif · buat · kode duplikat ditolak · format kode salah ditolak · ubah nama/kategori · ubah kode ditolak · nonaktif/aktifkan · hapus berhasil · hapus ditolak (dipakai tarif / diskon / item tagihan)
- **Tarif:** daftar default tahun ajaran aktif + filter unit · buat tarif per tingkat · buat tarif semua tingkat (NULL) · **duplikat NULL ditolak** · tingkat bukan milik unit ditolak · amount 0 ditolak · ubah amount · ubah kunci ditolak · jenis biaya nonaktif ditolak · hapus
- **Resolver:** memilih tarif tingkat spesifik · fallback ke tarif semua tingkat · `null` bila tidak ada
- **Diskon:** buat fixed dan percent · percent > 100 ditolak · duplikat aktif ditolak · duplikat setelah nonaktif diperbolehkan · aktifkan kembali yang bentrok ditolak · ubah nilai · `q` mencari nama/NIS · **audit tanpa `reason`**
- **Izin:** guru 403 · superadmin baca 200 dan tulis 403 · belum login 401 (cukup satu endpoint per grup, atau uji semua dengan dataProvider)

## Frontend (`/keuangan`)
- `module.tsx`: `key: 'finance'` (menggantikan placeholder), rute `keuangan` dengan `RequirePermission permission="finance.view"`.
- `FinancePage` memakai **Tabs** dari array di `tabs.tsx` (satu elemen per tab, agar paket K-2 s.d. K-5 cukup menambah baris). Tab K-1: **Jenis Biaya**, **Tarif**, **Diskon**. Tab Tarif jadi tab awal.
- **Jenis Biaya:** tabel (kode, nama, kategori sebagai Tag, status) + Drawer tambah/ubah. Kode hanya bisa diisi saat tambah (disabled saat ubah). Aksi: Ubah, Nonaktifkan/Aktifkan, Hapus (konfirmasi; tampilkan pesan 409 dari server).
- **Tarif:** filter tahun ajaran (default aktif) dan jenis biaya; **unit mengikuti pemilih unit di bilah atas** lewat `useUiStore`. Tabel: jenis biaya, unit (Tag), tingkat ("Semua tingkat" bila kosong), nominal `formatRupiah`. Drawer tambah (pilih jenis biaya, unit, tingkat opsional yang daftar pilihannya mengikuti unit, nominal) dan ubah (hanya nominal; kolom lain disabled). Hapus dengan konfirmasi.
- **Diskon:** filter cari/tahun ajaran/jenis biaya/status, tabel server-side (siswa + NIS, jenis biaya atau "Semua jenis biaya", potongan sebagai `Rp 50.000` atau `25%`, alasan [lg], status) + Drawer. Pemilih siswa memakai pencarian `GET /students?q=` (debounce) dan disabled saat ubah. Aksi: Ubah, Nonaktifkan/Aktifkan.
- Tombol tulis hanya tampil bila `finance.manage`. Input nominal: `InputNumber` bilangan bulat, min 1, tampilan pemisah ribuan titik.
- Galat 422/409 tampil di kolom/Alert. Responsif sesuai `docs/UI_GUIDE.md` (uji 375/768/1280). Semua teks Indonesia.

## Dokumen yang ditambahkan
`docs/API.md` (semua endpoint di atas) dan satu baris `docs/PROGRESS.md` (`K-1 | Selesai | <tanggal> | … | Jenis biaya, tarif, diskon siswa`).
Tambahkan ke `docs/ASSUMPTIONS.md` (status **BELUM**, catatan "Usulan PM, menunggu review sekolah"):
- **A-26** Keuangan: tarif ditentukan per jenis biaya, unit, tingkat, dan tahun ajaran; tarif tingkat spesifik menang atas tarif "semua tingkat"; tanpa tarif berarti tagihan dilewati, bukan Rp 0
- **A-27** Keuangan: diskon per siswa per tahun ajaran, nominal tetap atau persen; **tidak ditumpuk** (diskon spesifik jenis biaya menang atas diskon "semua jenis biaya"); persen dibulatkan ke bawah ke rupiah penuh
- **A-28** Keuangan: tanpa denda keterlambatan dan tanpa saldo lebih/deposit; tahun ajaran Juli–Juni; jatuh tempo SPP tanggal 10
- **A-29** Keuangan: tarif dan diskon yang diubah hanya memengaruhi tagihan yang **dibuat sesudahnya**

## Selesai bila
`php artisan test` semua lulus · `php vendor/bin/pint --test` bersih · `npm run lint` dan `npm run build` lulus · halaman `/keuangan` teruji manual sebagai `tu` (semua tab bisa tambah/ubah) dan `guru1` (403) · tiga tab tampil rapi di lebar 375 px.

## Berhenti dan laporkan jika
Perlu mengubah berkas di luar lingkup, perlu migrasi baru, tes lama gagal, atau instruksi ambigu. Jangan `git push`, `migrate:fresh`, atau menyentuh `.env`. **Jangan menambah endpoint tagihan, pembayaran, atau kas.**
