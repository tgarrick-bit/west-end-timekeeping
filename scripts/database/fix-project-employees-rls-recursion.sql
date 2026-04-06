-- Fix: infinite recursion in project_employees_select RLS policy
-- Applied: 2026-04-05
--
-- The original policy had a self-referencing EXISTS clause:
--   EXISTS (SELECT 1 FROM project_employees pe2 WHERE pe2.project_id = project_employees.project_id AND pe2.employee_id = auth.uid())
-- This caused infinite recursion when evaluating RLS on project_employees,
-- which also broke clients_select and projects_select (they reference project_employees).
--
-- Fix: Remove the self-referencing clause. The remaining conditions cover all cases:
--   - is_admin() → admins see all
--   - employee_id = auth.uid() → see your own assignments
--   - manager check → managers see their reports' assignments

DROP POLICY IF EXISTS project_employees_select ON project_employees;
CREATE POLICY project_employees_select ON project_employees
  FOR SELECT USING (
    is_admin()
    OR (employee_id = auth.uid())
    OR (EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = project_employees.employee_id
      AND e.manager_id = auth.uid()
    ))
  );
