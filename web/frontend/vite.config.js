import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        timeout: 60000,
        proxyTimeout: 60000,
      },
      '/socket.io': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
