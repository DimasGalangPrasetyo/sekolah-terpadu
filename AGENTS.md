# AGENTS.md — Aturan Kerja Agent

Berlaku untuk OpenCode dan Antigravity. Baca file ini di awal setiap tugas.

## 1. Konteks singkat

Sistem administrasi dan operasional untuk satu yayasan (unit TK, SD, SMP). TU dan keuangan terpusat.
Cakupan: data siswa, data guru/staf, keuangan, inventaris (semua unit); workspace rapor (hanya SD dan SMP).
**Tidak ada modul penilaian.** Bukan SaaS: hanya untuk satu sekolah.
Detail: `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/ASSUMPTIONS.md`.

## 2. Stack (default, dikonfirmasi di T-0.2)

- Backend: Laravel (API), autentikasi sesi cookie (guard `web`, grup middleware `web`; Sanctum terpasang tetapi belum dipakai)
- Frontend: React + Vite
- Database: MySQL
- Bahasa kode/identifier: Inggris. Teks antarmuka: Indonesia.

## 3. Struktur folder

```
backend/    Laravel
frontend/   React + Vite
docs/       dokumen proyek
AGENTS.md
```

## 4. Perintah standar (isi/ubah di T-0.2 bila berbeda)

- Tes backend: `cd backend && php artisan test`
- Lint backend: `cd backend && ./vendor/bin/pint --test`
- Lint frontend: `cd frontend && npm run lint`
- Build frontend: `cd frontend && npm run build`

## 5. Aturan umum (semua agent)

1. Kerjakan **hanya** yang tertulis di kartu tugas. Jangan menambah fitur.
2. Ubah **hanya** file dalam lingkup kartu. Jika perlu menyentuh file lain, berhenti dan laporkan.
3. Jangan menginstal paket di luar yang tertulis di kartu.
4. Setiap perubahan logika harus disertai tes. Tes harus lulus sebelum tugas dinyatakan selesai.
5. **Data dummy saja.** Jangan membuat atau memasukkan data siswa/guru asli. Jangan commit `.env`, kunci, atau kredensial.
6. Jangan melakukan `git push`. Push dilakukan pemilik repo per fase.
7. Jangan menghapus atau menulis ulang file besar tanpa instruksi eksplisit.

## 6. Aturan database

- Migrasi yang sudah di-commit **tidak diedit**; buat migrasi baru.
- Migrasi yang memakai SQL mentah atau generated column wajib diuji di **MySQL**, bukan hanya SQLite.
- Data yang bergantung jenjang memakai `unit_id` (TK/SD/SMP). Tidak ada `tenant_id`.
- Tahun ajaran/semester aktif diambil dari satu service tunggal, bukan dihitung ulang di tiap tempat.

## 7. Aturan Git

- Satu tugas = satu cabang: `task/<ID>-<nama-singkat>` (contoh: `task/T-1.4-students-crud`).
- Pesan commit: `tipe(area): ringkasan` — tipe: `feat`, `fix`, `test`, `chore`, `docs`, `refactor`.
- Satu tugas = satu commit (boleh lebih jika terbagi logis).

## 8. Khusus OpenCode (eksekutor perintah)

- Jalankan perintah **persis** seperti tertulis. Jangan menyimpulkan, mengganti pendekatan, atau "memperbaiki" di luar lingkup.
- Jika hasil perintah berbeda dari yang diharapkan, atau instruksi ambigu: **berhenti dan laporkan.**
- Setelah selesai: isi laporan sesuai `docs/templates/TASK_REPORT.md`, perbarui `docs/PROGRESS.md`, lalu commit.

## 9. Khusus Antigravity (penulis kode)

> Status: **ditunda** selama kuotanya habis. Aturan ini berlaku saat dipakai kembali.

- **Buat rencana dulu** (langkah + file yang akan diubah). Jangan mengubah file sebelum rencana disetujui.
- Perubahan kecil dan bertahap. Jangan menulis ulang file di luar lingkup.
- Setelah implementasi: jalankan tes, lalu beri ringkasan perubahan dan hal yang belum yakin.
- Minta persetujuan sebelum menjalankan perintah terminal yang menginstal atau menghapus sesuatu.

## 10. Hemat usaha (model gratis, waktu mepet)

- Pakai generator bawaan (`php artisan make:model -mfc`, `make:resource`, dst.) sebelum menulis kode manual.
- Pakai satu library komponen UI siap pakai untuk tabel/form; jangan menulis CSS dari nol.
- Ikuti pola modul yang sudah ada (siswa → salin pola ke staf, inventaris, dst.).
- Utamakan jalur yang bisa didemokan; tunda polesan.
