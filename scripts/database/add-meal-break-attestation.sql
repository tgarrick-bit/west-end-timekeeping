-- Add meal/rest break attestation tracking to timesheets
-- Required for compliance in states with break laws (CA, OR, WA, CO)

ALTER TABLE timesheets
  ADD COLUMN IF NOT EXISTS meal_break_attestation BOOLEAN DEFAULT false;

COMMENT ON COLUMN timesheets.meal_break_attestation IS
  'Employee attested they received all required meal periods and rest breaks per state law';
