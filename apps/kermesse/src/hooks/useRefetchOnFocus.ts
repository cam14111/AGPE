import { useEffect, useRef } from 'react'

// Relance un rafraîchissement quand l'utilisateur revient sur l'onglet
// (sur mobile : retour depuis une autre app). Les places restantes affichées
// peuvent être périmées après plusieurs minutes d'inactivité ; ce hook évite
// de laisser un bénévole agir sur des données obsolètes.
export function useRefetchOnFocus(refetch: () => void): void {
  const refetchRef = useRef(refetch)
  refetchRef.current = refetch

  useEffect(() => {
    function handleVisibilityChange(): void {
      if (document.visibilityState === 'visible') {
        refetchRef.current()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])
}
