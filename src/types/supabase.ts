// Database types matching production schema (production-schema.sql)
// Generate complete types later using: npx supabase gen types typescript

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
          first_name: string
          last_name: string
          middle_name?: string | null
          phone?: string | null
          role: string
          department?: string | null
          employee_id?: string | null
          employee_type?: string | null
          manager_id?: string | null
          client_id?: string | null
          hourly_rate?: number | null
          bill_rate?: number | null
          overtime_rate?: number | null
          hire_date?: string | null
          state?: string | null
          is_active: boolean
          is_exempt: boolean
          mybase_payroll_id?: string | null
          notification_prefs?: Json | null
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id: string
          email: string
          first_name: string
          last_name: string
          middle_name?: string | null
          phone?: string | null
          role?: string
          department?: string | null
          employee_id?: string | null
          employee_type?: string | null
          manager_id?: string | null
          client_id?: string | null
          hourly_rate?: number | null
          bill_rate?: number | null
          overtime_rate?: number | null
          hire_date?: string | null
          state?: string | null
          is_active?: boolean
          is_exempt?: boolean
          mybase_payroll_id?: string | null
          notification_prefs?: Json | null
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          middle_name?: string | null
          phone?: string | null
          role?: string
          department?: string | null
          employee_id?: string | null
          employee_type?: string | null
          manager_id?: string | null
          client_id?: string | null
          hourly_rate?: number | null
          bill_rate?: number | null
          overtime_rate?: number | null
          hire_date?: string | null
          state?: string | null
          is_active?: boolean
          is_exempt?: boolean
          mybase_payroll_id?: string | null
          notification_prefs?: Json | null
        }
      }
      clients: {
        Row: {
          id: string
          name: string
          code?: string | null
          contact_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_person?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          bill_rate?: number | null
          contract_start?: string | null
          contract_end?: string | null
          billing_details?: string | null
          is_active: boolean
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          name: string
          code?: string | null
          contact_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_person?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          bill_rate?: number | null
          contract_start?: string | null
          contract_end?: string | null
          billing_details?: string | null
          is_active?: boolean
        }
        Update: {
          name?: string
          code?: string | null
          contact_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_person?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          bill_rate?: number | null
          contract_start?: string | null
          contract_end?: string | null
          billing_details?: string | null
          is_active?: boolean
        }
      }
      projects: {
        Row: {
          id: string
          client_id?: string | null
          name: string
          code?: string | null
          short_name?: string | null
          project_number?: string | null
          description?: string | null
          client_name?: string | null
          department?: string | null
          is_active: boolean
          status?: string | null
          start_date?: string | null
          end_date?: string | null
          budget?: number | null
          track_time?: boolean | null
          track_expenses?: boolean | null
          is_billable?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          client_id?: string | null
          name: string
          code?: string | null
          short_name?: string | null
          project_number?: string | null
          description?: string | null
          client_name?: string | null
          department?: string | null
          is_active?: boolean
          status?: string | null
          start_date?: string | null
          end_date?: string | null
          budget?: number | null
          track_time?: boolean | null
          track_expenses?: boolean | null
          is_billable?: boolean | null
        }
        Update: {
          client_id?: string | null
          name?: string
          code?: string | null
          short_name?: string | null
          project_number?: string | null
          description?: string | null
          client_name?: string | null
          department?: string | null
          is_active?: boolean
          status?: string | null
          start_date?: string | null
          end_date?: string | null
          budget?: number | null
          track_time?: boolean | null
          track_expenses?: boolean | null
          is_billable?: boolean | null
        }
      }
      project_employees: {
        Row: {
          id: string
          project_id: string
          employee_id: string
          pay_rate?: number | null
          bill_rate?: number | null
          is_active: boolean
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          project_id: string
          employee_id: string
          pay_rate?: number | null
          bill_rate?: number | null
          is_active?: boolean
        }
        Update: {
          project_id?: string
          employee_id?: string
          pay_rate?: number | null
          bill_rate?: number | null
          is_active?: boolean
        }
      }
      timesheets: {
        Row: {
          id: string
          employee_id: string
          week_ending: string
          total_hours?: number | null
          overtime_hours?: number | null
          status: string
          submitted_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          payroll_approved_at?: string | null
          rejection_reason?: string | null
          comments?: string | null
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          employee_id: string
          week_ending: string
          total_hours?: number | null
          overtime_hours?: number | null
          status?: string
          submitted_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          comments?: string | null
        }
        Update: {
          employee_id?: string
          week_ending?: string
          total_hours?: number | null
          overtime_hours?: number | null
          status?: string
          submitted_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          rejection_reason?: string | null
          comments?: string | null
        }
      }
      timesheet_entries: {
        Row: {
          id: string
          timesheet_id: string
          project_id?: string | null
          date: string
          hours: number
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          timesheet_id: string
          project_id?: string | null
          date: string
          hours?: number
          description?: string | null
        }
        Update: {
          timesheet_id?: string
          project_id?: string | null
          date?: string
          hours?: number
          description?: string | null
        }
      }
      expenses: {
        Row: {
          id: string
          employee_id: string
          report_id?: string | null
          project_id?: string | null
          expense_date: string
          category: string
          amount: number
          description?: string | null
          vendor?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          is_reimbursable?: boolean | null
          status: string
          submitted_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          rejection_reason?: string | null
          comments?: string | null
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          employee_id: string
          report_id?: string | null
          project_id?: string | null
          expense_date: string
          category: string
          amount: number
          description?: string | null
          vendor?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          is_reimbursable?: boolean | null
          status?: string
        }
        Update: {
          employee_id?: string
          report_id?: string | null
          project_id?: string | null
          expense_date?: string
          category?: string
          amount?: number
          description?: string | null
          vendor?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          is_reimbursable?: boolean | null
          status?: string
          rejection_reason?: string | null
          comments?: string | null
        }
      }
      expense_reports: {
        Row: {
          id: string
          employee_id: string
          title?: string | null
          period_month?: string | null
          status: string
          total_amount?: number | null
          submitted_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          employee_id: string
          title?: string | null
          period_month?: string | null
          status?: string
          total_amount?: number | null
          submitted_at?: string | null
        }
        Update: {
          employee_id?: string
          title?: string | null
          period_month?: string | null
          status?: string
          total_amount?: number | null
          submitted_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          rejection_reason?: string | null
        }
      }
      expense_categories: {
        Row: {
          id: string
          name: string
          code?: string | null
          description?: string | null
          spending_limit?: number | null
          is_billable?: boolean | null
          requires_receipt?: boolean | null
          is_active: boolean
          created_at?: string
          updated_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id?: string | null
          action: string
          timestamp?: string
          metadata?: Json
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          timestamp?: string
          metadata?: Json
        }
        Update: {
          user_id?: string | null
          action?: string
          metadata?: Json
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message?: string | null
          is_read: boolean
          created_at?: string
          metadata?: Json
        }
        Insert: {
          id?: string
          user_id: string
          type?: string
          title: string
          message?: string | null
          is_read?: boolean
          metadata?: Json
        }
        Update: {
          type?: string
          title?: string
          message?: string | null
          is_read?: boolean
          metadata?: Json
        }
      }
      company_settings: {
        Row: {
          id: string
          timezone?: string | null
          currency?: string | null
          [key: string]: any
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
      timesheet_status: 'draft' | 'submitted' | 'approved' | 'payroll_approved' | 'rejected'
      expense_status: 'draft' | 'submitted' | 'approved' | 'rejected'
    }
  }
}
