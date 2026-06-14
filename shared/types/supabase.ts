export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type TableDefinition<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type UserRole = "admin" | "volunteer";

export interface Database {
  public: {
    Tables: {
      agpe_users_profile: TableDefinition<
        {
          id: string;
          user_id: string;
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
          child_class: string | null;
          created_at: string | null;
        },
        {
          id?: string;
          user_id: string;
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          child_class?: string | null;
          created_at?: string | null;
        }
      >;
      kermesse_events: TableDefinition<
        {
          id: string;
          name: string;
          date: string;
          location: string | null;
          description: string | null;
          start_time: string | null;
          end_time: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string | null;
        },
        {
          id?: string;
          name: string;
          date: string;
          location?: string | null;
          description?: string | null;
          start_time?: string | null;
          end_time?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string | null;
        }
      >;
      kermesse_stands: TableDefinition<
        {
          id: string;
          event_id: string;
          name: string;
          description: string | null;
          location_detail: string | null;
          emoji: string | null;
          created_at: string | null;
        },
        {
          id?: string;
          event_id: string;
          name: string;
          description?: string | null;
          location_detail?: string | null;
          emoji?: string | null;
          created_at?: string | null;
        }
      >;
      kermesse_slots: TableDefinition<
        {
          id: string;
          stand_id: string;
          start_time: string;
          end_time: string;
          max_volunteers: number;
          created_at: string | null;
        },
        {
          id?: string;
          stand_id: string;
          start_time: string;
          end_time: string;
          max_volunteers?: number;
          created_at?: string | null;
        }
      >;
      kermesse_signups: TableDefinition<
        {
          id: string;
          slot_id: string;
          user_id: string;
          created_at: string | null;
        },
        {
          id?: string;
          slot_id: string;
          user_id: string;
          created_at?: string | null;
        }
      >;
      kermesse_user_roles: TableDefinition<
        {
          id: string;
          user_id: string;
          role: UserRole;
          created_at: string | null;
        },
        {
          id?: string;
          user_id: string;
          role: UserRole;
          created_at?: string | null;
        }
      >;
    };
    Views: {
      kermesse_slot_fill_rate: {
        Row: {
          slot_id: string | null;
          stand_id: string | null;
          start_time: string | null;
          end_time: string | null;
          max_volunteers: number | null;
          current_count: number | null;
          remaining: number | null;
          is_full: boolean | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      kermesse_bootstrap_admin: {
        Args: { admin_email: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
