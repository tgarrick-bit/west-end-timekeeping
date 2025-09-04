// Simplified database types for deployment
// You can generate complete types later using Supabase CLI

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
      employees: {
        Row: {
          id: string
          email: string
          first_name?: string
          last_name?: string
          role: string
          department?: string
          is_active: boolean
          hourly_rate?: number
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          email: string
          first_name?: string
          last_name?: string
          role?: string
          department?: string
          is_active?: boolean
          hourly_rate?: number
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          role?: string
          department?: string
          is_active?: boolean
          hourly_rate?: number
        }
      }
      timesheets: {
        Row: {
          id: string
          employee_id: string
          week_ending: string
          total_hours?: number
          status: string
          submitted_at?: string
          approved_at?: string
          approved_by?: string
          comments?: string
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          employee_id: string
          week_ending: string
          total_hours?: number
          status?: string
          submitted_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          week_ending?: string
          total_hours?: number
          status?: string
        }
      }
      expenses: {
        Row: {
          id: string
          employee_id: string
          expense_date: string
          amount: number
          category: string
          description?: string
          status: string
          submitted_at?: string
          approved_at?: string
          approved_by?: string
          receipt_url?: string
          project_id?: string
          comments?: string
        }
        Insert: {
          id?: string
          employee_id: string
          expense_date: string
          amount: number
          category: string
          description?: string
          status?: string
        }
        Update: {
          id?: string
          employee_id?: string
          expense_date?: string
          amount?: number
          category?: string
          description?: string
          status?: string
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          code?: string
          client_id?: string
          status: string
          created_at?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          name: string
          is_active: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}