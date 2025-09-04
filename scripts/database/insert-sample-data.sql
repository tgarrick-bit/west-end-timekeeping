-- Insert sample clients for testing
-- Run this script in your Supabase SQL editor to populate the database with sample data

INSERT INTO clients (id, name, contact_person, contact_email, contact_phone, time_tracking_method, is_active, created_at, updated_at) VALUES
    (gen_random_uuid(), 'Metro Hospital', 'Sarah Johnson', 'hr@metrohospital.com', '+1-555-0101', 'detailed', true, NOW(), NOW()),
    (gen_random_uuid(), 'Downtown Office', 'Mike Chen', 'admin@downtownoffice.com', '+1-555-0102', 'simple', true, NOW(), NOW()),
    (gen_random_uuid(), 'City Schools', 'Lisa Rodriguez', 'hr@cityschools.edu', '+1-555-0103', 'detailed', true, NOW(), NOW()),
    (gen_random_uuid(), 'Riverside Manufacturing', 'David Thompson', 'operations@riversidemfg.com', '+1-555-0104', 'simple', true, NOW(), NOW()),
    (gen_random_uuid(), 'Tech Consulting', 'Alex Kim', 'projects@techconsulting.com', '+1-555-0105', 'detailed', true, NOW(), NOW());

-- Insert sample projects for these clients
INSERT INTO projects (id, name, client_id, description, start_date, budget, is_active, status, created_at, updated_at) VALUES
    (gen_random_uuid(), 'Nursing Staff', (SELECT id FROM clients WHERE name = 'Metro Hospital'), 'Nursing staff support and management', '2024-01-01', 50000.00, true, 'active', NOW(), NOW()),
    (gen_random_uuid(), 'Security Services', (SELECT id FROM clients WHERE name = 'Downtown Office'), 'Building security and monitoring', '2024-01-01', 30000.00, true, 'active', NOW(), NOW()),
    (gen_random_uuid(), 'Substitute Teachers', (SELECT id FROM clients WHERE name = 'City Schools'), 'Educational support and substitute teaching', '2024-01-01', 25000.00, true, 'active', NOW(), NOW()),
    (gen_random_uuid(), 'Assembly Line', (SELECT id FROM clients WHERE name = 'Riverside Manufacturing'), 'Production line assembly and quality control', '2024-01-01', 40000.00, true, 'active', NOW(), NOW()),
    (gen_random_uuid(), 'Software Development', (SELECT id FROM clients WHERE name = 'Tech Consulting'), 'Custom software development and consulting', '2024-01-01', 60000.00, true, 'active', NOW(), NOW());

-- Insert sample tasks for these projects
INSERT INTO tasks (id, project_id, name, code, description, is_active, created_at, updated_at) VALUES
    (gen_random_uuid(), (SELECT id FROM projects WHERE name = 'Nursing Staff'), 'Patient Care', 'CARE', 'Direct patient care and support', true, NOW(), NOW()),
    (gen_random_uuid(), (SELECT id FROM projects WHERE name = 'Nursing Staff'), 'Documentation', 'DOC', 'Medical record documentation', true, NOW(), NOW()),
    (gen_random_uuid(), (SELECT id FROM projects WHERE name = 'Security Services'), 'Patrol', 'PATROL', 'Building security patrols', true, NOW(), NOW()),
    (gen_random_uuid(), (SELECT id FROM projects WHERE name = 'Security Services'), 'Monitoring', 'MONITOR', 'Security system monitoring', true, NOW(), NOW()),
    (gen_random_uuid(), (SELECT id FROM projects WHERE name = 'Substitute Teachers'), 'Teaching', 'TEACH', 'Classroom instruction', true, NOW(), NOW()),
    (gen_random_uuid(), (SELECT id FROM projects WHERE name = 'Substitute Teachers'), 'Grading', 'GRADE', 'Assignment grading and feedback', true, NOW(), NOW()),
    (gen_random_uuid(), (SELECT id FROM projects WHERE name = 'Assembly Line'), 'Assembly', 'ASSEMBLE', 'Product assembly work', true, NOW(), NOW()),
    (gen_random_uuid(), (SELECT id FROM projects WHERE name = 'Assembly Line'), 'Quality Control', 'QC', 'Quality inspection and testing', true, NOW(), NOW()),
    (gen_random_uuid(), (SELECT id FROM projects WHERE name = 'Software Development'), 'Coding', 'CODE', 'Software development and programming', true, NOW(), NOW()),
    (gen_random_uuid(), (SELECT id FROM projects WHERE name = 'Software Development'), 'Testing', 'TEST', 'Software testing and debugging', true, NOW(), NOW());
