-- ============================================================================
-- West End Workforce Timekeeping — Production Schema
-- Generated 2026-04-04 from full codebase audit
-- Target: Supabase project ubyixboinrzgwwxahkdv
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE timesheet_status AS ENUM (
  'draft', 'submitted', 'approved', 'payroll_approved', 'rejected'
);

CREATE TYPE expense_status AS ENUM (
  'draft', 'submitted', 'approved', 'rejected'
);

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- employees (the code uses .from('employees') everywhere)
CREATE TABLE employees (
  id            UUID PRIMARY KEY,  -- matches Supabase auth.users.id
  email         TEXT NOT NULL UNIQUE,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  middle_name   TEXT,
  phone         TEXT,
  role          TEXT NOT NULL DEFAULT 'employee',  -- admin, manager, employee, time_approver, client_approver, payroll
  department    TEXT,
  employee_id   TEXT,              -- external employee ID / badge number
  employee_type TEXT,              -- WE, MBP, CNDH, CNDC — for report stratification
  manager_id    UUID REFERENCES employees(id),
  client_id     UUID,              -- FK added after clients table
  hourly_rate   NUMERIC(10,2) DEFAULT 0,
  bill_rate     NUMERIC(10,2),
  overtime_rate NUMERIC(10,2),
  hire_date     DATE,
  state         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  is_exempt     BOOLEAN NOT NULL DEFAULT false,
  mybase_payroll_id TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- clients
CREATE TABLE clients (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  code            TEXT,
  contact_name    TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  contact_person  TEXT,
  address         TEXT,
  city            TEXT,
  state           TEXT,
  zip             TEXT,
  bill_rate       NUMERIC(10,2),
  contract_start  DATE,
  contract_end    DATE,
  billing_details TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Add FK from employees → clients now that clients table exists
ALTER TABLE employees ADD CONSTRAINT fk_employees_client
  FOREIGN KEY (client_id) REFERENCES clients(id);

-- projects
CREATE TABLE projects (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id       UUID REFERENCES clients(id),
  name            TEXT NOT NULL,
  code            TEXT,
  short_name      TEXT,
  project_number  TEXT,
  description     TEXT,
  client_name     TEXT,           -- denormalized for quick display
  department      TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  status          TEXT DEFAULT 'active',
  start_date      DATE,
  end_date        DATE,
  budget          NUMERIC(10,2) DEFAULT 0,
  track_time      BOOLEAN DEFAULT true,
  track_expenses  BOOLEAN DEFAULT true,
  is_billable     BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- project_employees (assignment of people to projects with rates)
CREATE TABLE project_employees (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  pay_rate    NUMERIC(10,2),
  bill_rate   NUMERIC(10,2),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, employee_id)
);

-- time_approvers (who can approve time for which projects)
CREATE TABLE time_approvers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  can_approve BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, employee_id)
);

-- tasks (per-project task codes)
CREATE TABLE tasks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  code        TEXT,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- TIME TRACKING
-- ============================================================================

-- timesheets (weekly aggregation)
CREATE TABLE timesheets (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id         UUID NOT NULL REFERENCES employees(id),
  week_ending         DATE NOT NULL,
  total_hours         NUMERIC(8,2) DEFAULT 0,
  overtime_hours      NUMERIC(8,2) DEFAULT 0,
  status              timesheet_status NOT NULL DEFAULT 'draft',
  submitted_at        TIMESTAMPTZ,
  approved_at         TIMESTAMPTZ,
  approved_by         UUID REFERENCES employees(id),
  payroll_approved_at TIMESTAMPTZ,
  rejection_reason    TEXT,
  comments            TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, week_ending)
);

