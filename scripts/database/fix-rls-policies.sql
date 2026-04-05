-- ============================================================================
-- West End Workforce Timekeeping — RLS Policy Fix
-- Generated 2026-04-04
-- Replaces all permissive USING(true) policies with proper role-based access
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.employees WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.employees WHERE id = auth.uid() AND role = 'admin')
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper to check if user manages an employee
CREATE OR REPLACE FUNCTION public.is_manager_of(employee_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.employees WHERE id = employee_uuid AND manager_id = auth.uid())
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper to check if user is a time approver for a project
CREATE OR REPLACE FUNCTION public.is_approver_for_project(project_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.time_approvers
    WHERE project_id = project_uuid
      AND employee_id = auth.uid()
      AND can_approve = true
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- DROP ALL EXISTING POLICIES
-- ============================================================================

-- employees
DROP POLICY IF EXISTS "Authenticated users can read employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can modify employees" ON employees;

-- clients
DROP POLICY IF EXISTS "Authenticated users can read clients" ON clients;
DROP POLICY IF EXISTS "Authenticated users can modify clients" ON clients;

-- projects
DROP POLICY IF EXISTS "Authenticated users can read projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can modify projects" ON projects;

-- timesheets
DROP POLICY IF EXISTS "Authenticated users can read timesheets" ON timesheets;
DROP POLICY IF EXISTS "Authenticated users can modify timesheets" ON timesheets;

-- timesheet_entries
DROP POLICY IF EXISTS "Authenticated users can read timesheet_entries" ON timesheet_entries;
DROP POLICY IF EXISTS "Authenticated users can modify timesheet_entries" ON timesheet_entries;

-- expenses
DROP POLICY IF EXISTS "Authenticated users can read expenses" ON expenses;
DROP POLICY IF EXISTS "Authenticated users can modify expenses" ON expenses;

-- expense_reports
DROP POLICY IF EXISTS "Authenticated users can read expense_reports" ON expense_reports;
DROP POLICY IF EXISTS "Authenticated users can modify expense_reports" ON expense_reports;

-- project_employees
DROP POLICY IF EXISTS "Authenticated users can read project_employees" ON project_employees;
DROP POLICY IF EXISTS "Authenticated users can modify project_employees" ON project_employees;

-- time_approvers
DROP POLICY IF EXISTS "Authenticated users can read time_approvers" ON time_approvers;
DROP POLICY IF EXISTS "Authenticated users can modify time_approvers" ON time_approvers;

-- tasks
DROP POLICY IF EXISTS "Authenticated users can read tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated users can modify tasks" ON tasks;

-- expense_categories
DROP POLICY IF EXISTS "Authenticated users can read expense_categories" ON expense_categories;
DROP POLICY IF EXISTS "Authenticated users can modify expense_categories" ON expense_categories;

-- company_settings
DROP POLICY IF EXISTS "Authenticated users can read company_settings" ON company_settings;
DROP POLICY IF EXISTS "Authenticated users can modify company_settings" ON company_settings;

-- approval_settings
DROP POLICY IF EXISTS "Authenticated users can read approval_settings" ON approval_settings;
DROP POLICY IF EXISTS "Authenticated users can modify approval_settings" ON approval_settings;

-- additional_approvers
DROP POLICY IF EXISTS "Authenticated users can read additional_approvers" ON additional_approvers;
DROP POLICY IF EXISTS "Authenticated users can modify additional_approvers" ON additional_approvers;

-- audit_logs
DROP POLICY IF EXISTS "Authenticated users can read audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "Authenticated users can modify audit_logs" ON audit_logs;

-- notification_logs
DROP POLICY IF EXISTS "Authenticated users can read notification_logs" ON notification_logs;
DROP POLICY IF EXISTS "Authenticated users can modify notification_logs" ON notification_logs;

-- ============================================================================
-- EMPLOYEES TABLE POLICIES
-- ============================================================================

-- SELECT: Own record, managed employees, or admin sees all
CREATE POLICY "employees_select"
  ON employees FOR SELECT TO authenticated
  USING (
    id = auth.uid()                          -- own record
    OR manager_id = auth.uid()               -- managed by me
    OR public.is_admin()                     -- admin sees all
  );

-- UPDATE: Own non-role fields, or admin updates all
CREATE POLICY "employees_update"
  ON employees FOR UPDATE TO authenticated
  USING (
    id = auth.uid()                          -- can update own record
    OR public.is_admin()                     -- admin can update anyone
  )
  WITH CHECK (
    CASE
      WHEN public.is_admin() THEN true       -- admin can change anything
      WHEN id = auth.uid() THEN
        -- Non-admins cannot change their own role or is_active
        role = (SELECT role FROM employees WHERE id = auth.uid())
        AND is_active = (SELECT is_active FROM employees WHERE id = auth.uid())
      ELSE false
    END
  );

-- INSERT: Admin only
CREATE POLICY "employees_insert"
  ON employees FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- DELETE: Admin only
CREATE POLICY "employees_delete"
  ON employees FOR DELETE TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- TIMESHEETS TABLE POLICIES
-- ============================================================================

-- SELECT: Own, managed employees', or admin sees all
CREATE POLICY "timesheets_select"
  ON timesheets FOR SELECT TO authenticated
  USING (
    employee_id = auth.uid()                 -- own timesheets
    OR public.is_manager_of(employee_id)     -- my team's timesheets
    OR public.is_admin()                     -- admin sees all
  );

-- INSERT: Own timesheets only, or admin
CREATE POLICY "timesheets_insert"
  ON timesheets FOR INSERT TO authenticated
  WITH CHECK (
    employee_id = auth.uid()
    OR public.is_admin()
  );

-- UPDATE: Owner can modify drafts/rejected. Manager can update status of team's. Admin all.
CREATE POLICY "timesheets_update"
  ON timesheets FOR UPDATE TO authenticated
  USING (
    (employee_id = auth.uid() AND status IN ('draft', 'rejected'))
    OR public.is_manager_of(employee_id)
    OR public.is_admin()
  )
  WITH CHECK (
    (employee_id = auth.uid() AND status IN ('draft', 'rejected', 'submitted'))
    OR public.is_manager_of(employee_id)
    OR public.is_admin()
  );

-- DELETE: Owner of draft only. Admin all.
CREATE POLICY "timesheets_delete"
  ON timesheets FOR DELETE TO authenticated
  USING (
    (employee_id = auth.uid() AND status = 'draft')
    OR public.is_admin()
  );

-- ============================================================================
-- TIMESHEET_ENTRIES TABLE POLICIES
-- ============================================================================

-- SELECT: Via parent timesheet ownership
CREATE POLICY "timesheet_entries_select"
  ON timesheet_entries FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM timesheets t
      WHERE t.id = timesheet_entries.timesheet_id
        AND (
          t.employee_id = auth.uid()
          OR public.is_manager_of(t.employee_id)
          OR public.is_admin()
        )
    )
  );

