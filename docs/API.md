# API — Daftar endpoint (v1)

Prefix `/api/v1`. Peran: **SA** superadmin · **TU** admin_tu_keuangan · **GU** guru (akses rapor hanya jika ia wali kelas rombel tersebut).
D = dibangun saat demo · P = pasca-demo. `*` = hanya rombel yang ia walikan (tahun ajaran/semester aktif).

## Auth
| Method | Path | Fungsi | Peran | Fase |
|---|---|---|---|---|
| GET | `/sanctum/csrf-cookie` | Ambil cookie CSRF (di luar prefix) | publik | D |
| POST | `/auth/login` | Login (throttle 5/menit) | publik | D |
| POST | `/auth/logout` | Logout | semua | D |
| GET | `/auth/me` | Profil + permission | semua | D |
| PUT | `/auth/password` | Ganti password (wajib saat pertama) | semua | D |

## Akun dan sistem (SA)
| Method | Path | Fungsi | Fase |
|---|---|---|---|
| GET/POST | `/users` | Daftar / buat akun (password sementara) | D |
| GET/PUT | `/users/{id}` | Detail / ubah (nama, peran, staf terkait) | D |
| POST | `/users/{id}/reset-password` | Reset ke password sementara | D |
| POST | `/users/{id}/deactivate`, `/activate` | Nonaktif/aktifkan (hapus sesi) | D |
| GET | `/roles` | Daftar peran | D |
| GET/PUT | `/school-profile` | Profil sekolah (GET: semua peran) | D |
| POST | `/school-profile/logo` | Unggah logo | D |
| GET/PUT | `/settings` | Pengaturan umum | P |
| GET | `/audit-logs` | Audit log (filter pengguna, aksi, tanggal) | D |

## Master (TU tulis; SA/GU baca)
| Method | Path | Fungsi | Fase |
|---|---|---|---|
| GET | `/units`, `/grade-levels` | Daftar | D |
| CRUD | `/academic-years` | Tahun ajaran | D |
| POST | `/academic-years/{id}/activate` | Aktifkan | D |
| CRUD | `/semesters`, POST `/semesters/{id}/activate` | Semester | D |
| CRUD | `/classrooms` | Rombel (filter unit, tahun) | D |
| CRUD | `/subjects` | Mata pelajaran | D |

## Siswa (TU tulis; SA baca; GU* baca)
| Method | Path | Fungsi | Fase |
|---|---|---|---|
| GET/POST | `/students` | Daftar (filter unit, rombel, status, `q`) / buat | D |
| GET/PUT/DELETE | `/students/{id}` | Detail / ubah / soft delete | D |
| POST | `/students/{id}/photo` | Foto | D |
| GET/POST | `/students/{id}/guardians` | Wali | D |
| PUT/DELETE | `/guardians/{id}` | | D |
| POST | `/students/{id}/status` | Mutasi (pindah, keluar, lulus, nonaktif) | D |
| GET | `/students/{id}/status-logs` | Riwayat | D |
| GET | `/classrooms/{id}/students` | Siswa dalam rombel | D |
| POST | `/classrooms/{id}/enroll` | Masukkan siswa (massal) | D |
| DELETE | `/enrollments/{id}` | Keluarkan dari rombel | D |
| POST | `/enrollments/promote` | Kenaikan kelas/lanjut jenjang massal | P |
| GET/POST | `/students/import`, `/students/import/template` | Impor CSV/Excel | P |

## Staf (TU tulis; SA baca)
| Method | Path | Fungsi | Fase |
|---|---|---|---|
| CRUD | `/staff` | Staf (filter unit, `is_teacher`) | D |
| POST/DELETE | `/staff/{id}/assignments` | Penugasan unit | D |

## Rapor (SD/SMP)
| Method | Path | Fungsi | Peran | Fase |
|---|---|---|---|---|
| CRUD | `/report-templates` | Template (edit template terpakai = versi baru) | TU, SA | D |
| POST | `/report-templates/{id}/activate`, `/duplicate` | | TU, SA | D |
| GET | `/report-cards?classroom_id=&semester_id=` | Daftar + status pengisian | TU, GU* | D |
| POST | `/report-cards` | Buat/ambil draft (siswa, semester) | TU, GU* | D |
| GET | `/report-cards/{id}` | Detail + template | TU, GU* | D |
| PUT | `/report-cards/{id}` | Simpan draft (autosave) | TU, GU* | D |
| POST | `/report-cards/{id}/finalize` | Finalkan | TU, GU* | D |
| POST | `/report-cards/{id}/unlock` | Buka kunci (alasan wajib) | TU | D |
| POST | `/report-cards/{id}/copy-from-previous` | Salin isian semester lalu | TU, GU* | P |
| GET | `/report-cards/{id}/pdf` | Unduh PDF server | TU | P |

Preview dirender di frontend dari template + data; tidak ada endpoint preview.

