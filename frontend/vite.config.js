import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'unsafe-none',
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
    }
  },

  build: {
    // Disable sourcemaps in production — removes significant bundle overhead
    sourcemap: false,

    // Warn when a single output chunk exceeds 500 kB
    chunkSizeWarningLimit: 500,

    // Vite 8 uses Rolldown as the bundler. Both rollupOptions and rolldownOptions
    // are applied — rolldownOptions takes precedence for the Rolldown runtime.
    rollupOptions: {
      output: {
        // TDZ safety: execute modules in dependency-graph order
        strictExecutionOrder: true,
      }
    },

    rolldownOptions: {
      output: {
        // TDZ safety: execute modules in dependency-graph order
        strictExecutionOrder: true,

        // Split vendor dependencies into individually-cached chunks.
        // Browser caches each chunk by its content hash, so a new deploy
        // of app code doesn't bust the React or icon caches.
        manualChunks(id) {
          // React core — tiny, almost never changes between deploys
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/scheduler/')
          ) {
            return 'vendor-react';
          }

          // React Router — separate from React core for targeted cache busting
          if (
            id.includes('node_modules/react-router') ||
            id.includes('node_modules/@remix-run/')
          ) {
            return 'vendor-router';
          }

          // TanStack Query — data-fetching runtime
          if (id.includes('node_modules/@tanstack/')) {
            return 'vendor-query';
          }

          // Lucide icons — large icon library, benefits most from long-term caching
          if (id.includes('node_modules/lucide-react/')) {
            return 'vendor-icons';
          }

          // Zustand state management
          if (id.includes('node_modules/zustand/')) {
            return 'vendor-state';
          }

          // All other node_modules share one vendor-misc chunk
          if (id.includes('node_modules/')) {
            return 'vendor-misc';
          }
        }
      }
    },
  }
})
