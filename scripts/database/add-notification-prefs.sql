-- Migration: Add notification preferences support
-- Option A: JSONB column on employees (simple)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS notification_prefs JSONB DEFAULT '{}';

-- Option B: Dedicated table (used by the API route)
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES employees(id) UNIQUE,
  email BOOLEAN DEFAULT true,
  browser BOOLEAN DEFAULT true,
  timesheets BOOLEAN DEFAULT true,
  expenses BOOLEAN DEFAULT true,
  deadlines BOOLEAN DEFAULT true,
  system BOOLEAN DEFAULT true,
  frequency TEXT DEFAULT 'immediate',
  quiet_hours_start TEXT DEFAULT '22:00',
  quiet_hours_end TEXT DEFAULT '08:00',
  quiet_hours_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read notification_preferences"
  ON notification_preferences FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can modify notification_preferences"
  ON notification_preferences FOR ALL TO authenticated USING (true) WITH CHECK (true);
