# BACKLOG

Pelaksana: **U** = Kamu · **OC** = OpenCode (DeepSeek V4 Flash Free; cadangan MiniMax M3 Free)
· **C** = Claude di chat (PM, review, dan penulis kode kompleks yang kamu tempel ke repo)
· **AG** = Antigravity (ditunda sampai kuota kembali)
Ukuran: S · M · L  |  ⚑ = diff wajib direview Claude

Target: demo minggu depan. Jumlah hari menyesuaikan tanggal demo; **hari terakhir selalu buffer**.

Rancangan lengkap (database, API, keamanan, server) ada di `DECISIONS.md` dan dokumen turunannya;
tiap kartu tugas harus menyebut bagian dokumen yang menjadi rujukannya.

## Fase A — Demo (prototype tipis tapi menyeluruh)

### Hari 1 — Fondasi
| ID | Tugas | Pelaksana | Ukuran | Review |
|---|---|---|---|---|
| A-01 | Buat repo baru + struktur `backend/ frontend/ docs/`; taruh kit ini | U + OC | S | |
| A-02 | Instal Laravel, React/Vite, MySQL + koneksi tes, **satu** library UI (MUI atau Ant Design); konfirmasi perintah di `AGENTS.md` | OC | M | |
| A-03 | Autentikasi (Sanctum) + peran superadmin, admin_tu_keuangan, guru (spatie permission, seed permission sesuai `BACKEND.md` §3; wali kelas = penugasan, bukan peran) + wajib ganti password pertama | OC | M | ⚑ |
| A-04 | Master: unit (TK/SD/SMP), tahun ajaran, semester, kelas/rombel | OC | M | ⚑ |
| A-05 | Seeder data dummy (3 unit) | OC | S | |

### Hari 2 — Siswa dan staf
| ID | Tugas | Pelaksana | Ukuran | Review |
|---|---|---|---|---|
| A-06 | Siswa: CRUD, buku induk, pencarian, filter unit | OC | M | |
| A-07 | Staf: CRUD, penugasan unit, penetapan wali kelas per rombel (validasi satu rombel per guru per tahun) | OC | M | |
| A-08 | Mutasi siswa dasar (aktif/pindah/keluar/lulus) + log | OC | S | ⚑ |
| A-08b | Manajemen akun (superadmin): buat, ubah, reset password, aktif/nonaktif, tautkan staf (wajib untuk akun guru) | OC | M | ⚑ |
| A-08c | Audit log dasar (trait Auditable, login, void) + halaman lihat | OC | M | ⚑ |

### Hari 3 — Keuangan (1)
| ID | Tugas | Pelaksana | Ukuran | Review |
|---|---|---|---|---|
| A-09 | Komponen biaya dan tarif per unit/tingkat | OC | M | |
| A-10 | Tagihan SPP bulanan per siswa | OC | M | ⚑ |
| A-11 | Pembayaran + kwitansi (halaman cetak sederhana) | OC | M | ⚑ |

### Hari 4 — Keuangan (2) dan inventaris
| ID | Tugas | Pelaksana | Ukuran | Review |
|---|---|---|---|---|
| A-12 | Kas masuk/keluar dengan kategori | OC | M | |
| A-13 | Laporan keuangan per unit dan gabungan | OC | M | ⚑ |
| A-14 | Inventaris aset: CRUD, kategori, lokasi, kondisi | OC | M | |

### Hari 5 — Workspace rapor (SD dan SMP)
| ID | Tugas | Pelaksana | Ukuran | Review |
|---|---|---|---|---|
| A-15 | Skema template rapor **generik** (bagian, field, tipe) + migrasi | C desain, OC implementasi | M | ⚑ |
| A-16 | Form isian (kiri) + preview real-time (kanan) | C menulis komponen, OC integrasi | L | ⚑ |

### Hari 6 — Rapor lanjutan dan penyelesaian
| ID | Tugas | Pelaksana | Ukuran | Review |
|---|---|---|---|---|
| A-17 | Overflow teks, baris dinamis, pindah halaman, pengaturan kertas (A4/F4/Letter/custom), offset kalibrasi + Cetak uji; PDF via dialog cetak | C + OC | L | ⚑ |
| A-18 | Status rapor draft/final | OC | S | |
| A-19 | Dashboard ringkas | OC | M | |
| A-20 | Putaran perbaikan bug jalur demo | OC | M | |

### Hari 7 — Buffer
| ID | Tugas | Pelaksana | Ukuran |
|---|---|---|---|
| A-21 | **Bekukan fitur.** Seed data dummy yang meyakinkan | OC | S |
| A-22 | Skrip demo + latihan sekali penuh | U + C | S |
| A-23 | Cadangan waktu untuk perbaikan darurat | — | — |

### Garis potong (jika tertinggal, buang dari bawah)
1. Dashboard (A-19)
2. Mutasi siswa detail (A-08), tetap tampilkan status saja
3. Kwitansi rapi (A-11): cukup tampilan cetak
4. Impor CSV (tidak masuk Fase A)

Yang **tidak boleh** dipotong: auth, siswa, staf, keuangan dasar (A-09–A-13), dan rapor
(A-15–A-17). Inilah isi permintaan sekolah.

## Fase B — Setelah demo

| ID | Tugas | Pelaksana |
|---|---|---|
| B-01 | Ganti template generik dengan template asli sekolah | C + OC/AG |
| B-02 | Revisi sesuai umpan balik; perbarui `ASSUMPTIONS.md` | U + C |
| B-03 | Impor data siswa/staf dari CSV/Excel | OC |
| B-04 | Ekspor PDF di server bila hasil cetak browser kurang | AG/OC |
| B-05 | Audit hak akses semua peran | OC jalankan, C review ⚑ |
| B-06 | Panduan pengguna singkat dan prosedur backup | C |

## Definition of Done (semua tugas)

- Tes lulus dan lint bersih (untuk Fase A: minimal jalur utama)
- Tidak ada data asli, `.env`, atau kredensial di commit
- Laporan tugas terisi; `PROGRESS.md` diperbarui
- Tugas ⚑: diff sudah direview Claude
