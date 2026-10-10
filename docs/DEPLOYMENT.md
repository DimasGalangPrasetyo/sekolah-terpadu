# DEPLOYMENT — Server dan operasional

## 1. Lingkungan

| Lingkungan | Tujuan | Data |
|---|---|---|
| Lokal (laptop) | Pengembangan dan **demo** | Dummy |
| Staging (opsional) | Uji sebelum produksi | Dummy |
| Produksi | Dipakai sekolah | Asli (setelah checklist `SECURITY.md` §9) |

## 2. Rekomendasi produksi

VPS Linux (Ubuntu LTS), pertimbangkan penyedia dengan pusat data di Indonesia (lokasi data dan latensi).
Spesifikasi awal: 2 vCPU, 4 GB RAM, 40–80 GB SSD (cukup untuk ratusan siswa; RAM lebih bila PDF server memakai browser headless).
Alternatif server lokal di sekolah **tidak disarankan** (listrik, internet, cadangan, keamanan fisik) kecuali ada pengelola.

Komponen:
```
Internet → Nginx (HTTPS)
             ├─ /        → file statis hasil build React
             └─ /api     → PHP-FPM (Laravel)
Laravel → MySQL 8 (hanya localhost)
Systemd/Supervisor: queue worker · Cron: php artisan schedule:run (tiap menit)
```
Satu domain/subdomain milik sekolah (ditanyakan: apakah sekolah sudah punya domain; O-03).

## 3. Pengerasan server

- Pengguna non-root, login SSH hanya dengan kunci; root login dimatikan.
- Firewall (ufw): hanya 22 (idealnya dibatasi IP), 80, 443. MySQL tidak terbuka ke luar.
- `fail2ban`; pembaruan keamanan otomatis (`unattended-upgrades`).
- Sertifikat HTTPS dari Let's Encrypt (Certbot) dengan pembaruan otomatis.
- `.env` izin 600; disk upload privat di luar folder web.
- Zona waktu server `Asia/Jakarta`.

## 4. Konfigurasi aplikasi produksi

```
APP_ENV=production   APP_DEBUG=false   APP_TIMEZONE=Asia/Jakarta
SESSION_DRIVER=database   QUEUE_CONNECTION=database   CACHE_STORE=database
SESSION_SECURE_COOKIE=true   SANCTUM_STATEFUL_DOMAINS=<domain>
```
Skala kecil: tanpa Redis. Pertimbangkan Redis bila beban tumbuh.

## 5. Alur rilis

Fase A: manual dengan skrip `deploy.sh` (di server):
```
git pull → composer install --no-dev --optimize-autoloader
        → php artisan migrate --force
        → php artisan config:cache route:cache view:cache
        → frontend: npm ci && npm run build (atau salin hasil build)
        → reload php-fpm, restart queue worker
```
Fase B: GitHub Actions menjalankan lint + tes pada tiap push; deploy manual dengan persetujuan.
Aturan: rilis hanya dari `main` yang tes-nya lulus; ada langkah **kembali ke versi sebelumnya** (tag Git + cadangan DB sebelum migrasi).

## 6. Cadangan dan pemulihan

| Item | Cara | Frekuensi | Retensi |
|---|---|---|---|
| Database | `mysqldump --single-transaction`, kompres, **enkripsi** | Harian | 14 harian, 8 mingguan, 6 bulanan |
| Berkas unggahan | rsync/arsip terenkripsi | Harian | Sama |
| Salinan luar server | Penyimpanan objek/penyedia lain atau drive eksternal | Harian | Sama |

Target: kehilangan data maksimal 24 jam; pemulihan ≤ 4 jam.
**Uji pemulihan tiap bulan** (pulihkan ke staging, cek jumlah siswa dan total keuangan). Cadangan yang belum diuji dianggap belum ada.

## 7. Pemantauan

- Pemantau uptime eksternal pada halaman login.
- Peringatan ruang disk > 80%.
- Log Laravel dirotasi; galat 500 ditinjau berkala.
- Pembaruan keamanan PHP, MySQL, dan dependensi dijadwalkan bulanan.

## 8. PDF server (pasca-demo)

Pilihan: (a) browser headless (Browsershot + Chromium/Node): ukuran kertas dan CSS paling setia ke preview, tetapi menambah beban RAM dan dependensi; (b) dompdf: ringan, tetapi dukungan CSS terbatas. Putuskan lewat uji kecil dengan template asli (O-01). Bila (a), pasang di server dan jalankan sebagai job.

## 9. Serah terima

Dokumen: panduan pengguna per peran, prosedur cadangan/pemulihan, daftar akun, kepemilikan repo/server/domain.
Pelatihan singkat untuk TU dan guru wali kelas. Tentukan siapa pemelihara setelah serah terima.
