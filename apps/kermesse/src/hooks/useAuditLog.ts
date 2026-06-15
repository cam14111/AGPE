import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@agpe/shared/supabase-client'
import type { Tables } from '@agpe/shared/types/supabase'

export type AuditEntry = Tables<'kermesse_signup_audit'>

interface UseAuditLogResult {
  entries: AuditEntry[]
  loading: boolean
  error: string | null
  refetch: () => void
  reset: () => Promise<boolean>
}

// Historique des actions d'inscription pour un événement (admin uniquement).
export function useAuditLog(eventId: string | null): UseAuditLogResult {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEntries = useCallback(async (): Promise<void> => {
    if (!eventId) {
      setEntries([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('kermesse_signup_audit')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    if (err) {
      setError(err.message)
      setEntries([])
    } else {
      setEntries(data ?? [])
    }
    setLoading(false)
  }, [eventId])

  useEffect(() => {
    void fetchEntries()
  }, [fetchEntries])

  // Purge définitive de l'historique de l'événement (RLS : admin uniquement).
  const reset = useCallback(async (): Promise<boolean> => {
    if (!eventId) return false
    const { error: err } = await supabase
      .from('kermesse_signup_audit')
      .delete()
      .eq('event_id', eventId)
    if (err) {
      toast.error('Impossible de réinitialiser l\'historique.')
      console.error('[kermesse] reset audit error:', err)
      return false
    }
    toast.success('Historique réinitialisé.')
    await fetchEntries()
    return true
  }, [eventId, fetchEntries])

  return { entries, loading, error, refetch: fetchEntries, reset }
}
