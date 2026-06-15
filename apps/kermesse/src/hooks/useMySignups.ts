import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@agpe/shared/supabase-client'
import type { SignupStatus } from '@/lib/domain'

// Inscription enrichie de l'utilisateur courant (créneau + stand + événement).
export interface MySignup {
  id: string
  slotId: string
  status: SignupStatus
  createdAt: string | null
  startTime: string
  endTime: string
  slotDate: string
  standName: string
  standEmoji: string | null
  eventName: string
  eventDate: string
  eventEndDate: string
}

interface UseMySignupsResult {
  signups: MySignup[]
  signedUpSlotIds: Set<string>
  statusBySlot: Map<string, SignupStatus>
  loading: boolean
  error: string | null
  refetch: () => void
}

interface RawSignupRow {
  id: string
  slot_id: string
  status: SignupStatus
  created_at: string | null
  kermesse_slots: {
    start_time: string
    end_time: string
    date: string | null
    kermesse_stands: {
      name: string
      emoji: string | null
      kermesse_events: { name: string; date: string; end_date: string } | null
    } | null
  } | null
}

// Récupère les inscriptions de l'utilisateur, regroupables par stand côté UI.
export function useMySignups(userId: string | null): UseMySignupsResult {
  const [signups, setSignups] = useState<MySignup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSignups = useCallback(async (): Promise<void> => {
    if (!userId) {
      setSignups([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('kermesse_signups')
      .select(
        `id, slot_id, status, created_at,
         kermesse_slots (
           start_time, end_time, date,
           kermesse_stands (
             name, emoji,
             kermesse_events ( name, date, end_date )
           )
         )`,
      )
      .eq('user_id', userId)

    if (err) {
      setError(err.message)
      setSignups([])
      setLoading(false)
      return
    }

    const rows = (data ?? []) as unknown as RawSignupRow[]
    const mapped: MySignup[] = rows.map((row) => {
      const slot = row.kermesse_slots
      const stand = slot?.kermesse_stands
      const event = stand?.kermesse_events
      return {
        id: row.id,
        slotId: row.slot_id,
        status: row.status,
        createdAt: row.created_at,
        startTime: slot?.start_time ?? '',
        endTime: slot?.end_time ?? '',
        slotDate: slot?.date ?? '',
        standName: stand?.name ?? 'Stand',
        standEmoji: stand?.emoji ?? null,
        eventName: event?.name ?? '',
        eventDate: event?.date ?? '',
        eventEndDate: event?.end_date ?? '',
      }
    })
    mapped.sort(
      (a, b) =>
        a.standName.localeCompare(b.standName) ||
        a.startTime.localeCompare(b.startTime),
    )
    setSignups(mapped)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void fetchSignups()
  }, [fetchSignups])

  const signedUpSlotIds = new Set(signups.map((s) => s.slotId))
  const statusBySlot = new Map(signups.map((s) => [s.slotId, s.status]))

  return {
    signups,
    signedUpSlotIds,
    statusBySlot,
    loading,
    error,
    refetch: fetchSignups,
  }
}
