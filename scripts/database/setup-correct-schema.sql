-- West End Workforce Database Setup Script
-- Run this in your Supabase SQL editor to create all necessary tables

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE user_role AS ENUM ('employee', 'client_approver', 'admin', 'payroll');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE timesheet_status AS ENUM ('draft', 'submitted', 'client_approved', 'payroll_approved', 'rejected');
CREATE TYPE expense_status AS ENUM ('draft', 'submitted', 'client_approved', 'payroll_approved', 'rejected');

-- Users table (employees, client approvers, admins, payroll)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'employee',
    client_id UUID, -- Only for client_approver role
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clients table (external companies)
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    time_tracking_method VARCHAR(20) NOT NULL DEFAULT 'detailed' CHECK (time_tracking_method IN ('detailed', 'simple')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table
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

-- Project assignments (which users work on which projects)
CREATE TABLE IF NOT EXISTS project_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    project_id UUID NOT NULL REFERENCES projects(id),
    start_date DATE NOT NULL,
    end_date DATE,
    hourly_rate DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, project_id, start_date)
);

-- Tasks table (project-specific tasks/codes)
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, code)
);

-- Time entries (daily time tracking)
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    project_id UUID NOT NULL REFERENCES projects(id),
    task_id UUID NOT NULL REFERENCES tasks(id),
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    total_hours INTEGER NOT NULL, -- Stored in minutes for precision
    notes TEXT,
    location VARCHAR(255),
    is_submitted BOOLEAN NOT NULL DEFAULT false,
    is_approved BOOLEAN NOT NULL DEFAULT false,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Timesheets (weekly aggregation)
CREATE TABLE IF NOT EXISTS timesheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    total_hours INTEGER NOT NULL DEFAULT 0, -- Stored in minutes
    status timesheet_status NOT NULL DEFAULT 'draft',
    submitted_at TIMESTAMP WITH TIME ZONE,
    client_approved_at TIMESTAMP WITH TIME ZONE,
    payroll_approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, week_start_date)
);

-- Expense categories
CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    spending_limit DECIMAL(10,2),
    is_billable BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expense items
CREATE TABLE IF NOT EXISTS expense_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    project_id UUID REFERENCES projects(id), -- Optional, can be personal expense
    category_id UUID NOT NULL REFERENCES expense_categories(id),
    date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    receipt_url TEXT,
    is_billable BOOLEAN NOT NULL DEFAULT true,
    is_submitted BOOLEAN NOT NULL DEFAULT false,
    is_approved BOOLEAN NOT NULL DEFAULT false,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expense reports (monthly aggregation)
CREATE TABLE IF NOT EXISTS expense_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    year INTEGER NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status expense_status NOT NULL DEFAULT 'draft',
    submitted_at TIMESTAMP WITH TIME ZONE,
    client_approved_at TIMESTAMP WITH TIME ZONE,
    payroll_approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, month, year)
);

-- Rate tables for flexible rate management
CREATE TABLE IF NOT EXISTS rate_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rate entries (specific rates for user+project combinations)
CREATE TABLE IF NOT EXISTS rate_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rate_table_id UUID NOT NULL REFERENCES rate_tables(id),
    user_id UUID REFERENCES users(id), -- Optional, for user-specific rates
    project_id UUID REFERENCES projects(id), -- Optional, for project-specific rates
    hourly_rate DECIMAL(10,2) NOT NULL,
    effective_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Approvals table (multi-level approval workflow)
CREATE TABLE IF NOT EXISTS approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    approver_id UUID NOT NULL REFERENCES users(id),
    approver_type VARCHAR(20) NOT NULL CHECK (approver_type IN ('client', 'payroll')),
    timesheet_id UUID REFERENCES timesheets(id),
    expense_report_id UUID REFERENCES expense_reports(id),
    status approval_status NOT NULL DEFAULT 'pending',
    comments TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (
        (timesheet_id IS NOT NULL AND expense_report_id IS NULL) OR
        (timesheet_id IS NULL AND expense_report_id IS NOT NULL)
    )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_client_id ON users(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_user_id ON project_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_project_id ON project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project_id ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);
