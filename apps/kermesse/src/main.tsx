import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { AuthProvider } from '@agpe/shared/auth/AuthProvider'
import { AppRoutes } from '@/router'
import { Toaster } from '@/components/ui/sonner'
import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Élément racine #root introuvable.')
}

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
      <Toaster />
    </AuthProvider>
  </StrictMode>,
)
