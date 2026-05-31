import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import { TRPCProvider } from "@/providers/trpc"
import { ApiProvider } from "@/providers/ApiProvider"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ApiProvider>
          <TRPCProvider>
            <App />
          </TRPCProvider>
        </ApiProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
