import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@agpe/shared/supabase-client'
import type { StandWithSlots } from '@/lib/domain'

interface UseStandsResult {
  stands: StandWithSlots[]
  loading: boolean
  error: string | null
  refetch: () => void
}

// Stands de l'événement + créneaux imbriqués, triés par nom puis heure.
export function useStands(eventId: string | null): UseStandsResult {
  const [stands, setStands] = useState<StandWithSlots[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStands = useCallback(async (): Promise<void> => {
    if (!eventId) {
      setStands([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('kermesse_stands')
      .select('*, kermesse_slots(*)')
      .eq('event_id', eventId)
      .order('name', { ascending: true })

    if (err) {
      setError(err.message)
      setStands([])
    } else {
      const sorted = (data ?? []).map((stand) => ({
        ...stand,
        kermesse_slots: [...stand.kermesse_slots].sort((a, b) => {
          const dateCmp = (a.date ?? '').localeCompare(b.date ?? '')
          if (dateCmp !== 0) return dateCmp
          return a.start_time.localeCompare(b.start_time)
        }),
      }))
      setStands(sorted)
    }
    setLoading(false)
  }, [eventId])

  useEffect(() => {
    void fetchStands()
  }, [fetchStands])

  return { stands, loading, error, refetch: fetchStands }
}
