import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Em desenvolvimento, /api vai para o backend NestJS.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
