# Database Setup Guide - Fix Project Creation Issues

## 🚨 Problem
The project creation is failing with 400 errors because the database tables don't exist yet.

## ✅ Solution
Run the database setup script in your Supabase SQL editor.

## 📋 Steps to Fix

### 1. Open Supabase Dashboard
- Go to your Supabase project dashboard
- Navigate to the **SQL Editor** section

### 2. Run the Setup Script
- Copy the entire contents of `setup-correct-schema.sql`
- Paste it into the SQL editor
- Click **Run** to execute the script

### 3. Verify Tables Created
The script will create these essential tables:
- `users` - User accounts and roles
- `clients` - Client companies
- `projects` - Client projects
- `project_assignments` - Employee-project assignments
- `tasks` - Project-specific tasks
- `time_entries` - Daily time tracking
- `timesheets` - Weekly time aggregation
- `expense_categories` - Expense categories
- `expense_items` - Individual expenses
- `expense_reports` - Monthly expense reports

### 4. Sample Data Included
The script automatically creates:
- 8 sample clients (Metro Hospital, Downtown Office, etc.)
- 8 sample projects with descriptions and budgets
- Sample users (admin, employees, client approvers)
- Project assignments with hourly rates
- Expense categories

### 5. Test Project Creation
After running the script:
- Go back to your app
- Try creating a new project
- The client dropdown should now show all available clients
- Project creation should work without 400 errors

## 🔧 What This Fixes

- **Missing tables error**: Creates all required database tables
- **400 errors**: Proper database schema prevents API failures
- **Empty client dropdown**: Populates with sample client data
- **Project save failures**: Correct table structure allows proper inserts

## 🚀 After Setup

Once the database is set up:
1. Client creation will work properly
2. Project creation will save successfully
3. Employee assignments can be managed
4. Timesheet functionality will be available
5. All admin features will work as expected

## 📞 Need Help?

If you still get errors after running the setup script:
1. Check the browser console for detailed error messages
2. Verify the script ran successfully in Supabase
3. Check that all tables were created in the Table Editor

The setup script includes comprehensive error handling and will show you exactly what's happening during execution.
