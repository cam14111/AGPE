import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@agpe/shared/supabase-client'
import type { TablesInsert, TablesUpdate } from '@agpe/shared/types/supabase'
import type { EventRow } from '@/lib/domain'

interface UseEventsResult {
  events: EventRow[]
  loading: boolean
  error: string | null
  refetch: () => void
  createEvent: (input: TablesInsert<'kermesse_events'>) => Promise<string | null>
  updateEvent: (
    id: string,
    input: TablesUpdate<'kermesse_events'>,
  ) => Promise<boolean>
  deleteEvent: (id: string) => Promise<boolean>
  activateEvent: (id: string) => Promise<boolean>
}

// Gestion des événements (admin) : liste + CRUD + activation exclusive.
export function useEvents(): UseEventsResult {
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('kermesse_events')
      .select('*')
      .order('start_date', { ascending: false })

    if (err) {
      setError(err.message)
      setEvents([])
    } else {
      setEvents(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void fetchEvents()
  }, [fetchEvents])

  const createEvent = useCallback(
    async (input: TablesInsert<'kermesse_events'>): Promise<string | null> => {
      const { data, error: err } = await supabase
        .from('kermesse_events')
        .insert(input)
        .select('id')
        .single()
      if (err) {
        toast.error('Impossible de créer l\'événement.')
        console.error('[kermesse] createEvent error:', err)
        return null
      }
      toast.success('Enregistré avec succès.')
      await fetchEvents()
      return data.id
    },
    [fetchEvents],
  )

  const updateEvent = useCallback(
    async (
      id: string,
      input: TablesUpdate<'kermesse_events'>,
    ): Promise<boolean> => {
      const { error: err } = await supabase
        .from('kermesse_events')
        .update(input)
        .eq('id', id)
      if (err) {
        toast.error('Impossible de modifier l\'événement.')
        console.error('[kermesse] updateEvent error:', err)
        return false
      }
      toast.success('Enregistré avec succès.')
      await fetchEvents()
      return true
    },
    [fetchEvents],
  )

  const deleteEvent = useCallback(
    async (id: string): Promise<boolean> => {
      const { error: err } = await supabase
        .from('kermesse_events')
        .delete()
        .eq('id', id)
      if (err) {
        toast.error('Impossible de supprimer l\'événement.')
        console.error('[kermesse] deleteEvent error:', err)
        return false
      }
      toast.success('Supprimé.')
      await fetchEvents()
      return true
    },
    [fetchEvents],
  )

  // Active une édition en désactivant d'abord toutes les autres
  // (respecte l'index partiel : un seul is_active = TRUE à la fois).
  const activateEvent = useCallback(
    async (id: string): Promise<boolean> => {
      const { error: deactivateErr } = await supabase
        .from('kermesse_events')
        .update({ is_active: false })
        .eq('is_active', true)
        .neq('id', id)
      if (deactivateErr) {
        toast.error('Impossible de mettre à jour les éditions actives.')
        console.error('[kermesse] deactivate error:', deactivateErr)
        return false
      }
      const { error: activateErr } = await supabase
        .from('kermesse_events')
        .update({ is_active: true })
        .eq('id', id)
      if (activateErr) {
        toast.error('Impossible d\'activer cette édition.')
        console.error('[kermesse] activate error:', activateErr)
        return false
      }
      toast.success('Édition activée.')
      await fetchEvents()
      return true
    },
    [fetchEvents],
  )

  return {
    events,
    loading,
    error,
    refetch: fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    activateEvent,
  }
}
