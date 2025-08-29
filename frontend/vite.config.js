import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteCompression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [react(), viteCompression({ algorithm: 'brotliCompress', ext: '.br' }), visualizer({ filename: 'bundle-report.html', template: 'treemap', gzipSize: true, brotliSize: true, open: false })],
  server: {
    open: true,
    host: process.env.VITE_HOST ?? 'localhost',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
        },
      },
    },
  },
});