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
      blueprint_shares: {
        Row: {
          access_level: string
          blueprint_id: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          share_token: string
          share_type: string
          updated_at: string
        }
        Insert: {
          access_level: string
          blueprint_id: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          share_token?: string
          share_type: string
          updated_at?: string
        }
        Update: {
          access_level?: string
          blueprint_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          share_token?: string
          share_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blueprint_shares_blueprint_id_fkey"
            columns: ["blueprint_id"]
            isOneToOne: false
            referencedRelation: "blueprints"
            referencedColumns: ["id"]
          },
        ]
      }
      blueprint_templates: {
        Row: {
          category: string
          created_at: string
          description: string
          difficulty: string
          edges: Json
          id: string
          name: string
          nodes: Json
          tags: string[] | null
          thumbnail: string | null
          tier: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          difficulty?: string
          edges?: Json
          id?: string
          name: string
          nodes?: Json
          tags?: string[] | null
          thumbnail?: string | null
          tier?: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          difficulty?: string
          edges?: Json
          id?: string
          name?: string
          nodes?: Json
          tags?: string[] | null
          thumbnail?: string | null
          tier?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
      blueprint_versions: {
        Row: {
          blueprint_id: string
          change_summary: string | null
          created_at: string
          created_by: string
          created_by_email: string
          description: string | null
          edges: Json
          id: string
          nodes: Json
          title: string
          version_number: number
        }
        Insert: {
          blueprint_id: string
          change_summary?: string | null
          created_at?: string
          created_by: string
          created_by_email: string
          description?: string | null
          edges?: Json
          id?: string
          nodes?: Json
          title: string
          version_number: number
        }
        Update: {
          blueprint_id?: string
          change_summary?: string | null
          created_at?: string
          created_by?: string
          created_by_email?: string
          description?: string | null
          edges?: Json
          id?: string
          nodes?: Json
          title?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "blueprint_versions_blueprint_id_fkey"
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
      collaboration_sessions: {
        Row: {
          blueprint_id: string
          cursor_position: Json | null
          id: string
          last_seen: string
          status: string
          user_email: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          blueprint_id: string
          cursor_position?: Json | null
          id?: string
          last_seen?: string
          status?: string
          user_email: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          blueprint_id?: string
          cursor_position?: Json | null
          id?: string
          last_seen?: string
          status?: string
          user_email?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_sessions_blueprint_id_fkey"
            columns: ["blueprint_id"]
            isOneToOne: false
            referencedRelation: "blueprints"
            referencedColumns: ["id"]
          },
        ]
      }
      encrypted_credentials: {
        Row: {
          created_at: string
          encrypted_data: string
          expires_at: string | null
          id: string
          key_hash: string
          service_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_data: string
          expires_at?: string | null
          id?: string
          key_hash: string
          service_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_data?: string
          expires_at?: string | null
          id?: string
          key_hash?: string
          service_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      integration_credentials: {
        Row: {
          created_at: string
          credential_ref: string
          encrypted_data: string
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credential_ref: string
          encrypted_data: string
          expires_at: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credential_ref?: string
          encrypted_data?: string
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      integration_usage_logs: {
        Row: {
          blueprint_id: string | null
          created_at: string
          error_message: string | null
          id: string
          integration_id: string
          operation_type: string
          request_count: number | null
          response_time_ms: number | null
          success: boolean | null
          user_id: string
        }
        Insert: {
          blueprint_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          integration_id: string
          operation_type: string
          request_count?: number | null
          response_time_ms?: number | null
          success?: boolean | null
          user_id: string
        }
        Update: {
          blueprint_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          integration_id?: string
          operation_type?: string
          request_count?: number | null
          response_time_ms?: number | null
          success?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_usage_logs_blueprint_id_fkey"
            columns: ["blueprint_id"]
            isOneToOne: false
            referencedRelation: "blueprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_usage_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          config: Json
          created_at: string
          credential_refs: Json
          id: string
          last_validated: string | null
          name: string
          status: string | null
          type: string
          updated_at: string
          user_id: string
          validation_error: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          credential_refs?: Json
          id?: string
          last_validated?: string | null
          name: string
          status?: string | null
          type: string
          updated_at?: string
          user_id: string
          validation_error?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          credential_refs?: Json
          id?: string
          last_validated?: string | null
          name?: string
          status?: string | null
          type?: string
          updated_at?: string
          user_id?: string
          validation_error?: string | null
        }
        Relationships: []
      }
      node_comments: {
        Row: {
          blueprint_id: string
          comment_text: string
          created_at: string
          id: string
          node_id: string
          resolved: boolean
          updated_at: string
          user_email: string
          user_id: string
          user_name: string | null
          x_position: number | null
          y_position: number | null
        }
        Insert: {
          blueprint_id: string
          comment_text: string
          created_at?: string
          id?: string
          node_id: string
          resolved?: boolean
          updated_at?: string
          user_email: string
          user_id: string
          user_name?: string | null
          x_position?: number | null
          y_position?: number | null
        }
        Update: {
          blueprint_id?: string
          comment_text?: string
          created_at?: string
          id?: string
          node_id?: string
          resolved?: boolean
          updated_at?: string
          user_email?: string
          user_id?: string
          user_name?: string | null
          x_position?: number | null
          y_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "node_comments_blueprint_id_fkey"
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
      rag_analyses: {
        Row: {
          analysis_results: Json
          blueprint_id: string | null
          created_at: string
          dataset_filename: string
          dataset_size: number
          id: string
          optimal_config: Json
          user_id: string
        }
        Insert: {
          analysis_results?: Json
          blueprint_id?: string | null
          created_at?: string
          dataset_filename: string
          dataset_size: number
          id?: string
          optimal_config?: Json
          user_id: string
        }
        Update: {
          analysis_results?: Json
          blueprint_id?: string | null
          created_at?: string
          dataset_filename?: string
          dataset_size?: number
          id?: string
          optimal_config?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rag_analyses_blueprint_id_fkey"
            columns: ["blueprint_id"]
            isOneToOne: false
            referencedRelation: "blueprints"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          blocked_until: string | null
          created_at: string
          endpoint: string
          id: string
          ip_address: unknown | null
          request_count: number
          updated_at: string
          user_id: string | null
          window_end: string
          window_start: string
        }
        Insert: {
          blocked_until?: string | null
          created_at?: string
          endpoint: string
          id?: string
          ip_address?: unknown | null
          request_count?: number
          updated_at?: string
          user_id?: string | null
          window_end?: string
          window_start?: string
        }
        Update: {
          blocked_until?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          ip_address?: unknown | null
          request_count?: number
          updated_at?: string
          user_id?: string | null
          window_end?: string
          window_start?: string
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          created_at: string
          details: Json | null
          endpoint: string
          event_type: string
          id: string
          ip_address: unknown | null
          severity: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          endpoint: string
          event_type: string
          id?: string
          ip_address?: unknown | null
          severity?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          endpoint?: string
          event_type?: string
          id?: string
          ip_address?: unknown | null
          severity?: string
          user_id?: string | null
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
      team_members: {
        Row: {
          email: string
          id: string
          invited_at: string
          invited_by: string
          joined_at: string | null
          role: string
          status: string
          team_id: string
          user_id: string
        }
        Insert: {
          email: string
          id?: string
          invited_at?: string
          invited_by: string
          joined_at?: string | null
          role: string
          status?: string
          team_id: string
          user_id: string
        }
        Update: {
          email?: string
          id?: string
          invited_at?: string
          invited_by?: string
          joined_at?: string | null
          role?: string
          status?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          subscription_tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          subscription_tier: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          subscription_tier?: string
          updated_at?: string
        }
        Relationships: []
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
      check_rate_limit: {
        Args: {
          p_user_id: string
          p_ip_address: unknown
          p_endpoint: string
          p_max_requests?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      cleanup_expired_credentials: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_shares: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_rate_limits: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_security_logs: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      complete_simulation: {
        Args: { sim_id: string; final_result?: string; error_msg?: string }
        Returns: undefined
      }
      decrypt_api_key: {
        Args: {
          p_user_id: string
          p_service_name: string
          p_passphrase: string
        }
        Returns: string
      }
      encrypt_api_key: {
        Args: {
          p_user_id: string
          p_service_name: string
          p_api_key: string
          p_passphrase: string
        }
        Returns: string
      }
      sanitize_input: {
        Args: { p_input: string; p_max_length?: number; p_allow_html?: boolean }
        Returns: string
      }
      test_integration: {
        Args: { integration_id: string }
        Returns: Json
      }
      update_collaboration_session: {
        Args: { p_blueprint_id: string; p_cursor_position?: Json }
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
