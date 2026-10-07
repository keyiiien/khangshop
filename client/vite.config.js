import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Khi chạy dev, chuyển các request /api và /uploads sang server Express
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/uploads': 'http://localhost:4000',
    },
  },
});
