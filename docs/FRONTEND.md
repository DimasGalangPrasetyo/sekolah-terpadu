# FRONTEND — Rancangan

React + Vite + **TypeScript**. UI: **Ant Design** (locale `id_ID`, `dayjs`).
Data server: **TanStack Query** + Axios. **Status login = cache TanStack Query** (kunci `['auth','me']`); **Zustand** hanya untuk preferensi tampilan (unit, menu). Form admin: **Form bawaan Ant Design**; React Hook Form + Zod tersedia untuk form kompleks (mis. workspace rapor).
Routing: React Router. Satu library UI saja; jangan campur dengan yang lain.

## 1. Struktur

```
src/
  app/            router, providers, layout utama, guard
  api/            klien axios + fungsi per modul (students.ts, finance.ts, ...)
  features/
    auth/ users/ master/ students/ staff/ finance/ inventory/ rapor/ reports/ dashboard/
      pages/ components/ hooks/ schemas/   (Zod) 
  components/     DataTable, FormField, PageHeader, ConfirmButton, PrintLayout, Money, ...
  stores/         auth, ui (filter unit, sidebar)
  lib/            format (rupiah, tanggal), permissions, print utilities
  types/          tipe respons API
  styles/         print.css
```

## 2. Navigasi dan hak akses

Menu disusun dari permission pengguna (UI hanya mempermudah; **server yang menentukan**).

| Menu | superadmin | admin_tu_keuangan | guru |
|---|:-:|:-:|:-:|
| Dashboard | ✓ | ✓ | rombel yang diwalikan (jika ada) |
| Siswa, Rombel, Staf | lihat | ✓ | siswa rombel yang diwalikan |
| Keuangan (tagihan, pembayaran, kas, laporan) | lihat | ✓ | |
| Inventaris | lihat | ✓ | |
| Rapor (workspace) | | ✓ | ✓ (hanya jika wali kelas) |
| Template rapor | ✓ | ✓ | |
| Laporan & cetak | ✓ | ✓ | |
| Akun & peran, profil sekolah, audit log | ✓ | | |

Bilah atas: **pemilih unit** (Semua / TK / SD / SMP) yang menyaring semua daftar; tahun ajaran/semester aktif; menu pengguna.
Setiap halaman daftar: pencarian, filter, paginasi sisi server, status kosong/muat/galat.

## 3. Halaman utama

| Modul | Halaman |
|---|---|
| Auth | Login, ganti password wajib |
| Akun (SA) | Daftar akun, buat/ubah, reset password, aktif/nonaktif |
| Master | Tahun ajaran & semester, rombel, mata pelajaran |
| Siswa | Daftar, detail (data, wali, riwayat status, rombel), form, mutasi |
| Staf | Daftar, form, penugasan unit, penetapan wali kelas |
| Keuangan | Jenis biaya & tarif, generate tagihan, daftar tagihan, catat pembayaran, kwitansi, kas, laporan |
| Inventaris | Daftar aset, form, riwayat perpindahan |
| Rapor | Pilih rombel & semester → daftar siswa + status → **Workspace** |
| Laporan | Siswa, staf, keuangan, aset: filter + tombol Cetak |

## 4. Workspace rapor

```
┌─────────────────────────────┬───────────────────────────────────┐
│ FORM ISIAN (kiri, ~40%)     │ PREVIEW HALAMAN (kanan, ~60%)     │
│ dibangun dari definition    │ kertas sesuai template (mm)       │
│ template; simpan otomatis   │ garis putus = batas halaman       │
│ (debounce 2 dtk) + manual   │ peringatan jika isi > 1 halaman   │
└─────────────────────────────┴───────────────────────────────────┘
 Bilah atas: siswa sebelumnya/berikutnya · status (draft/final) · Cetak · Pengaturan cetak
```

- **Form** dibentuk dari `definition` JSON (lihat `DATABASE.md` §4): tiap `section.type` punya komponen form dan komponen render.
- **Preview** memakai komponen render yang **sama** dengan hasil cetak, dalam satuan `mm`, diskalakan ke lebar panel dengan CSS `transform: scale()`.
- **Overflow dan pagination:** konten diukur terhadap tinggi area cetak (tinggi kertas − margin). Baris tabel dan blok tanda tangan memakai `break-inside: avoid`. Garis putus menandai batas halaman; peringatan muncul bila konten melebihi jumlah halaman yang diharapkan.
- **Pengaturan cetak** (per template, bisa diubah sebelum cetak): ukuran kertas (A4, F4/Folio, Letter, Custom mm), orientasi, margin, **offset X/Y**, ukuran huruf. Tersedia **Cetak uji** (grid dan penggaris) untuk kalibrasi di kertas khusus.
- **Cetak:** menyisipkan `@page { size: <w>mm <h>mm; margin: <m>mm }` dari template, menyembunyikan UI, lalu `window.print()`. "Simpan sebagai PDF" tersedia di dialog yang sama.
- **Cetak satu kelas:** merender semua rapor final dalam rombel berurutan dengan `page-break-after`.
- **Kunci:** rapor `final` read-only; tombol Buka Kunci hanya untuk TU (alasan wajib).
- Guru hanya melihat rombel yang ia walikan pada tahun ajaran aktif; menu Rapor muncul hanya jika ia wali kelas. Rapor di luar semester aktif hanya-baca.

## 5. Komponen cetak umum

`PrintLayout` (kop dari profil sekolah, judul, periode, tanda tangan opsional) dipakai semua laporan dan kwitansi.
Kwitansi default A5 (ukuran dapat diatur di pengaturan). Stylesheet cetak di `styles/print.css`.

## 6. Konvensi UI

- Bahasa Indonesia; tanggal `dd MMM yyyy`; uang `Rp 1.250.000` lewat satu fungsi `formatRupiah`.
- Aksi merusak (void, nonaktifkan, buka kunci) lewat dialog konfirmasi + alasan bila wajib.
- Galat 422 dipetakan ke field formulir; 403 menampilkan halaman "tidak berhak"; 401 mengarah ke login.
- Formulir ramah entri cepat untuk TU: urutan tab logis, fokus otomatis, Enter menyimpan.
- Tabel besar: paginasi sisi server; jangan memuat semua data.

## 7. Keamanan frontend

- Sesi lewat cookie HttpOnly (Sanctum SPA); **tidak** menyimpan token di `localStorage`.
- Jangan memakai `dangerouslySetInnerHTML` untuk data pengguna.
- Waktu menganggur 30 menit → peringatan, lalu logout.
- Variabel lingkungan hanya berisi konfigurasi publik; tidak ada rahasia.

## 8. Pengujian

Tes komponen untuk util format, guard peran, dan komponen render rapor; satu alur uji manual terskrip untuk demo.
Lint (`npm run lint`) dan `npm run build` harus lulus.

## 9. Catatan implementasi (Pack 3)

- Dev: Vite meneruskan `/api` dan `/sanctum` ke `http://127.0.0.1:8000` (satu asal untuk browser, cookie dan CSRF jalan tanpa CORS).
- Halaman berat (akun, audit, ganti password) dimuat lazy; unduhan awal lebih ringan.
- Breakpoint tata letak: **< 992 px = mode HP/tablet** (menu geser, pemilih unit ringkas). Lihat `docs/UI_GUIDE.md`.
- Keluar otomatis setelah 30 menit tanpa aktivitas, dengan peringatan 60 detik.
- Versi: antd 6 (gunakan `title` pada Alert, `size` pada Drawer, `mask.closable` pada Modal), React Router 7, TypeScript 6.
