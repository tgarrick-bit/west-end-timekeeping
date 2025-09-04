# Environment Setup Guide

## Required Environment Variables

To run the West End Workforce system, you need to configure the following environment variables:

### 1. Create `.env.local` file

Create a `.env.local` file in your project root with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 2. Get Supabase Credentials

1. Go to [Supabase](https://supabase.com) and create a new project
2. Navigate to Settings → API
3. Copy the following values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Database Setup

1. Run the SQL commands from `database-schema.sql` in your Supabase SQL editor
2. This will create all necessary tables and sample data
3. Verify the tables are created successfully

### 4. Authentication Setup

1. In Supabase, go to Authentication → Settings
2. Configure your site URL and redirect URLs
3. Set up email templates if needed

### 5. Row Level Security

The system uses RLS policies for data security. Make sure to:

1. Enable RLS on all tables
2. Create appropriate policies for each role
3. Test access permissions

## Testing the Setup

1. Start your development server: `npm run dev`
2. Navigate to the admin dashboard
3. Go to "Database Test" section
4. Verify all tests pass

## Troubleshooting

### Common Issues

1. **"Missing environment variable" error**
   - Check `.env.local` file exists
   - Verify variable names are correct
   - Restart development server

2. **Database connection errors**
   - Verify Supabase project is active
   - Check URL and key values
   - Ensure database schema is created

3. **Permission errors**
   - Check RLS policies
   - Verify user authentication
   - Check user role assignments

### Debug Steps

1. Check browser console for errors
2. Use the Database Test component
3. Verify Supabase dashboard status
4. Check network tab for failed requests

## Production Deployment

For production deployment:

1. Set environment variables in your hosting platform
2. Use production Supabase project
3. Configure custom domains
4. Set up monitoring and logging

## Security Notes

- Never commit `.env.local` to version control
- Use different keys for development and production
- Regularly rotate service role keys
- Monitor API usage and limits



