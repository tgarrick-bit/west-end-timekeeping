-- add-tracker-fields.sql
-- Adds Tracker RMS integration columns and indexes for placement sync

-- Track which Tracker placement each project_employee assignment came from
ALTER TABLE project_employees ADD COLUMN IF NOT EXISTS tracker_placement_id INTEGER;

-- Track which Tracker resource (candidate) each employee maps to
ALTER TABLE employees ADD COLUMN IF NOT EXISTS tracker_resource_id INTEGER;

-- Track which Tracker opportunity (job order) each project maps to
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tracker_opportunity_id INTEGER;

-- Track which Tracker client each client maps to
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tracker_client_id INTEGER;

-- Indexes for fast lookup during sync
CREATE INDEX IF NOT EXISTS idx_pe_tracker ON project_employees(tracker_placement_id);
CREATE INDEX IF NOT EXISTS idx_emp_tracker ON employees(tracker_resource_id);
CREATE INDEX IF NOT EXISTS idx_proj_tracker ON projects(tracker_opportunity_id);
CREATE INDEX IF NOT EXISTS idx_client_tracker ON clients(tracker_client_id);
