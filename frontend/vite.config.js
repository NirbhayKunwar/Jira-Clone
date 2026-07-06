import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        // Fix: Rolldown (Vite 8's bundler) can generate code where const/let
        // variables are accessed before initialization (Temporal Dead Zone).
        // strictExecutionOrder forces modules to execute in dependency-graph
        // order, permanently preventing all TDZ ReferenceErrors at runtime.
        strictExecutionOrder: true,
      },
    },
  },
})

