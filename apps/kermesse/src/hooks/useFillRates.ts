import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@agpe/shared/supabase-client'
import type { FillRate } from '@/lib/domain'

interface UseFillRatesResult {
  fillRates: Record<string, FillRate>
  loading: boolean
  error: string | null
  refetch: () => void
}

// Taux de remplissage de tous les créneaux, indexés par slot_id.
// Appel de la fonction RPC kermesse_slot_fill_rate (compteurs globaux, sans données perso).
export function useFillRates(): UseFillRatesResult {
  const [fillRates, setFillRates] = useState<Record<string, FillRate>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFillRates = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase.rpc('kermesse_slot_fill_rate')

    if (err) {
      setError(err.message)
      setFillRates({})
    } else {
      const map: Record<string, FillRate> = {}
      for (const row of data ?? []) {
        if (!row.slot_id) continue
        map[row.slot_id] = {
          currentCount: row.current_count ?? 0,
          maxVolunteers: row.max_volunteers ?? 0,
          remaining: row.remaining ?? 0,
          isFull: row.is_full ?? false,
          replacementCount: row.replacement_count ?? 0,
        }
      }
      setFillRates(map)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void fetchFillRates()
  }, [fetchFillRates])

  return { fillRates, loading, error, refetch: fetchFillRates }
}