## Keuangan (TU tulis; SA baca)
| Method | Path | Fungsi | Fase |
|---|---|---|---|
| CRUD | `/fee-types`, `/fee-rates`, `/student-discounts` | Biaya, tarif, potongan | D |
| POST | `/invoices/generate` | Generate tagihan massal (idempoten) | D |
| GET/POST | `/invoices` | Daftar (filter unit, status, periode, siswa) / manual | D |
| GET | `/invoices/{id}` | Detail | D |
| POST | `/invoices/{id}/void` | Void (alasan) | D |
| GET | `/students/{id}/billing` | Tunggakan siswa | D |
| GET/POST | `/payments` | Daftar / catat (alokasi otomatis/manual) | D |
| GET | `/payments/{id}`, `/payments/{id}/receipt` | Detail / data kwitansi | D |
| POST | `/payments/{id}/void` | Void (alasan) | D |
| CRUD | `/cash-categories` | Kategori kas | D |
| GET/POST | `/cash-transactions` | Daftar / catat | D |
| POST | `/cash-transactions/{id}/void` | Void (alasan) | D |

## Inventaris (TU tulis; SA baca)
| Method | Path | Fungsi | Fase |
|---|---|---|---|
| CRUD | `/asset-categories`, `/locations`, `/assets` | | D |
| GET/POST | `/assets/{id}/movements` | Riwayat / catat perpindahan, kondisi, penghapusan | D |

## Dashboard dan laporan (SA, TU; GU hanya progres rapor rombelnya)
| Method | Path | Fungsi | Fase |
|---|---|---|---|
| GET | `/dashboard` | Ringkasan per unit | D |
| GET | `/reports/students`, `/reports/staff`, `/reports/assets` | Data laporan (dicetak dari frontend) | D |
| GET | `/reports/finance/summary`, `/arrears`, `/cash-book`, `/daily-payments` | Laporan keuangan (filter unit, periode) | D |
| GET | `/reports/*?format=csv` | Ekspor CSV | P |

## Throttle
Login 5/menit per IP+username; API umum 120/menit per pengguna.

## Pembaruan Pack 4 (Data Master dan Siswa)

Endpoint yang dibangun (menggantikan rincian lama di atas bila berbeda). Parameter rute memakai nama model.

| Method | Path | Izin | Keterangan |
|---|---|---|---|
| GET | `/units`, `/grade-levels?unit_id=`, `/academic-context` | master.view | Rujukan dan tahun ajaran/semester aktif |
| GET | `/academic-years` | master.view | Daftar + semester + jumlah rombel |
| POST/PUT/DELETE | `/academic-years[/{id}]` | master.manage | Buat/ubah dengan dua semester; hapus ditolak (409) bila aktif/punya rombel |
| POST | `/academic-years/{id}/activate`, `/semesters/{id}/activate` | master.manage | Satu tahun dan satu semester aktif (aktivasi semester ikut mengaktifkan tahunnya) |
| GET | `/classrooms?academic_year_id=&unit=&grade_level_id=` | master.view | Default: tahun aktif; memuat `students_count` |
| POST/PUT/DELETE | `/classrooms[/{id}]` | master.manage | Wali kelas: guru aktif, satu rombel per tahun; hapus ditolak bila ada siswa |
| GET | `/teacher-options?q=` | master.manage | Guru aktif + penanda sudah menjadi wali kelas |
| GET | `/students?q=&status=&unit=&classroom_id=&unplaced=` | students.view | Guru hanya melihat siswa rombel yang diwalikannya |
| GET | `/students/{id}` | students.view | Detail + wali + riwayat status (403 bila bukan siswanya) |
| POST/PUT/DELETE | `/students[/{id}]` | students.manage | Wali di-sinkron (id: ubah, tanpa id: tambah, hilang: hapus); hapus ditolak (409) bila ada keuangan/rapor |
| POST | `/students/{id}/status` | students.manage | Mutasi; keluar/lulus menutup enrollment tahun aktif |
| PUT | `/students/{id}/enrollment` | students.manage | Tempatkan/pindah rombel (memperbarui enrollment yang sama) |

## Pembaruan Pack 5 (Rapor dan Profil Sekolah)

Rute modul baru dimuat otomatis dari `backend/routes/v1/*.php` (lihat `docs/MODULE_GUIDE.md`).

| Method | Path | Izin | Keterangan |
|---|---|---|---|
| GET | `/school-profile` | login | Profil yayasan/sekolah + nama kepala sekolah per unit |
| PUT | `/school-profile` | system.manage | Ubah profil (kop rapor, laporan, kwitansi) |
| GET | `/report-cards/classrooms` | reportcards.fill/manage | Rombel SD/SMP yang boleh dikerjakan (TU semua, guru rombel yang diwalikannya) |
| GET | `/report-cards?classroom_id=` | idem | Siswa rombel + status rapor semester aktif + hitungan |
| POST | `/report-cards` | idem | Buka rapor siswa `{student_id}`: membuat draft terisi dari template bila belum ada |
| GET | `/report-cards/{id}` | policy `view` | Rapor lengkap: isian, siswa, rombel, template (definisi + pengaturan halaman), kop sekolah, `editable` |
| PUT | `/report-cards/{id}` | policy `update` | Simpan isian `{data}` (divalidasi terhadap definisi template; kunci/kolom asing ditolak) |
| POST | `/report-cards/{id}/finalize` | policy `update` | Finalkan |
| POST | `/report-cards/{id}/unlock` | reportcards.unlock | Buka kunci `{reason}` (TU) |
| POST | `/report-cards/{id}/printed` | policy `view` | Catat pencetakan ke audit log |
| GET | `/report-cards/batch?classroom_id=` | idem | Semua rapor final satu rombel (cetak sekaligus) |