-- INSERT: Only if parent timesheet is own and in draft/rejected, or admin
CREATE POLICY "timesheet_entries_insert"
  ON timesheet_entries FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM timesheets t
      WHERE t.id = timesheet_entries.timesheet_id
        AND (
          (t.employee_id = auth.uid() AND t.status IN ('draft', 'rejected'))
          OR public.is_admin()
        )
    )
  );

-- UPDATE: Same as insert
CREATE POLICY "timesheet_entries_update"
  ON timesheet_entries FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM timesheets t
      WHERE t.id = timesheet_entries.timesheet_id
        AND (
          (t.employee_id = auth.uid() AND t.status IN ('draft', 'rejected'))
          OR public.is_admin()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM timesheets t
      WHERE t.id = timesheet_entries.timesheet_id
        AND (
          (t.employee_id = auth.uid() AND t.status IN ('draft', 'rejected'))
          OR public.is_admin()
        )
    )
  );

-- DELETE: Owner of draft parent only, or admin
CREATE POLICY "timesheet_entries_delete"
  ON timesheet_entries FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM timesheets t
      WHERE t.id = timesheet_entries.timesheet_id
        AND (
          (t.employee_id = auth.uid() AND t.status = 'draft')
          OR public.is_admin()
        )
    )
  );

-- ============================================================================
-- EXPENSE_REPORTS TABLE POLICIES
-- ============================================================================

-- SELECT: Own, managed employees', or admin
CREATE POLICY "expense_reports_select"
  ON expense_reports FOR SELECT TO authenticated
  USING (
    employee_id = auth.uid()
    OR public.is_manager_of(employee_id)
    OR public.is_admin()
  );

-- INSERT: Own or admin
CREATE POLICY "expense_reports_insert"
  ON expense_reports FOR INSERT TO authenticated
  WITH CHECK (
    employee_id = auth.uid()
    OR public.is_admin()
  );

