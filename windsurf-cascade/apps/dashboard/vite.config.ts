import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'odds-core': resolve(__dirname, '../../packages/odds-core/src'),
      'odds-websocket': resolve(__dirname, '../../packages/odds-websocket/src'),
      'odds-arbitrage': resolve(__dirname, '../../packages/odds-arbitrage/src'),
      'odds-ml': resolve(__dirname, '../../packages/odds-ml/src'),
      'odds-temporal': resolve(__dirname, '../../packages/odds-temporal/src'),
      'odds-validation': resolve(__dirname, '../../packages/odds-validation/src')
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
});
