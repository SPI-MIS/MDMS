import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      host: '0.0.0.0',
      port: 8080,
      allowedHosts: ['mdms.southplastic.com'], // ⭐ 允許子網域
      proxy: {
        // ⭐ 只在本機開發模式時用 proxy
        '/api': {
          //cloudflare端：
          // target: 'http://website_backend:4000',
          //開發端：
          target: 'http://localhost:4000',
          changeOrigin: true,
          secure: false
        }
      }
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true
    }
  }
})
