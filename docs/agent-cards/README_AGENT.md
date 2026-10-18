# Cara memakai kartu ini dengan Antigravity

1. Buka folder repo (`C:\Dev\Project\sekolah_terpadu`) di Antigravity. Pastikan `main` bersih (`git status`) dan sudah ter-push.
2. **Satu kartu = satu percakapan baru.** Kerjakan **berurutan**, bukan bersamaan (keduanya menyentuh `backend/` dan `frontend/`).
3. Tempel isi kartu. Minta agen **membuat rencana dulu** dan jangan mengubah file sebelum rencana kamu setujui.
4. Atur agar perintah terminal **meminta persetujuan**. Tolak `migrate:fresh`, `db:wipe`, `db:seed`, dan penyuntingan `.env`.
5. Model: pakai **Claude** untuk backend (logika dan tes); **Gemini** cukup untuk halaman antarmuka.
6. Setelah agen selesai, **kamu sendiri** jalankan: `php artisan test`, `php vendor/bin/pint --test`, `npm run lint`, `npm run build`,
   lalu coba manual. Jangan percaya laporan agen tanpa menjalankannya.
7. Commit ke `main` dengan pesan yang ditentukan di kartu. Jangan `git push` oleh agen.
8. Catat persentase kuota sebelum dan sesudah di `docs/PROGRESS.md`.

Jika agen macet dua kali pada hal yang sama: berhenti, salin potongan galat ke chat PM; jangan mengulang tanpa diagnosis.
