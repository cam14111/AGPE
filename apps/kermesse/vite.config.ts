import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// base: '/AGPE/' — l'app est servie sous https://cam14111.github.io/AGPE/
export default defineConfig({
  base: '/AGPE/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
