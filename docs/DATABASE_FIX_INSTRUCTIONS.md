# Database Fix Instructions

## The Problem
Your client creation is failing because the database schema doesn't have an `address` column that the application expects.

## Quick Fix
Run this SQL script in your Supabase SQL editor:

```sql
-- Add the missing address column
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address TEXT;

-- Update existing clients to have a default address
UPDATE clients 
SET address = 'Address not specified' 
WHERE address IS NULL;
```

## Alternative: Run the Complete Setup
If you want to start fresh, run the `setup-database.sql` file in your Supabase SQL editor. This will:
- Create all necessary tables
- Add the address column
- Insert sample clients and projects
- Set up proper permissions

## Steps to Fix:
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the SQL above (or the full setup-database.sql)
4. Click "Run" to execute
5. Refresh your application

## What This Fixes:
- ✅ Client creation will work properly
- ✅ All form fields will save to the database
- ✅ No more "address column not found" errors
- ✅ Database schema matches the application

## After Running the Fix:
1. Try creating a new client
2. The form should save successfully
3. You should see the client in the list
4. All fields including address will be saved

## If You Still Have Issues:
- Check that your Supabase environment variables are correct
- Ensure your database is running and accessible
- Check the browser console for any error messages
