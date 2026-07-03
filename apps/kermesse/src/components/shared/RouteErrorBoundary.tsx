import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface RouteErrorBoundaryProps {
  children: ReactNode
}

interface RouteErrorBoundaryState {
  hasError: boolean
}

// Filet de sécurité du routeur : si le chargement d'une page à la demande
// échoue (cas typique : onglet resté ouvert pendant un redéploiement — les
// fichiers hachés de l'ancienne version n'existent plus sur GitHub Pages),
// on propose de recharger la page au lieu de laisser un écran blanc.
export class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): RouteErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: unknown): void {
    console.error('[kermesse] erreur de chargement de page:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh flex flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-slate-600">
            Une mise à jour de l'application est disponible.
          </p>
          <Button onClick={() => window.location.reload()}>
            Recharger la page
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
