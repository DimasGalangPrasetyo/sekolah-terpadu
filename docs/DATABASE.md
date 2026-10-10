# DATABASE — Rancangan

MySQL 8, InnoDB, `utf8mb4`. Zona waktu aplikasi `Asia/Jakarta`.
Identifier bahasa Inggris, `snake_case`, tabel jamak. PK `BIGINT UNSIGNED` auto-increment.
Semua tabel punya `created_at`/`updated_at`. Status/jenis = `VARCHAR` + PHP enum.
Uang = `BIGINT` rupiah. FK `ON DELETE RESTRICT` kecuali disebut lain.
`SD` = soft delete (`deleted_at`).

## 1. Akses dan sistem

| Tabel | Kolom penting | Catatan |
|---|---|---|
| `users` (SD) | `staff_id`? FK, `name`, `username` UQ, `email`? UQ, `password`, `is_active`, `must_change_password`, `last_login_at`, `failed_attempts`, `locked_until` | Satu akun per orang; `staff_id` wajib untuk peran guru |
| `roles`, `permissions`, `model_has_roles`, `model_has_permissions`, `role_has_permissions` | Bawaan spatie | Seed: 3 peran |
| `sessions` | Bawaan Laravel (driver `database`) | Nonaktif akun → hapus sesi |
| `audit_logs` | `user_id`?, `event`, `auditable_type`?, `auditable_id`?, `old_values` JSON?, `new_values` JSON?, `ip_address`, `user_agent`, `created_at` | Hanya tulis; tanpa UI hapus. Indeks `(auditable_type, auditable_id)`, `(user_id, created_at)` |
| `settings` | `key` UQ, `value` JSON | Pengaturan umum (ukuran kwitansi, dll.) |
| `school_profiles` | `foundation_name`, `address`, `phone`, `email`, `logo_path`?, `letterhead` JSON? | Satu baris |
| `number_sequences` | `key`, `period`, `last_number`; UQ `(key, period)` | Penomoran aman (kunci baris) |

## 2. Struktur sekolah

| Tabel | Kolom penting | Catatan |
|---|---|---|
| `units` | `code` UQ (TK/SD/SMP), `name`, `has_report_card` bool, `npsn`?, `head_staff_id`?, `is_active` | 3 baris seed |
| `academic_years` | `name` UQ ("2026/2027"), `start_date`, `end_date`, `is_active` | Satu aktif (service, bukan DB) |
| `semesters` | `academic_year_id`, `name` (ganjil/genap), `start_date`, `end_date`, `is_active`; UQ `(academic_year_id, name)` | Dipakai SD/SMP |
| `grade_levels` | `unit_id`, `code`, `name`, `sort_order`; UQ `(unit_id, code)` | Seed: TK A/B, SD 1–6, SMP 7–9 |
| `classrooms` (rombel) | `unit_id`, `academic_year_id`, `grade_level_id`, `name`, `homeroom_staff_id`?, `capacity`?; UQ `(unit_id, academic_year_id, name)` | Baris baru tiap tahun ajaran. `homeroom_staff_id` = penugasan wali kelas (bukan peran) |
| `subjects` | `unit_id`?, `name`, `code`?, `sort_order`, `is_active` | Pengisi baris tabel rapor |

## 3. Orang

| Tabel | Kolom penting | Catatan |
|---|---|---|
| `students` (SD) | `nis`? UQ, `nisn`? UQ, `name`, `gender`, `birth_place`, `birth_date`, `religion`, `address`, `phone`?, `previous_school`?, `entry_date`, `status`, `photo_path`?, `notes`? | Satu catatan per anak sepanjang TK→SMP. Tanpa NIK/KK (D-10) |
| `guardians` | `student_id`, `relation`, `name`, `occupation`?, `phone`?, `address`?, `is_primary_contact` | Indeks `student_id` |
| `student_enrollments` | `student_id`, `classroom_id`, `academic_year_id`, `status`, `started_at`, `ended_at`?; UQ `(student_id, academic_year_id)` | Unit siswa = unit rombelnya |
| `student_status_logs` | `student_id`, `from_status`, `to_status`, `effective_date`, `reason`?, `destination_school`?, `document_number`?, `created_by` | Riwayat mutasi, tidak ditimpa |
| `staff` (SD) | `nip`?, `nuptk`?, `name`, `gender`, `birth_place`, `birth_date`, `phone`?, `email`?, `address`, `position`, `employment_status`, `join_date`, `education`?, `is_teacher` bool, `is_active`, `photo_path`? | |
| `staff_unit_assignments` | `staff_id`, `unit_id`, `role_title`, `start_date`, `end_date`? | Satu orang bisa di dua unit |

Status siswa: `active`, `transferred`, `dropped`, `graduated`, `inactive`.
Status enrollment: `active`, `promoted`, `retained`, `graduated`, `left`.

## 4. Rapor (SD/SMP)

| Tabel | Kolom penting | Catatan |
|---|---|---|
| `report_templates` | `unit_id`, `name`, `version`, `page_size`, `page_width_mm`, `page_height_mm`, `orientation`, `margin_top/right/bottom/left_mm`, `offset_x_mm`, `offset_y_mm`, `font_family`, `font_size_pt`, `definition` JSON, `is_active`, `is_locked` | **Tidak diubah setelah dipakai**; edit = baris baru (D-09). UQ `(unit_id, name, version)` |
| `report_cards` | `student_id`, `enrollment_id`, `semester_id`, `template_id`, `status` (draft/final), `data` JSON, `filled_by`, `finalized_by`?, `finalized_at`?; UQ `(student_id, semester_id)` | Isi = pasangan key→nilai |

