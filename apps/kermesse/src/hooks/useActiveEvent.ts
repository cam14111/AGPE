import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@agpe/shared/supabase-client'
import type { Tables } from '@agpe/shared/types/supabase'

export type KermesseEvent = Tables<'kermesse_events'>

interface UseActiveEventResult {
  event: KermesseEvent | null
  loading: boolean
  error: string | null
  refetch: () => void
}

// Récupère l'unique événement actif (is_active = TRUE). Null si aucun.
export function useActiveEvent(): UseActiveEventResult {
  const [event, setEvent] = useState<KermesseEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvent = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('kermesse_events')
      .select('*')
      .eq('is_active', true)
      .maybeSingle()

    if (err) {
      setError(err.message)
      setEvent(null)
    } else {
      setEvent(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void fetchEvent()
  }, [fetchEvent])

  return { event, loading, error, refetch: fetchEvent }
}
