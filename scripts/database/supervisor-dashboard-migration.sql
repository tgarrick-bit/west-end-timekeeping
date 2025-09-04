-- SUPERVISOR DASHBOARD ENHANCEMENT MIGRATION
-- Customized for YOUR database structure with project_assignments

-- 1. Support for bulk approvals
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS batch_approval_id UUID;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS approved_in_bulk BOOLEAN DEFAULT false;

-- 2. Multiple projects per timesheet entry
CREATE TABLE IF NOT EXISTS timesheet_entry_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_entry_id UUID REFERENCES timesheet_entries(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  hours DECIMAL(4,2) NOT NULL,
  overtime_hours DECIMAL(4,2) DEFAULT 0,
  double_overtime_hours DECIMAL(4,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(timesheet_entry_id, project_id)
);

-- 3. Project end dates and visibility
ALTER TABLE projects ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS visibility_mode VARCHAR(20) DEFAULT 'all';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 4. Project assignment end dates (using YOUR project_assignments table)
ALTER TABLE project_assignments ADD COLUMN IF NOT EXISTS assignment_end_date DATE;
ALTER TABLE project_assignments ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 5. Add bulk approval support to expense_reports too
ALTER TABLE expense_reports ADD COLUMN IF NOT EXISTS batch_approval_id UUID;
ALTER TABLE expense_reports ADD COLUMN IF NOT EXISTS approved_in_bulk BOOLEAN DEFAULT false;

-- 6. Overtime rules table
CREATE TABLE IF NOT EXISTS overtime_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code VARCHAR(2) NOT NULL UNIQUE,
  daily_threshold DECIMAL(4,2) DEFAULT 8.0,
  weekly_threshold DECIMAL(4,2) DEFAULT 40.0,
  daily_double_threshold DECIMAL(4,2),
  weekly_double_threshold DECIMAL(4,2),
  seventh_day_rule BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. California compliance tracking
CREATE TABLE IF NOT EXISTS timesheet_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id UUID REFERENCES timesheets(id) ON DELETE CASCADE,
  hours_accurate BOOLEAN NOT NULL,
  breaks_taken BOOLEAN NOT NULL,
  no_injuries BOOLEAN NOT NULL,
  certified_at TIMESTAMP DEFAULT NOW(),
  certified_by UUID REFERENCES users(id)
);

-- 8. Clock entries for future clock in/out
CREATE TABLE IF NOT EXISTS clock_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES users(id),
  project_id UUID REFERENCES projects(id),
  clock_in TIMESTAMP NOT NULL,
  clock_out TIMESTAMP,
  break_minutes INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 9. Insert California overtime rules
INSERT INTO overtime_rules (state_code, daily_threshold, weekly_threshold, daily_double_threshold, seventh_day_rule)
VALUES ('CA', 8.0, 40.0, 12.0, true)
ON CONFLICT (state_code) DO NOTHING;

-- 10. Create indexes for performance (FIXED - removed week_ending reference)
CREATE INDEX IF NOT EXISTS idx_timesheets_batch_approval ON timesheets(batch_approval_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_status ON timesheets(status);
CREATE INDEX IF NOT EXISTS idx_projects_active ON projects(is_active);
CREATE INDEX IF NOT EXISTS idx_project_assignments_active ON project_assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_expense_reports_batch ON expense_reports(batch_approval_id);