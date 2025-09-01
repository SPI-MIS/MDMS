import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// import vueDevTools from 'vite-plugin-vue-devtools'


// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    host: '0.0.0.0',
    port: 8080,
    allowedHosts: ['mdms.southplastic.com'],
    proxy: {
      '/api': {
        target: 'http://website_backend:3000', // ⭐ 用容器名稱，不是 localhost
        changeOrigin: true,
        secure: false
      }
    }
  }
});
