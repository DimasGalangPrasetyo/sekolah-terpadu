# KARTU: modul Inventaris

**Pelaksana:** Antigravity · **Commit:** `feat(inventory): modul inventaris` · **Baca dulu:** `AGENTS.md`, `docs/MODULE_GUIDE.md`, `docs/UI_GUIDE.md`, `docs/DATABASE.md` §6
**Syarat awal:** kartu Staf sudah selesai dan di-commit (aset memakai staf sebagai penanggung jawab).

## Tujuan
TU dapat mengelola aset sekolah: kategori, lokasi, aset, dan riwayat perpindahan/kondisi. Tabel `asset_categories`, `locations`, `assets`, `asset_movements` dan modelnya **sudah ada** (kolom kondisi bernama `item_condition`). Tanpa migrasi baru.

## Lingkup file (hanya ini)
- Backend baru: `routes/v1/inventory.php`, `app/Http/Controllers/Api/V1/Inventory/{AssetController,AssetCategoryController,LocationController}.php`,
  `app/Http/Requests/Inventory/`, `app/Http/Resources/{AssetResource,AssetMovementResource}.php`, `app/Services/AssetService.php`, `tests/Feature/Inventory/`
- Backend ubah (hanya menambah `Auditable`): `app/Models/Asset.php`, `app/Models/AssetMovement.php`
- Frontend baru: `frontend/src/features/inventory/` (`module.tsx`, `lazyPages.tsx`, `api.ts`, `types.ts`, `constants.ts`, `InventoryPage.tsx`, dan komponen tab)
- Dokumen: bagian di `docs/API.md`, satu baris di `docs/PROGRESS.md`

## API (izin: `inventory.view` baca, `inventory.manage` tulis)
- `GET/POST /asset-categories`, `PUT/DELETE /asset-categories/{id}` (hapus 409 bila dipakai aset). `code` unik.
- `GET/POST /locations?unit=`, `PUT/DELETE /locations/{id}` (hapus 409 bila dipakai aset/riwayat). `unit_id` boleh kosong (= bersama).
- `GET /assets?q=&unit=&category_id=&location_id=&item_condition=&status=&page=&per_page=` (paginasi 15; `unit=shared` untuk aset bersama; `q` cari nama/kode)
- `POST /assets`, `GET /assets/{id}` (memuat `movements`), `PUT /assets/{id}`, `DELETE /assets/{id}` (soft delete)
- `POST /assets/{id}/movements`: `{type: move|condition|dispose, moved_at*, to_location_id (wajib bila move), to_condition (wajib bila condition), notes}`
- `GET /assets/{id}/movements`

**Aturan:**
- `code` boleh kosong → otomatis `AST-` + id 4 digit setelah dibuat. Bila diisi harus unik.
- `quantity` ≥ 1; `item_condition` ∈ `good|light_damage|heavy_damage|lost|disposed`; `status` ∈ `active|disposed`.
- Perpindahan mengubah aset: `move` → `location_id`; `condition` → `item_condition` (bukan `disposed`); `dispose` → `status=disposed` dan `item_condition=disposed`.
  Riwayat mencatat nilai asal/tujuan, tanggal, catatan, dan pembuat. Aset `disposed` tidak boleh dipindah/diubah kondisinya (422).
- `acquisition_cost` bilangan bulat rupiah (tanpa desimal). `responsible_staff_id` harus staf aktif.

## Tes wajib (minimal 16), `tests/Feature/Inventory/`
Kategori CRUD + hapus ditolak bila dipakai · lokasi CRUD + filter unit · aset: buat (kode otomatis dan manual), kode unik, validasi, ubah, daftar + semua filter, soft delete ·
perpindahan lokasi, ubah kondisi, penghapusan aset (status berubah + riwayat) · aset disposed tidak bisa dipindah · `to_location_id` wajib saat move ·
guru **403**, superadmin boleh baca tetapi **403** menulis, belum login **401**.

## Frontend (`/inventaris`)
- `module.tsx`: `key: 'inventory'`, rute `inventaris` (izin `inventory.view`).
- `InventoryPage` dengan **Tabs**: **Aset** (tabel + filter + Drawer tambah/ubah + panel detail dengan riwayat dan tombol "Catat perpindahan/kondisi/penghapusan"),
  **Kategori** dan **Lokasi** (tabel sederhana + Drawer). Unit mengikuti pemilih unit di bilah atas.
- Kondisi ditampilkan sebagai Tag berwarna dengan teks Indonesia (konstanta di `features/inventory/constants.ts`).
- Responsif sesuai `docs/UI_GUIDE.md` (375/768/1280). Tombol tambah/ubah hanya bila `inventory.manage`.

## Selesai bila
`php artisan test` semua lulus · `pint --test` bersih · `npm run lint` dan `npm run build` lulus · uji manual sebagai `tu`.

## Berhenti dan laporkan jika
Perlu berkas di luar lingkup, migrasi baru, atau tes lama gagal. Jangan `git push`, `migrate:fresh`, atau menyentuh `.env`.
