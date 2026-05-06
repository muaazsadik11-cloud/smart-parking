import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://smart-parking-production-0e7a.up.railway.app',
        changeOrigin: true,
      }
    }
  }
})
