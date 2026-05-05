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
      learner_profiles: {
        Row: {
          available_min: number
          decoding_trials: number
          fatigue: number
          goal: string | null
          name: string | null
          phonological_score: number
          reading_speed: string | null
          subjects: string[]
          surface_score: number
          updated_at: string
          user_id: string
          wpm: number | null
        }
        Insert: {
          available_min?: number
          decoding_trials?: number
          fatigue?: number
          goal?: string | null
          name?: string | null
          phonological_score?: number
          reading_speed?: string | null
          subjects?: string[]
          surface_score?: number
          updated_at?: string
          user_id: string
          wpm?: number | null
        }
        Update: {
          available_min?: number
          decoding_trials?: number
          fatigue?: number
          goal?: string | null
          name?: string | null
          phonological_score?: number
          reading_speed?: string | null
          subjects?: string[]
          surface_score?: number
          updated_at?: string
          user_id?: string
          wpm?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reasoning_log: {
        Row: {
          created_at: string
          id: string
          message: string
          schedule_id: string | null
          tag: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          schedule_id?: string | null
          tag?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          schedule_id?: string | null
          tag?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reasoning_log_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_blocks: {
        Row: {
          created_at: string
          done: boolean
          id: string
          kind: string
          minutes: number
          modified: boolean
          position: number
          reasons: string[]
          schedule_id: string
          supports: Json
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          id?: string
          kind: string
          minutes: number
          modified?: boolean
          position: number
          reasons?: string[]
          schedule_id: string
          supports?: Json
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          done?: boolean
          id?: string
          kind?: string
          minutes?: number
          modified?: boolean
          position?: number
          reasons?: string[]
          schedule_id?: string
          supports?: Json
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_blocks_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          active: boolean
          content: Json | null
          created_at: string
          id: string
          source: string
          topic: string
          user_id: string
        }
        Insert: {
          active?: boolean
          content?: Json | null
          created_at?: string
          id?: string
          source?: string
          topic: string
          user_id: string
        }
        Update: {
          active?: boolean
          content?: Json | null
          created_at?: string
          id?: string
          source?: string
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          block_id: string | null
          completed_at: string
          difficulty: string
          duration_sec: number | null
          id: string
          user_id: string
        }
        Insert: {
          block_id?: string | null
          completed_at?: string
          difficulty: string
          duration_sec?: number | null
          id?: string
          user_id: string
        }
        Update: {
          block_id?: string | null
          completed_at?: string
          difficulty?: string
          duration_sec?: number | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "schedule_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      word_difficulty: {
        Row: {
          created_at: string
          exposures: number
          id: string
          last_tapped: string
          mastered: boolean
          tap_count: number
          user_id: string
          word: string
        }
        Insert: {
          created_at?: string
          exposures?: number
          id?: string
          last_tapped?: string
          mastered?: boolean
          tap_count?: number
          user_id: string
          word: string
        }
        Update: {
          created_at?: string
          exposures?: number
          id?: string
          last_tapped?: string
          mastered?: boolean
          tap_count?: number
          user_id?: string
          word?: string
        }
        Relationships: []
      }
      word_event: {
        Row: {
          created_at: string
          features: number[]
          id: string
          label: number
          predicted_p: number
          user_id: string
          word: string
        }
        Insert: {
          created_at?: string
          features: number[]
          id?: string
          label: number
          predicted_p: number
          user_id: string
          word: string
        }
        Update: {
          created_at?: string
          features?: number[]
          id?: string
          label?: number
          predicted_p?: number
          user_id?: string
          word?: string
        }
        Relationships: []
      }
      word_model: {
        Row: {
          bias: number
          trained_n: number
          updated_at: string
          user_id: string
          weights: number[]
        }
        Insert: {
          bias?: number
          trained_n?: number
          updated_at?: string
          user_id: string
          weights?: number[]
        }
        Update: {
          bias?: number
          trained_n?: number
          updated_at?: string
          user_id?: string
          weights?: number[]
        }
        Relationships: []
      }
    }
    Views: {
      v_word_difficulty: {
        Row: {
          difficulty: number | null
          exposures: number | null
          last_tapped: string | null
          mastered: boolean | null
          tap_count: number | null
          user_id: string | null
          word: string | null
        }
        Insert: {
          difficulty?: never
          exposures?: number | null
          last_tapped?: string | null
          mastered?: boolean | null
          tap_count?: number | null
          user_id?: string | null
          word?: string | null
        }
        Update: {
          difficulty?: never
          exposures?: number | null
          last_tapped?: string | null
          mastered?: boolean | null
          tap_count?: number | null
          user_id?: string | null
          word?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      extract_word_features: {
        Args: { p_user: string; p_word: string }
        Returns: number[]
      }
      increment_word_tap: {
        Args: { p_word: string }
        Returns: {
          created_at: string
          exposures: number
          id: string
          last_tapped: string
          mastered: boolean
          tap_count: number
          user_id: string
          word: string
        }
        SetofOptions: {
          from: "*"
          to: "word_difficulty"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      predict_words_difficulty: {
        Args: { p_words: string[] }
        Returns: {
          p: number
          source: string
          word: string
        }[]
      }
      record_word_exposure: { Args: { p_words: string[] }; Returns: undefined }
      reset_word_model: { Args: never; Returns: undefined }
      set_word_mastered: {
        Args: { p_mastered: boolean; p_word: string }
        Returns: undefined
      }
      update_word_model: {
        Args: { p_label: number; p_word: string }
        Returns: number
      }
      update_word_model_batch: {
        Args: { p_label: number; p_words: string[] }
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
