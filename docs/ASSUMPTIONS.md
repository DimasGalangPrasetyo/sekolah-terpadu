# ASSUMPTIONS — Asumsi yang menunggu review sekolah

Cara pakai: setiap asumsi punya status. Ubah status setelah review dan catat tanggalnya.
Status: `BELUM` (belum dikonfirmasi) · `BENAR` · `SALAH` · `REVISI`.

| ID | Area | Asumsi | Dampak jika salah | Status | Catatan/Tgl |
|---|---|---|---|---|---|
| A-01 | Struktur | Ada **tiga unit: TK, SD, SMP**, masing-masing punya tahun ajaran; SD/SMP memakai semester Ganjil/Genap | Skema master berubah | REVISI | 2026-10-07: tiga tingkat dikonfirmasi; detail TK belum |
| A-02 | Struktur | TK kelompok A/B (asumsi), SD kelas 1–6, SMP kelas 7–9; rombel dibuat ulang tiap tahun ajaran | Desain kelas/rombel | BELUM | |
| A-03 | Siswa | Field buku induk standar: NIS, NISN, nama, tempat/tgl lahir, JK, agama, alamat, data orang tua/wali | Tabel dan form siswa | BELUM | |
| A-04 | Siswa | Status siswa: aktif, pindah, keluar, lulus; ada riwayat mutasi | Alur mutasi | BELUM | |
| A-05 | Staf | Guru/staf punya jabatan, status kepegawaian, unit penugasan; satu orang bisa bertugas di dua unit | Relasi staf–unit | BELUM | |
| A-06 | Staf | Wali kelas adalah guru dengan tanggung jawab tambahan atas satu rombel (bukan peran); satu wali kelas per rombel | Relasi rombel–wali | REVISI | 2026-10-07: "bukan peran" dikonfirmasi; jumlah per rombel (mis. pendamping) belum |
| A-07 | Keuangan | Biaya: SPP bulanan per siswa + biaya lain (pangkal, seragam, kegiatan); tarif bisa berbeda per unit/tingkat | Struktur tarif | BELUM | |
| A-08 | Keuangan | Pembayaran dicatat manual (tunai/transfer) dan menghasilkan kwitansi; tanpa payment gateway | Cakupan modul | BELUM | |
| A-09 | Keuangan | Kas masuk/keluar dengan kategori; **TU dan keuangan terpusat untuk TK/SD/SMP** | Hak akses dan laporan | BENAR | 2026-10-07: dikonfirmasi bahwa TU & keuangan satu |
| A-10 | Inventaris | Aset: kode, nama, kategori, kondisi, lokasi, penanggung jawab; tanpa penyusutan | Struktur aset | BELUM | |
| A-11 | Rapor | Rapor per siswa per semester; diisi wali kelas; template SD dan SMP bisa berbeda | Skema template | BELUM | |
| A-12 | Rapor | Tidak ada hitung nilai otomatis; semua isian manual | Cakupan M4 | BELUM | |
| A-13 | Rapor | Keluaran cukup PDF (tidak wajib file Word) | Teknologi ekspor | BELUM | |
| A-14 | Rapor | Alur status: draft → final (persetujuan kepala sekolah opsional) | Alur dan peran | BELUM | |
| A-15 | Peran | Tiga peran: superadmin, admin TU & keuangan (lintas unit), guru (wali kelas = penugasan). Tanpa peran hanya-lihat | Hak akses | REVISI | 2026-10-07: tanpa peran view-only; butuh pengelola akun (lihat `DECISIONS.md` §2) |
| A-16 | Data awal | Data awal ada di buku induk/Excel dan perlu diimpor | Fitur impor | BELUM | |
| A-17 | Operasional | Dipakai lewat browser desktop; hosting belum diketahui (prototype dijalankan lokal/demo) | Deployment | BELUM | |
| A-18 | Integrasi | Tidak ada integrasi Dapodik/e-Rapor di versi awal | Cakupan | BELUM | |
| A-19 | Rapor | TK **tidak** memakai workspace rapor; rapor hanya untuk SD dan SMP | Cakupan M4 | BENAR | 2026-10-07: akademik hanya SD dan SMP |
| A-20 | Rapor | Demo memakai template rapor **generik**; template asli diberikan setelah sekolah melihat hasil | Bentuk template di demo | BENAR | 2026-10-07: sekolah belum bisa memberi template |
| A-21 | Demo | Demo = prototype dengan data dummy, bukan versi final | Ekspektasi sekolah | BELUM | Sampaikan jelas ke sekolah |
| A-22 | Akun | Akun dibuat superadmin, tanpa registrasi publik, satu akun per orang (bukan akun bersama per peran) | Alur akun dan audit | BELUM | Usulan PM, menunggu konfirmasi |
| A-23 | Rapor | Kertas rapor perlu opsi cetak dan PDF dengan ukuran berbeda-beda; belum diketahui apakah kertas polos berkop atau formulir tercetak | Kalibrasi cetak (offset) | BELUM | Tanyakan ke sekolah |
| A-24 | Data | Tidak mengumpulkan NIK/No. KK di versi awal | Skema siswa | BELUM | Tanyakan apakah sekolah mewajibkan |
| A-25 | Akun | Saat ini hanya guru yang menjadi wali kelas SD/SMP yang butuh akun (mengisi rapor); guru lain belum, karena tidak ada modul nilai/jadwal/presensi | Jumlah akun, cakupan peran guru | BELUM | Tanyakan ke sekolah |