-- UPDATE: Owner can modify drafts/rejected. Manager can update team's. Admin all.
CREATE POLICY "expense_reports_update"
  ON expense_reports FOR UPDATE TO authenticated
  USING (
    (employee_id = auth.uid() AND status IN ('draft', 'rejected'))
    OR public.is_manager_of(employee_id)
    OR public.is_admin()
  )
  WITH CHECK (
    (employee_id = auth.uid() AND status IN ('draft', 'rejected', 'submitted'))
    OR public.is_manager_of(employee_id)
    OR public.is_admin()
  );

-- DELETE: Owner of draft only. Admin all.
CREATE POLICY "expense_reports_delete"
  ON expense_reports FOR DELETE TO authenticated
  USING (
    (employee_id = auth.uid() AND status = 'draft')
    OR public.is_admin()
  );

-- ============================================================================
-- EXPENSES TABLE POLICIES
-- ============================================================================

-- SELECT: Own, managed employees', or admin
CREATE POLICY "expenses_select"
  ON expenses FOR SELECT TO authenticated
  USING (
    employee_id = auth.uid()
    OR public.is_manager_of(employee_id)
    OR public.is_admin()
  );

-- INSERT: Own or admin
CREATE POLICY "expenses_insert"
  ON expenses FOR INSERT TO authenticated
  WITH CHECK (
    employee_id = auth.uid()
    OR public.is_admin()
  );

-- UPDATE: Owner can modify drafts/rejected. Manager can update team's. Admin all.
CREATE POLICY "expenses_update"
  ON expenses FOR UPDATE TO authenticated
  USING (
    (employee_id = auth.uid() AND status IN ('draft', 'rejected'))
    OR public.is_manager_of(employee_id)
    OR public.is_admin()
  )
  WITH CHECK (
    (employee_id = auth.uid() AND status IN ('draft', 'rejected', 'submitted'))
    OR public.is_manager_of(employee_id)
    OR public.is_admin()
  );

-- DELETE: Owner of draft only. Admin all.
CREATE POLICY "expenses_delete"
  ON expenses FOR DELETE TO authenticated
  USING (
    (employee_id = auth.uid() AND status = 'draft')
    OR public.is_admin()
  );

-- ============================================================================
-- CLIENTS TABLE POLICIES
-- ============================================================================

