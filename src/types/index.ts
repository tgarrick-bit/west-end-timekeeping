// src/types/index.ts

// ===== Enums & primitives =====
export type UserRole =
  | 'employee'
  | 'manager'
  | 'admin'
  | 'client_approver'
  | 'payroll';

export type ProjectStatus =
  | 'active'
  | 'inactive'
  | 'archived'
  | 'completed'
  | 'on-hold';

export type TimesheetStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'paid';

export type ExpenseStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'reimbursed';

// ===== Auth / People =====
// NOTE: Components read first_name/last_name/role directly from User.
// Make them present (not optional) to satisfy usage.
export interface User {
  id: string;
  email: string;
  first_name: string;                 // required for UI
  last_name: string;                  // required for UI
  role: UserRole;                     // required for guards & badges
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

// ===== Clients =====
export interface Client {
  id: string;
  name: string;
  code?: string | null;

  // Components use these as strings/booleans (not nullable).
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;

  address?: string | null;

  // used in forms & filters as boolean
  is_active?: boolean;

  // some UIs mention this
  time_tracking_method?: 'detailed' | 'simple';

  created_at?: string;
  updated_at?: string;
}

// ===== Projects =====
export interface Project {
  id: string;
  name: string;
  code?: string | null;
  client_id?: string | null;

  description?: string | null;
  start_date?: string | null;         // keep optional, UI will guard
  end_date?: string | null;
  status?: ProjectStatus;
  budget?: number;                    // referenced in ProjectManagement

  is_active?: boolean | null;
  created_at?: string;
  updated_at?: string;
}

// ===== Timesheets & Time entries =====
export interface Timesheet {
  id: string;
  employee_id: string;
  week_ending?: string;               // some UIs expect this
  week_start_date?: string;           // others reference this
  total_minutes?: number | null;
  status?: TimesheetStatus;
  submitted_at?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * TimeEntry is permissive so different schemas work.
 */
export interface TimeEntry {
  id: string;
  timesheet_id: string;
  project_id?: string | null;
  task_id?: string | null;

  // date fields (one or the other)
  entry_date?: string;                // YYYY-MM-DD
  date?: string;                      // YYYY-MM-DD

  // durations
  total_minutes?: number | null;
  minutes?: number | null;
  hours?: number | null;

  // optional details
  start_time?: string | null;         // HH:MM:SS
  end_time?: string | null;           // HH:MM:SS
  break_minutes?: number | null;
  notes?: string | null;
  billable?: boolean | null;
  location?: string | null;
  status?: string | null;

  created_at?: string;
  updated_at?: string;
}

// ===== Expenses =====
export interface ExpenseReport {
  id: string;
  employee_id: string;
  report_number?: string;
  report_name?: string;
  status?: ExpenseStatus;
  submission_date?: string;           // YYYY-MM-DD
  total_amount?: number | null;
  project_code?: string | null;
  department?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ExpenseItem {
  id: string;
  expense_report_id?: string;         // sometimes report_id
  report_id?: string;

  date: string;                        // YYYY-MM-DD
  amount?: number | null;
  total_amount?: number | null;
  category?: string | null;
  description?: string | null;
  receipt_url?: string | null;
  project_id?: string | null;

  created_at?: string;
  updated_at?: string;
}

// ===== Manager/Project helper shapes used in UI =====
export interface ProjectAssignment {
  id: string;
  user_id: string;
  project_id: string;
  start_date?: string | null;
  end_date?: string | null;
  hourly_rate?: number | null;
  is_active?: boolean | null;

  // joins in UI
  user?: Pick<User, 'first_name' | 'last_name' | 'email'>;
  project?: Pick<Project, 'name' | 'client_id'>;
}

export interface ProjectOverviewItem {
  project: Pick<Project, 'id' | 'name' | 'status' | 'description'>;
  isActive: boolean;
  totalHours: number;
  totalExpenses: number;
}

export interface ProjectWithClient extends Project {
  client?: Pick<Client, 'id' | 'name'>;
}

// ===== Dashboard stats (employee & admin) =====
export interface EmployeeDashboardStats {
  // keep both names so either code path compiles
  week_hours?: number;
  thisWeekHours?: number;

  pending_approvals?: number;
  pendingApprovals?: number;

  totalProjects?: number;
  totalEntries?: number;
}

export interface DashboardStats {
  totalEmployees: number;
  activeProjects: number;
  pendingApprovals: number;
  submittedItems: number;
  totalExpensesThisMonth?: number;
  totalHoursThisWeek?: number;
}

// ===== Misc =====
export interface PagedResult<T> {
  items: T[];
  total: number;
}

export interface ApprovalSummary {
  timesheets_pending: number;
  expenses_pending: number;
}



