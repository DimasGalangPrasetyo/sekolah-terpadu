# Sekolah Terpadu

[![CI](https://github.com/DimasGalangPrasetyo/sekolah-terpadu/actions/workflows/ci.yml/badge.svg)](https://github.com/DimasGalangPrasetyo/sekolah-terpadu/actions/workflows/ci.yml)

Sistem administrasi dan operasional untuk satu yayasan sekolah (TK, SD, SMP): data siswa dan staf, keuangan,
inventaris, dan workspace rapor. Dibangun sebagai **prototype** berdasarkan praktik umum sekolah, lalu direvisi
bersama pihak sekolah.

> **Status:** pengembangan aktif. Seluruh data di repositori ini adalah **data dummy**.

## Fitur

| Modul | Isi |
|---|---|
| Akun dan hak akses | Tiga peran (superadmin, admin TU & keuangan, guru), login username, kunci akun, audit log |
| Data master | Unit (TK/SD/SMP), tahun ajaran dan semester, tingkat, rombel, profil sekolah |
| Siswa | Buku induk, wali, penempatan kelas, mutasi (pindah, keluar, lulus) |
| Staf | Data staf, penugasan unit, penetapan wali kelas |
| Rapor (SD dan SMP) | Isian di kiri dan pratinjau di kanan sesuai template, status draft/final, cetak dengan pengaturan kertas |
| Keuangan | Jenis biaya, tarif, diskon siswa, tagihan bulanan massal, pembayaran dengan alokasi ke tagihan, kwitansi cetak, kas masuk/keluar, void dengan alasan |
| Inventaris | Aset, kategori, lokasi, riwayat perpindahan dan kondisi |

Dalam rencana: laporan keuangan, dashboard ringkas. Rincian ada di [`docs/product/BACKLOG.md`](docs/product/BACKLOG.md).

## Teknologi

| Lapisan | Pilihan |
|---|---|
| Backend | Laravel 13 (PHP 8.4+), autentikasi sesi cookie, `spatie/laravel-permission` |
| Frontend | React 19, TypeScript, Vite, Ant Design, TanStack Query, Zustand |
| Database | MySQL 8 (produksi); SQLite dalam memori untuk tes otomatis |

## Struktur repositori

```
backend/    API Laravel (rute per modul di routes/v1/, logika di app/Services/)
frontend/   Aplikasi React + Vite (satu folder per modul di src/features/)
docs/       Dokumentasi proyek (indeks di docs/README.md)
.github/    CI dan template pull request
```

## Menjalankan secara lokal

Prasyarat: PHP 8.4+, Composer, Node.js (LTS), dan MySQL 8 atau SQLite.

```bash
# Backend
cd backend
composer install
cp .env.example .env            # Windows: copy .env.example .env
php artisan key:generate
php artisan migrate --seed      # membuat data inti dan akun superadmin
php artisan db:seed --class=DummyDataSeeder   # opsional, data dummy (hanya lingkungan local)
php artisan serve               # http://localhost:8000

# Frontend (terminal lain)
cd frontend
npm install
npm run dev                     # http://localhost:5173 (permintaan /api diteruskan ke backend)
```

Password akun `superadmin` dibuat acak dan **hanya ditampilkan sekali** oleh seeder. Untuk menentukannya sendiri,
isi `SEED_SUPERADMIN_PASSWORD` di `.env` sebelum `migrate --seed`.

## Pengujian

```bash
cd backend  && php artisan test && ./vendor/bin/pint --test
cd frontend && npm run lint && npm run build
```

Backend memiliki lebih dari 290 tes otomatis. Seluruh pemeriksaan di atas dijalankan otomatis oleh CI pada setiap
push dan pull request.

## Dokumentasi

Mulai dari [`docs/README.md`](docs/README.md): kebutuhan produk, arsitektur, daftar endpoint, keputusan teknis,
dan asumsi yang menunggu review sekolah.

## Proses pengembangan

Pekerjaan dipecah menjadi paket kecil dengan kartu tugas dan kriteria selesai yang jelas. Sebagian kode ditulis
dengan bantuan agen AI, lalu setiap paket diuji otomatis dan manual oleh pemilik repositori sebelum digabung ke
`main`. Aturan kerja ada di [`AGENTS.md`](AGENTS.md); alur dan catatan kemajuan ada di
[`docs/process/`](docs/process/).

## Lisensi

Hak cipta © 2026 Dimas Galang Prasetyo. Seluruh hak dilindungi. Lihat [`LICENSE`](LICENSE).
