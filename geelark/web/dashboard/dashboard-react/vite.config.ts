import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { DEV_SERVER } from './src/config.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '../..'), '');

  return {
    // Build configuration
    build: {
      outDir: '../dashboard-dist',
      emptyOutDir: true,
      sourcemap: mode === 'development',
      minify: 'esbuild',
      chunkSizeWarningLimit: 500,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'charts': ['recharts'],
            'icons': ['lucide-react'],
          }
        }
      }
    },

    // Development server (only for development)
    server: {
      port: DEV_SERVER.PORT,
      host: DEV_SERVER.HOST,
      proxy: {
        '/api': {
          target: DEV_SERVER.API_PROXY_TARGET,
          changeOrigin: true,
        }
      }
    },

    plugins: [react()],

    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.API_KEY || ''),
      'process.env.VITE_API_BASE': JSON.stringify('/api'),
      'process.env.VITE_WS_BASE': JSON.stringify('ws://localhost:3000'),
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    }
  };
});
