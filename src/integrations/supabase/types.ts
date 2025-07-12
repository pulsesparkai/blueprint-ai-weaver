export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      blueprint_sessions: {
        Row: {
          blueprint_id: string
          created_at: string
          expires_at: string
          id: string
          session_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          blueprint_id: string
          created_at?: string
          expires_at: string
          id?: string
          session_data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          blueprint_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          session_data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blueprint_sessions_blueprint_id_fkey"
            columns: ["blueprint_id"]
            isOneToOne: false
            referencedRelation: "blueprints"
            referencedColumns: ["id"]
          },
        ]
      }
      blueprints: {
        Row: {
          created_at: string
          description: string | null
          edges: Json
          id: string
          is_public: boolean | null
          nodes: Json
          thumbnail: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          edges?: Json
          id?: string
          is_public?: boolean | null
          nodes?: Json
          thumbnail?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          edges?: Json
          id?: string
          is_public?: boolean | null
          nodes?: Json
          thumbnail?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blueprints_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      execution_logs: {
        Row: {
          blueprint_id: string
          executed_at: string
          execution_results: Json
          id: string
          input_data: Json
          session_id: string | null
          user_id: string
        }
        Insert: {
          blueprint_id: string
          executed_at?: string
          execution_results?: Json
          id?: string
          input_data?: Json
          session_id?: string | null
          user_id: string
        }
        Update: {
          blueprint_id?: string
          executed_at?: string
          execution_results?: Json
          id?: string
          input_data?: Json
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "execution_logs_blueprint_id_fkey"
            columns: ["blueprint_id"]
            isOneToOne: false
            referencedRelation: "blueprints"
            referencedColumns: ["id"]
          },
        ]
      }
      export_logs: {
        Row: {
          blueprint_id: string
          created_at: string
          download_url: string | null
          export_config: Json
          export_format: string
          file_path: string
          file_size: number | null
          filename: string
          id: string
          user_id: string
        }
        Insert: {
          blueprint_id: string
          created_at?: string
          download_url?: string | null
          export_config?: Json
          export_format: string
          file_path: string
          file_size?: number | null
          filename: string
          id?: string
          user_id: string
        }
        Update: {
          blueprint_id?: string
          created_at?: string
          download_url?: string | null
          export_config?: Json
          export_format?: string
          file_path?: string
          file_size?: number | null
          filename?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_logs_blueprint_id_fkey"
            columns: ["blueprint_id"]
            isOneToOne: false
            referencedRelation: "blueprints"
            referencedColumns: ["id"]
          },
        ]
      }
      optimization_history: {
        Row: {
          after_metrics: Json
          before_metrics: Json
          blueprint_id: string
          created_at: string
          error_message: string | null
          execution_time_ms: number | null
          id: string
          improvements: Json
          optimization_type: string
          strategies_applied: Json
          success: boolean | null
          user_id: string
        }
        Insert: {
          after_metrics?: Json
          before_metrics?: Json
          blueprint_id: string
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          improvements?: Json
          optimization_type: string
          strategies_applied?: Json
          success?: boolean | null
          user_id: string
        }
        Update: {
          after_metrics?: Json
          before_metrics?: Json
          blueprint_id?: string
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          improvements?: Json
          optimization_type?: string
          strategies_applied?: Json
          success?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "optimization_history_blueprint_id_fkey"
            columns: ["blueprint_id"]
            isOneToOne: false
            referencedRelation: "blueprints"
            referencedColumns: ["id"]
          },
        ]
      }
      optimized_blueprints: {
        Row: {
          applied_at: string | null
          created_at: string
          id: string
          optimization_metrics: Json
          optimization_strategies: Json
          optimization_type: string | null
          optimized_edges: Json
          optimized_nodes: Json
          original_blueprint_id: string
          performance_improvement_percent: number | null
          token_savings_percent: number | null
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          created_at?: string
          id?: string
          optimization_metrics?: Json
          optimization_strategies?: Json
          optimization_type?: string | null
          optimized_edges?: Json
          optimized_nodes?: Json
          original_blueprint_id: string
          performance_improvement_percent?: number | null
          token_savings_percent?: number | null
          user_id: string
        }
        Update: {
          applied_at?: string | null
          created_at?: string
          id?: string
          optimization_metrics?: Json
          optimization_strategies?: Json
          optimization_type?: string | null
          optimized_edges?: Json
          optimized_nodes?: Json
          original_blueprint_id?: string
          performance_improvement_percent?: number | null
          token_savings_percent?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "optimized_blueprints_original_blueprint_id_fkey"
            columns: ["original_blueprint_id"]
            isOneToOne: false
            referencedRelation: "blueprints"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          subscription_status: string | null
          subscription_tier: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      simulation_logs: {
        Row: {
          blueprint_id: string
          completed_at: string | null
          context_window: Json
          error_message: string | null
          execution_steps: Json
          execution_time_ms: number | null
          final_output: string | null
          id: string
          input_query: string
          llm_provider: string
          metrics: Json
          pipeline_config: Json
          session_id: string
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          blueprint_id: string
          completed_at?: string | null
          context_window?: Json
          error_message?: string | null
          execution_steps?: Json
          execution_time_ms?: number | null
          final_output?: string | null
          id?: string
          input_query: string
          llm_provider: string
          metrics?: Json
          pipeline_config?: Json
          session_id: string
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          blueprint_id?: string
          completed_at?: string | null
          context_window?: Json
          error_message?: string | null
          execution_steps?: Json
          execution_time_ms?: number | null
          final_output?: string | null
          id?: string
          input_query?: string
          llm_provider?: string
          metrics?: Json
          pipeline_config?: Json
          session_id?: string
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_logs_blueprint_id_fkey"
            columns: ["blueprint_id"]
            isOneToOne: false
            referencedRelation: "blueprints"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_metrics: {
        Row: {
          cost_usd: number | null
          created_at: string
          id: string
          latency_ms: number | null
          model_name: string | null
          simulation_id: string
          step_name: string
          tokens_input: number | null
          tokens_output: number | null
        }
        Insert: {
          cost_usd?: number | null
          created_at?: string
          id?: string
          latency_ms?: number | null
          model_name?: string | null
          simulation_id: string
          step_name: string
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Update: {
          cost_usd?: number | null
          created_at?: string
          id?: string
          latency_ms?: number | null
          model_name?: string | null
          simulation_id?: string
          step_name?: string
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "simulation_metrics_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "simulation_logs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_optimization: {
        Args: { optimization_id: string }
        Returns: boolean
      }
      cleanup_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      complete_simulation: {
        Args: { sim_id: string; final_result?: string; error_msg?: string }
        Returns: undefined
      }
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
  public: {
    Enums: {},
  },
} as const
