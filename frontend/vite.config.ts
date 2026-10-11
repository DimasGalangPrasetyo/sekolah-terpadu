import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Saat pengembangan, /api dan /sanctum diteruskan ke Laravel (php artisan serve) sehingga
// browser hanya berhubungan dengan satu asal (localhost:5173): cookie sesi dan CSRF jalan tanpa CORS.
// Memakai 127.0.0.1 (bukan localhost) agar tidak gagal karena IPv6 di Node baru.
const backend = 'http://127.0.0.1:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': backend,
      '/sanctum': backend,
    },
  },
})
