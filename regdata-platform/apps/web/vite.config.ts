import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In development, /api is proxied to the NestJS backend.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
