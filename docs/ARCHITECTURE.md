# ARCHITECTURE — Keputusan

## Keputusan terkunci (disepakati)

| ID | Keputusan |
|---|---|
| K-01 | Khusus satu sekolah, **tanpa multi-tenant/SaaS** |
| K-02 | Tiga unit (TK, SD, SMP) sebagai dimensi data (`unit_id`) |
| K-03 | Modul penilaian ditiadakan; rapor lewat workspace isian, hanya SD dan SMP |
| K-04 | Stack: Laravel + React/Vite + MySQL |
| K-05 | Metode: prototype; asumsi dicatat di `ASSUMPTIONS.md` |
| K-06 | Pembagian kerja (minggu demo): Claude = PM, arsitek, reviewer, dan penulis kode kompleks di chat; OpenCode (DeepSeek V4 Flash Free, cadangan MiniMax M3 Free) = setup, kode, tes, commit; Antigravity = ditunda (kuota habis) |
| K-07 | TU dan keuangan terpusat lintas TK/SD/SMP (satu peran admin TU & keuangan) |
| K-08 | Demo memakai template rapor generik yang data-driven; template asli menyusul setelah demo |
| K-09 | Tiga peran (superadmin, admin_tu_keuangan, guru); tanpa peran hanya-lihat; akun dibuat superadmin, satu per orang. **Wali kelas = penugasan guru, bukan peran** |
| K-10 | Rapor: ukuran kertas bagian dari template; opsi cetak dan PDF (lihat `DECISIONS.md` §3) |
| K-11 | Rancangan lengkap per topik: `DECISIONS.md`, `DATABASE.md`, `BACKEND.md`, `API.md`, `FRONTEND.md`, `SECURITY.md`, `DEPLOYMENT.md`, `WORKFLOW.md` |

## Usulan (dikunci setelah disetujui di Sprint 0)

| ID | Usulan |
|---|---|
| U-01 | Satu service tunggal sebagai sumber kebenaran tahun ajaran/semester aktif |
| U-02 | Kelas/rombel dibuat per tahun ajaran (baris baru tiap tahun) |
| U-03 | Hal yang bisa berubah (komponen biaya, kategori, template rapor) disimpan di tabel konfigurasi, bukan ditanam di kode |
| U-04 | Riwayat status siswa disimpan sebagai log, bukan ditimpa |

## Keputusan terbuka

| ID | Pertanyaan | Cara memutuskan |
|---|---|---|
| O-01 | Mesin PDF (dompdf vs headless browser) | Spike T-0.5 dengan template contoh |
| O-02 | Keluaran rapor: PDF saja atau perlu Word | Tanya sekolah (A-13) |
| O-03 | Hosting/deployment | Tanya sekolah (A-17) |
| O-04 | Siapa yang membuat akun pengguna | Tanya sekolah |
| O-05 | Penomoran NIS | Tanya sekolah |
| O-06 | ~~Library UI~~ | Diputuskan: Ant Design (D-04) |
| O-07 | Upgrade Google AI Pro untuk Antigravity | Putuskan setelah 2–3 hari kerja dengan model gratis |

## Entitas awal (diperdalam jadi ERD di T-0.4)

units, academic_years, semesters, classrooms (rombel), students, student_status_logs,
guardians, staff, staff_assignments, users/roles, report_templates, report_sections,
report_entries, fee_types, invoices, payments, cash_transactions, assets, asset_categories.