-- SELECT: Employees see clients for projects they're assigned to. Manager sees team's. Admin all.
CREATE POLICY "clients_select"
  ON clients FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM project_employees pe
      JOIN projects p ON p.id = pe.project_id
      WHERE p.client_id = clients.id
        AND pe.employee_id = auth.uid()
    )
    OR EXISTS (
      -- Manager sees clients where any of their team is assigned
      SELECT 1 FROM project_employees pe
      JOIN projects p ON p.id = pe.project_id
      JOIN employees e ON e.id = pe.employee_id
      WHERE p.client_id = clients.id
        AND e.manager_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE: Admin only
CREATE POLICY "clients_insert"
  ON clients FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "clients_update"
  ON clients FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "clients_delete"
  ON clients FOR DELETE TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- PROJECTS TABLE POLICIES
-- ============================================================================

-- SELECT: Assigned employees, managers of assigned employees, or admin
CREATE POLICY "projects_select"
  ON projects FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM project_employees pe
      WHERE pe.project_id = projects.id
        AND pe.employee_id = auth.uid()
    )
    OR EXISTS (
      -- Manager sees projects where any of their team is assigned
      SELECT 1 FROM project_employees pe
      JOIN employees e ON e.id = pe.employee_id
      WHERE pe.project_id = projects.id
        AND e.manager_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE: Admin only
CREATE POLICY "projects_insert"
  ON projects FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "projects_update"
  ON projects FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "projects_delete"
  ON projects FOR DELETE TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- PROJECT_EMPLOYEES TABLE POLICIES
-- ============================================================================

-- SELECT: See assignments for projects you're on, team's projects, or admin
CREATE POLICY "project_employees_select"
  ON project_employees FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM project_employees pe2
      WHERE pe2.project_id = project_employees.project_id
        AND pe2.employee_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = project_employees.employee_id
        AND e.manager_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE: Admin only
CREATE POLICY "project_employees_insert"
  ON project_employees FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "project_employees_update"
  ON project_employees FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "project_employees_delete"
  ON project_employees FOR DELETE TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- TIME_APPROVERS TABLE POLICIES
-- ============================================================================

-- SELECT: See approvers for your projects, team's projects, or admin
CREATE POLICY "time_approvers_select"
  ON time_approvers FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM project_employees pe
      WHERE pe.project_id = time_approvers.project_id
        AND pe.employee_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = time_approvers.employee_id
        AND e.manager_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE: Admin only
CREATE POLICY "time_approvers_insert"
  ON time_approvers FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "time_approvers_update"
  ON time_approvers FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "time_approvers_delete"
  ON time_approvers FOR DELETE TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- TASKS TABLE POLICIES
-- ============================================================================

-- SELECT: See tasks for projects you're assigned to, team's projects, or admin
CREATE POLICY "tasks_select"
  ON tasks FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM project_employees pe
      WHERE pe.project_id = tasks.project_id
        AND pe.employee_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM project_employees pe
      JOIN employees e ON e.id = pe.employee_id
      WHERE pe.project_id = tasks.project_id
        AND e.manager_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE: Admin only
CREATE POLICY "tasks_insert"
  ON tasks FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "tasks_update"
  ON tasks FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "tasks_delete"
  ON tasks FOR DELETE TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- EXPENSE_CATEGORIES TABLE POLICIES
-- ============================================================================

-- SELECT: All authenticated users
CREATE POLICY "expense_categories_select"
  ON expense_categories FOR SELECT TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE: Admin only
CREATE POLICY "expense_categories_insert"
  ON expense_categories FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "expense_categories_update"
  ON expense_categories FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "expense_categories_delete"
  ON expense_categories FOR DELETE TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- COMPANY_SETTINGS TABLE POLICIES
-- ============================================================================

-- SELECT: All authenticated (needed for app config)
CREATE POLICY "company_settings_select"
  ON company_settings FOR SELECT TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE: Admin only
CREATE POLICY "company_settings_insert"
  ON company_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "company_settings_update"
  ON company_settings FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "company_settings_delete"
  ON company_settings FOR DELETE TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- APPROVAL_SETTINGS TABLE POLICIES
-- ============================================================================

-- Admin only for all operations
CREATE POLICY "approval_settings_select"
  ON approval_settings FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "approval_settings_insert"
  ON approval_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "approval_settings_update"
  ON approval_settings FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "approval_settings_delete"
  ON approval_settings FOR DELETE TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- ADDITIONAL_APPROVERS TABLE POLICIES
-- ============================================================================

-- Admin only for all operations
CREATE POLICY "additional_approvers_select"
  ON additional_approvers FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "additional_approvers_insert"
  ON additional_approvers FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "additional_approvers_update"
  ON additional_approvers FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "additional_approvers_delete"
  ON additional_approvers FOR DELETE TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- AUDIT_LOGS TABLE POLICIES
-- ============================================================================

-- SELECT: Admin only
CREATE POLICY "audit_logs_select"
  ON audit_logs FOR SELECT TO authenticated
  USING (public.is_admin());

-- INSERT: All authenticated (so actions get logged)
CREATE POLICY "audit_logs_insert"
  ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- UPDATE/DELETE: Admin only
CREATE POLICY "audit_logs_update"
  ON audit_logs FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "audit_logs_delete"
  ON audit_logs FOR DELETE TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- NOTIFICATION_LOGS TABLE POLICIES
-- ============================================================================

-- Admin only for all operations
CREATE POLICY "notification_logs_select"
  ON notification_logs FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "notification_logs_insert"
  ON notification_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "notification_logs_update"
  ON notification_logs FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "notification_logs_delete"
  ON notification_logs FOR DELETE TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- NOTIFICATION PREFERENCES TABLE (create if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  email       BOOLEAN NOT NULL DEFAULT true,
  browser     BOOLEAN NOT NULL DEFAULT true,
  timesheets  BOOLEAN NOT NULL DEFAULT true,
  expenses    BOOLEAN NOT NULL DEFAULT true,
  deadlines   BOOLEAN NOT NULL DEFAULT true,
  system      BOOLEAN NOT NULL DEFAULT true,
  frequency   TEXT NOT NULL DEFAULT 'immediate',
  quiet_hours_start TEXT DEFAULT '22:00',
  quiet_hours_end   TEXT DEFAULT '08:00',
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own preferences. Admin can read all.
CREATE POLICY "notification_preferences_select"
  ON notification_preferences FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin()
  );

CREATE POLICY "notification_preferences_insert"
  ON notification_preferences FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notification_preferences_update"
  ON notification_preferences FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notification_preferences_delete"
  ON notification_preferences FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