CREATE INDEX IF NOT EXISTS idx_timesheets_user_id ON timesheets(user_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_status ON timesheets(status);
CREATE INDEX IF NOT EXISTS idx_expense_items_user_id ON expense_items(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_items_project_id ON expense_items(project_id);
CREATE INDEX IF NOT EXISTS idx_expense_items_date ON expense_items(date);
CREATE INDEX IF NOT EXISTS idx_expense_reports_user_id ON expense_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_reports_status ON expense_reports(status);
CREATE INDEX IF NOT EXISTS idx_approvals_approver_id ON approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_timesheet_id ON approvals(timesheet_id);
CREATE INDEX IF NOT EXISTS idx_approvals_expense_report_id ON approvals(expense_report_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_assignments_updated_at BEFORE UPDATE ON project_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON time_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_timesheets_updated_at BEFORE UPDATE ON timesheets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expense_categories_updated_at BEFORE UPDATE ON expense_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expense_items_updated_at BEFORE UPDATE ON expense_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expense_reports_updated_at BEFORE UPDATE ON expense_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rate_tables_updated_at BEFORE UPDATE ON rate_tables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rate_entries_updated_at BEFORE UPDATE ON rate_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_approvals_updated_at BEFORE UPDATE ON approvals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert seed data for testing
INSERT INTO clients (id, name, contact_person, contact_email, contact_phone) VALUES
    (uuid_generate_v4(), 'Acme Corporation', 'HR Manager', 'hr@acme.com', '+1-555-0101'),
    (uuid_generate_v4(), 'TechStart Inc', 'Finance Manager', 'finance@techstart.com', '+1-555-0102'),
    (uuid_generate_v4(), 'Global Solutions', 'Admin Manager', 'admin@globalsolutions.com', '+1-555-0103'),
    (uuid_generate_v4(), 'Metro Hospital', 'Sarah Johnson', 'hr@metrohospital.com', '+1-555-0104'),
    (uuid_generate_v4(), 'Downtown Office', 'Mike Chen', 'admin@downtownoffice.com', '+1-555-0105'),
    (uuid_generate_v4(), 'City Schools', 'Lisa Rodriguez', 'hr@cityschools.edu', '+1-555-0106'),
    (uuid_generate_v4(), 'Riverside Manufacturing', 'David Thompson', 'operations@riversidemfg.com', '+1-555-0107'),
    (uuid_generate_v4(), 'Tech Consulting', 'Alex Kim', 'projects@techconsulting.com', '+1-555-0108')
ON CONFLICT (name) DO NOTHING;

-- Insert expense categories
INSERT INTO expense_categories (name, description, spending_limit, is_billable) VALUES
    ('Meals', 'Food and beverage expenses', 50.00, true),
    ('Travel', 'Transportation and accommodation', 200.00, true),
    ('Supplies', 'Office and work supplies', 100.00, true),
    ('Equipment', 'Tools and equipment', 500.00, true),
    ('Training', 'Professional development', 1000.00, false)
ON CONFLICT (name) DO NOTHING;

-- Insert sample projects
INSERT INTO projects (name, client_id, description, start_date, budget) VALUES
    ('Website Redesign', (SELECT id FROM clients WHERE name = 'Acme Corporation'), 'Complete website overhaul and redesign', '2024-01-01', 15000.00),
    ('Mobile App Development', (SELECT id FROM clients WHERE name = 'TechStart Inc'), 'iOS and Android app development', '2024-02-01', 25000.00),
    ('Data Migration', (SELECT id FROM clients WHERE name = 'Global Solutions'), 'Legacy system data migration', '2024-03-01', 8000.00),
    ('Nursing Staff', (SELECT id FROM clients WHERE name = 'Metro Hospital'), 'Nursing staff support and management', '2024-01-01', 50000.00),
    ('Security Services', (SELECT id FROM clients WHERE name = 'Downtown Office'), 'Building security and monitoring', '2024-01-01', 30000.00),
    ('Substitute Teachers', (SELECT id FROM clients WHERE name = 'City Schools'), 'Educational support and substitute teaching', '2024-01-01', 25000.00),
    ('Assembly Line', (SELECT id FROM clients WHERE name = 'Riverside Manufacturing'), 'Production line assembly and quality control', '2024-01-01', 40000.00),
    ('Software Development', (SELECT id FROM clients WHERE name = 'Tech Consulting'), 'Custom software development and consulting', '2024-01-01', 60000.00)
ON CONFLICT (name) DO NOTHING;

-- Insert sample tasks
INSERT INTO tasks (project_id, name, code, description) VALUES
    ((SELECT id FROM projects WHERE name = 'Website Redesign'), 'Design', 'DESIGN', 'UI/UX design work'),
    ((SELECT id FROM projects WHERE name = 'Website Redesign'), 'Development', 'DEV', 'Frontend and backend development'),
    ((SELECT id FROM projects WHERE name = 'Website Redesign'), 'Testing', 'TEST', 'Quality assurance and testing'),
    ((SELECT id FROM projects WHERE name = 'Mobile App Development'), 'iOS Development', 'IOS', 'iPhone app development'),
    ((SELECT id FROM projects WHERE name = 'Mobile App Development'), 'Android Development', 'ANDROID', 'Android app development'),
    ((SELECT id FROM projects WHERE name = 'Data Migration'), 'Analysis', 'ANALYSIS', 'Data analysis and mapping'),
    ((SELECT id FROM projects WHERE name = 'Data Migration'), 'Migration', 'MIGRATE', 'Data migration execution'),
    ((SELECT id FROM projects WHERE name = 'Nursing Staff'), 'Patient Care', 'CARE', 'Direct patient care and support'),
    ((SELECT id FROM projects WHERE name = 'Nursing Staff'), 'Documentation', 'DOC', 'Medical record documentation'),
    ((SELECT id FROM projects WHERE name = 'Security Services'), 'Patrol', 'PATROL', 'Building security patrols'),
    ((SELECT id FROM projects WHERE name = 'Security Services'), 'Monitoring', 'MONITOR', 'Security system monitoring'),
    ((SELECT id FROM projects WHERE name = 'Substitute Teachers'), 'Teaching', 'TEACH', 'Classroom instruction'),
    ((SELECT id FROM projects WHERE name = 'Substitute Teachers'), 'Grading', 'GRADE', 'Assignment grading and feedback'),
    ((SELECT id FROM projects WHERE name = 'Assembly Line'), 'Assembly', 'ASSEMBLE', 'Product assembly work'),
    ((SELECT id FROM projects WHERE name = 'Assembly Line'), 'Quality Control', 'QC', 'Quality inspection and testing'),
    ((SELECT id FROM projects WHERE name = 'Software Development'), 'Coding', 'CODE', 'Software development and programming'),
    ((SELECT id FROM projects WHERE name = 'Software Development'), 'Testing', 'TEST', 'Software testing and debugging')
ON CONFLICT (project_id, code) DO NOTHING;

-- Insert admin user (password: admin123)
INSERT INTO users (id, email, first_name, last_name, role) VALUES
    (uuid_generate_v4(), 'admin@westendworkforce.com', 'System', 'Administrator', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insert sample employee users (passwords: employee123)
INSERT INTO users (id, email, first_name, last_name, role) VALUES
    (uuid_generate_v4(), 'john.doe@westendworkforce.com', 'John', 'Doe', 'employee'),
    (uuid_generate_v4(), 'jane.smith@westendworkforce.com', 'Jane', 'Smith', 'employee'),
    (uuid_generate_v4(), 'mike.johnson@westendworkforce.com', 'Mike', 'Johnson', 'employee')
ON CONFLICT (email) DO NOTHING;

-- Insert sample client approver users (passwords: client123)
INSERT INTO users (id, email, first_name, last_name, role, client_id) VALUES
    (uuid_generate_v4(), 'hr@acme.com', 'HR', 'Manager', 'client_approver', (SELECT id FROM clients WHERE name = 'Acme Corporation')),
    (uuid_generate_v4(), 'finance@techstart.com', 'Finance', 'Manager', 'client_approver', (SELECT id FROM clients WHERE name = 'TechStart Inc')),
    (uuid_generate_v4(), 'admin@globalsolutions.com', 'Admin', 'Manager', 'client_approver', (SELECT id FROM clients WHERE name = 'Global Solutions')),
    (uuid_generate_v4(), 'hr@metrohospital.com', 'Sarah', 'Johnson', 'client_approver', (SELECT id FROM clients WHERE name = 'Metro Hospital')),
    (uuid_generate_v4(), 'admin@downtownoffice.com', 'Mike', 'Chen', 'client_approver', (SELECT id FROM clients WHERE name = 'Downtown Office')),
    (uuid_generate_v4(), 'hr@cityschools.edu', 'Lisa', 'Rodriguez', 'client_approver', (SELECT id FROM clients WHERE name = 'City Schools')),
    (uuid_generate_v4(), 'operations@riversidemfg.com', 'David', 'Thompson', 'client_approver', (SELECT id FROM clients WHERE name = 'Riverside Manufacturing')),
    (uuid_generate_v4(), 'projects@techconsulting.com', 'Alex', 'Kim', 'client_approver', (SELECT id FROM clients WHERE name = 'Tech Consulting'))
ON CONFLICT (email) DO NOTHING;

-- Insert sample payroll user (password: payroll123)
INSERT INTO users (id, email, first_name, last_name, role) VALUES
    (uuid_generate_v4(), 'payroll@westendworkforce.com', 'Payroll', 'Manager', 'payroll')
ON CONFLICT (email) DO NOTHING;

-- Insert project assignments
INSERT INTO project_assignments (user_id, project_id, start_date, hourly_rate) VALUES
    ((SELECT id FROM users WHERE email = 'john.doe@westendworkforce.com'), (SELECT id FROM projects WHERE name = 'Website Redesign'), '2024-01-01', 75.00),
    ((SELECT id FROM users WHERE email = 'jane.smith@westendworkforce.com'), (SELECT id FROM projects WHERE name = 'Mobile App Development'), '2024-02-01', 85.00),
    ((SELECT id FROM users WHERE email = 'mike.johnson@westendworkforce.com'), (SELECT id FROM projects WHERE name = 'Data Migration'), '2024-03-01', 65.00),
    ((SELECT id FROM users WHERE email = 'john.doe@westendworkforce.com'), (SELECT id FROM projects WHERE name = 'Nursing Staff'), '2024-01-01', 75.00),
    ((SELECT id FROM users WHERE email = 'jane.smith@westendworkforce.com'), (SELECT id FROM projects WHERE name = 'Security Services'), '2024-01-01', 85.00),
    ((SELECT id FROM users WHERE email = 'mike.johnson@westendworkforce.com'), (SELECT id FROM projects WHERE name = 'Substitute Teachers'), '2024-01-01', 65.00),
    ((SELECT id FROM users WHERE email = 'john.doe@westendworkforce.com'), (SELECT id FROM projects WHERE name = 'Assembly Line'), '2024-01-01', 75.00),
    ((SELECT id FROM users WHERE email = 'jane.smith@westendworkforce.com'), (SELECT id FROM projects WHERE name = 'Software Development'), '2024-01-01', 85.00)
ON CONFLICT (user_id, project_id, start_date) DO NOTHING;

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (you may want to customize these based on your security requirements)
-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = id::text);

-- Time entries: users can only see their own entries
CREATE POLICY "Users can view own time entries" ON time_entries FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own time entries" ON time_entries FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own time entries" ON time_entries FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Projects: users can see projects they're assigned to
CREATE POLICY "Users can view assigned projects" ON projects FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM project_assignments 
        WHERE project_id = projects.id 
        AND user_id::text = auth.uid()::text
        AND is_active = true
    )
);

-- Tasks: users can see tasks for projects they're assigned to
CREATE POLICY "Users can view project tasks" ON tasks FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM project_assignments 
        WHERE project_id = tasks.project_id 
        AND user_id::text = auth.uid()::text
        AND is_active = true
    )
);

