import { useEffect, useState } from 'react'

// Renvoie l'heure courante, rafraîchie périodiquement (30 s par défaut).
// Utilisé par la vue temps réel pour surligner le créneau en cours.
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}
