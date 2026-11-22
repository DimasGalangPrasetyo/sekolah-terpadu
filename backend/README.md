# Backend

API Laravel untuk Sekolah Terpadu. Gambaran proyek dan cara menjalankan lengkap ada di [README utama](../README.md).

## Perintah

```bash
composer install
cp .env.example .env && php artisan key:generate
php artisan migrate --seed
php artisan serve
php artisan test
./vendor/bin/pint --test
```

## Struktur

```
routes/v1/*.php          satu berkas rute per modul (dimuat otomatis)
app/Http/Controllers/    controller tipis per modul
app/Http/Requests/       validasi
app/Http/Resources/      bentuk respons JSON
app/Services/            logika bisnis (mis. InvoiceService, PaymentService)
app/Models/ · app/Enums/ model dan enum
database/seeders/        CoreSeeder (data inti) dan DummyDataSeeder (khusus local)
tests/Feature/           tes per modul
```

Rujukan: [API](../docs/architecture/API.md) · [Skema database](../docs/architecture/DATABASE.md) ·
[Panduan modul](../docs/guides/MODULE_GUIDE.md).
