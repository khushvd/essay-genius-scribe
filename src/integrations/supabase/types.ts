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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          details: Json | null
          id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      colleges: {
        Row: {
          country: string
          created_at: string | null
          id: string
          name: string
          tier: string | null
        }
        Insert: {
          country: string
          created_at?: string | null
          id?: string
          name: string
          tier?: string | null
        }
        Update: {
          country?: string
          created_at?: string | null
          id?: string
          name?: string
          tier?: string | null
        }
        Relationships: []
      }
      essay_analytics: {
        Row: {
          action: string
          action_timestamp: string
          analysis_id: string
          created_at: string | null
          essay_id: string
          id: string
          original_text: string | null
          reasoning: string | null
          suggested_text: string | null
          suggestion_id: string
          suggestion_type: string
        }
        Insert: {
          action: string
          action_timestamp?: string
          analysis_id: string
          created_at?: string | null
          essay_id: string
          id?: string
          original_text?: string | null
          reasoning?: string | null
          suggested_text?: string | null
          suggestion_id: string
          suggestion_type: string
        }
        Update: {
          action?: string
          action_timestamp?: string
          analysis_id?: string
          created_at?: string | null
          essay_id?: string
          id?: string
          original_text?: string | null
          reasoning?: string | null
          suggested_text?: string | null
          suggestion_id?: string
          suggestion_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "essay_analytics_essay_id_fkey"
            columns: ["essay_id"]
            isOneToOne: false
            referencedRelation: "essays"
            referencedColumns: ["id"]
          },
        ]
      }
      essay_scores: {
        Row: {
          ai_reasoning: string | null
          authenticity_score: number | null
          clarity_score: number | null
          coherence_score: number | null
          created_at: string | null
          essay_id: string
          id: string
          impact_score: number | null
          notes: string | null
          overall_score: number | null
          score_type: string
          scored_at: string
          scored_by: string | null
        }
        Insert: {
          ai_reasoning?: string | null
          authenticity_score?: number | null
          clarity_score?: number | null
          coherence_score?: number | null
          created_at?: string | null
          essay_id: string
          id?: string
          impact_score?: number | null
          notes?: string | null
          overall_score?: number | null
          score_type: string
          scored_at?: string
          scored_by?: string | null
        }
        Update: {
          ai_reasoning?: string | null
          authenticity_score?: number | null
          clarity_score?: number | null
          coherence_score?: number | null
          created_at?: string | null
          essay_id?: string
          id?: string
          impact_score?: number | null
          notes?: string | null
          overall_score?: number | null
          score_type?: string
          scored_at?: string
          scored_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "essay_scores_essay_id_fkey"
            columns: ["essay_id"]
            isOneToOne: false
            referencedRelation: "essays"
            referencedColumns: ["id"]
          },
        ]
      }
      essays: {
        Row: {
          college_id: string | null
          completion_status: Database["public"]["Enums"]["completion_status"]
          content: string
          created_at: string | null
          custom_college_name: string | null
          custom_programme_name: string | null
          cv_data: Json | null
          degree_level: Database["public"]["Enums"]["degree_level"] | null
          id: string
          last_exported_at: string | null
          programme_id: string | null
          questionnaire_data: Json | null
          status: Database["public"]["Enums"]["essay_status"] | null
          title: string | null
          updated_at: string | null
          writer_id: string
        }
        Insert: {
          college_id?: string | null
          completion_status?: Database["public"]["Enums"]["completion_status"]
          content: string
          created_at?: string | null
          custom_college_name?: string | null
          custom_programme_name?: string | null
          cv_data?: Json | null
          degree_level?: Database["public"]["Enums"]["degree_level"] | null
          id?: string
          last_exported_at?: string | null
          programme_id?: string | null
          questionnaire_data?: Json | null
          status?: Database["public"]["Enums"]["essay_status"] | null
          title?: string | null
          updated_at?: string | null
          writer_id: string
        }
        Update: {
          college_id?: string | null
          completion_status?: Database["public"]["Enums"]["completion_status"]
          content?: string
          created_at?: string | null
          custom_college_name?: string | null
          custom_programme_name?: string | null
          cv_data?: Json | null
          degree_level?: Database["public"]["Enums"]["degree_level"] | null
          id?: string
          last_exported_at?: string | null
          programme_id?: string | null
          questionnaire_data?: Json | null
          status?: Database["public"]["Enums"]["essay_status"] | null
          title?: string | null
          updated_at?: string | null
          writer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "essays_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "essays_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "essays_writer_id_fkey"
            columns: ["writer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      programmes: {
        Row: {
          college_id: string | null
          created_at: string | null
          english_variant: Database["public"]["Enums"]["english_variant"]
          id: string
          name: string
        }
        Insert: {
          college_id?: string | null
          created_at?: string | null
          english_variant?: Database["public"]["Enums"]["english_variant"]
          id?: string
          name: string
        }
        Update: {
          college_id?: string | null
          created_at?: string | null
          english_variant?: Database["public"]["Enums"]["english_variant"]
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "programmes_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      successful_essays: {
        Row: {
          college_id: string | null
          created_at: string | null
          degree_level: string | null
          essay_content: string
          essay_title: string | null
          id: string
          key_strategies: Json | null
          performance_score: number | null
          programme_id: string | null
          writer_questionnaire: Json | null
          writer_resume: string | null
        }
        Insert: {
          college_id?: string | null
          created_at?: string | null
          degree_level?: string | null
          essay_content: string
          essay_title?: string | null
          id?: string
          key_strategies?: Json | null
          performance_score?: number | null
          programme_id?: string | null
          writer_questionnaire?: Json | null
          writer_resume?: string | null
        }
        Update: {
          college_id?: string | null
          created_at?: string | null
          degree_level?: string | null
          essay_content?: string
          essay_title?: string | null
          id?: string
          key_strategies?: Json | null
          performance_score?: number | null
          programme_id?: string | null
          writer_questionnaire?: Json | null
          writer_resume?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "successful_essays_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "successful_essays_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      training_essays: {
        Row: {
          added_at: string | null
          added_by: string | null
          admin_notes: string | null
          after_score: Json | null
          before_score: Json | null
          created_at: string | null
          essay_id: string
          final_content: string
          id: string
          improvement_metrics: Json | null
          manual_edits: Json | null
          metadata: Json | null
          original_content: string
          status: string | null
          suggestions_applied: Json | null
          suggestions_dismissed: Json | null
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          admin_notes?: string | null
          after_score?: Json | null
          before_score?: Json | null
          created_at?: string | null
          essay_id: string
          final_content: string
          id?: string
          improvement_metrics?: Json | null
          manual_edits?: Json | null
          metadata?: Json | null
          original_content: string
          status?: string | null
          suggestions_applied?: Json | null
          suggestions_dismissed?: Json | null
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          admin_notes?: string | null
          after_score?: Json | null
          before_score?: Json | null
          created_at?: string | null
          essay_id?: string
          final_content?: string
          id?: string
          improvement_metrics?: Json | null
          manual_edits?: Json | null
          metadata?: Json | null
          original_content?: string
          status?: string | null
          suggestions_applied?: Json | null
          suggestions_dismissed?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "training_essays_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_essays_essay_id_fkey"
            columns: ["essay_id"]
            isOneToOne: false
            referencedRelation: "essays"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_id_by_email: {
        Args: { _email: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      account_status: "pending" | "approved" | "suspended" | "rejected"
      app_role: "free" | "premium" | "admin"
      completion_status: "in_progress" | "completed"
      degree_level: "bachelors" | "masters"
      english_variant: "british" | "american"
      essay_status: "draft" | "in_review" | "completed"
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
      account_status: ["pending", "approved", "suspended", "rejected"],
      app_role: ["free", "premium", "admin"],
      completion_status: ["in_progress", "completed"],
      degree_level: ["bachelors", "masters"],
      english_variant: ["british", "american"],
      essay_status: ["draft", "in_review", "completed"],
    },
  },
} as const
