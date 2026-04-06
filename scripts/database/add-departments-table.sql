-- ============================================================================
-- Add departments table + department_id FK on employees and projects
-- Applied: 2026-04-05
-- ============================================================================

-- 1. Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  code        TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, name)
);

CREATE INDEX IF NOT EXISTS idx_departments_client ON departments(client_id);

-- 2. RLS policies (references employees only — avoids project_employees recursion)
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY departments_select ON departments
  FOR SELECT USING (
    is_admin()
    OR client_id IN (SELECT client_id FROM employees WHERE id = auth.uid())
  );

CREATE POLICY departments_insert ON departments
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY departments_update ON departments
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY departments_delete ON departments
  FOR DELETE USING (is_admin());

-- 3. Add department_id FK to employees and projects (nullable, optional)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id);

CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_projects_department ON projects(department_id);
