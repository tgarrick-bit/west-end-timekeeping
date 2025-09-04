# Environment Setup Instructions

## Fix the Supabase Connection Issues

The app is currently failing because Supabase environment variables are missing. This is causing:
- JavaScript compilation errors
- 404 errors for JS files
- Buttons not working
- "missing required error components" message

## Quick Fix Steps

### 1. Create Environment File
Create a file named `.env.local` in your project root with this content:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 2. Get Your Supabase Credentials
1. Go to [supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your project (or create a new one)
4. Go to Settings → API
5. Copy the values:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Restart the Development Server
After creating the `.env.local` file:
```bash
# Stop the current server (Ctrl+C)
# Then restart it
npm run dev
```

## Alternative: Use Demo Mode

If you don't want to set up Supabase right now, the app will fall back to demo mode with sample data. The client management will work with local demo data.

## Database Setup

Once Supabase is configured, run the clean database setup script:
```sql
-- Copy and paste the contents of setup-clean-database.sql into your Supabase SQL editor
```

This will create all the necessary tables and sample data.

## Test the Fix

After setting up the environment variables:
1. The app should load without errors
2. JavaScript files should load properly
3. Buttons should work
4. Client management should function correctly
5. You can create/edit clients and projects

## Troubleshooting

- Make sure the `.env.local` file is in the project root (same folder as `package.json`)
- Restart the development server after creating the environment file
- Check the browser console for any remaining errors
- Verify your Supabase project is active and the keys are correct
