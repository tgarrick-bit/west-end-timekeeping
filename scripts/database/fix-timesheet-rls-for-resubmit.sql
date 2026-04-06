-- Fix: allow employees to re-edit submitted timesheets
-- Applied: 2026-04-06
--
-- The original policies only allowed employees to update timesheets in
-- 'draft' or 'rejected' status. This blocked the re-edit flow where:
-- 1. Employee opens a submitted timesheet to make changes
-- 2. Entry page resets status to 'draft'
-- 3. Entries are replaced
-- 4. Status API transitions back to 'submitted'
--
-- Step 2 was blocked because the USING clause didn't include 'submitted'.
-- Same issue applied to timesheet_entries insert/update/delete.

DROP POLICY IF EXISTS timesheets_update ON timesheets;
CREATE POLICY timesheets_update ON timesheets
  FOR UPDATE USING (
    ((employee_id = auth.uid()) AND (status = ANY (ARRAY['draft'::timesheet_status, 'rejected'::timesheet_status, 'submitted'::timesheet_status])))
    OR is_manager_of(employee_id)
    OR is_admin()
  )
  WITH CHECK (
    ((employee_id = auth.uid()) AND (status = ANY (ARRAY['draft'::timesheet_status, 'rejected'::timesheet_status, 'submitted'::timesheet_status])))
    OR is_manager_of(employee_id)
    OR is_admin()
  );

DROP POLICY IF EXISTS timesheet_entries_insert ON timesheet_entries;
CREATE POLICY timesheet_entries_insert ON timesheet_entries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM timesheets t
      WHERE t.id = timesheet_entries.timesheet_id
      AND (
        ((t.employee_id = auth.uid()) AND (t.status = ANY (ARRAY['draft'::timesheet_status, 'rejected'::timesheet_status, 'submitted'::timesheet_status])))
        OR is_admin()
      )
    )
  );

DROP POLICY IF EXISTS timesheet_entries_delete ON timesheet_entries;
CREATE POLICY timesheet_entries_delete ON timesheet_entries
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM timesheets t
      WHERE t.id = timesheet_entries.timesheet_id
      AND (
        ((t.employee_id = auth.uid()) AND (t.status = ANY (ARRAY['draft'::timesheet_status, 'rejected'::timesheet_status, 'submitted'::timesheet_status])))
        OR is_admin()
      )
    )
  );

DROP POLICY IF EXISTS timesheet_entries_update ON timesheet_entries;
CREATE POLICY timesheet_entries_update ON timesheet_entries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM timesheets t
      WHERE t.id = timesheet_entries.timesheet_id
      AND (
        ((t.employee_id = auth.uid()) AND (t.status = ANY (ARRAY['draft'::timesheet_status, 'rejected'::timesheet_status, 'submitted'::timesheet_status])))
        OR is_admin()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM timesheets t
      WHERE t.id = timesheet_entries.timesheet_id
      AND (
        ((t.employee_id = auth.uid()) AND (t.status = ANY (ARRAY['draft'::timesheet_status, 'rejected'::timesheet_status, 'submitted'::timesheet_status])))
        OR is_admin()
      )
    )
  );
