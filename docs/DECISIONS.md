# DECISIONS — Keputusan PM

Status: usulan PM, **berlaku setelah dikonfirmasi pemilik proyek**. Perubahan dicatat di `PROGRESS.md`.
Dokumen rancangan lain dipecah per topik agar agent hanya membaca yang perlu:
`DATABASE.md` · `BACKEND.md` · `API.md` · `FRONTEND.md` · `SECURITY.md` · `DEPLOYMENT.md` · `WORKFLOW.md`

## 1. Cakupan

| Area | TK | SD | SMP |
|---|---|---|---|
| Data siswa, staf, keuangan, inventaris | ✓ | ✓ | ✓ |
| Workspace rapor (SIAKAD) | ✗ | ✓ | ✓ |
| Modul nilai/penilaian | ✗ | ✗ | ✗ |

TU dan keuangan **satu kantor** untuk ketiga unit. Khusus satu yayasan, bukan SaaS.

## 2. Peran dan akun

**Tiga peran.** Tidak ada peran "hanya melihat": laporan dicetak manual oleh TU.

| Peran | Siapa | Boleh |
|---|---|---|
| `superadmin` | Pengelola sistem (kamu / penanggung jawab IT) | Kelola akun, peran, reset password, profil sekolah, pengaturan, audit log, backup. **Hanya lihat** data operasional (untuk dukungan) |
| `admin_tu_keuangan` | Staf TU dan keuangan | Semua data operasional TK/SD/SMP, keuangan, inventaris, template rapor, cetak laporan/rapor |
| `guru` | Guru yang punya akun (saat ini: yang menjadi wali kelas SD/SMP) | Masuk dan melihat profil. **Bila ditetapkan sebagai wali kelas** sebuah rombel: mengisi rapor siswa rombel itu (draft, semester aktif) |

**Wali kelas bukan peran.** Itu tanggung jawab tambahan seorang guru atas satu rombel, ditetapkan TU per rombel per tahun ajaran (`classrooms.homeroom_staff_id`). Akses rapor mengikuti penugasan ini lewat policy, jadi guru yang berganti rombel antar tahun tidak perlu diubah perannya. Peran `guru` tetap ada supaya fitur berikutnya (mis. nilai, presensi per mapel) bisa ditambahkan tanpa merombak.

Kepala sekolah dan yayasan **tidak punya akun** di versi awal. Karena izin berbasis *permission*
(bukan if-role di kode), peran baru bisa ditambah nanti tanpa menulis ulang.

**Pertanyaan "akun per role atau registrasi?" — keputusan:**
1. **Tanpa registrasi publik.** Akun hanya dibuat oleh `superadmin`.
2. **Satu akun per orang, bukan satu akun bersama per peran.** Akun bersama membuat tidak ada
   jejak "siapa yang mengubah", tidak bisa dicabut per orang, dan password cenderung dibagikan.
   Guru wali kelas butuh akun sendiri karena haknya terbatas pada rombel yang ia walikan.
3. Akun dibuat dengan password sementara; **wajib ganti saat login pertama**.
4. Login dengan `username` (email opsional, karena tidak semua staf punya email).
5. Akun nonaktif, bukan dihapus, saat staf berhenti (riwayat audit tetap utuh).

## 3. Rapor: cetak dan PDF

Ukuran dan kertas rapor berbeda-beda, jadi **ukuran kertas adalah properti template**:
A4, F4/Folio (215×330 mm), Letter, atau ukuran custom (mm), plus margin dan **offset X/Y kalibrasi**
(untuk kertas khusus yang sudah tercetak formulir).

| Opsi | Cara | Fase |
|---|---|---|
| **Cetak** | Tombol Cetak → dialog cetak browser dengan `@page size` dari template; "Cetak uji" (garis grid/penggaris) untuk kalibrasi | Demo |
| **PDF (cepat)** | Pilih "Simpan sebagai PDF" di dialog cetak yang sama | Demo |
| **PDF (server)** | Unduh PDF dengan ukuran persis lewat mesin PDF server | Pasca-demo |

**Perlu ditanyakan ke sekolah:** apakah kertas rapor *polos berkop* atau *formulir yang sudah tercetak*?
Jika sudah tercetak, isian harus tepat di kotak; kalibrasi offset menjadi wajib dan hasil uji cetak
di printer sekolah menentukan.

## 3b. Laporan dan kwitansi

Semua laporan (siswa, staf, keuangan, inventaris) dan kwitansi memakai komponen cetak yang sama
(kop dari profil sekolah, CSS cetak). Ekspor CSV menyusul pasca-demo.

## 4. Keputusan teknis

| ID | Keputusan | Alasan |
|---|---|---|
| D-01 | Laravel API + React/Vite **TypeScript**, MySQL 8 | Stack dikuasai; tipe mengurangi salah paham agent |
| D-02 | Izin berbasis permission (`spatie/laravel-permission`) | Peran bisa ditambah tanpa ubah kode |
| D-03 | Frontend dan API **satu domain** (Nginx proxy `/api`) | Cookie Sanctum SPA, tanpa CORS |
| D-04 | UI: **Ant Design** (locale `id_ID`), TanStack Query, Zustand, React Hook Form + Zod, Axios | Tabel/form admin cepat dibuat |
| D-05 | Nominal uang = `BIGINT` rupiah (tanpa desimal) | Hindari galat pembulatan |
| D-06 | Status/jenis disimpan `VARCHAR` + PHP enum (bukan ENUM MySQL) | Mudah berevolusi; SQLite (tes) dan MySQL sama |
| D-07 | **Tanpa generated column**; "satu tahun ajaran aktif" dijaga service dalam transaksi + tes | Hindari perbedaan perilaku MySQL/SQLite |
| D-08 | Keuangan: tanpa hapus fisik, hanya `void` + alasan | Integritas dan audit |
| D-09 | Template rapor = JSON terversi dan **tidak bisa diubah** setelah dipakai (edit = versi baru) | Rapor lama tetap bisa dicetak ulang persis |
| D-10 | Data NIK/No. KK **tidak dikumpulkan** di versi awal | Minimalisasi data pribadi anak |
| D-11 | Demo dari laptop/staging dengan **data dummy**; server produksi setelah review | Aman dan realistis untuk seminggu |
| D-12 | Wali kelas = penugasan guru per rombel per tahun ajaran, bukan peran; akses rapor lewat Policy | Sesuai praktik sekolah; ganti rombel antar tahun tanpa ubah peran |

## 5. Yang dibangun saat demo (D) vs setelah demo (P)

Rancangan di dokumen ini adalah target lengkap. Demo seminggu memuat **keluasan fungsi**;
**kesiapan produksi** (server, hardening penuh, PDF server, impor, backup terautomasi) adalah Fase B.

| Area | Demo (D) | Pasca-demo (P) |
|---|---|---|
| Database | Semua tabel inti, seeder dummy | Tabel opsional, indeks tambahan hasil profiling |
| Backend | Auth, user, master, siswa, staf, keuangan, inventaris, rapor | Impor, PDF server, penutupan periode, kenaikan kelas massal |
| Frontend | Semua halaman utama, cetak | Ekspor CSV, polesan UX |
| Keamanan | Auth, izin per peran, audit log, validasi, throttle | Hardening header, uji penetrasi ringan, audit dependensi, kebijakan privasi |
| Server | Lokal/staging dummy | VPS produksi, HTTPS, backup terenkripsi, monitoring |
