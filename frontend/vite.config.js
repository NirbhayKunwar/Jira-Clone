import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // App: stores and config — isolated stable chunk to prevent TDZ
          if (id.includes('/src/store/') || id.includes('/src/config/') || id.includes('/src/hooks/')) {
            return 'app-core';
          }
        }
      }
    }
  }
})
