import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

/**
 * Vite 5 configuration for Sports Terminal OS frontend.
 * React 19 + TypeScript SPA with HMR and optimized builds.
 * Tailwind v4 via @tailwindcss/vite (shadcn / cn add).
 */
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  root: resolve(__dirname, "src/frontend"),
  publicDir: resolve(__dirname, "src/frontend/public"),
  build: {
    outDir: resolve(__dirname, "dist/frontend"),
    emptyOutDir: true,
    sourcemap: mode !== "production",
    minify: mode === "production",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router"],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@frontend": resolve(__dirname, "src/frontend"),
      "@components": resolve(__dirname, "src/frontend/components"),
      "@pages": resolve(__dirname, "src/frontend/pages"),
      "@hooks": resolve(__dirname, "src/frontend/hooks"),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/ws": {
        target: "ws://localhost:3000",
        ws: true,
      },
    },
  },
  css: {
    devSourcemap: true,
  },
}));
