import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@agpe/shared/supabase-client'
import type { EventDayScheduleRow } from '@/lib/domain'

interface UseEventDaySchedulesResult {
  schedules: EventDayScheduleRow[]
  loading: boolean
  upsertSchedule: (
    eventId: string,
    date: string,
    openTime: string,
    closeTime: string,
  ) => Promise<boolean>
  deleteSchedule: (id: string) => Promise<boolean>
}

// Horaires personnalisés par journée pour un événement donné.
export function useEventDaySchedules(eventId: string | null): UseEventDaySchedulesResult {
  const [schedules, setSchedules] = useState<EventDayScheduleRow[]>([])
  const [loading, setLoading] = useState(false)

  const fetchSchedules = useCallback(async (): Promise<void> => {
    if (!eventId) {
      setSchedules([])
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('kermesse_event_day_schedules')
      .select('*')
      .eq('event_id', eventId)
      .order('date', { ascending: true })

    if (!error) setSchedules(data ?? [])
    setLoading(false)
  }, [eventId])

  useEffect(() => {
    void fetchSchedules()
  }, [fetchSchedules])

  const upsertSchedule = useCallback(
    async (
      eid: string,
      date: string,
      openTime: string,
      closeTime: string,
    ): Promise<boolean> => {
      const { error } = await supabase
        .from('kermesse_event_day_schedules')
        .upsert(
          { event_id: eid, date, open_time: openTime, close_time: closeTime },
          { onConflict: 'event_id,date' },
        )
      if (error) {
        toast.error('Impossible de sauvegarder les horaires.')
        console.error('[kermesse] upsertSchedule error:', error)
        return false
      }
      await fetchSchedules()
      return true
    },
    [fetchSchedules],
  )

  const deleteSchedule = useCallback(
    async (id: string): Promise<boolean> => {
      const { error } = await supabase
        .from('kermesse_event_day_schedules')
        .delete()
        .eq('id', id)
      if (error) {
        toast.error('Impossible de supprimer les horaires.')
        console.error('[kermesse] deleteSchedule error:', error)
        return false
      }
      await fetchSchedules()
      return true
    },
    [fetchSchedules],
  )

  return { schedules, loading, upsertSchedule, deleteSchedule }
}
