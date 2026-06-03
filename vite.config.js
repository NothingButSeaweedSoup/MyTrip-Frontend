import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8180',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:8180',
        changeOrigin: true
      }
    }
  },
  build: {
    target: 'es2020',
    minify: 'oxc',
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 200,
  },
})
