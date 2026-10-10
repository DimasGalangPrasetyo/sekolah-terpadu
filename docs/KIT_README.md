# Project Kit — Sistem Administrasi Sekolah (TK + SD + SMP, satu yayasan)

Kit ini adalah bahan Sprint 0. Salin isinya ke **repo baru** proyek ini.

```
repo-baru/
├─ AGENTS.md                    ← aturan untuk OpenCode & Antigravity
└─ docs/
   ├─ PRD.md                    ← tujuan, lingkup, modul (sebagian masih hipotesis)
   ├─ ASSUMPTIONS.md            ← daftar asumsi yang menunggu review sekolah
   ├─ ARCHITECTURE.md           ← keputusan terkunci & keputusan terbuka
   ├─ DECISIONS.md              ← keputusan PM: peran/akun, cetak rapor, stack, cakupan demo vs pasca
   ├─ DATABASE.md · BACKEND.md · API.md · FRONTEND.md
   ├─ SECURITY.md · DEPLOYMENT.md
   ├─ WORKFLOW.md               ← urutan pengerjaan awal sampai akhir
   ├─ BACKLOG.md                ← tugas Sprint 0–4 + pelaksana
   ├─ PROGRESS.md               ← status & log (diperbarui tiap tugas)
   └─ templates/
      ├─ TASK_CARD.md           ← templat perintah (OpenCode & Antigravity)
      └─ TASK_REPORT.md         ← templat laporan hasil tugas
```

## Alur satu tugas

1. **Claude (PM)** menulis kartu tugas dari `BACKLOG.md` memakai `TASK_CARD.md`.
2. **Kamu** menempel kartu ke OpenCode atau Antigravity sesuai kolom "Pelaksana".
3. Agent bekerja di cabang `task/<ID>-<nama>`, lalu mengisi laporan sesuai `TASK_REPORT.md`.
4. **Kamu** menempel laporan (dan diff, jika bertanda ⚑) ke Claude untuk review.
5. Setelah lolos, `PROGRESS.md` diperbarui. Push ke GitHub per fase oleh kamu.

## Aturan hemat token (ringkas)

- Tempel **laporan dan diff**, bukan seluruh file.
- Satu kartu = satu tujuan kecil.
- Perencanaan dan diskusi hanya di chat Claude, bukan di agent.
- Antigravity ditunda sampai kuotanya kembali; kode kompleks ditulis Claude di chat.
- Data siswa asli **tidak pernah** masuk repo atau prompt. Pakai data dummy.

## Yang harus dilakukan pertama

Lihat **Fase A, Hari 1** di `docs/BACKLOG.md` (A-01 sampai A-05).