-- timesheet_entries (daily line items per project)
CREATE TABLE timesheet_entries (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timesheet_id UUID NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
  project_id   UUID REFERENCES projects(id),
  date         DATE NOT NULL,
  hours        NUMERIC(6,2) NOT NULL DEFAULT 0,
  description  TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- EXPENSE TRACKING
-- ============================================================================

-- expense_categories
CREATE TABLE expense_categories (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT NOT NULL,
  code           TEXT,
  description    TEXT,
  spending_limit NUMERIC(10,2),
  is_billable    BOOLEAN DEFAULT true,
  requires_receipt BOOLEAN DEFAULT true,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- expense_reports (monthly/period aggregation)
CREATE TABLE expense_reports (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id    UUID NOT NULL REFERENCES employees(id),
  title          TEXT,
  period_month   TEXT,            -- e.g. '2026-04'
  status         expense_status NOT NULL DEFAULT 'draft',
  total_amount   NUMERIC(10,2) DEFAULT 0,
  submitted_at   TIMESTAMPTZ,
  approved_at    TIMESTAMPTZ,
  approved_by    UUID REFERENCES employees(id),
  rejection_reason TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- expenses (individual expense line items)
CREATE TABLE expenses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     UUID NOT NULL REFERENCES employees(id),
  report_id       UUID REFERENCES expense_reports(id) ON DELETE SET NULL,
  project_id      UUID REFERENCES projects(id),
  expense_date    DATE NOT NULL,
  category        TEXT NOT NULL,
  amount          NUMERIC(10,2) NOT NULL,
  description     TEXT,
  vendor          TEXT,
  payment_method  TEXT,
  receipt_url     TEXT,
  is_reimbursable BOOLEAN DEFAULT true,
  status          expense_status NOT NULL DEFAULT 'draft',
  submitted_at    TIMESTAMPTZ,
  approved_at     TIMESTAMPTZ,
  approved_by     UUID REFERENCES employees(id),
  rejection_reason TEXT,
  comments        TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- SETTINGS & ADMIN
-- ============================================================================

-- company_settings (singleton config row)
CREATE TABLE company_settings (
  id                           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timezone                     TEXT DEFAULT 'Central',
  currency                     TEXT DEFAULT 'USD',
  hide_company_name            BOOLEAN DEFAULT false,
  allowed_entry_date           DATE,
  email_notifications          BOOLEAN DEFAULT true,
  logout_timeout_minutes       INTEGER DEFAULT 30,
  -- Time settings
  time_enabled                 BOOLEAN DEFAULT true,
  use_user_rates               BOOLEAN DEFAULT false,
  use_user_reps                BOOLEAN DEFAULT false,
  use_tasks                    BOOLEAN DEFAULT false,
  use_attachments              BOOLEAN DEFAULT false,
  use_time_in_out              BOOLEAN DEFAULT false,
  use_clock_in_out             BOOLEAN DEFAULT false,
  allow_new_time_after_approval BOOLEAN DEFAULT false,
  changes_require_reason       BOOLEAN DEFAULT false,
  effective_date               DATE,
  time_accrual_display         TEXT DEFAULT 'hours',
  time_cycle                   TEXT DEFAULT 'weekly',
  ot_day_hours                 NUMERIC(4,1),
  ot_week_hours                NUMERIC(4,1) DEFAULT 40,
  dt_day_hours                 NUMERIC(4,1),
  time_increment_minutes       INTEGER DEFAULT 15,
  -- Expense settings
  expense_enabled              BOOLEAN DEFAULT true,
  expense_foreign_currencies   BOOLEAN DEFAULT false,
  expense_payment_memo         TEXT,
  -- Integration settings
  quickbooks_enabled           BOOLEAN DEFAULT false,
  quickbooks_config            JSONB DEFAULT '{}',
  tracker_rms_enabled          BOOLEAN DEFAULT false,
  tracker_rms_api_key          TEXT,
  tracker_rms_config           JSONB DEFAULT '{}',
  created_at                   TIMESTAMPTZ DEFAULT now(),
  updated_at                   TIMESTAMPTZ DEFAULT now()
);

-- approval_settings
CREATE TABLE approval_settings (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type                     TEXT NOT NULL,  -- 'time' or 'expense'
  use_additional_approvers BOOLEAN DEFAULT false,
  created_at               TIMESTAMPTZ DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now()
);

-- additional_approvers
CREATE TABLE additional_approvers (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  approval_setting_id UUID NOT NULL REFERENCES approval_settings(id) ON DELETE CASCADE,
  approver_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- audit_logs
CREATE TABLE audit_logs (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id   UUID REFERENCES employees(id),
  action    TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  metadata  JSONB DEFAULT '{}'
);

-- notification_logs
CREATE TABLE notification_logs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type              TEXT NOT NULL,
  notification_type TEXT,
  recipient_id      UUID,
  recipient_email   TEXT,
  sent_by           UUID,
  sent_at           TIMESTAMPTZ DEFAULT now(),
  email_sent        BOOLEAN DEFAULT false,
  metadata          JSONB DEFAULT '{}'
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_employees_role ON employees(role);
CREATE INDEX idx_employees_manager ON employees(manager_id);
CREATE INDEX idx_employees_active ON employees(is_active);
CREATE INDEX idx_employees_email ON employees(email);

CREATE INDEX idx_timesheets_employee ON timesheets(employee_id);
CREATE INDEX idx_timesheets_week ON timesheets(week_ending);
CREATE INDEX idx_timesheets_status ON timesheets(status);
CREATE INDEX idx_timesheets_emp_week ON timesheets(employee_id, week_ending);

CREATE INDEX idx_timesheet_entries_timesheet ON timesheet_entries(timesheet_id);
CREATE INDEX idx_timesheet_entries_project ON timesheet_entries(project_id);

CREATE INDEX idx_expenses_employee ON expenses(employee_id);
CREATE INDEX idx_expenses_report ON expenses(report_id);
CREATE INDEX idx_expenses_status ON expenses(status);

CREATE INDEX idx_expense_reports_employee ON expense_reports(employee_id);
CREATE INDEX idx_expense_reports_status ON expense_reports(status);

CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_projects_active ON projects(is_active);

CREATE INDEX idx_project_employees_project ON project_employees(project_id);
CREATE INDEX idx_project_employees_employee ON project_employees(employee_id);

CREATE INDEX idx_time_approvers_project ON time_approvers(project_id);
CREATE INDEX idx_time_approvers_employee ON time_approvers(employee_id);

-- ============================================================================
-- ROW LEVEL SECURITY (basic policies)
-- ============================================================================

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_approvers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE additional_approvers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all tables (app handles role checks client-side)
CREATE POLICY "Authenticated users can read employees"
  ON employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read clients"
  ON clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read projects"
  ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read timesheets"
  ON timesheets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read timesheet_entries"
  ON timesheet_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read expenses"
  ON expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read expense_reports"
  ON expense_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read project_employees"
  ON project_employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read time_approvers"
  ON time_approvers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read tasks"
  ON tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read expense_categories"
  ON expense_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read company_settings"
  ON company_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read approval_settings"
  ON approval_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read additional_approvers"
  ON additional_approvers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read audit_logs"
  ON audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read notification_logs"
  ON notification_logs FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert/update/delete (app handles authorization)
CREATE POLICY "Authenticated users can modify employees"
  ON employees FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can modify clients"
  ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can modify projects"
  ON projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can modify timesheets"
  ON timesheets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can modify timesheet_entries"
  ON timesheet_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can modify expenses"
  ON expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can modify expense_reports"
  ON expense_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can modify project_employees"
  ON project_employees FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can modify time_approvers"
  ON time_approvers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can modify tasks"
  ON tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can modify expense_categories"
  ON expense_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can modify company_settings"
  ON company_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can modify approval_settings"
  ON approval_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can modify additional_approvers"
  ON additional_approvers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can modify audit_logs"
  ON audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can modify notification_logs"
  ON notification_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- SEED: Default company settings row
-- ============================================================================

INSERT INTO company_settings (timezone, currency) VALUES ('Central', 'USD');

-- ============================================================================
-- STORAGE BUCKET for expense receipts
-- ============================================================================
-- Run via Supabase dashboard or API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('expense-receipts', 'expense-receipts', true);
