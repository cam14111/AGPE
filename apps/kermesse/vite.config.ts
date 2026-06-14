import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// base: '/AGPE/' — l'app est servie sous https://cam14111.github.io/AGPE/
// envDir: les fichiers .env vivent à la racine du monorepo (pas dans apps/kermesse).
export default defineConfig({
  base: '/AGPE/',
  envDir: path.resolve(__dirname, '../..'),
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
