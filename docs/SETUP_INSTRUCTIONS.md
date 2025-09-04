# West End Workforce - Setup Instructions

## Quick Start Guide

### 1. Environment Setup
Make sure you have a `.env.local` file in your project root with:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 2. Database Setup
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the SQL from `database-schema.sql` to create all tables
4. Or run the simplified version from `setup-timesheet-tables.sql`

### 3. Test Database Connection
1. Start the development server: `npm run dev`
2. Sign in as admin (admin@westendworkforce.com / admin123)
3. Go to System Settings → Database Connection Test
4. Click "Run Tests" to verify database connectivity

## Troubleshooting Client Creation Issues

### Problem: "Create Client" button not working
**Symptoms:**
- Form appears but data doesn't save
- No error messages shown
- Client doesn't appear in the list after creation

**Solutions:**

#### 1. Check Database Connection
- Use the Database Test component in System Settings
- Verify all tests pass (Connection, Tables, Insert, Select, Update, Delete)
- Check browser console for error messages

#### 2. Verify Environment Variables
- Ensure `.env.local` file exists and has correct values
- Restart development server after changing environment variables
- Check that Supabase project is active and accessible

#### 3. Database Schema Issues
- Verify `clients` table exists in Supabase
- Check table structure matches the expected schema
- Ensure Row Level Security (RLS) policies allow insert operations

#### 4. Common Error Messages
- **"Missing environment variable"**: Check `.env.local` file
- **"Database error: relation does not exist"**: Run database schema setup
- **"Permission denied"**: Check RLS policies in Supabase
- **"Network error"**: Verify Supabase project URL and internet connection

### 4. Manual Database Setup
If automatic setup fails, manually create the clients table:

```sql
-- Create clients table
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

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow authenticated users to manage clients" ON clients
    FOR ALL USING (auth.role() = 'authenticated');
```

### 5. Sample Data
Insert some sample clients for testing:

```sql
INSERT INTO clients (name, contact_person, contact_email, contact_phone, address, time_tracking_method) VALUES
    ('Metro Hospital', 'Sarah Johnson', 'hr@metrohospital.com', '+1-555-0101', '123 Medical Center Dr, Healthcare City, HC 12345', 'detailed'),
    ('Downtown Office', 'Mike Chen', 'admin@downtownoffice.com', '+1-555-0102', '456 Business Ave, Downtown, DT 67890', 'simple'),
    ('City Schools', 'Lisa Rodriguez', 'hr@cityschools.edu', '+1-555-0103', '789 Education Blvd, School District, SD 11111', 'detailed'),
    ('Riverside Manufacturing', 'David Thompson', 'operations@riversidemfg.com', '+1-555-0104', '321 Industrial Way, Riverside, RV 22222', 'simple'),
    ('Tech Consulting', 'Alex Kim', 'projects@techconsulting.com', '+1-555-0105', '654 Innovation St, Tech Hub, TH 33333', 'detailed');
```

## Development Workflow

### 1. Start Development Server
```bash
npm run dev
```

### 2. Test Database Connection
- Sign in as admin
- Navigate to System Settings
- Run Database Connection Test
- Fix any issues before proceeding

### 3. Test Client Management
- Go to Clients & Projects section
- Try creating a new client
- Verify it appears in the list
- Test edit and delete functionality

### 4. Debug Issues
- Check browser console for errors
- Use Database Test component for diagnostics
- Verify Supabase dashboard status
- Check network tab for failed requests

## Support

If you continue to have issues:
1. Check the browser console for detailed error messages
2. Use the Database Test component to identify specific problems
3. Verify your Supabase project settings and permissions
4. Ensure all environment variables are correctly set

## Next Steps

Once client creation is working:
1. Create sample clients and projects
2. Set up employee assignments
3. Configure time tracking methods
4. Test timesheet functionality
