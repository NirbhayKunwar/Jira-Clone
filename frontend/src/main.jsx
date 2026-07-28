import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import { ThemeProvider } from './providers/ThemeProvider.jsx'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Don't refetch when window regains focus — avoids spurious network hits
      refetchOnWindowFocus: false,

      // Single retry on failure — enough for transient errors, not thrashing
      retry: 1,

      // Default staleTime: 30 s. Prevents duplicate fetches on quick navigation.
      // Individual hooks that need fresher data (e.g. tasks) override this.
      staleTime: 30_000,

      // Keep unused query data in cache for 5 minutes before garbage-collecting.
      // Restoring a cached page feels instant while background revalidation runs.
      gcTime: 5 * 60_000,
    }
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
