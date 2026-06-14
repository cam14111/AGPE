import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@agpe/shared/supabase-client'
import { useAuth } from '@agpe/shared/auth/useAuth'
import type { Tables } from '@agpe/shared/types/supabase'

export type Profile = Tables<'agpe_users_profile'>

export interface ProfileInput {
  first_name: string
  last_name: string
  phone: string
  child_class: string
}

interface UseProfileResult {
  profile: Profile | null
  loading: boolean
  error: string | null
  isComplete: boolean
  refetch: () => void
  saveProfile: (input: ProfileInput) => Promise<boolean>
}

// Profil AGPE optionnel de l'utilisateur courant + sauvegarde (upsert).
export function useProfile(): UseProfileResult {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async (): Promise<void> => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('agpe_users_profile')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (err) {
      setError(err.message)
      setProfile(null)
    } else {
      setProfile(data)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    void fetchProfile()
  }, [fetchProfile])

  const saveProfile = useCallback(
    async (input: ProfileInput): Promise<boolean> => {
      if (!user) return false
      const { error: err } = await supabase
        .from('agpe_users_profile')
        .upsert(
          {
            user_id: user.id,
            first_name: input.first_name || null,
            last_name: input.last_name || null,
            phone: input.phone || null,
            child_class: input.child_class || null,
          },
          { onConflict: 'user_id' },
        )
      if (err) {
        toast.error('Impossible d\'enregistrer le profil.')
        console.error('[kermesse] saveProfile error:', err)
        return false
      }
      toast.success('Profil enregistré.')
      await fetchProfile()
      return true
    },
    [user, fetchProfile],
  )

  const isComplete = Boolean(profile?.first_name && profile.first_name.trim())

  return { profile, loading, error, isComplete, refetch: fetchProfile, saveProfile }
}
