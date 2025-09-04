// Standalone type definitions for the application
// No dependency on supabase types file

// Define UserRole type
export type UserRole = 'admin' | 'manager' | 'employee';

// Define Employee interface based on your database schema
export interface Employee {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  department?: string;
  is_active: boolean;
  hourly_rate?: number;
  created_at?: string;
  updated_at?: string;
  phone?: string;
  hire_date?: string;
  is_exempt?: boolean;
  state?: string;
  employee_id?: string;
  client_id?: string;
}

// Define Client interface based on your database schema
export interface Client {
  id: string;
  name: string;
  contact_person: string;  // Required for component compatibility
  contact_email: string;   // Required for component compatibility
  contact_phone: string;   // Required for component compatibility
  time_tracking_method: 'detailed' | 'simple';  // Required, no undefined
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// ClientFormData interface for form handling
export interface ClientFormData {
  name: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  time_tracking_method: 'detailed' | 'simple';
  is_active: boolean;
}

// Define Project interface - COMPLETE VERSION
export interface Project {
  id: string;
  name: string;
  code?: string;
  client_id: string;  // Required for ProjectManagement component
  description?: string;
  start_date: string;
  end_date?: string | null;
  budget?: number | null;
  status: 'active' | 'completed' | 'on-hold';
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Define User interface
export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Define ProjectAssignment interface
export interface ProjectAssignment {
  id: string;
  project_id: string;
  user_id: string;
  role?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Define Timesheet interface
export interface Timesheet {
  id: string;
  employee_id: string;
  week_ending: string;
  total_hours?: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_at?: string;
  approved_at?: string;
  approved_by?: string;
  comments?: string;
  created_at?: string;
  updated_at?: string;
}

// Define TimesheetEntry interface
export interface TimesheetEntry {
  id: string;
  timesheet_id: string;
  date: string;
  hours: number;
  project_id?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

// Define Expense interface
export interface Expense {
  id: string;
  employee_id: string;
  expense_date: string;
  amount: number;
  category: string;
  description?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_at?: string;
  approved_at?: string;
  approved_by?: string;
  receipt_url?: string;
  project_id?: string;
  comments?: string;
  created_at?: string;
  updated_at?: string;
}


