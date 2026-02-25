import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 18383,
    proxy: {
      '/api': 'http://localhost:13952',
      '/ws': { target: 'ws://localhost:13952', ws: true },
      '/login': 'http://localhost:13952',
    },
  },
})
