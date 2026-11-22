# Frontend

Aplikasi React + TypeScript + Vite untuk Sekolah Terpadu. Gambaran proyek dan cara menjalankan lengkap ada di
[README utama](../README.md).

## Perintah

```bash
npm install
npm run dev      # http://localhost:5173, /api diteruskan ke backend
npm run lint
npm run build
```

## Struktur

```
src/features/<modul>/   satu folder per modul (halaman, drawer, api, tipe)
src/api/                klien HTTP dan penanganan galat
src/app/                kerangka aplikasi, navigasi, sesi
```

Rujukan: [Arsitektur frontend](../docs/architecture/FRONTEND.md) · [Pedoman UI](../docs/guides/UI_GUIDE.md) ·
[Panduan modul](../docs/guides/MODULE_GUIDE.md).
