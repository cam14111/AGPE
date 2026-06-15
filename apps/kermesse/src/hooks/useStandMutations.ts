import { useCallback } from 'react'
import { toast } from 'sonner'
import { supabase } from '@agpe/shared/supabase-client'
import type { TablesInsert, TablesUpdate } from '@agpe/shared/types/supabase'

interface UseStandMutationsResult {
  createStand: (input: TablesInsert<'kermesse_stands'>) => Promise<string | null>
  updateStand: (
    id: string,
    input: TablesUpdate<'kermesse_stands'>,
  ) => Promise<boolean>
  deleteStand: (id: string) => Promise<boolean>
}

// Mutations CRUD des stands (admin).
export function useStandMutations(
  onChange: () => void,
): UseStandMutationsResult {
  const createStand = useCallback(
    async (input: TablesInsert<'kermesse_stands'>): Promise<string | null> => {
      const { data, error } = await supabase
        .from('kermesse_stands')
        .insert(input)
        .select('id')
        .single()
      if (error) {
        toast.error('Impossible de créer le stand.')
        console.error('[kermesse] createStand error:', error)
        return null
      }
      toast.success('Enregistré avec succès.')
      onChange()
      return data.id
    },
    [onChange],
  )

  const updateStand = useCallback(
    async (
      id: string,
      input: TablesUpdate<'kermesse_stands'>,
    ): Promise<boolean> => {
      const { error } = await supabase
        .from('kermesse_stands')
        .update(input)
        .eq('id', id)
      if (error) {
        toast.error('Impossible de modifier le stand.')
        console.error('[kermesse] updateStand error:', error)
        return false
      }
      toast.success('Enregistré avec succès.')
      onChange()
      return true
    },
    [onChange],
  )

  const deleteStand = useCallback(
    async (id: string): Promise<boolean> => {
      const { error } = await supabase
        .from('kermesse_stands')
        .delete()
        .eq('id', id)
      if (error) {
        toast.error('Impossible de supprimer le stand.')
        console.error('[kermesse] deleteStand error:', error)
        return false
      }
      toast.success('Supprimé.')
      onChange()
      return true
    },
    [onChange],
  )

  return { createStand, updateStand, deleteStand }
}
