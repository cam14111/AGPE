import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@agpe/shared/supabase-client'

// Détail d'une inscription tel que renvoyé par la RPC admin.
export interface AdminSignupDetail {
  signup_id: string
  created_at: string
  user_id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  stand_id: string
  stand_name: string
  slot_id: string
  start_time: string
  end_time: string
  status: 'reserved' | 'replacement'
}

interface UseAdminSignupsResult {
  details: AdminSignupDetail[]
  loading: boolean
  error: string | null
  refetch: () => void
  removeSignup: (signupId: string) => Promise<boolean>
}

// Détail complet des inscriptions (email + nom + stand + créneau) via RPC admin.
export function useAdminSignups(eventId: string | null): UseAdminSignupsResult {
  const [details, setDetails] = useState<AdminSignupDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDetails = useCallback(async (): Promise<void> => {
    if (!eventId) {
      setDetails([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase.rpc(
      'kermesse_admin_signup_details',
      { p_event_id: eventId },
    )
    if (err) {
      setError(err.message)
      setDetails([])
    } else {
      setDetails(data ?? [])
    }
    setLoading(false)
  }, [eventId])

  useEffect(() => {
    void fetchDetails()
  }, [fetchDetails])

  // Désinscrit un bénévole d'un créneau (la RLS autorise l'admin à supprimer).
  const removeSignup = useCallback(
    async (signupId: string): Promise<boolean> => {
      const { error: err } = await supabase
        .from('kermesse_signups')
        .delete()
        .eq('id', signupId)
      if (err) {
        toast.error('Impossible de désinscrire ce bénévole.')
        console.error('[kermesse] removeSignup error:', err)
        return false
      }
      toast.success('Bénévole désinscrit.')
      await fetchDetails()
      return true
    },
    [fetchDetails],
  )

  return { details, loading, error, refetch: fetchDetails, removeSignup }
}
