import { useCallback } from 'react'
import { toast } from 'sonner'
import { supabase } from '@agpe/shared/supabase-client'
import type { TablesInsert, TablesUpdate } from '@agpe/shared/types/supabase'

interface UseStandMutationsResult {
  createStand: (
    input: TablesInsert<'kermesse_stands'>,
    openDays: string[],
  ) => Promise<string | null>
  updateStand: (
    id: string,
    input: TablesUpdate<'kermesse_stands'>,
    openDays: string[],
  ) => Promise<boolean>
  deleteStand: (id: string) => Promise<boolean>
}

// Plus petite date (= première date d'ouverture) pour la colonne dénormalisée.
function minDate(days: string[]): string | null {
  if (days.length === 0) return null
  return [...days].sort((a, b) => a.localeCompare(b))[0] ?? null
}

// Mutations CRUD des stands (admin) avec gestion des jours d'ouverture.
export function useStandMutations(
  onChange: () => void,
): UseStandMutationsResult {
  const createStand = useCallback(
    async (
      input: TablesInsert<'kermesse_stands'>,
      openDays: string[],
    ): Promise<string | null> => {
      const { data, error } = await supabase
        .from('kermesse_stands')
        .insert({ ...input, date: minDate(openDays) })
        .select('id')
        .single()
      if (error) {
        toast.error('Impossible de créer le stand.')
        console.error('[kermesse] createStand error:', error)
        return null
      }

      if (openDays.length > 0) {
        const { error: daysError } = await supabase
          .from('kermesse_stand_days')
          .insert(openDays.map((date) => ({ stand_id: data.id, date })))
        if (daysError) {
          toast.error('Stand créé, mais erreur sur les dates d\'ouverture.')
          console.error('[kermesse] createStand days error:', daysError)
        }
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
      openDays: string[],
    ): Promise<boolean> => {
      const { error } = await supabase
        .from('kermesse_stands')
        .update({ ...input, date: minDate(openDays) })
        .eq('id', id)
      if (error) {
        toast.error('Impossible de modifier le stand.')
        console.error('[kermesse] updateStand error:', error)
        return false
      }

      // Réconcilie les jours d'ouverture.
      const { data: currentRows } = await supabase
        .from('kermesse_stand_days')
        .select('date')
        .eq('stand_id', id)
      const current = (currentRows ?? []).map((r) => r.date)
      const toAdd = openDays.filter((d) => !current.includes(d))
      const toRemove = current.filter((d) => !openDays.includes(d))

      // Ne retire pas une journée qui porte des créneaux (évite les orphelins).
      let blockedDays: string[] = []
      if (toRemove.length > 0) {
        const { data: slotRows } = await supabase
          .from('kermesse_slots')
          .select('date')
          .eq('stand_id', id)
          .in('date', toRemove)
        blockedDays = [...new Set((slotRows ?? []).map((s) => s.date).filter(Boolean) as string[])]
      }
      const reallyRemove = toRemove.filter((d) => !blockedDays.includes(d))

      if (toAdd.length > 0) {
        await supabase
          .from('kermesse_stand_days')
          .insert(toAdd.map((date) => ({ stand_id: id, date })))
      }
      if (reallyRemove.length > 0) {
        await supabase
          .from('kermesse_stand_days')
          .delete()
          .eq('stand_id', id)
          .in('date', reallyRemove)
      }
      if (blockedDays.length > 0) {
        toast.warning(
          'Certaines journées ont été conservées car des créneaux y existent.',
        )
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
