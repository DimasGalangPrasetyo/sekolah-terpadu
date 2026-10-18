# KARTU: modul Staf

**Pelaksana:** Antigravity · **Commit:** `feat(staff): modul staf` · **Baca dulu:** `AGENTS.md`, `docs/MODULE_GUIDE.md`, `docs/UI_GUIDE.md`, `docs/DATABASE.md` §3

## Tujuan
TU dapat mengelola data guru dan tenaga kependidikan: daftar, tambah, ubah, nonaktifkan, hapus, dan penugasan ke unit (TK/SD/SMP).
Tabel `staff` dan `staff_unit_assignments` serta modelnya **sudah ada**. Jangan membuat migrasi baru.

## Lingkup file (hanya ini)
- Backend baru: `routes/v1/staff.php`, `app/Http/Controllers/Api/V1/Staff/StaffController.php`, `app/Http/Requests/Staff/StaffRequest.php`,
  `app/Http/Resources/StaffResource.php`, `app/Services/StaffService.php`, `tests/Feature/Staff/StaffTest.php`
- Backend ubah (hanya menambah trait `Auditable` + `$auditExclude`): `app/Models/Staff.php`, `app/Models/StaffUnitAssignment.php`
- Frontend baru: `frontend/src/features/staff/` (`module.tsx`, `lazyPages.tsx`, `api.ts`, `types.ts`, `StaffPage.tsx`, `StaffDrawer.tsx`)
- Dokumen: tambahkan bagian di `docs/API.md` dan satu baris di `docs/PROGRESS.md`

## API (izin: `staff.view` untuk baca, `staff.manage` untuk tulis)
| Method | Path | Keterangan |
|---|---|---|
| GET | `/staff?q=&is_teacher=&is_active=&unit=&employment_status=&page=&per_page=` | Paginasi 15. `q` mencari nama/NIP/NUPTK. `unit` = kode unit melalui penugasan |
| GET | `/staff/{staff}` | Detail |
| POST | `/staff` | Buat |
| PUT | `/staff/{staff}` | Ubah |
| POST | `/staff/{staff}/deactivate`, `/staff/{staff}/activate` | Nonaktif/aktifkan |
| DELETE | `/staff/{staff}` | Soft delete |

**Isi:** `nip`, `nuptk`, `name`*, `gender`* (L/P), `birth_place`, `birth_date`, `phone`, `email`, `address`, `position`*, `employment_status`* (`permanent|honorary|contract`),
`join_date`, `education`, `is_teacher` (bool), `is_active` (bool), dan `assignments`: `[{id?, unit_id*, role_title*, start_date?, end_date?}]` (sinkron seperti `StudentService::syncGuardians`: ber-`id` diubah, tanpa `id` ditambah, yang hilang dihapus).
(* wajib). `nip` dan `nuptk` unik bila diisi (abaikan diri sendiri saat ubah).

**Respons (`StaffResource`):** semua kolom di atas + `assignments` (dengan `unit: {id, code}`), `has_account` (bool), `account_username` (atau null),
`homerooms` (rombel yang diwalikan pada tahun ajaran aktif: `[{id, name, unit}]`).

**Aturan:**
- Hapus ditolak (409, pesan Indonesia) bila staf punya akun pengguna, menjadi wali kelas rombel mana pun, bertanggung jawab atas aset, atau menjadi kepala unit.
- Nonaktifkan ditolak (422) bila saat ini menjadi wali kelas pada tahun ajaran aktif.
- Penugasan: `unit_id` harus ada; `end_date` ≥ `start_date`.
- Data pribadi (`address`, `phone`, `email`, `birth_date`, `birth_place`, `photo_path`) **tidak** disalin ke audit log.

## Tes wajib (minimal 14), di `tests/Feature/Staff/StaffTest.php`
Gunakan `tests/Concerns/SchoolFixtures.php` dan `CoreSeeder`. Cakup: daftar + filter (q, unit, is_teacher, is_active) · buat dengan penugasan · validasi wajib ·
NIP unik · ubah + sinkron penugasan · hapus berhasil · hapus ditolak (punya akun / wali kelas / penanggung jawab aset / kepala unit) ·
nonaktif ditolak untuk wali kelas · `has_account` dan `homerooms` benar · guru **403** · superadmin boleh baca tetapi **403** menulis · audit tanpa data pribadi · belum login **401**.

## Frontend (`/staf`)
- `module.tsx`: `key: 'staff'` (menggantikan placeholder), rute `staf` dengan `RequirePermission permission="staff.view"`.
- `StaffPage`: bilah judul + tombol "Tambah staf" (hanya bila `staff.manage`), filter (cari, guru/non-guru, status, **unit mengikuti pemilih unit di bilah atas** lewat `useUiStore`),
  tabel server-side (nama + NIP di bawahnya, jabatan, unit sebagai Tag, status kepegawaian [md], Guru [lg], wali kelas [md], akun [lg], status), menu aksi (Ubah, Nonaktifkan/Aktifkan, Hapus dengan konfirmasi).
- `StaffDrawer`: formulir `Drawer` (pola `features/users/UserFormDrawer.tsx`) dengan `Form.List` untuk penugasan unit. Galat 422/409 tampil di kolom/Alert.
- Responsif sesuai `docs/UI_GUIDE.md` (uji 375/768/1280), semua teks Indonesia.

## Selesai bila
`php artisan test` semua lulus · `php vendor/bin/pint --test` bersih · `npm run lint` dan `npm run build` lulus · halaman `/staf` teruji manual sebagai `tu` dan `guru1` (guru melihat 403).

## Berhenti dan laporkan jika
Perlu mengubah berkas di luar lingkup, perlu migrasi baru, tes lama gagal, atau instruksi ambigu. Jangan `git push`, `migrate:fresh`, atau menyentuh `.env`.
