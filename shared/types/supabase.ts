// Types de la base de données Supabase — projet AGPE.
//
// ⚠️ Ce fichier est normalement GÉNÉRÉ automatiquement. Après toute modification
// du schéma, le régénérer (cf. CODING_GUIDELINES §1 et SETUP_CHECKLIST §5) :
//
//   pnpm supabase gen types typescript --project-id <project-id> \
//     > shared/types/supabase.ts
//
// La version ci-dessous est une définition manuelle fidèle aux migrations
// 0001 → 0018.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      agpe_users_profile: {
        Row: {
          id: string
          user_id: string
          first_name: string | null
          last_name: string | null
          phone: string | null
          child_class: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          child_class?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          child_class?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      kermesse_events: {
        Row: {
          id: string
          name: string
          date: string
          start_date: string
          end_date: string
          location: string | null
          description: string | null
          start_time: string | null
          end_time: string | null
          is_active: boolean
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          date?: string
          start_date: string
          end_date: string
          location?: string | null
          description?: string | null
          start_time?: string | null
          end_time?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          date?: string
          start_date?: string
          end_date?: string
          location?: string | null
          description?: string | null
          start_time?: string | null
          end_time?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      kermesse_event_day_schedules: {
        Row: {
          id: string
          event_id: string
          date: string
          open_time: string
          close_time: string
          created_at: string | null
        }
        Insert: {
          id?: string
          event_id: string
          date: string
          open_time: string
          close_time: string
          created_at?: string | null
        }
        Update: {
          id?: string
          event_id?: string
          date?: string
          open_time?: string
          close_time?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'kermesse_event_day_schedules_event_id_fkey'
            columns: ['event_id']
            referencedRelation: 'kermesse_events'
            referencedColumns: ['id']
          },
        ]
      }
      kermesse_stands: {
        Row: {
          id: string
          event_id: string
          name: string
          date: string | null
          description: string | null
          location_detail: string | null
          emoji: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          event_id: string
          name: string
          date?: string | null
          description?: string | null
          location_detail?: string | null
          emoji?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          event_id?: string
          name?: string
          date?: string | null
          description?: string | null
          location_detail?: string | null
          emoji?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'kermesse_stands_event_id_fkey'
            columns: ['event_id']
            referencedRelation: 'kermesse_events'
            referencedColumns: ['id']
          },
        ]
      }
      kermesse_slots: {
        Row: {
          id: string
          stand_id: string
          date: string | null
          start_time: string
          end_time: string
          max_volunteers: number
          created_at: string | null
        }
        Insert: {
          id?: string
          stand_id: string
          date?: string | null
          start_time: string
          end_time: string
          max_volunteers?: number
          created_at?: string | null
        }
        Update: {
          id?: string
          stand_id?: string
          date?: string | null
          start_time?: string
          end_time?: string
          max_volunteers?: number
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'kermesse_slots_stand_id_fkey'
            columns: ['stand_id']
            referencedRelation: 'kermesse_stands'
            referencedColumns: ['id']
          },
        ]
      }
      kermesse_signups: {
        Row: {
          id: string
          slot_id: string
          user_id: string
          status: 'reserved' | 'replacement'
          created_at: string | null
        }
        Insert: {
          id?: string
          slot_id: string
          user_id: string
          status?: 'reserved' | 'replacement'
          created_at?: string | null
        }
        Update: {
          id?: string
          slot_id?: string
          user_id?: string
          status?: 'reserved' | 'replacement'
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'kermesse_signups_slot_id_fkey'
            columns: ['slot_id']
            referencedRelation: 'kermesse_slots'
            referencedColumns: ['id']
          },
        ]
      }
      kermesse_user_roles: {
        Row: {
          id: string
          user_id: string
          role: 'admin' | 'volunteer'
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          role: 'admin' | 'volunteer'
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'admin' | 'volunteer'
          created_at?: string | null
        }
        Relationships: []
      }
      kermesse_signup_audit: {
        Row: {
          id: string
          event_id: string
          action: 'signup' | 'replacement' | 'unsignup' | 'auto_reserved'
          volunteer_user_id: string | null
          first_name: string | null
          last_name: string | null
          stand_name: string | null
          slot_start: string | null
          slot_end: string | null
          actor_kind: 'self' | 'admin' | 'system'
          actor_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          action: 'signup' | 'replacement' | 'unsignup' | 'auto_reserved'
          volunteer_user_id?: string | null
          first_name?: string | null
          last_name?: string | null
          stand_name?: string | null
          slot_start?: string | null
          slot_end?: string | null
          actor_kind: 'self' | 'admin' | 'system'
          actor_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          action?: 'signup' | 'replacement' | 'unsignup' | 'auto_reserved'
          volunteer_user_id?: string | null
          first_name?: string | null
          last_name?: string | null
          stand_name?: string | null
          slot_start?: string | null
          slot_end?: string | null
          actor_kind?: 'self' | 'admin' | 'system'
          actor_name?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      kermesse_slot_fill_rate: {
        Args: Record<string, never>
        Returns: {
          slot_id: string
          stand_id: string
          start_time: string
          end_time: string
          max_volunteers: number
          current_count: number
          remaining: number
          is_full: boolean
          replacement_count: number
        }[]
      }
      kermesse_bootstrap_admin: {
        Args: { admin_email: string }
        Returns: boolean
      }
      kermesse_ensure_volunteer_role: {
        Args: Record<string, never>
        Returns: string
      }
      kermesse_admin_list_members: {
        Args: Record<string, never>
        Returns: {
          user_id: string
          email: string | null
          first_name: string | null
          last_name: string | null
          role: 'admin' | 'volunteer' | null
        }[]
      }
      kermesse_admin_set_role: {
        Args: { p_user_id: string; p_role: 'admin' | 'volunteer' }
        Returns: undefined
      }
      kermesse_admin_signup_details: {
        Args: { p_event_id: string }
        Returns: {
          signup_id: string
          created_at: string
          user_id: string
          email: string | null
          first_name: string | null
          last_name: string | null
          stand_id: string
          stand_name: string
          slot_id: string
          start_time: string
          end_time: string
          status: 'reserved' | 'replacement'
        }[]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Helpers de lignes — raccourcis utilisés dans l'app.
type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update']
export type Views<T extends keyof PublicSchema['Views']> =
  PublicSchema['Views'][T]['Row']
