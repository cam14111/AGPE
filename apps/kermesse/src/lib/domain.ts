// Types métier dérivés du schéma Supabase.
import type { Tables } from '@agpe/shared/types/supabase'

export type EventRow = Tables<'kermesse_events'>
export type StandRow = Tables<'kermesse_stands'>
export type SlotRow = Tables<'kermesse_slots'>
export type SignupRow = Tables<'kermesse_signups'>

// Stand avec ses créneaux imbriqués (requête select '*, kermesse_slots(*)').
export interface StandWithSlots extends StandRow {
  kermesse_slots: SlotRow[]
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
