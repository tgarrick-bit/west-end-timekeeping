// src/types/index.ts

// ---- Roles -------------------------------------------------
export type UserRole =
  | 'employee'
  | 'manager'
  | 'admin'
  | 'client_approver'
  | 'payroll';

// ---- Core user/employee ------------------------------------
export interface User {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  role: UserRole;
  client_id?: string | null;
  manager_id?: string | null;
  is_active?: boolean | null;
  created_at?: string;
  updated_at?: string;
}

export interface Employee extends User {
  department?: string | null;
  state?: string | null;
}

// ---- Projects ----------------------------------------------
export interface Project {
  id: string;
  name: string;
  code?: string;
  client_id?: string | null;
  is_active?: boolean | null;
  created_at?: string;
  updated_at?: string;
}

// ---- Timesheets --------------------------------------------
export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';

export interface Timesheet {
  id: string;
  employee_id: string; // a.k.a. user_id in some schemas
  week_ending?: string;       // if your table has week_ending
  week_start_date?: string;   // or week_start_date
  total_hours?: number | null;
  status?: TimesheetStatus;
  created_at?: string;
  updated_at?: string;
}

// ---- Time entries ------------------------------------------
/**
 * This interface is intentionally permissive so it works
 * with both “minutes” and “total_minutes” schemas, and with
 * either “entry_date” or “date”.
 */
export interface TimeEntry {
  id: string;
  timesheet_id: string;
  project_id?: string | null;
  task_id?: string | null;

  // date fields (your DB might use one or the other)
  entry_date?: string; // YYYY-MM-DD
  date?: string;       // YYYY-MM-DD

  // duration fields
  total_minutes?: number | null;
  minutes?: number | null;
  hours?: number | null; // some UI code references hours

  // optional details
  start_time?: string | null; // HH:MM:SS
  end_time?: string | null;   // HH:MM:SS
  notes?: string | null;
  billable?: boolean | null;
  status?: string | null;

  created_at?: string;
  updated_at?: string;
}

// ---- Expenses ----------------------------------------------
export type ExpenseStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';

export interface ExpenseReport {
  id: string;
  employee_id: string;
  report_number?: string;
  report_name?: string;
  status?: ExpenseStatus;
  submission_date?: string;
  total_amount?: number | null;
  project_code?: string | null;
  department?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ExpenseItem {
  id: string;
  expense_report_id?: string; // sometimes named report_id
  report_id?: string;

  date: string; // YYYY-MM-DD
  amount?: number | null;
  total_amount?: number | null; // some UIs sum into report total
  category?: string | null;
  description?: string | null;
  receipt_url?: string | null;
  project_id?: string | null;

  created_at?: string;
  updated_at?: string;
}

// ---- Convenience bundles -----------------------------------
export interface PagedResult<T> {
  items: T[];
  total: number;
}

export interface ApprovalSummary {
  timesheets_pending: number;
  expenses_pending: number;
}



