# WORKFLOW — Urutan pengerjaan dari awal sampai akhir

Rincian tugas ada di `BACKLOG.md`; dokumen ini menjelaskan **urutan, gerbang, dan ritme kerja**.

## Tahap 0 — Persiapan repo (sebelum Hari 1)

Checklist:
- [ ] Repo baru di GitHub (privat), `main` sebagai cabang utama
- [ ] Struktur `backend/ frontend/ docs/`; salin isi kit ini (`AGENTS.md` di akar, sisanya di `docs/`)
- [ ] `.gitignore` untuk Laravel dan Node; `.env` tidak ter-commit
- [ ] Terpasang: PHP 8.3+, Composer, Node LTS, MySQL 8 (lokal), Git
- [ ] Dua database lokal: `app_dev` dan `app_test` (untuk tes MySQL)
- [ ] OpenCode terhubung ke model gratis; uji satu tugas kecil (30 menit)
- [ ] Antigravity: catat status kuota (ditunda sementara)
- [ ] Baca ringkas `DECISIONS.md`, lalu konfirmasi atau koreksi keputusannya

## Tahap 1 — Fondasi (Hari 1)

Instal kerangka (Laravel, React/Vite/TS, Ant Design), koneksi MySQL, autentikasi, peran dan permission,
master (unit, tahun ajaran, semester, rombel), seeder dummy.
**Gerbang:** login berjalan untuk tiga peran; tes autentikasi dan matriks peran awal lulus; ⚑ direview.

## Tahap 2 — Akun, siswa, staf (Hari 2)

Manajemen akun (superadmin), siswa (lintas TK/SD/SMP), wali, enrollment, mutasi, staf, penugasan, wali kelas.
**Gerbang:** TU dapat memasukkan dan mencari siswa semua unit; superadmin dapat membuat akun guru dan menautkannya ke staf, lalu TU menetapkannya sebagai wali kelas sebuah rombel.

## Tahap 3 — Keuangan (Hari 3–4)

Jenis biaya dan tarif → generate tagihan → pembayaran dan kwitansi → kas → laporan.
**Gerbang:** skenario uji: generate SPP satu bulan, bayar sebagian, bayar lunas, void, cek laporan = angka tangan. ⚑ semua tugas keuangan direview.

## Tahap 4 — Inventaris (Hari 4)

Aset, kategori, lokasi, riwayat perpindahan.

## Tahap 5 — Rapor (Hari 5–6)

Template generik → form dan preview → overflow/pagination → pengaturan kertas dan cetak → draft/final.
**Gerbang:** satu rapor SD dan satu SMP diisi, dicetak (cetak uji + cetak asli), dan hasil PDF-nya diperiksa di dua ukuran kertas.

## Tahap 6 — Penyelesaian demo (Hari 6–7)

Dashboard, perbaikan bug jalur demo, **pembekuan fitur**, data dummy yang meyakinkan, skrip demo, latihan penuh.
**Aturan:** setelah pembekuan hanya perbaikan bug jalur demo.

## ▶ DEMO ◀

Sampaikan: ini **prototype berbasis asumsi umum**, data dummy, dan template rapor generik.
Bawa `ASSUMPTIONS.md` dan catat setiap jawaban sekolah langsung di tempat.

## Tahap 7 — Umpan balik dan revisi

Perbarui `ASSUMPTIONS.md`; minta template rapor asli dan contoh kertas; minta jawaban O-02–O-05;
daftar revisi diprioritaskan PM; ganti template generik dengan template asli (B-01).

## Tahap 8 — Hardening dan produksi

Impor data awal, kenaikan kelas, PDF server (bila perlu), penutupan periode, audit hak akses,
checklist `SECURITY.md` §9, server produksi, cadangan terenkripsi, uji pemulihan.

## Tahap 9 — Go-live dan serah terima

Migrasi data asli (hanya di server produksi), pelatihan TU dan wali kelas, panduan pengguna,
masa pendampingan, kesepakatan pemeliharaan.

## Tahap 10 — Pemeliharaan

Pembaruan keamanan bulanan, uji pemulihan bulanan, tinjauan permintaan perubahan, serta
siklus tahun ajaran baru (tahun ajaran, rombel, kenaikan kelas).

---

## Ritme harian (Tahap 1–6)

| Waktu | Kegiatan | Siapa |
|---|---|---|
| Awal | Tinjau `PROGRESS.md`; PM menulis kartu tugas hari itu | PM + kamu |
| Inti | Eksekusi kartu satu per satu (satu cabang per tugas) | OpenCode / kamu |
| Setiap tugas | Laporan baku → tugas ⚑ ditempel ke PM untuk review | Kamu → PM |
| Akhir | Gabung ke `main` yang lulus tes; perbarui `PROGRESS.md`; catat keputusan/asumsi baru | Kamu |

Push ke GitHub **tiap akhir hari** selama minggu demo (cadangan), lalu per fase setelahnya.

## Aturan alur

1. **Definition of Ready** kartu: tujuan, lingkup file, perintah + hasil yang diharapkan, kondisi berhenti.
2. **Satu tugas gagal dua kali** → berhenti, bawa laporan ke PM; jangan mengulang tanpa diagnosis.
3. **Rewrite besar** hanya setelah PM memeriksa apakah akar masalahnya di spesifikasi.
4. **Pembekuan perubahan skema** setelah Hari 3: tambahan kolom lewat migrasi baru dan dicatat di `DATABASE.md`.
5. **Tidak ada data asli** di mana pun sebelum Tahap 8–9.
6. Ketika tertinggal, potong sesuai **garis potong** di `BACKLOG.md`, bukan memperpanjang jam kerja.
7. Setiap keputusan yang mengubah rancangan dicatat di `PROGRESS.md` (Log keputusan) dan dokumen terkait diperbarui.
