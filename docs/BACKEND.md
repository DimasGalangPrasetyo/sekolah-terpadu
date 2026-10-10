# BACKEND — Rancangan

Laravel (versi stabil terbaru yang kompatibel; PHP 8.3+, dikonfirmasi di A-02), MySQL 8.
Paket: `laravel/sanctum`, `spatie/laravel-permission`. Tambahan paket hanya lewat kartu tugas.

## 1. Lapisan

```
Request → Middleware (auth, throttle) → FormRequest (validasi + otorisasi dasar)
        → Controller (tipis) → Service (logika bisnis, transaksi)
        → Model/Eloquent → API Resource (bentuk respons)
Policy: otorisasi per record (mis. guru hanya rapor rombel yang ia walikan)
Job: pekerjaan berat (generate tagihan massal, PDF server, backup)
```

Aturan: **controller tidak berisi logika bisnis**; logika di `Service`. Respons selalu lewat `Resource`.

## 2. Struktur folder

```
app/
  Enums/                 StudentStatus, InvoiceStatus, ...
  Http/
    Controllers/Api/V1/  Auth, Users, Master, Students, Staff, ReportCards, Finance, Inventory, Reports
    Requests/<Modul>/
    Resources/<Modul>/
    Middleware/          EnsurePasswordChanged
  Models/
  Policies/
  Services/              AcademicContext, EnrollmentService, StudentStatusService,
                         InvoiceService, PaymentService, NumberSequenceService,
                         CashBookService, ReportCardService, AssetService,
                         AuditLogger, FileStorageService, DashboardService
  Jobs/
  Traits/Auditable.php   catat created/updated/deleted ke audit_logs
database/{migrations,factories,seeders}
routes/api.php           semua di prefix /api/v1
tests/Feature/<Modul>/   tes per endpoint + matriks peran
```

## 3. Peran dan permission

| Permission | superadmin | admin_tu_keuangan | guru |
|---|:-:|:-:|:-:|
| `users.manage`, `system.manage`, `audit.view` | ✓ | | |
| `master.view` | ✓ | ✓ | ✓ |
| `master.manage` | | ✓ | |
| `students.view` | ✓ | ✓ | ✓ (jika wali kelas rombelnya) |
| `students.manage`, `staff.manage`, `inventory.manage`, `finance.manage` | | ✓ | |
| `staff.view`, `inventory.view`, `finance.view`, `reports.view` | ✓ | ✓ | |
| `templates.manage` | ✓ | ✓ | |
| `reportcards.fill` | | | ✓ (jika wali kelas rombel tsb, draft, semester aktif) |
| `reportcards.manage`, `reportcards.unlock` | | ✓ | |

`superadmin` hanya **melihat** data operasional; tidak menulis. Setiap endpoint dijaga permission;
tolak secara default.

**Wali kelas bukan peran, melainkan penugasan** (`classrooms.homeroom_staff_id`). Peran `guru` hanya memberi hak masuk dan melihat profil. Akses rapor diputuskan `Policy` yang mensyaratkan **semuanya**: user punya `reportcards.fill` **dan** `classroom.homeroom_staff_id == user.staff_id` **dan** tahun ajaran/semester aktif **dan** rapor berstatus draft. Akun `guru` wajib punya `staff_id`.

## 4. Aturan bisnis kunci

**Konteks akademik.** `AcademicContext` satu-satunya sumber tahun ajaran/semester aktif.
Aktivasi = transaksi; tolak jika tanggal tumpang tindih.

**Enrollment.** Satu enrollment aktif per siswa per tahun ajaran; rombel harus di tahun yang sama.
Pindah rombel = tutup enrollment lama, buka baru. Kapasitas melebihi = peringatan, bukan blokir.

**Mutasi siswa.** Ubah status lewat `StudentStatusService` (tulis `student_status_logs`, tutup enrollment aktif bila keluar/lulus).

**Tagihan.**
- `generate` (batch): input unit, tingkat (opsional), periode, jenis biaya → buat tagihan untuk siswa aktif; **idempoten** (UQ `student, kind, period_month`; duplikat dilewati dan dilaporkan).
- Jumlah = tarif − potongan aktif. Hasil disalin ke `invoice_items` (snapshot; perubahan tarif tidak mengubah tagihan lama).
- `void` butuh alasan; tagihan yang sudah punya alokasi valid tidak bisa di-void sebelum pembayarannya di-void.

**Pembayaran.** Dalam satu transaksi: validasi, kunci tagihan (`lockForUpdate`), alokasi (otomatis ke tagihan tertua atau manual), perbarui `paid_amount` dan `status`, terbitkan nomor kwitansi. Kelebihan bayar ditolak di versi awal.
`void` pembayaran membalik alokasi dan memperbarui tagihan.

**Kas.** Hanya transaksi di luar pembayaran siswa. Laporan menggabungkan keduanya (lihat `DATABASE.md` §5).

**Wali kelas.** Ditetapkan TU per rombel per tahun ajaran. Satu guru maksimal satu rombel per tahun ajaran (divalidasi service). Mengganti wali kelas di tengah tahun memindahkan akses seketika dan tercatat di audit log; draft rapor tetap milik rombel. Setelah tahun ajaran berganti, akses guru ke rombel lama berakhir (hanya TU).

**Rapor.**
- `POST` membuat/mengambil draft per (siswa, semester) dengan template aktif unit tersebut.
- Simpan draft divalidasi terhadap `definition` template (key dikenal, tipe, `max_length`); key asing ditolak.
- `finalize` mengunci; `unlock` hanya TU, wajib alasan.
- Template yang sudah dipakai tidak bisa diedit; edit = versi baru.

**Aset.** Perubahan kondisi/lokasi/penghapusan selalu lewat `asset_movements`.

## 5. Konvensi API

- Prefix `/api/v1`; JSON; tanggal `YYYY-MM-DD`; waktu ISO 8601; uang integer rupiah.
- Daftar: `?page=1&per_page=25` (maks 100), `?q=`, `?filter[unit_id]=`, `?sort=-created_at`.
- Sukses: Laravel Resource (`data`, `meta`, `links`).
- Galat: `{"message": "...", "errors": {"field": ["..."]}}`.
- Kode: 200/201/204, 401 (belum login), 403 (tak berhak), 404, 409 (konflik: duplikat, status tak valid), 422 (validasi), 429 (throttle).

## 6. Pekerjaan latar

Driver antrian `database`. Fase A: generate tagihan dijalankan sinkron (ratusan siswa).
Pasca-demo: generate massal, PDF server, dan backup sebagai job/scheduler.

## 7. Pengujian

- Satu tes Feature per endpoint (sukses, validasi gagal, tak berhak).
- **Tes matriks peran**: setiap endpoint × setiap peran.
- Tes service kritis: aktivasi tahun ajaran, alokasi pembayaran, void, idempotensi tagihan, finalisasi rapor.
- Tes migrasi yang memakai SQL mentah dijalankan di MySQL, bukan hanya SQLite.
- Lint: Pint. Opsional: Larastan.
