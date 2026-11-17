# Paket K-3 (backend) — Pembayaran, kwitansi, dan zona waktu WIB

Dikerjakan PM. Frontend pembayaran (K-3F) menyusul setelah backend ini lulus tes.

## Cara pasang
1. Pastikan `git status` bersih, lalu ekstrak zip ini **di akar repo** (sejajar `backend/` dan `docs/`).
   Tiga berkas lama tertimpa: `backend/config/app.php` (hanya baris `timezone`), `backend/app/Models/Payment.php`,
   `backend/app/Models/PaymentAllocation.php`. Sisanya 14 berkas baru. Tidak ada migrasi baru.
2. Cek `backend/.env`: bila ada baris `APP_TIMEZONE=UTC`, ubah menjadi `APP_TIMEZONE=Asia/Jakarta` atau hapus barisnya.
   (Baris itu akan menimpa bawaan baru.)
3. `cd backend && php artisan test` → diharapkan 209 lama + 48 baru = **257 lulus**.
   Bila ada tes lama yang gagal gara-gara zona waktu, kirim hasilnya ke PM; jangan ubah tesnya sendiri.
4. `php vendor/bin/pint --test`; bila mengeluh pada berkas paket ini, jalankan `php vendor/bin/pint <path berkas itu>`.
5. Tempel bagian "Dokumen" di bawah ke `docs/`. Commit: `feat(finance): pembayaran, alokasi, kwitansi, void pembayaran, zona waktu WIB (K-3 backend)`. Push, lalu kirim hasil tes.

Catatan: kolom `created_at` pada data dev yang sudah ada akan terbaca bergeser sekitar 7 jam (sebelumnya tersimpan basis UTC).
Tidak berpengaruh pada kolom tanggal biasa (jatuh tempo, tanggal bayar).

## Berkas
Baru: `app/Support/Terbilang.php`, `app/Services/PaymentService.php`, `app/Http/Controllers/Api/V1/Finance/PaymentController.php`,
`app/Http/Requests/Finance/{PaymentRequest,VoidPaymentRequest}.php`, `app/Http/Resources/PaymentResource.php`,
`routes/v1/finance_payments.php`, `tests/Concerns/PaymentFixtures.php`,
tes: `PaymentRecordTest`, `PaymentVoidTest`, `PaymentListTest`, `ReceiptTest`, `TimezoneTest`, `tests/Unit/TerbilangTest`.
Diubah: `config/app.php` (timezone), `Payment.php` (trait Auditable, cast integer), `PaymentAllocation.php` (cast integer).

## Dokumen

### docs/API.md — tambahkan
| Method | Path | Keterangan | Izin |
|---|---|---|---|
| GET | `/payments?student_id=&method=&status=&date_from=&date_to=&q=&page=&per_page=` | Daftar pembayaran (paginasi, `per_page` maks 100). `q` mencari nomor kwitansi/nama/NIS | `finance.view` |
| GET | `/payments/open-invoices?student_id=` | Tagihan terbuka siswa (belum lunas), urut terlama = urutan alokasi otomatis | `finance.view` |
| GET | `/payments/{id}` | Detail + alokasi + tagihan | `finance.view` |
| GET | `/payments/{id}/receipt` | Data kwitansi (nama yayasan, terbilang, alokasi). Setiap pengambilan dicatat di audit (`receipt_printed`) | `finance.view` |
| POST | `/payments` | Body: `student_id`, `payment_date` (`YYYY-MM-DD`, tidak boleh melewati hari ini WIB), `method` (`cash`/`transfer`/`other`), `reference` (wajib bila transfer), `notes?`, lalu **salah satu**: `allocations[{invoice_id, amount}]` (eksplisit; `amount` opsional tetapi harus sama dengan jumlah alokasi) atau `amount` saja (alokasi otomatis ke tagihan terlama). Kelebihan bayar → 422 | `finance.manage` |
| POST | `/payments/{id}/void` | Body `reason` (min 5 karakter). Nominal dikembalikan ke tagihan terkait. 409 bila sudah dibatalkan | `finance.manage` |

### docs/PROGRESS.md — tambahkan baris
`K-3 backend | Selesai | <tanggal> | PM | Pembayaran, alokasi, kwitansi (terbilang), void pembayaran, zona waktu WIB`

### docs/ASSUMPTIONS.md — tambahkan (status BELUM, "Usulan PM, menunggu review sekolah")
- **A-33** Keuangan: satu pembayaran milik satu siswa dan harus teralokasi penuh ke tagihannya; tidak ada kelebihan bayar atau deposit. Pembayaran sebagian per tagihan diperbolehkan
- **A-34** Keuangan: tanpa pilihan tagihan, pembayaran dialokasikan otomatis ke tagihan terlama (jatuh tempo paling lama dulu; tanpa jatuh tempo paling akhir)
- **A-35** Keuangan: metode bayar Tunai/Transfer/Lainnya; transfer wajib mencatat nomor referensi/bukti; tanggal bayar boleh mundur tetapi tidak boleh melewati hari ini
- **A-36** Keuangan: kwitansi bernomor `KWT/TTTT/BB/NNNN`; pembayaran yang salah dibatalkan (void) dan dicatat ulang, nomor kwitansi lama tidak dipakai lagi; kwitansi void tetap bisa dibuka dan ditandai "Dibatalkan"

### docs/DECISIONS.md — tambahkan
`D-nn | Zona waktu aplikasi Asia/Jakarta (WIB), dapat diganti lewat APP_TIMEZONE | Tanggal pembayaran dan nomor dokumen mengikuti hari kerja sekolah, bukan UTC`
`D-nn | Pembayaran memakai kunci baris berurutan (siswa → tagihan berurut id; void: pembayaran → tagihan berurut id) dalam satu transaksi | Mencegah kelebihan alokasi dan deadlock saat dua kasir bekerja bersamaan`
