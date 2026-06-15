// Types métier dérivés du schéma Supabase.
import type { Tables } from '@agpe/shared/types/supabase'

export type EventRow = Tables<'kermesse_events'>
export type EventDayScheduleRow = Tables<'kermesse_event_day_schedules'>
export type StandRow = Tables<'kermesse_stands'>
export type StandDayRow = Tables<'kermesse_stand_days'>
export type SlotRow = Tables<'kermesse_slots'>
export type SignupRow = Tables<'kermesse_signups'>

// Stand avec ses créneaux et jours d'ouverture imbriqués
// (requête select '*, kermesse_slots(*), kermesse_stand_days(date)').
export interface StandWithSlots extends StandRow {
  kermesse_slots: SlotRow[]
  kermesse_stand_days: { date: string }[]
}

// Jours d'ouverture d'un stand, triés par ordre chronologique.
export function standOpenDays(stand: StandWithSlots): string[] {
  return [...(stand.kermesse_stand_days ?? [])]
    .map((d) => d.date)
    .sort((a, b) => a.localeCompare(b))
}

export type SignupStatus = 'reserved' | 'replacement'

// Taux de remplissage normalisé, indexé par slot_id.
export interface FillRate {
  currentCount: number
  maxVolunteers: number
  remaining: number
  isFull: boolean
  replacementCount: number
}
