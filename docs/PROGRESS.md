# PROGRESS

Diperbarui setelah setiap tugas selesai. Pelaksana: U = kamu, C = Claude (chat), AG = Antigravity.

## Status tugas

| ID | Status | Tanggal | Commit/Cabang | Catatan |
|---|---|---|---|---|
| A-01 | Selesai | 2026-10-10 | main | Repo, dokumen kit, push ke GitHub |
| A-02a | Selesai | 2026-10-10 | main | Laravel 13, PHP 8.5, Sanctum, spatie permission |
| A-02b | Selesai | 2026-10-10 | main | Vite + React + TS + Ant Design + TanStack Query dkk; build berhasil |
| A-04 / A-05 | Selesai | 2026-10-10 | task/A-04-schema | Pack 1: 32 tabel, model, enum, seeder; 7 tes lulus; pint bersih; 75 siswa / 11 rombel |
| A-03 | Berjalan | 2026-10-10 | task/A-03-auth | Pack 2: login username, ganti password, kunci akun, manajemen akun, audit log |
| A-08b / A-08c | Berjalan | 2026-10-10 | task/A-03-auth | Termasuk dalam Pack 2 (backend) |

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
