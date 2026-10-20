# PROGRESS

Diperbarui setelah setiap tugas selesai. Pelaksana: U = kamu, C = Claude (chat), AG = Antigravity.

## Status tugas

| ID | Status | Tanggal | Commit/Cabang | Catatan |
|---|---|---|---|---|
| A-01 | Selesai | 2026-10-10 | main | Repo, dokumen kit, push ke GitHub |
| A-02a | Selesai | 2026-10-10 | main | Laravel 13, PHP 8.5, Sanctum, spatie permission |
| A-02b | Selesai | 2026-10-10 | main | Vite + React + TS + Ant Design + TanStack Query dkk; build berhasil |
| A-04 / A-05 | Selesai | 2026-10-10 | task/A-04-schema | Pack 1: 32 tabel, model, enum, seeder; 7 tes lulus; pint bersih; 75 siswa / 11 rombel |
| A-03 | Selesai | 2026-10-10 | task/A-03-auth | Pack 2 (backend): login username, ganti password, kunci akun; semua tes lulus |
| A-08b / A-08c | Selesai (backend) | 2026-10-10 | task/A-03-auth | Manajemen akun dan audit log; UI ada di Pack 3 |
| A-UI-1 | Selesai | 2026-10-11 | main | Pack 3 + perbaikan 3.1 (tombol Keluar); 40 tes lulus; login, dashboard, logout teruji manual |
| A-06 | Selesai | 2026-10-13 | main | Pack 4: Data Master dan Siswa; 76 tes lulus; teruji manual |
| A-08 | Berjalan | 2026-10-14 | main | Pack 5: workspace rapor (form + pratinjau + cetak), profil sekolah, titik perluasan modul |
| A-07 | Selesai | 2026-10-20 | task/A-07-staff | Modul staf: CRUD, penugasan unit, aktivasi/deaktivasi, UI lengkap |
| A-09 | Selesai | 2026-10-20 | task/A-09-inventory | Modul inventaris: kategori, lokasi, aset, riwayat perpindahan/kondisi, UI lengkap |

(Status: Belum, Berjalan, Berhenti, Selesai)

## Log kuota Antigravity

| Tanggal | Tugas | Model | Kuota sebelum | sesudah | Catatan |
|---|---|---|---|---|---|
| 2026-10-07 | Percobaan 3 file (html/css/js) | Gemini | 100% | 60% | Akun utama kena limit (menunggu reset) |
| 2026-10-07 | Debugging | Gemini | 60% | 35% | |

## Log keputusan

| Tanggal | Keputusan | Alasan |
|---|---|---|
| 2026-10-07 | Satu repo baru, khusus satu yayasan (TK, SD, SMP), bukan SaaS | Kebutuhan sekolah |
| 2026-10-07 | Wali kelas = penugasan guru (bukan peran); peran: superadmin, admin_tu_keuangan, guru | Sesuai praktik sekolah |
| 2026-10-08 | Kerjakan setup dan kode secara manual dulu; agent untuk bagian tersulit | Model gratis kurang meyakinkan; kuota Antigravity terbatas |
| 2026-10-10 | Kolom diganti: `condition` jadi `item_condition`; `key` jadi `setting_key` / `sequence_key` | Hindari kata cadangan MySQL |
| 2026-10-10 | Autentikasi memakai sesi cookie (guard `web`, grup middleware `web`), bukan Sanctum stateful | Lebih sederhana dan mudah diuji; setara untuk SPA satu domain |
| 2026-10-10 | Status login di frontend = cache TanStack Query; Zustand hanya untuk preferensi UI | Satu sumber kebenaran, tanpa sinkronisasi ganda |
| 2026-10-10 | Form admin memakai Form Ant Design (bukan React Hook Form) | Lebih ringkas; RHF tetap untuk form kompleks |
| 2026-10-10 | Tambah endpoint `GET /staff-options` | Memilih staf guru saat membuat akun, sebelum modul Staf ada |
| 2026-10-11 | Keluar: jangan memakai `queryClient.clear()`; set profil null lalu hapus query lain (`app/session.ts`) | `clear()` melepas query profil dari komponen aktif sehingga layar tidak berpindah ke halaman masuk |
| 2026-10-11 | Reset password akun sendiri ditolak (422); pakai Ganti password | Reset mengakhiri sesi yang sedang dipakai |
| 2026-10-12 | Pindah rombel memperbarui enrollment yang sama | Constraint unik siswa+tahun ajaran |
| 2026-10-12 | Data pribadi (alamat, telepon, catatan) tidak masuk audit log | Minimalisasi data pribadi anak |
| 2026-10-12 | Guru hanya melihat siswa rombel yang diwalikannya (disaring di server) | Hak akses berbasis penugasan |
| 2026-10-14 | Modul baru ditambahkan lewat berkas baru (`routes/v1/*.php`, `features/*/module.tsx`), bukan mengubah berkas bersama | Agen dan paket PM dapat bekerja paralel tanpa saling menimpa |
| 2026-10-14 | Cetak rapor lewat dialog cetak browser dengan `@page` dinamis dan kalibrasi offset; PDF server ditunda | Cukup untuk demo dan kertas khusus; tanpa dependensi server |
| 2026-10-14 | Kerja langsung di `main` sampai demo | Satu pengembang, waktu singkat |
