import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@agpe/shared/supabase-client'

// Membre listé pour la gestion des rôles.
export interface Member {
  userId: string
  email: string | null
  firstName: string | null
  lastName: string | null
  role: 'admin' | 'volunteer' | null
}

interface UseMembersResult {
  members: Member[]
  adminCount: number
  loading: boolean
  error: string | null
  refetch: () => void
  setRole: (userId: string, role: 'admin' | 'volunteer') => Promise<boolean>
}

// Liste des membres + actions de promotion / rétrogradation (admin uniquement).
export function useMembers(): UseMembersResult {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMembers = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase.rpc('kermesse_admin_list_members')
    if (err) {
      setError(err.message)
      setMembers([])
    } else {
      setMembers(
        (data ?? []).map((row) => ({
          userId: row.user_id,
          email: row.email,
          firstName: row.first_name,
          lastName: row.last_name,
          role: row.role,
        })),
      )
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void fetchMembers()
  }, [fetchMembers])

  const setRole = useCallback(
    async (userId: string, role: 'admin' | 'volunteer'): Promise<boolean> => {
      const { error: err } = await supabase.rpc('kermesse_admin_set_role', {
        p_user_id: userId,
        p_role: role,
      })
      if (err) {
        // Message métier renvoyé par la fonction (ex. dernier admin).
        if (err.message.includes('au moins un administrateur')) {
          toast.error('Il doit rester au moins un administrateur.')
        } else {
          toast.error('Impossible de modifier le rôle.')
          console.error('[kermesse] setRole error:', err)
        }
        return false
      }
      toast.success(
        role === 'admin'
          ? 'Administrateur ajouté.'
          : 'Administrateur rétrogradé en bénévole.',
      )
      await fetchMembers()
      return true
    },
    [fetchMembers],
  )

  const adminCount = members.filter((m) => m.role === 'admin').length

  return { members, adminCount, loading, error, refetch: fetchMembers, setRole }
}
