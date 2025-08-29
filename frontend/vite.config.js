import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import compression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    // Precompress assets for faster production delivery (served by reverse proxies/CDNs)
    compression({ algorithm: 'brotliCompress', ext: '.br', deleteOriginFile: false }),
    compression({ algorithm: 'gzip', ext: '.gz', deleteOriginFile: false }),
    // Optional: analyze bundle with ANALYZE_BUNDLE=true npm run build
    (process.env.ANALYZE_BUNDLE === 'true'
      ? visualizer({ filename: 'stats.html', open: true, brotliSize: true })
      : null),
  ].filter(Boolean),
  server: {
    open: true,
    host: process.env.VITE_HOST ?? 'localhost',
  },
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
  build: {
    target: 'es2019',
    cssCodeSplit: true,
    sourcemap: false,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
        },
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});