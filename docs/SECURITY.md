# SECURITY — Rancangan

Konteks: data pribadi **anak-anak**, data pegawai, dan data keuangan. Prinsip: data minimal,
akses minimal, jejak audit, dan pemulihan yang teruji. Rujukan umum: OWASP Top 10 dan UU No. 27/2022
tentang Pelindungan Data Pribadi (ini bukan nasihat hukum; konsultasikan sebelum produksi).

## 1. Autentikasi

- Sesi cookie (`HttpOnly`, `Secure`, `SameSite=Lax`) lewat guard `web` dan grup middleware `web` (CSRF aktif); Sanctum terpasang tetapi belum dipakai. Frontend dan API satu domain.
- Login lewat `username` (tidak peka huruf besar/kecil); pesan galat sama untuk username tak dikenal; satu verifikasi hash selalu dijalankan agar waktu respons tidak membocorkan username.
- Hash password bawaan Laravel (bcrypt/argon2id). Minimal 10 karakter, tolak password umum.
- Password sementara untuk akun baru/reset; **wajib diganti** saat login pertama (middleware).
- Kunci akun 15 menit setelah 5 kegagalan; throttle login 5/menit per IP+username.
- Sesi idle 120 menit di server (peringatan 30 menit di UI); logout menghapus sesi.
- Akun nonaktif: sesi dihapus segera.
- Tanpa registrasi publik; akun hanya dibuat `superadmin`.

## 2. Otorisasi

- Permission-based, **tolak secara default**; setiap endpoint dijaga permission + policy.
- Guru dibatasi ke rombel yang ia walikan (penugasan, bukan peran) di level query dan policy, bukan hanya di UI.
- Tes matriks peran × endpoint wajib lulus sebelum rilis.
- `superadmin` hanya baca data operasional (pemisahan tugas); semua tindakannya masuk audit.

## 3. Validasi dan data masuk

- Semua input lewat `FormRequest`; `$fillable` eksplisit (tanpa mass assignment liar).
- Unggahan (foto, logo, bukti kas): tipe dan ukuran dibatasi (≤ 2 MB), nama diacak, disimpan di disk **privat**, disajikan lewat controller yang mengecek izin; gambar diproses ulang.
- Query lewat Eloquent/binding (tanpa SQL mentah dari input).
- Keluaran React di-escape; tidak ada HTML mentah dari pengguna.

## 4. Perlindungan data

- HTTPS wajib, HSTS; cookie `Secure`.
- **Minimalisasi:** tidak mengumpulkan NIK/No. KK (D-10). Jika kelak perlu, pakai cast `encrypted` dan batasi akses.
- Data asli **tidak pernah** masuk repo, prompt model AI, atau lingkungan pengembangan. Dev dan demo memakai data dummy.
- `.env` tidak di-commit; izin file 600; `APP_DEBUG=false` di produksi.
- Pengguna DB aplikasi berprivilege minimal (tanpa root, tanpa DDL di produksi setelah migrasi).
- Log tidak memuat data pribadi (nama lengkap, alamat, nomor telepon).
- Cadangan dienkripsi dan disimpan di luar server (lihat `DEPLOYMENT.md`).
- Kebijakan retensi (berapa lama data siswa lulus disimpan) ditanyakan ke sekolah; sediakan prosedur anonimisasi/penghapusan.

## 5. Integritas dan audit

- `audit_logs`: login berhasil/gagal, buat/ubah/hapus data penting, void, finalisasi/buka kunci rapor, cetak rapor, reset password, perubahan peran. Memuat pelaku, waktu, IP, nilai lama/baru.
- Tidak ada UI untuk mengubah/menghapus audit log.
- Keuangan: tanpa hapus fisik, void + alasan, transaksi DB, nomor dokumen unik, laporan rekonsiliasi.
- Pasca-demo: **penutupan periode** (periode tertutup tidak bisa diubah).

## 6. Header dan jaringan (Nginx)

`Strict-Transport-Security`, `Content-Security-Policy` (sumber sendiri), `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `Permissions-Policy` minimal.
CORS ditutup (same-origin). Throttle API 120/menit per pengguna.

## 7. Dependensi dan rantai pasok

- `composer.lock` dan `package-lock.json` di-commit.
- `composer audit` dan `npm audit` sebelum tiap rilis; aktifkan peringatan dependensi di GitHub.
- Tambah paket hanya lewat kartu tugas (aturan `AGENTS.md`).
- Kode dari model AI **direview** sebelum digabung; modul ⚑ direview PM.

## 8. Operasional

- Siapa yang memegang akun `superadmin` didokumentasikan; kredensial tidak dibagikan lewat chat/kode.
- Prosedur reset password dan pemulihan akun tertulis.
- Rencana insiden singkat: siapa dihubungi, cara mencabut akses, cara memulihkan cadangan.

## 9. Checklist rilis (Fase B sebelum data asli)

- [ ] Tes matriks peran lulus
- [ ] `composer audit` / `npm audit` bersih atau risiko dicatat
- [ ] `APP_DEBUG=false`, `.env` aman, tidak ada rahasia di repo
- [ ] HTTPS aktif, header keamanan terpasang
- [ ] Akun demo/uji dihapus; password awal diganti
- [ ] Cadangan terenkripsi berjalan **dan pemulihan sudah diuji**
- [ ] Audit log tercatat untuk aksi penting
- [ ] Kebijakan privasi dan retensi disepakati dengan sekolah
- [ ] Unggahan tidak bisa diakses tanpa login

## 10. Demo minggu depan

Demo berjalan di laptop atau staging terlindungi (tidak terbuka publik), **data dummy saja**,
password demo kuat dan dihapus setelah demo.
