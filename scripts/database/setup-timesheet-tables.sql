-- Timesheet System Database Setup for West End Workforce
-- Run this in your Supabase SQL editor to create the necessary tables

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('employee', 'client_approver', 'admin', 'payroll');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE timesheet_status AS ENUM ('draft', 'submitted', 'client_approved', 'payroll_approved', 'rejected');

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

-- Insert sample data for testing
-- Sample client
INSERT INTO clients (id, name, contact_person, contact_email, contact_phone) VALUES
    (uuid_generate_v4(), 'Acme Corporation', 'HR Manager', 'hr@acme.com', '+1-555-0101')
ON CONFLICT (name) DO NOTHING;

-- Sample project
INSERT INTO projects (name, client_id, description, start_date, budget) VALUES
    ('Website Redesign', (SELECT id FROM clients WHERE name = 'Acme Corporation'), 'Complete website overhaul and redesign', '2024-01-01', 15000.00)
ON CONFLICT (name) DO NOTHING;

-- Sample tasks
INSERT INTO tasks (project_id, name, code, description) VALUES
    ((SELECT id FROM projects WHERE name = 'Website Redesign'), 'Design', 'DESIGN', 'UI/UX design work'),
    ((SELECT id FROM projects WHERE name = 'Website Redesign'), 'Development', 'DEV', 'Frontend and backend development'),
    ((SELECT id FROM projects WHERE name = 'Website Redesign'), 'Testing', 'TEST', 'Quality assurance and testing')
ON CONFLICT (project_id, code) DO NOTHING;

-- Sample employee user (password: employee123)
INSERT INTO users (id, email, first_name, last_name, role) VALUES
    (uuid_generate_v4(), 'employee@westendworkforce.com', 'John', 'Doe', 'employee')
ON CONFLICT (email) DO NOTHING;

-- Sample project assignment
INSERT INTO project_assignments (user_id, project_id, start_date, hourly_rate) VALUES
    ((SELECT id FROM users WHERE email = 'employee@westendworkforce.com'), (SELECT id FROM projects WHERE name = 'Website Redesign'), '2024-01-01', 75.00)
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
