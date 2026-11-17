# Paket K-2 (backend) — Tagihan

Dikerjakan PM. Frontend tagihan (K-2F) menyusul setelah backend ini lulus tes.

## Cara pasang
1. Pastikan `git status` bersih, lalu ekstrak zip ini **di akar repo** (folder `sekolah_terpadu`, sejajar `backend/` dan `docs/`).
   Satu berkas lama tertimpa: `backend/app/Models/Invoice.php`. Sisanya 14 berkas baru.
2. Migrasi (jangan `migrate:fresh`): `cd backend && php artisan migrate`
   Cek di MySQL: `SHOW INDEX FROM invoices;` → harus ada `invoices_student_kind_active_period_unique`
   dan tidak ada lagi indeks unik `(student_id, kind, period_month)`.
3. `php artisan test` (diharapkan 167 lama + 38 baru = 205 lulus), lalu `php vendor/bin/pint --test`.
   Bila Pint mengeluh pada berkas paket ini, jalankan `php vendor/bin/pint <path berkas itu>`.
4. Tempel isi bagian "Dokumen" di bawah ke `docs/API.md`, `docs/PROGRESS.md`, `docs/ASSUMPTIONS.md`, `docs/DECISIONS.md`.
5. Commit: `feat(finance): tagihan bulanan, tagihan manual, dan void (K-2 backend)`. Push, lalu kirim hasil tes ke PM.

## Berkas
Baru: migrasi `2026_11_08_000100_add_active_period_to_invoices`, `DocumentNumberService`, `InvoiceService`,
`InvoiceController`, `GenerateInvoicesRequest`, `InvoiceRequest`, `VoidInvoiceRequest`, `InvoiceResource`,
`routes/v1/finance_invoices.php`, tes (`InvoiceGenerateTest`, `InvoiceManualVoidTest`, `InvoiceListTest`,
`DocumentNumberTest`) dan `tests/Concerns/InvoiceFixtures.php`.
Diubah: `app/Models/Invoice.php` (trait `Auditable`, kolom `active_period`, cast integer).

## Dokumen

### docs/API.md — tambahkan
| Method | Path | Keterangan | Izin |
|---|---|---|---|
| GET | `/invoices?unit=&status=&kind=&period=YYYY-MM&student_id=&q=&overdue=1&academic_year_id=&page=&per_page=` | Daftar tagihan (paginasi, `per_page` maks 100). Tahun ajaran kosong = aktif | `finance.view` |
| GET | `/invoices/{id}` | Detail: item, alokasi pembayaran, `outstanding`, `is_overdue` | `finance.view` |
| POST | `/invoices/generate` | Body: `unit_id`, `month` (`YYYY-MM`), opsional `academic_year_id`, `due_date`, `student_ids[]`, `dry_run`. Idempoten. Respons `data`: `created`, `skipped_existing`, `skipped_no_rate`, `skipped_no_rate_students[]`, `eligible`, `total_amount` | `finance.manage` |
| POST | `/invoices` | Tagihan manual non-bulanan: `student_id`, `items[{fee_type_id, quantity?, unit_price?, description?}]`, `due_date?`, `notes?`. `unit_price` kosong = ambil dari tarif | `finance.manage` |
| POST | `/invoices/{id}/void` | Body `reason` (min 5 karakter). 409 bila sudah void atau sudah ada pembayaran | `finance.manage` |

### docs/PROGRESS.md — tambahkan baris
`K-2 backend | Selesai | <tanggal> | PM | Tagihan bulanan massal (idempoten, dry-run), tagihan manual, void, penomoran INV`

### docs/ASSUMPTIONS.md — tambahkan (status BELUM, "Usulan PM, menunggu review sekolah")
- **A-30** Keuangan: satu siswa satu tagihan bulanan per bulan; isinya semua jenis biaya bulanan aktif yang punya tarif. Hanya siswa berstatus aktif dengan rombel aktif di tahun ajaran itu yang ditagih
- **A-31** Keuangan: diskon nominal "semua jenis biaya" dipotongkan sekali per tagihan (dihabiskan berurutan antarbaris); tagihan bertotal Rp 0 (diskon penuh) otomatis berstatus lunas
- **A-32** Keuangan: biaya sekali bayar/tahunan (uang pangkal, seragam, kegiatan) hanya satu per siswa per tahun ajaran selama belum di-void; biaya bulanan tidak lewat tagihan manual

### docs/DECISIONS.md — tambahkan
`D-nn | Batas unik tagihan bulanan memakai kolom biasa active_period (diisi service, NULL saat void), bukan generated column | Tagihan di-void bisa dibuat ulang; tetap sesuai D-07`
