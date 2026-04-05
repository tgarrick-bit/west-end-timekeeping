-- Add date range and metadata columns to approval_delegations
ALTER TABLE approval_delegations ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE approval_delegations ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE approval_delegations ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE approval_delegations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
