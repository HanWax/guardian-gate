export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      children: {
        Row: {
          created_at: string | null
          id: string
          name: string
          nursery_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          nursery_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          nursery_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_nursery_id_fkey"
            columns: ["nursery_id"]
            isOneToOne: false
            referencedRelation: "nurseries"
            referencedColumns: ["id"]
          },
        ]
      }
      children_parents: {
        Row: {
          child_id: string
          parent_id: string
        }
        Insert: {
          child_id: string
          parent_id: string
        }
        Update: {
          child_id?: string
          parent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_parents_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "children_parents_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_state: {
        Row: {
          current_child_index: number | null
          id: string
          parent_id: string
          state: string | null
          updated_at: string | null
          verification_attempts: number | null
        }
        Insert: {
          current_child_index?: number | null
          id?: string
          parent_id: string
          state?: string | null
          updated_at?: string | null
          verification_attempts?: number | null
        }
        Update: {
          current_child_index?: number | null
          id?: string
          parent_id?: string
          state?: string | null
          updated_at?: string | null
          verification_attempts?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_state_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_attendance: {
        Row: {
          child_id: string
          created_at: string | null
          date: string
          id: string
          inconsistency: boolean | null
          inconsistency_resolution: string | null
          inconsistency_resolved: boolean | null
          inconsistency_resolved_at: string | null
          inconsistency_resolved_by: string | null
          inconsistency_type: string | null
          nine_am_alert_sent: boolean | null
          nine_am_explanation: string | null
          nine_am_parent_response: string | null
          parent_explanation: string | null
          parent_response: string | null
          parent_response_time: string | null
          teacher_confirmed: boolean | null
          teacher_confirmed_by: string | null
          teacher_confirmed_time: string | null
        }
        Insert: {
          child_id: string
          created_at?: string | null
          date: string
          id?: string
          inconsistency?: boolean | null
          inconsistency_resolution?: string | null
          inconsistency_resolved?: boolean | null
          inconsistency_resolved_at?: string | null
          inconsistency_resolved_by?: string | null
          inconsistency_type?: string | null
          nine_am_alert_sent?: boolean | null
          nine_am_explanation?: string | null
          nine_am_parent_response?: string | null
          parent_explanation?: string | null
          parent_response?: string | null
          parent_response_time?: string | null
          teacher_confirmed?: boolean | null
          teacher_confirmed_by?: string | null
          teacher_confirmed_time?: string | null
        }
        Update: {
          child_id?: string
          created_at?: string | null
          date?: string
          id?: string
          inconsistency?: boolean | null
          inconsistency_resolution?: string | null
          inconsistency_resolved?: boolean | null
          inconsistency_resolved_at?: string | null
          inconsistency_resolved_by?: string | null
          inconsistency_type?: string | null
          nine_am_alert_sent?: boolean | null
          nine_am_explanation?: string | null
          nine_am_parent_response?: string | null
          parent_explanation?: string | null
          parent_response?: string | null
          parent_response_time?: string | null
          teacher_confirmed?: boolean | null
          teacher_confirmed_by?: string | null
          teacher_confirmed_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_attendance_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_attendance_teacher_confirmed_by_fkey"
            columns: ["teacher_confirmed_by"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      managers: {
        Row: {
          created_at: string | null
          id: string
          name: string
          nursery_id: string
          phone: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          nursery_id: string
          phone: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          nursery_id?: string
          phone?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "managers_nursery_id_fkey"
            columns: ["nursery_id"]
            isOneToOne: false
            referencedRelation: "nurseries"
            referencedColumns: ["id"]
          },
        ]
      }
      nurseries: {
        Row: {
          created_at: string | null
          dropoff_end: string
          dropoff_start: string
          first_message_time: string
          id: string
          name: string
          second_ping_time: string
          timezone: string | null
        }
        Insert: {
          created_at?: string | null
          dropoff_end: string
          dropoff_start: string
          first_message_time: string
          id?: string
          name: string
          second_ping_time: string
          timezone?: string | null
        }
        Update: {
          created_at?: string | null
          dropoff_end?: string
          dropoff_start?: string
          first_message_time?: string
          id?: string
          name?: string
          second_ping_time?: string
          timezone?: string | null
        }
        Relationships: []
      }
      parents: {
        Row: {
          created_at: string | null
          id: string
          name: string
          phone: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          phone: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          phone?: string
        }
        Relationships: []
      }
      teachers: {
        Row: {
          created_at: string | null
          id: string
          name: string
          nursery_id: string
          phone: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          nursery_id: string
          phone: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          nursery_id?: string
          phone?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_nursery_id_fkey"
            columns: ["nursery_id"]
            isOneToOne: false
            referencedRelation: "nurseries"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_manager_nursery_id: { Args: never; Returns: string }
      get_teacher_nursery_id: { Args: never; Returns: string }
      get_user_role: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

