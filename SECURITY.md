# Kebijakan Keamanan

Repositori ini berisi **prototype** sistem administrasi sekolah. Seluruh data di dalamnya adalah data dummy,
dan tidak ada data siswa, staf, atau keuangan yang nyata.

## Melaporkan kerentanan

Jika Anda menemukan kerentanan keamanan, mohon **jangan membukanya sebagai issue publik**.
Laporkan secara tertutup lewat GitHub: tab **Security → Report a vulnerability** pada repositori ini.

Sertakan, bila memungkinkan:

- deskripsi singkat dan dampaknya,
- langkah untuk mereproduksi (endpoint, peran yang dipakai, contoh permintaan),
- versi atau commit yang diuji.

Mohon **tidak menyertakan data pribadi nyata** dalam laporan. Laporan ditanggapi sebisanya oleh pemilik repositori;
tidak ada jaminan waktu respons tertentu.

## Cakupan

Yang relevan: autentikasi dan sesi, kontrol hak akses antarperan, validasi masukan, kebocoran data lewat
respons API atau log audit, dan konfigurasi bawaan di repositori.

Di luar cakupan: layanan pihak ketiga, serangan yang butuh akses fisik ke server, dan temuan pada
dependensi yang belum punya perbaikan resmi.

## Rujukan

Rancangan kontrol keamanan aplikasi (autentikasi, otorisasi, audit, cadangan, dan checklist produksi) ada di
[`docs/architecture/SECURITY.md`](docs/architecture/SECURITY.md).
