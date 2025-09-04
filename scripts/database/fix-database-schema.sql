-- Fix Database Schema - Add Missing Address Column
-- Run this script in your Supabase SQL editor to fix the schema mismatch

-- Add the missing address column to the clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address TEXT;

-- Update existing clients to have a default address if they don't have one
UPDATE clients 
SET address = 'Address not specified' 
WHERE address IS NULL;

-- Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'clients' 
ORDER BY ordinal_position;

-- Show sample data
SELECT name, contact_person, contact_email, contact_phone, address, time_tracking_method, is_active 
FROM clients 
LIMIT 5;
