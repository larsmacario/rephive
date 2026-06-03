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
      body_measurements: {
        Row: {
          created_at: string
          id: string
          user_id: string
          weight_kg: number
          body_fat_pct: number | null
          waist_cm: number | null
          muscle_mass_kg: number | null
          water_pct: number | null
          chest_cm: number | null
          shoulders_cm: number | null
          upper_arm_l_cm: number | null
          upper_arm_r_cm: number | null
          lower_arm_l_cm: number | null
          lower_arm_r_cm: number | null
          thigh_l_cm: number | null
          thigh_r_cm: number | null
          calf_l_cm: number | null
          calf_r_cm: number | null
          hips_cm: number | null
          performed_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          weight_kg: number
          body_fat_pct?: number | null
          waist_cm?: number | null
          muscle_mass_kg?: number | null
          water_pct?: number | null
          chest_cm?: number | null
          shoulders_cm?: number | null
          upper_arm_l_cm?: number | null
          upper_arm_r_cm?: number | null
          lower_arm_l_cm?: number | null
          lower_arm_r_cm?: number | null
          thigh_l_cm?: number | null
          thigh_r_cm?: number | null
          calf_l_cm?: number | null
          calf_r_cm?: number | null
          hips_cm?: number | null
          performed_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          weight_kg?: number
          body_fat_pct?: number | null
          waist_cm?: number | null
          muscle_mass_kg?: number | null
          water_pct?: number | null
          chest_cm?: number | null
          shoulders_cm?: number | null
          upper_arm_l_cm?: number | null
          upper_arm_r_cm?: number | null
          lower_arm_l_cm?: number | null
          lower_arm_r_cm?: number | null
          thigh_l_cm?: number | null
          thigh_r_cm?: number | null
          calf_l_cm?: number | null
          calf_r_cm?: number | null
          hips_cm?: number | null
          performed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "body_measurements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      body_photos: {
        Row: {
          created_at: string
          id: string
          photo_path: string
          orientation: string
          weight_kg: number | null
          performed_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          photo_path: string
          orientation: string
          weight_kg?: number | null
          performed_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          photo_path?: string
          orientation?: string
          weight_kg?: number | null
          performed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "body_photos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      exercises: {
        Row: {
          created_at: string
          equipment: string
          id: string
          metric_type: string
          muscle_group: string
          name: string
          user_id: string | null
          youtube_url: string | null
        }
        Insert: {
          created_at?: string
          equipment: string
          id?: string
          metric_type?: string
          muscle_group: string
          name: string
          user_id?: string | null
          youtube_url?: string | null
        }
        Update: {
          created_at?: string
          equipment?: string
          id?: string
          metric_type?: string
          muscle_group?: string
          name?: string
          user_id?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      plan_days: {
        Row: {
          id: string
          note: string | null
          plan_id: string
          position: number
          workout_id: string | null
        }
        Insert: {
          id?: string
          note?: string | null
          plan_id: string
          position: number
          workout_id?: string | null
        }
        Update: {
          id?: string
          note?: string | null
          plan_id?: string
          position?: number
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_days_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_days_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          current_day: number
          id: string
          is_active: boolean
          name: string
          sub: string
          summary: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          current_day?: number
          id?: string
          is_active?: boolean
          name: string
          sub?: string
          summary?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          current_day?: number
          id?: string
          is_active?: boolean
          name?: string
          sub?: string
          summary?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          birth_date: string | null
          created_at: string
          display_name: string | null
          id: string
          preferences: Json
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          preferences?: Json
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          preferences?: Json
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      sessions: {
        Row: {
          duration_min: number
          id: string
          is_pr: boolean
          name: string
          performed_at: string
          set_count: number
          tags: string[]
          user_id: string
          volume_kg: number
          workout_id: string | null
        }
        Insert: {
          duration_min?: number
          id?: string
          is_pr?: boolean
          name: string
          performed_at?: string
          set_count?: number
          tags?: string[]
          user_id: string
          volume_kg?: number
          workout_id?: string | null
        }
        Update: {
          duration_min?: number
          id?: string
          is_pr?: boolean
          name?: string
          performed_at?: string
          set_count?: number
          tags?: string[]
          user_id?: string
          volume_kg?: number
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      session_exercises: {
        Row: {
          id: string
          metric_type: string
          name: string
          note: string | null
          position: number
          session_id: string
          sets: Json
          superset_id: string | null
        }
        Insert: {
          id?: string
          metric_type?: string
          name: string
          note?: string | null
          position?: number
          session_id: string
          sets?: Json
          superset_id?: string | null
        }
        Update: {
          id?: string
          metric_type?: string
          name?: string
          note?: string | null
          position?: number
          session_id?: string
          sets?: Json
          superset_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      support_requests: {
        Row: {
          category: string
          contact_email: string
          created_at: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          category: string
          contact_email: string
          created_at?: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          category?: string
          contact_email?: string
          created_at?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_exercises: {
        Row: {
          catalog_exercise_id: string | null
          id: string
          metric_type: string
          name: string
          note: string | null
          position: number
          sets: Json
          superset_id: string | null
          workout_id: string
        }
        Insert: {
          catalog_exercise_id?: string | null
          id?: string
          metric_type?: string
          name: string
          note?: string | null
          position?: number
          sets?: Json
          superset_id?: string | null
          workout_id: string
        }
        Update: {
          catalog_exercise_id?: string | null
          id?: string
          metric_type?: string
          name?: string
          note?: string | null
          position?: number
          sets?: Json
          superset_id?: string | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_catalog_exercise_id_fkey"
            columns: ["catalog_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          created_at: string
          duration_min: number
          id: string
          name: string
          sub: string
          tags: string[]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration_min?: number
          id?: string
          name: string
          sub?: string
          tags?: string[]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration_min?: number
          id?: string
          name?: string
          sub?: string
          tags?: string[]
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "athlet" | "coach" | "owner"
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
      app_role: ["athlet", "coach", "owner"],
    },
  },
} as const
