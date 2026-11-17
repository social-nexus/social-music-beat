import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// "npm run build" gera a interface pronta dentro de ../helper/web
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  build: { outDir: '../helper/web', emptyOutDir: true },
  server: { proxy: { '/api': 'http://localhost:8002', '/ace': 'http://localhost:8002', '/musicas': 'http://localhost:8002' } },
});
