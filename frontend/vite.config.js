import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    // ✅ proxy Laravel API
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
    },
    // ✅ fallback bawaan vite untuk React Router (tanpa connect-history-api-fallback)
    historyApiFallback: true,
  },
  // ✅ pastikan path output benar saat build
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
