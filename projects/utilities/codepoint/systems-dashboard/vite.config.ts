import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  root: ".",
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      input: "./index.html",
    },
  },
  server: {
    port: parseInt(process.env.PORT || "5173"),
    open: true,
  },
});