-- Project assignments: users can see their own assignments
CREATE POLICY "Users can view own assignments" ON project_assignments FOR SELECT USING (auth.uid()::text = user_id::text);

-- Clients: users can see clients for projects they're assigned to
CREATE POLICY "Users can view project clients" ON clients FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM projects p
        JOIN project_assignments pa ON p.id = pa.project_id
        WHERE p.client_id = clients.id
        AND pa.user_id::text = auth.uid()::text
        AND pa.is_active = true
    )
);

-- For admin users, allow full access
CREATE POLICY "Admins have full access" ON users FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id::text = auth.uid()::text 
        AND role = 'admin'
    )
);

CREATE POLICY "Admins have full access" ON clients FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id::text = auth.uid()::text 
        AND role = 'admin'
    )
);

CREATE POLICY "Admins have full access" ON projects FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id::text = auth.uid()::text 
        AND role = 'admin'
    )
);

CREATE POLICY "Admins have full access" ON project_assignments FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id::text = auth.uid()::text 
        AND role = 'admin'
    )
);

CREATE POLICY "Admins have full access" ON tasks FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id::text = auth.uid()::text 
        AND role = 'admin'
    )
);

-- Allow authenticated users to read expense categories
CREATE POLICY "Anyone can view expense categories" ON expense_categories FOR SELECT USING (true);

-- Allow authenticated users to read expense categories
CREATE POLICY "Anyone can view expense categories" ON expense_categories FOR SELECT USING (true);

-- Success message
SELECT 'Database setup completed successfully! All tables created and populated with sample data.' as status;
