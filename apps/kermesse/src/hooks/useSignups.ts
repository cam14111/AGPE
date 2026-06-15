import { useCallback } from 'react'
import { toast } from 'sonner'
import { supabase } from '@agpe/shared/supabase-client'
import { useAuth } from '@agpe/shared/auth/useAuth'
import type { SignupStatus } from '@/lib/domain'

interface UseSignupsResult {
  signUp: (slotId: string) => Promise<SignupStatus | null>
  unsignUp: (slotId: string) => Promise<boolean>
}

// Actions d'inscription / désinscription, avec mapping des erreurs DB
// vers des messages français lisibles (CODING_GUIDELINES §4).
export function useSignups(): UseSignupsResult {
  const { user } = useAuth()

  const signUp = useCallback(
    async (slotId: string): Promise<SignupStatus | null> => {
      if (!user) {
        toast.error('Vous devez être connecté pour vous inscrire.')
        return null
      }
      const { data, error } = await supabase
        .from('kermesse_signups')
        .insert({ slot_id: slotId, user_id: user.id })
        .select('status')
        .single()

      if (error) {
        if (error.message.includes('Chevauchement')) {
          toast.error(
            'Ce créneau chevauche un autre de vos créneaux. Désinscrivez-vous de l\'autre d\'abord.',
          )
        } else if (error.code === '23505') {
          toast.warning('Vous êtes déjà inscrit sur ce créneau.')
        } else {
          toast.error('Une erreur est survenue. Réessayez dans quelques instants.')
          console.error('[kermesse] signup error:', error)
        }
        return null
      }
      if (data.status === 'replacement') {
        toast.success('Ajouté comme remplaçant ✓')
      } else {
        toast.success('Inscription confirmée ✓')
      }
      return data.status
    },
    [user],
  )

  const unsignUp = useCallback(
    async (slotId: string): Promise<boolean> => {
      if (!user) return false
      const { error } = await supabase
        .from('kermesse_signups')
        .delete()
        .eq('slot_id', slotId)
        .eq('user_id', user.id)

      if (error) {
        toast.error('Impossible de se désinscrire. Réessayez dans quelques instants.')
        console.error('[kermesse] unsignup error:', error)
        return false
      }
      toast.success('Désinscription confirmée')
      return true
    },
    [user],
  )

  return { signUp, unsignUp }
}
