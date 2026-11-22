# UI_GUIDE — Panduan antarmuka (responsif dan ramah pengguna)

Berlaku untuk semua halaman baru. Tujuannya: nyaman dipakai di HP, tablet, dan komputer; jelas bagi
TU dan guru yang tidak teknis.

## 1. Perangkat dan breakpoint

| Mode | Lebar | Perilaku |
|---|---|---|
| HP/tablet | < 992 px | Menu geser (Drawer), pemilih unit ringkas, padding 12 px, paginasi `simple`, tabel `small` |
| Komputer | ≥ 992 px | Menu samping (bisa diciutkan), pemilih unit berbentuk segmen, padding 24 px |

Gunakan `useIsMobile()` untuk perilaku tata letak dan `responsive: ['md']` / `['lg']` pada kolom tabel.
Tidak boleh ada **gulir horizontal pada halaman**; konten lebar (tabel, kode) menggulir di dalam wadahnya.

## 2. Pola yang dipakai

- **Daftar data:** bilah atas (judul + tombol aksi utama), baris filter yang melipat ke bawah (`Flex wrap`), tabel dengan paginasi server.
  Kolom utama (nama + keterangan) selalu tampil; kolom sekunder muncul bertahap di layar lebar.
- **Form tambah/ubah:** `Drawer` lebar `min(480px, 100vw)` (penuh di HP). Tombol **Batal** dan **Simpan** di bawah form.
- **Aksi per baris:** satu tombol titik tiga (menu aksi), bukan banyak tombol kecil.
- **Aksi berisiko** (nonaktifkan, void, reset): dialog konfirmasi dengan kalimat yang menjelaskan akibatnya.
- **Data yang hanya tampil sekali** (password sementara): modal khusus dengan tombol Salin.
- **Status kosong, memuat, dan galat** selalu ada: `Empty`, indikator memuat, dan `Alert` dengan tombol "Coba lagi".

## 3. Tampilan dan bahasa

- Semua teks Indonesia; tanggal `DD MMM YYYY`; uang `Rp 1.250.000` lewat `formatRupiah`.
- Warna utama `#0f766e`; status: hijau = baik/aktif, oranye = perhatian, merah = berisiko, abu = nonaktif.
- Label jelas di atas kolom form (layout vertikal), contoh isian di placeholder, petunjuk singkat di `extra`.
- Jangan mengandalkan warna saja; sertakan teks pada status.

## 4. Sentuhan dan aksesibilitas

- Tinggi kontrol dasar 40 px; di perangkat layar sentuh minimal 44 px (sudah diatur di `index.css`).
- Tombol hanya-ikon wajib punya `aria-label`.
- Urutan Tab logis; fokus awal pada kolom pertama; Enter mengirim form.
- Atribut `autoComplete`, `autoCapitalize="none"`, dan `inputMode` yang sesuai pada kolom login dan email.

## 5. Kinerja

- Halaman berat dimuat lazy (`app/lazyPages.tsx`).
- Daftar besar: paginasi sisi server, jangan memuat semua data.
- Ikon diimpor satu per satu dari `@ant-design/icons`.

## 6. Daftar periksa sebelum menganggap halaman selesai

- [ ] Dicoba di lebar 375 px, 768 px, dan 1280 px (DevTools, mode perangkat)
- [ ] Tidak ada gulir horizontal pada halaman
- [ ] Status kosong, memuat, dan galat tampil benar
- [ ] Semua tombol hanya-ikon punya `aria-label`
- [ ] `npm run lint` dan `npm run build` lulus
- [ ] Galat server (422/403/423/429) ditampilkan dengan pesan yang bisa dipahami
