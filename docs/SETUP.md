# West End Workforce - Quick Setup Guide

This guide will help you get the West End Workforce system up and running in under 10 minutes.

## 🚀 Quick Start

### 1. Environment Setup
Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Access the Application
Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔧 Supabase Setup

### 1. Create Supabase Project
- Go to [supabase.com](https://supabase.com)
- Create a new project
- Note your project URL and API keys

### 2. Run Database Schema
- Open your Supabase project dashboard
- Go to SQL Editor
- Copy and paste the contents of `database-schema.sql`
- Execute the script

### 3. Enable Storage
- Go to Storage in your Supabase dashboard
- Create a new bucket called `receipts`
- Set it to public (for demo purposes)

### 4. Configure Authentication
- Go to Authentication > Settings
- Add your domain to allowed redirect URLs
- For local development: `http://localhost:3000`

## 🔐 Test Users

After running the database schema, you'll have these test accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@westendworkforce.com | admin123 |
| Employee | john.doe@westendworkforce.com | employee123 |
| Client Approver | hr@acme.com | client123 |
| Payroll | payroll@westendworkforce.com | payroll123 |

## 📱 Testing Different Roles

### Employee Experience
1. Sign in as `john.doe@westendworkforce.com`
2. Navigate to Dashboard
3. Use Quick Time Entry to log hours
4. Use Quick Expense Entry to submit expenses
5. View Project Overview

### Client Approver Experience
1. Sign in as `hr@acme.com`
2. View pending approvals
3. Review employee submissions
4. Approve or reject items

### Admin Experience
1. Sign in as `admin@westendworkforce.com`
2. Access user management
3. Configure projects and rates
4. View system-wide reports

### Payroll Experience
1. Sign in as `payroll@westendworkforce.com`
2. Review final approvals
3. Access export tools
4. Process payroll data

## 🐛 Troubleshooting

### Common Issues

**"Invalid API key" error**
- Check your `.env.local` file
- Verify Supabase project is active
- Ensure API keys are correct

**"Table doesn't exist" error**
- Run the database schema in Supabase SQL Editor
- Check that all tables were created successfully

**"Authentication failed" error**
- Verify user exists in database
- Check Supabase Auth settings
- Ensure redirect URLs are configured

**File upload not working**
- Verify storage bucket exists
- Check bucket permissions
- Ensure bucket is public (for demo)

### Database Connection Issues
- Check Supabase project status
- Verify network connectivity
- Check RLS policies if data access fails

## 🔒 Security Notes

### Development Environment
- The system includes sample data for testing
- Passwords are simple for demo purposes
- Storage bucket is public for easy testing

### Production Considerations
- Change all default passwords
- Configure proper RLS policies
- Set up secure storage bucket policies
- Enable MFA for admin accounts
- Configure proper CORS settings

## 📊 System Overview

### What You'll See
- **Dashboard**: Role-specific overview with key metrics
- **Navigation**: Role-based menu items
- **Quick Entry**: Fast time and expense submission
- **Project Overview**: Current project status
- **Recent Activity**: System activity feed

### Key Features Working
- ✅ User authentication and role management
- ✅ Time entry with project/task selection
- ✅ Expense submission with receipt upload
- ✅ Project overview and statistics
- ✅ Role-based navigation and access
- ✅ Real-time data updates

### Features to Add Next
- Full timesheet management
- Expense report workflows
- Approval queues and workflows
- Export and reporting tools
- User management interface
- Project configuration

## 🚀 Next Steps

### Immediate Development
1. Test all user roles and workflows
2. Customize branding and colors
3. Add your specific business logic
4. Configure email notifications

### Advanced Features
1. Implement full approval workflows
2. Add reporting and analytics
3. Create export tools for ATS integration
4. Build mobile-responsive components
5. Add real-time notifications

### Production Readiness
1. Set up proper environment variables
2. Configure production database
3. Set up monitoring and logging
4. Implement backup strategies
5. Configure CI/CD pipelines

## 📞 Getting Help

### Documentation
- Check the main `README.md` for comprehensive information
- Review code comments for implementation details
- Use TypeScript types as API documentation

### Support
- Check Supabase documentation for backend issues
- Review Next.js docs for frontend problems
- Use browser dev tools for debugging

---

**Happy coding! 🎉**




