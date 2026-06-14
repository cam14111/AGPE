import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
export default defineConfig({
  base: "/AGPE/",
  build: { chunkSizeWarningLimit: 700 },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@agpe/shared": path.resolve(__dirname, "../../shared"),
    },
  },
});
