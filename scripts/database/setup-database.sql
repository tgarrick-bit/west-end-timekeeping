-- Database Setup Script for West End Workforce
-- Run this script to ensure your database has the correct structure

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types if they don't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('employee', 'client_approver', 'admin', 'payroll');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE timesheet_status AS ENUM ('draft', 'submitted', 'client_approved', 'payroll_approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE expense_status AS ENUM ('draft', 'submitted', 'client_approved', 'payroll_approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create or update clients table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    address TEXT,
    time_tracking_method VARCHAR(20) NOT NULL DEFAULT 'detailed' CHECK (time_tracking_method IN ('detailed', 'simple')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add address column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'address') THEN
        ALTER TABLE clients ADD COLUMN address TEXT;
    END IF;
END $$;

-- Insert sample clients if table is empty
INSERT INTO clients (id, name, contact_person, contact_email, contact_phone, address, time_tracking_method, is_active) 
SELECT 
    uuid_generate_v4(), 
    'Metro Hospital', 
    'Sarah Johnson', 
    'hr@metrohospital.com', 
    '+1-555-0101', 
    '123 Medical Center Dr, Healthcare City, HC 12345', 
    'detailed', 
    true
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE name = 'Metro Hospital');

INSERT INTO clients (id, name, contact_person, contact_email, contact_phone, address, time_tracking_method, is_active) 
SELECT 
    uuid_generate_v4(), 
    'Downtown Office', 
    'Mike Chen', 
    'admin@downtownoffice.com', 
    '+1-555-0102', 
    '456 Business Ave, Downtown, DT 67890', 
    'simple', 
    true
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE name = 'Downtown Office');

INSERT INTO clients (id, name, contact_person, contact_email, contact_phone, address, time_tracking_method, is_active) 
SELECT 
    uuid_generate_v4(), 
    'City Schools', 
    'Lisa Rodriguez', 
    'hr@cityschools.edu', 
    '+1-555-0103', 
    '789 Education Blvd, School District, SD 11111', 
    'detailed', 
    true
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE name = 'City Schools');

INSERT INTO clients (id, name, contact_person, contact_email, contact_phone, address, time_tracking_method, is_active) 
SELECT 
    uuid_generate_v4(), 
    'Riverside Manufacturing', 
    'David Thompson', 
    'operations@riversidemfg.com', 
    '+1-555-0104', 
    '321 Industrial Way, Riverside, RV 22222', 
    'simple', 
    true
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE name = 'Riverside Manufacturing');

INSERT INTO clients (id, name, contact_person, contact_email, contact_phone, address, time_tracking_method, is_active) 
SELECT 
    uuid_generate_v4(), 
    'Tech Consulting', 
    'Alex Kim', 
    'projects@techconsulting.com', 
    '+1-555-0105', 
    '654 Innovation St, Tech Hub, TH 33333', 
    'detailed', 
    true
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE name = 'Tech Consulting');

-- Create projects table if it doesn't exist
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id),
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on-hold')),
    budget DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample projects
INSERT INTO projects (id, name, client_id, description, start_date, budget) 
SELECT 
    uuid_generate_v4(), 
    'Nursing Staff Support', 
    c.id, 
    'Provide temporary nursing staff for various departments', 
    '2024-01-01', 
    50000.00
FROM clients c WHERE c.name = 'Metro Hospital' AND NOT EXISTS (
    SELECT 1 FROM projects WHERE name = 'Nursing Staff Support' AND client_id = c.id
);

INSERT INTO projects (id, name, client_id, description, start_date, budget) 
SELECT 
    uuid_generate_v4(), 
    'Security Services', 
    c.id, 
    'Provide security personnel for office building', 
    '2024-01-01', 
    30000.00
FROM clients c WHERE c.name = 'Downtown Office' AND NOT EXISTS (
    SELECT 1 FROM projects WHERE name = 'Security Services' AND client_id = c.id
);

INSERT INTO projects (id, name, client_id, description, start_date, budget) 
SELECT 
    uuid_generate_v4(), 
    'Substitute Teacher Pool', 
    c.id, 
    'Provide qualified substitute teachers for various schools', 
    '2024-01-01', 
    40000.00
FROM clients c WHERE c.name = 'City Schools' AND NOT EXISTS (
    SELECT 1 FROM projects WHERE name = 'Substitute Teacher Pool' AND client_id = c.id
);

INSERT INTO projects (id, name, client_id, description, start_date, budget) 
SELECT 
    uuid_generate_v4(), 
    'Assembly Line Workers', 
    c.id, 
    'Provide temporary workers for manufacturing assembly line', 
    '2024-01-01', 
    35000.00
FROM clients c WHERE c.name = 'Riverside Manufacturing' AND NOT EXISTS (
    SELECT 1 FROM projects WHERE name = 'Assembly Line Workers' AND client_id = c.id
);

INSERT INTO projects (id, name, client_id, description, start_date, budget) 
SELECT 
    uuid_generate_v4(), 
    'Software Development Team', 
    c.id, 
    'Provide software developers for consulting projects', 
    '2024-01-01', 
    75000.00
FROM clients c WHERE c.name = 'Tech Consulting' AND NOT EXISTS (
    SELECT 1 FROM projects WHERE name = 'Software Development Team' AND client_id = c.id
);

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Display the results
SELECT 'Database setup completed successfully!' as status;
SELECT COUNT(*) as total_clients FROM clients;
SELECT COUNT(*) as total_projects FROM projects;
