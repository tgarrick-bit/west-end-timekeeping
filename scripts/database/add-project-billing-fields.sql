-- Migration: Add billing/invoicing/time-settings columns to projects table
-- Run this in Supabase SQL Editor

ALTER TABLE projects ADD COLUMN IF NOT EXISTS billing_rate NUMERIC(10,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS active_po TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS invoice_item TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS time_type TEXT DEFAULT 'hourly';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS max_daily_hours NUMERIC(4,1) DEFAULT 24;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS time_increment NUMERIC(4,2) DEFAULT 0.25;
