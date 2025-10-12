// /lib/types/database.ts

// Base types matching your database schema
export interface Employee {
    id: string
    email: string
    first_name: string
    last_name: string
    employee_id?: string
    department?: string
    hourly_rate: number
    role?: string
    manager_id?: string
    created_at?: string
    updated_at?: string
  }
  
  export interface Project {
    id: string
    name: string
    code: string
    description?: string
    client_id?: string
    is_active?: boolean
    created_at?: string
    updated_at?: string
  }
  
  export interface Timesheet {
    id: string
    employee_id: string
    week_ending: string
    total_hours: number
    overtime_hours: number
    status: 'draft' | 'submitted' | 'approved' | 'rejected'
    submitted_at?: string | null
    approved_at?: string | null
    approved_by?: string | null
    comments?: string | null
    created_at: string
    updated_at: string
  }
  
  export interface TimesheetEntry {
    id: string
    timesheet_id: string
    date: string
    project_id: string
    hours: number
    description?: string | null
    created_at?: string
    updated_at?: string
  }
  
  // Composite types with relationships
  export interface TimesheetWithEmployee extends Timesheet {
    employee?: Employee
  }
  
  export interface TimesheetEntryWithProject extends TimesheetEntry {
    project?: Project
  }
  
  export interface TimesheetWithDetails extends Timesheet {
    employee?: Employee
    entries?: TimesheetEntryWithProject[]
  }
  
  // Form/submission types
  export interface TimesheetSubmission {
    employee_id: string
    week_ending: string
    entries: {
      date: string
      project_id: string
      hours: number
      description?: string
    }[]
  }
  
  // Response types for API calls
  export interface QueryResponse<T> {
    data?: T
    error?: any
  }
  
  // Filter types
  export interface TimesheetFilters {
    status?: 'all' | 'draft' | 'submitted' | 'approved' | 'rejected'
    employee_id?: string
    week_ending?: string
    manager_id?: string
    date_from?: string
    date_to?: string
  }
  
  // Stats types
  export interface TimesheetStats {
    totalSubmissions: number
    pendingApprovals: number
    approved: number
    rejected: number
    totalHours: number
    totalValue: number
    overtimeHours: number
  }