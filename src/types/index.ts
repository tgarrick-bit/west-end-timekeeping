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
  | 'payroll_approved'
  | 'rejected';

export type ExpenseStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected';

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
  employee_id?: string | null;        // external employee ID / badge number
  employee_type?: string | null;      // WE, MBP, CNDH, CNDC
  middle_name?: string | null;
  phone?: string | null;
  hourly_rate?: number | null;
  bill_rate?: number | null;
  overtime_rate?: number | null;
  hire_date?: string | null;
  is_exempt?: boolean | null;
  mybase_payroll_id?: string | null;
  notification_prefs?: Record<string, any> | null;
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
  contact_person?: string;

  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;

  bill_rate?: number | null;
  contract_start?: string | null;
  contract_end?: string | null;
  billing_details?: string | null;

  // used in forms & filters as boolean
  is_active?: boolean;

  created_at?: string;
  updated_at?: string;
}

// ===== Projects =====
export interface Project {
  id: string;
  name: string;
  code?: string | null;
  client_id?: string | null;

  short_name?: string | null;
  project_number?: string | null;
  client_name?: string | null;        // denormalized for quick display
  department?: string | null;

  description?: string | null;
  start_date?: string | null;         // keep optional, UI will guard
  end_date?: string | null;
  status?: ProjectStatus;
  budget?: number;                    // referenced in ProjectManagement

  is_active?: boolean | null;
  track_time?: boolean | null;
  track_expenses?: boolean | null;
  is_billable?: boolean | null;

  created_at?: string;
  updated_at?: string;
}

// ===== Timesheets & Time entries =====
export interface Timesheet {
  id: string;
  employee_id: string;
  week_ending?: string;
  total_hours?: number | null;
  overtime_hours?: number | null;
  status?: TimesheetStatus;
  submitted_at?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  payroll_approved_at?: string | null;
  rejection_reason?: string | null;
  comments?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * TimeEntry maps to the production `timesheet_entries` table.
 * Extra fields (start_time, end_time, etc.) kept for future use.
 */
export interface TimeEntry {
  id: string;
  timesheet_id: string;
  project_id?: string | null;

  // date field — production uses `date`
  date?: string;                      // YYYY-MM-DD

  // durations — production uses `hours`
  hours?: number | null;

  // optional details
  description?: string | null;

  // extra fields kept for possible future schema additions
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
  title?: string | null;
  period_month?: string | null;
  status?: ExpenseStatus;
  total_amount?: number | null;
  submitted_at?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  rejection_reason?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ExpenseItem {
  id: string;
  employee_id?: string;
  report_id?: string | null;
  project_id?: string | null;

  expense_date?: string;              // YYYY-MM-DD (production column name)
  date?: string;                      // alias for backward compat
  amount?: number | null;
  category?: string | null;
  description?: string | null;
  vendor?: string | null;
  payment_method?: string | null;
  receipt_url?: string | null;
  is_reimbursable?: boolean | null;
  status?: ExpenseStatus;
  submitted_at?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  rejection_reason?: string | null;
  comments?: string | null;

  created_at?: string;
  updated_at?: string;
}

// ===== Manager/Project helper shapes used in UI =====

/** Maps to production `project_employees` table */
export interface ProjectEmployee {
  id: string;
  employee_id: string;
  project_id: string;
  pay_rate?: number | null;
  bill_rate?: number | null;
  is_active?: boolean | null;
  created_at?: string;
  updated_at?: string;

  // joins in UI
  employee?: Pick<User, 'first_name' | 'last_name' | 'email'>;
  project?: Pick<Project, 'name' | 'client_id'>;
}

/** @deprecated Use ProjectEmployee instead */
export type ProjectAssignment = ProjectEmployee;

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
