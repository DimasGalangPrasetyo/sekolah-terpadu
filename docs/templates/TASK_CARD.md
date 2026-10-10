# Templat Kartu Tugas

## A. Untuk OpenCode (perintah langsung, tanpa berpikir)

```
TUGAS: T-x.y — <judul>
PELAKSANA: OpenCode
CABANG: task/T-x.y-<nama-singkat>
BACA DULU: AGENTS.md, docs/ARCHITECTURE.md

LINGKUP FILE (hanya ini yang boleh diubah/dibuat):
- <path 1>
- <path 2>

LAKUKAN PERSIS, BERURUTAN:
1. <langkah>
2. <langkah>

JALANKAN:
- <perintah> → hasil yang diharapkan: <hasil>

KRITERIA SELESAI:
- <hasil yang dapat diperiksa>

BERHENTI DAN LAPORKAN (jangan memperbaiki sendiri) JIKA:
- hasil perintah berbeda dari yang diharapkan
- perlu mengubah file di luar lingkup
- instruksi ambigu
- ada tes gagal yang bukan akibat perubahan ini

DILARANG: menyimpulkan, mengganti pendekatan, menambah fitur, git push.

SETELAH SELESAI: isi laporan (docs/templates/TASK_REPORT.md), perbarui docs/PROGRESS.md, commit.
```

## B. Untuk Antigravity (rencana dulu)

```
TUGAS: T-x.y — <judul>
PELAKSANA: Antigravity
CABANG: task/T-x.y-<nama-singkat>

MODE: Buat RENCANA dulu (langkah + file yang akan diubah). Jangan ubah file
sebelum rencana saya setujui.

TUJUAN:
<satu paragraf>

KONTEKS (baca): AGENTS.md, docs/ARCHITECTURE.md, <file terkait>

LINGKUP (boleh diubah): <daftar file/folder>
DI LUAR LINGKUP (jangan disentuh): <daftar>

KRITERIA SELESAI (dapat diuji):
- <kriteria 1>
- <kriteria 2>

BATASAN:
- Perubahan kecil dan bertahap
- Minta persetujuan sebelum menginstal paket baru

KELUARAN: rencana singkat → (setelah disetujui) implementasi, tes, ringkasan
perubahan, dan hal yang belum Anda yakini.
```
