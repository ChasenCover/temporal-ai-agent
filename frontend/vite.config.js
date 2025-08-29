import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';

const isAnalyze = process.env.ANALYZE === '1' || process.env.ANALYZE === 'true';

export default defineConfig({
  plugins: [
    react(),
    // Generate compressed assets for production deployments (both gzip and brotli)
    viteCompression({ algorithm: 'brotliCompress', ext: '.br', deleteOriginFile: false }),
    viteCompression({ algorithm: 'gzip', ext: '.gz', deleteOriginFile: false }),
    ...(isAnalyze
      ? [
          visualizer({
            filename: 'dist/stats.html',
            gzipSize: true,
            brotliSize: true,
            template: 'treemap',
          }),
        ]
      : []),
  ],
  server: {
    open: true,
    host: process.env.VITE_HOST ?? 'localhost',
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    cssCodeSplit: true,
    reportCompressedSize: true,
    modulePreload: { polyfill: false },
    esbuild: {
      drop: ['console', 'debugger'],
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'react-vendor';
            return 'vendor';
          }
        },
      },
    },
  },
});