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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: number
          threshold_danger: number
          threshold_success: number
          threshold_warning: number
          updated_at: string
        }
        Insert: {
          id?: number
          threshold_danger?: number
          threshold_success?: number
          threshold_warning?: number
          updated_at?: string
        }
        Update: {
          id?: number
          threshold_danger?: number
          threshold_success?: number
          threshold_warning?: number
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          payload: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          payload?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          payload?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      franchises: {
        Row: {
          city: string | null
          code: string
          created_at: string
          id: string
          is_demo: boolean
          name: string
          opened_at: string | null
          state: string | null
          status: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          code: string
          created_at?: string
          id?: string
          is_demo?: boolean
          name: string
          opened_at?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          code?: string
          created_at?: string
          id?: string
          is_demo?: boolean
          name?: string
          opened_at?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      indicator_entries: {
        Row: {
          actual_value: number
          comment: string | null
          created_at: string
          franchise_id: string | null
          id: string
          indicator_id: string
          is_demo: boolean
          justification: string | null
          period_end: string
          period_start: string
          revision_number: number
          sector_id: string | null
          status: Database["public"]["Enums"]["entry_status"]
          submitted_at: string | null
          target_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          actual_value: number
          comment?: string | null
          created_at?: string
          franchise_id?: string | null
          id?: string
          indicator_id: string
          is_demo?: boolean
          justification?: string | null
          period_end: string
          period_start: string
          revision_number?: number
          sector_id?: string | null
          status?: Database["public"]["Enums"]["entry_status"]
          submitted_at?: string | null
          target_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          actual_value?: number
          comment?: string | null
          created_at?: string
          franchise_id?: string | null
          id?: string
          indicator_id?: string
          is_demo?: boolean
          justification?: string | null
          period_end?: string
          period_start?: string
          revision_number?: number
          sector_id?: string | null
          status?: Database["public"]["Enums"]["entry_status"]
          submitted_at?: string | null
          target_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "indicator_entries_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicator_entries_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicator_entries_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicator_entries_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "targets"
            referencedColumns: ["id"]
          },
        ]
      }
      indicators: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          critical_threshold: number | null
          default_target: number | null
          description: string | null
          direction: Database["public"]["Enums"]["indicator_direction"]
          formula: string | null
          franchise_id: string | null
          id: string
          instructions: string | null
          is_demo: boolean
          maximum_value: number | null
          minimum_value: number | null
          name: string
          objective: string | null
          owner_sector_id: string | null
          periodicity: Database["public"]["Enums"]["periodicity"]
          responsible_user_id: string | null
          scope: Database["public"]["Enums"]["indicator_scope"]
          start_date: string | null
          status: Database["public"]["Enums"]["indicator_status"]
          strategic_pillar: string | null
          updated_at: string
          value_type: Database["public"]["Enums"]["value_type"]
          warning_threshold: number | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          critical_threshold?: number | null
          default_target?: number | null
          description?: string | null
          direction?: Database["public"]["Enums"]["indicator_direction"]
          formula?: string | null
          franchise_id?: string | null
          id?: string
          instructions?: string | null
          is_demo?: boolean
          maximum_value?: number | null
          minimum_value?: number | null
          name: string
          objective?: string | null
          owner_sector_id?: string | null
          periodicity?: Database["public"]["Enums"]["periodicity"]
          responsible_user_id?: string | null
          scope?: Database["public"]["Enums"]["indicator_scope"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["indicator_status"]
          strategic_pillar?: string | null
          updated_at?: string
          value_type?: Database["public"]["Enums"]["value_type"]
          warning_threshold?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          critical_threshold?: number | null
          default_target?: number | null
          description?: string | null
          direction?: Database["public"]["Enums"]["indicator_direction"]
          formula?: string | null
          franchise_id?: string | null
          id?: string
          instructions?: string | null
          is_demo?: boolean
          maximum_value?: number | null
          minimum_value?: number | null
          name?: string
          objective?: string | null
          owner_sector_id?: string | null
          periodicity?: Database["public"]["Enums"]["periodicity"]
          responsible_user_id?: string | null
          scope?: Database["public"]["Enums"]["indicator_scope"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["indicator_status"]
          strategic_pillar?: string | null
          updated_at?: string
          value_type?: Database["public"]["Enums"]["value_type"]
          warning_threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "indicators_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicators_owner_sector_id_fkey"
            columns: ["owner_sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      integer_rounding_log: {
        Row: {
          created_at: string
          field_name: string
          id: string
          new_value: number
          old_value: number
          record_id: string
          table_name: string
        }
        Insert: {
          created_at?: string
          field_name: string
          id?: string
          new_value: number
          old_value: number
          record_id: string
          table_name: string
        }
        Update: {
          created_at?: string
          field_name?: string
          id?: string
          new_value?: number
          old_value?: number
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_demo: boolean
          status: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          is_demo?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_demo?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      sectors: {
        Row: {
          code: string
          color: string
          created_at: string
          description: string | null
          id: string
          is_demo: boolean
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      targets: {
        Row: {
          created_at: string
          created_by: string | null
          franchise_id: string | null
          id: string
          indicator_id: string
          is_demo: boolean
          max_value: number | null
          min_value: number | null
          period_end: string
          period_start: string
          sector_id: string | null
          target_value: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          franchise_id?: string | null
          id?: string
          indicator_id: string
          is_demo?: boolean
          max_value?: number | null
          min_value?: number | null
          period_end: string
          period_start: string
          sector_id?: string | null
          target_value: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          franchise_id?: string | null
          id?: string
          indicator_id?: string
          is_demo?: boolean
          max_value?: number | null
          min_value?: number | null
          period_end?: string
          period_start?: string
          sector_id?: string | null
          target_value?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "targets_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "targets_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "targets_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      user_franchises: {
        Row: {
          created_at: string
          franchise_id: string
          id: string
          role: Database["public"]["Enums"]["franchise_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          franchise_id: string
          id?: string
          role?: Database["public"]["Enums"]["franchise_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          franchise_id?: string
          id?: string
          role?: Database["public"]["Enums"]["franchise_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_franchises_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sectors: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["sector_role"]
          sector_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["sector_role"]
          sector_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["sector_role"]
          sector_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sectors_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clear_demo_data: { Args: never; Returns: undefined }
      log_audit: {
        Args: {
          _action: string
          _entity_id: string
          _entity_type: string
          _payload: Json
        }
        Returns: undefined
      }
      seed_demo_data: { Args: never; Returns: undefined }
      value_type_requires_integer: {
        Args: { _vt: Database["public"]["Enums"]["value_type"] }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "superadmin"
        | "admin_corporativo"
        | "gestor_setor"
        | "gestor_franquia"
        | "analista"
        | "colaborador"
        | "franqueado"
        | "auditor"
      entry_status: "rascunho" | "registrado" | "atrasado"
      franchise_role: "franqueado" | "gestor" | "operador" | "leitor"
      indicator_direction:
        | "maior_melhor"
        | "menor_melhor"
        | "faixa_ideal"
        | "meta_exata"
      indicator_scope: "corporativo" | "setor" | "franquia"
      indicator_status: "rascunho" | "ativo" | "pausado" | "arquivado"
      periodicity:
        | "diaria"
        | "semanal"
        | "mensal"
        | "trimestral"
        | "semestral"
        | "anual"
      sector_role: "gestor" | "analista" | "colaborador" | "leitor"
      value_type: "inteiro" | "decimal" | "percentual" | "moeda"
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
  public: {
    Enums: {
      app_role: [
        "superadmin",
        "admin_corporativo",
        "gestor_setor",
        "gestor_franquia",
        "analista",
        "colaborador",
        "franqueado",
        "auditor",
      ],
      entry_status: ["rascunho", "registrado", "atrasado"],
      franchise_role: ["franqueado", "gestor", "operador", "leitor"],
      indicator_direction: [
        "maior_melhor",
        "menor_melhor",
        "faixa_ideal",
        "meta_exata",
      ],
      indicator_scope: ["corporativo", "setor", "franquia"],
      indicator_status: ["rascunho", "ativo", "pausado", "arquivado"],
      periodicity: [
        "diaria",
        "semanal",
        "mensal",
        "trimestral",
        "semestral",
        "anual",
      ],
      sector_role: ["gestor", "analista", "colaborador", "leitor"],
      value_type: ["inteiro", "decimal", "percentual", "moeda"],
    },
  },
} as const
