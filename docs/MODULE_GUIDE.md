# MODULE_GUIDE — Menambah modul tanpa menyentuh berkas bersama

Tujuan: beberapa orang/agen bisa membangun modul berbeda **bersamaan** tanpa saling menimpa.
Modul baru hanya **menambah berkas**. Jangan mengubah berkas bersama di bawah ini.

## Berkas bersama (jangan diubah)

`backend/routes/api.php`, `frontend/src/app/router.tsx`, `frontend/src/app/navigation.tsx`,
`frontend/src/app/modules.ts`, `frontend/src/types/api.ts`, `frontend/src/lib/constants.ts`,
`backend/tests/Concerns/SchoolFixtures.php`, dan migrasi yang sudah ada.
(Pengecualian: menambah trait `Auditable` pada model modulmu sendiri.)

## Backend

| Apa | Di mana |
|---|---|
| Rute | `backend/routes/v1/<modul>.php` (dimuat otomatis di grup yang sudah terautentikasi dan wajib ganti password). Pasang izin dengan `->middleware('can:izin')` |
| Controller | `app/Http/Controllers/Api/V1/<Modul>/` |
| Validasi / respons | `app/Http/Requests/<Modul>/`, `app/Http/Resources/` |
| Logika bisnis | `app/Services/<Nama>Service.php` |
| Tes | `tests/Feature/<Modul>/`; data uji baru lewat trait baru di `tests/Concerns/` |

Polanya: contoh `StudentController`, `StudentRequest`, `StudentResource`, `StudentService`, `tests/Feature/Students/StudentTest.php`.

## Frontend

| Apa | Di mana |
|---|---|
| Pendaftaran modul | `frontend/src/features/<modul>/module.tsx` → `export default { key, routes, nav? } satisfies ModuleDef` |
| Halaman berat | `features/<modul>/lazyPages.tsx` (hanya mengekspor komponen `lazy`) |
| API dan tipe | `features/<modul>/api.ts`, `features/<modul>/types.ts` |
| Konstanta | `features/<modul>/constants.ts` |

- `key` yang sama dengan menu "segera hadir" (`staff`, `inventory`, ...) **menggantikan** halaman placeholder-nya.
- Halaman memakai `RequirePermission`; terapkan pola dari `features/students/*` dan `docs/UI_GUIDE.md`.
- Contoh modul lengkap: `features/reportcards/` dan `features/school/`.

## Aturan umum

Ikuti `AGENTS.md` dan `docs/UI_GUIDE.md`. Data dummy saja. Jangan menjalankan `migrate:fresh`, `db:wipe`, atau seeder
pada database pengembangan (tes memakai SQLite memori dan aman).