Bentuk `definition` (divalidasi backend):
```json
{
  "sections": [
    { "key": "identity", "type": "student_identity", "title": "Identitas Siswa" },
    { "key": "subjects", "type": "table", "title": "Capaian",
      "columns": [{"key":"subject","label":"Mata Pelajaran"},{"key":"score","label":"Nilai"},{"key":"note","label":"Deskripsi"}],
      "rows_from": "subjects" },
    { "key": "extra", "type": "table", "title": "Ekstrakurikuler", "dynamic_rows": true },
    { "key": "attendance", "type": "fields", "fields": [
        {"key":"sick","label":"Sakit","input":"number"},
        {"key":"permit","label":"Izin","input":"number"},
        {"key":"absent","label":"Alpa","input":"number"} ] },
    { "key": "homeroom_note", "type": "text", "label": "Catatan Wali Kelas", "input": "textarea", "max_length": 600 },
    { "key": "signature", "type": "signature", "signers": ["Wali Kelas","Kepala Sekolah"] }
  ]
}
```
Tipe `input`: `text`, `textarea`, `number`, `select`, `date`.

## 5. Keuangan (terpusat)

| Tabel | Kolom penting | Catatan |
|---|---|---|
| `fee_types` | `code` UQ, `name`, `category` (monthly/one_time/annual/other), `is_active` | SPP, uang pangkal, seragam, kegiatan |
| `fee_rates` | `fee_type_id`, `unit_id`, `grade_level_id`?, `academic_year_id`, `amount`; UQ `(fee_type_id, unit_id, grade_level_id, academic_year_id)` | Tarif per tingkat |
| `student_discounts` | `student_id`, `fee_type_id`?, `academic_year_id`, `type` (fixed/percent), `value`, `reason`, `is_active` | Potongan/beasiswa |
| `invoices` | `number` UQ, `student_id`, `unit_id`, `academic_year_id`, `kind` (monthly/one_time), `period_month`? (DATE tanggal 1), `due_date`, `total_amount`, `paid_amount`, `status` (unpaid/partial/paid/void), `notes`?, `created_by`, `voided_at/by`?, `void_reason`?; UQ `(student_id, kind, period_month)` | UQ mencegah tagihan bulanan ganda |
| `invoice_items` | `invoice_id`, `fee_type_id`, `description`, `quantity`, `unit_price`, `discount_amount`, `subtotal` | |
| `payments` | `receipt_number` UQ, `student_id`, `payment_date`, `method` (cash/transfer/other), `amount`, `reference`?, `notes`?, `received_by`, `status` (valid/void), `voided_at/by`?, `void_reason`? | |
| `payment_allocations` | `payment_id`, `invoice_id`, `amount` | Satu pembayaran bisa menutup beberapa tagihan |
| `cash_categories` | `name`, `type` (income/expense), `is_active` | |
| `cash_transactions` | `number` UQ, `transaction_date`, `type`, `cash_category_id`, `unit_id`? (null = umum), `amount`, `description`, `proof_path`?, `created_by`, `status` (valid/void), void info | Hanya kas **di luar** pembayaran siswa |

Laporan kas = saldo awal + (pembayaran siswa valid + kas masuk) − kas keluar. Pembayaran siswa
**tidak** disalin ke `cash_transactions` (hindari ganda).

## 6. Inventaris

| Tabel | Kolom penting | Catatan |
|---|---|---|
| `asset_categories` | `code`, `name` | |
| `locations` | `unit_id`?, `name`, `description`? | Ruang/lokasi |
| `assets` (SD) | `code` UQ, `name`, `asset_category_id`, `unit_id`? (null = bersama), `location_id`, `quantity`, `unit_label`, `acquisition_date`?, `acquisition_source`?, `acquisition_cost`?, `condition`, `responsible_staff_id`?, `photo_path`?, `status` (active/disposed), `notes`? | |
| `asset_movements` | `asset_id`, `type` (move/condition/dispose), `from_location_id`?, `to_location_id`?, `from_condition`?, `to_condition`?, `moved_at`, `notes`?, `created_by` | |

Kondisi: `good`, `light_damage`, `heavy_damage`, `lost`, `disposed`.

## 7. Aturan integritas

1. Tahun ajaran/semester aktif diubah lewat `AcademicContext` dalam transaksi (nonaktifkan semua, aktifkan satu); tes wajib.
2. Pembayaran dan alokasi dalam **satu transaksi** dengan `lockForUpdate` pada tagihan terkait.
3. Nomor dokumen dari `number_sequences` dengan kunci baris (format contoh: `INV/2026/10/0001`, `KWT/2026/10/0001`).
4. Setelah posting, nominal tagihan/pembayaran tidak diedit; koreksi lewat `void` + dokumen baru.
5. Siswa/staf/aset di-soft-delete; data yang dirujuk keuangan tidak boleh dihapus fisik.
6. Rapor `final` hanya bisa diubah setelah `unlock` oleh TU (dicatat di audit log).
7. Template yang sudah dipakai rapor menjadi `is_locked`.
8. Satu guru maksimal menjadi wali kelas satu rombel per tahun ajaran (divalidasi service, bukan DB).

## 8. Indeks yang wajib

`students(name)`, `students(status)`, `student_enrollments(classroom_id)`, `classrooms(unit_id, academic_year_id)`,
`invoices(student_id, status)`, `invoices(period_month)`, `payments(student_id, payment_date)`,
`cash_transactions(transaction_date)`, `report_cards(semester_id, status)`, `assets(location_id)`,
`audit_logs(auditable_type, auditable_id)`.

## 9. Seed

Peran + permission, 3 unit, grade level, satu akun `superadmin`, kategori kas dan jenis biaya awal,
dan **data dummy** (≈75 siswa lintas unit, staf, rombel, satu template rapor generik).
