# PRD — Sistem Administrasi Sekolah (TK + SD + SMP, satu yayasan)

Status dokumen: **draf prototype**. Detail banyak yang diasumsikan "pada umumnya"
dan akan direvisi setelah review sekolah (lihat `ASSUMPTIONS.md`).

## 1. Latar belakang

Pencatatan dan pendataan di sekolah masih manual. Sekolah meminta sistem yang
mempermudah operasional, bukan sistem penilaian. Akses informasi sekolah terbatas,
sehingga sistem dibangun dengan metode **prototype**: dibuat dulu berdasarkan praktik
umum TK/SD/SMP, lalu sekolah mereview dan memberi penilaian.

**Target:** demo ke sekolah minggu depan (dari 7 Okt 2026). Sekolah meminta aplikasi lengkap;
demo diposisikan sebagai prototype berbasis asumsi umum, bukan versi final.

## 2. Tujuan

1. Menggantikan pencatatan manual data siswa, staf, keuangan, dan inventaris untuk **semua tingkat (TK, SD, SMP)**.
2. Menyediakan **workspace rapor (hanya SD dan SMP)** yang merapikan isian otomatis sesuai template rapor sekolah.
3. Memberi laporan ringkas untuk kepala sekolah dan yayasan.

## 3. Di luar lingkup (saat ini)

- Modul penilaian/nilai (**ditiadakan**; rapor diisi manual di workspace)
- Jadwal pelajaran, presensi, PPDB online, portal orang tua
- Integrasi Dapodik/e-Rapor
- Multi-sekolah/SaaS (khusus satu sekolah)

## 4. Pengguna dan peran (asumsi)

| Peran | Kebutuhan utama |
|---|---|
| Superadmin (pengelola sistem) | Kelola akun, peran, profil sekolah, audit log; hanya melihat data operasional |
| Admin TU & Keuangan (terpusat, lintas TK/SD/SMP) | Data master, siswa, staf, tagihan, pembayaran, kas, inventaris, template rapor, cetak laporan/rapor |
| Guru | Punya akun bila perlu; bila ditetapkan sebagai wali kelas (tanggung jawab tambahan atas satu rombel SD/SMP), mengisi rapor rombel itu |

Tidak ada peran hanya-lihat: laporan dicetak manual. Kepala sekolah dan yayasan tidak punya akun di versi awal.

## 5. Modul

| Kode | Modul | Dasar | Prioritas |
|---|---|---|---|
| M0 | Autentikasi, peran, hak akses | Umum | Tinggi |
| M1 | Master: unit (TK/SD/SMP), tahun ajaran, semester, kelas/rombel | Umum | Tinggi |
| M2 | Data siswa (buku induk digital, mutasi, impor) | Cerita sekolah: pendataan manual | Tinggi |
| M3 | Data guru/staf, penugasan, wali kelas | Cerita sekolah | Tinggi |
| M4 | **Workspace rapor** — hanya SD dan SMP (form kiri, preview kanan, ekspor) | **Diminta sekolah** | Tinggi |
| M5 | Keuangan sederhana, **terpusat untuk TK/SD/SMP** (tagihan, pembayaran, kas, laporan) | Dikonfirmasi: TU & keuangan satu | Tinggi |
| M6 | Inventaris/aset sekolah | Cerita sekolah | Sedang |
| M7 | Dashboard dan laporan | Umum | Rendah |

"Cerita sekolah" = kebutuhan yang masih berupa hipotesis dari pembicaraan awal
tentang pencatatan manual; detailnya perlu dikonfirmasi.

## 6. Workspace rapor (M4) — ringkasan kebutuhan

- Sekolah sudah punya template rapor (Word) tetapi **belum bisa memberikannya sebelum melihat hasil**.
  Demo memakai **template generik** (data-driven); template asli menyusul setelah demo.
- Layar terbagi dua: **kiri** = form isian, **kanan** = preview rapi sesuai template (real-time).
- Sistem merapikan otomatis jika isian terlalu panjang/pendek (pembungkusan teks, baris dinamis, pindah halaman).
- Tidak ada perhitungan nilai otomatis; isian bersifat teks/angka bebas sesuai template.
- Status rapor: draft → final. Keluaran awal: PDF (format lain menunggu konfirmasi sekolah).

## 7. Kriteria keberhasilan prototype

- Admin dapat memasukkan dan mencari data siswa dan staf kedua unit.
- Guru yang menjadi wali kelas dapat mengisi satu rapor dan melihat hasil rapi yang menyerupai template.
- Sekolah dapat mereview dan memberi umpan balik pada tiap demo.

## 8. Risiko

| Risiko | Mitigasi |
|---|---|
| Asumsi salah karena akses informasi terbatas | Daftar asumsi, rilis kecil, demo per sprint |
| Kuota agent terbatas | Pembagian kerja Antigravity/OpenCode, tugas kecil |
| Layout rapor/pagination sulit | Spike awal (T-0.5), tugas khusus T-2.4 |
| Data pribadi anak | Data dummy saja di repo/prompt; akses berbasis peran |
