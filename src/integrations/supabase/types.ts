export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      transport_cleanup_runs: {
        Row: {
          deleted_courses: number
          deleted_requests: number
          error_code: string | null
          finished_at: string | null
          local_date: string
          started_at: string
          status: string
        }
        Insert: {
          deleted_courses?: number
          deleted_requests?: number
          error_code?: string | null
          finished_at?: string | null
          local_date: string
          started_at: string
          status: string
        }
        Update: {
          deleted_courses?: number
          deleted_requests?: number
          error_code?: string | null
          finished_at?: string | null
          local_date?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      transport_course_cache: {
        Row: {
          brigade: string | null
          carrier: string
          direction: string
          ends_at: string
          evidence: string
          expires_at: string
          fetched_at: string
          id: string
          line: string
          service_date: string
          source_url: string
          starts_at: string
          vehicle: string
        }
        Insert: {
          brigade?: string | null
          carrier: string
          direction: string
          ends_at: string
          evidence: string
          expires_at?: string
          fetched_at?: string
          id?: string
          line: string
          service_date: string
          source_url: string
          starts_at: string
          vehicle: string
        }
        Update: {
          brigade?: string | null
          carrier?: string
          direction?: string
          ends_at?: string
          evidence?: string
          expires_at?: string
          fetched_at?: string
          id?: string
          line?: string
          service_date?: string
          source_url?: string
          starts_at?: string
          vehicle?: string
        }
        Relationships: []
      }
      transport_lookup_requests: {
        Row: {
          failures: number
          lease_until: string
          request_key: string
          retry_after: string
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          failures?: number
          lease_until: string
          request_key: string
          retry_after: string
          status: string
          token: string
          updated_at?: string
        }
        Update: {
          failures?: number
          lease_until?: string
          request_key?: string
          retry_after?: string
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      transport_request_budget: {
        Row: {
          bucket: string
          used: number
          window_start: string
        }
        Insert: {
          bucket: string
          used: number
          window_start: string
        }
        Update: {
          bucket?: string
          used?: number
          window_start?: string
        }
        Relationships: []
      }
      transport_source_cache: {
        Row: {
          expires_at: string
          fetched_at: string
          payload: Json
          source_key: string
        }
        Insert: {
          expires_at?: string
          fetched_at?: string
          payload: Json
          source_key: string
        }
        Update: {
          expires_at?: string
          fetched_at?: string
          payload?: Json
          source_key?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      transport_claim: { Args: { p_key: string }; Returns: Json }
      transport_cleanup: { Args: { p_at?: string }; Returns: Json }
      transport_finish: {
        Args: {
          p_courses?: Json
          p_key: string
          p_status: string
          p_token: string
        }
        Returns: boolean
      }
      transport_next_noon: { Args: { p_at: string }; Returns: string }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
