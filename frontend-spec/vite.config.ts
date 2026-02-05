import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      external: ['three', 'gsap', 'keyboardjs'],
      output: {
        globals: {
          'three': 'THREE',
          'gsap': 'gsap',
          'keyboardjs': 'keyboardJS'
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['three', 'gsap', 'keyboardjs']
  },
  define: {
    global: 'globalThis',
  }
});
