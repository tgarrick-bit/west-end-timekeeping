-- Add employee_type column to employees table
-- Values: 'WE' (West End), 'MBP', 'CNDH', 'CNDC'
-- Used for reporting and consultant type stratification (Test 20)

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS employee_type TEXT DEFAULT NULL;

COMMENT ON COLUMN employees.employee_type IS 'Consultant type: WE, MBP, CNDH, CNDC — used for report stratification';
