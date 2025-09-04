# Timesheet Entry System Setup Guide

This guide will help you set up the timesheet entry system for your West End Workforce app.

## 🚀 Quick Start

### 1. Database Setup

1. **Open your Supabase project dashboard**
2. **Go to the SQL Editor**
3. **Copy and paste the contents of `setup-timesheet-tables.sql`**
4. **Run the script**

This will create all necessary tables, indexes, and sample data.

### 2. Environment Variables

Ensure your `.env.local` file has the correct Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Test the System

1. **Start your development server**: `npm run dev`
2. **Navigate to `/timesheet`** (employees only)
3. **Use the demo account**: `employee@westendworkforce.com` / `employee123`

## 📋 System Features

### For Employees
- ✅ **Daily Time Entry**: Add multiple time entries per day
- ✅ **Project & Task Selection**: Choose from assigned projects and tasks
- ✅ **Time Tracking**: Start/end time or manual hours entry
- ✅ **Location & Notes**: Add work location and detailed notes
- ✅ **Weekly View**: See all entries for the current week
- ✅ **Edit Entries**: Modify existing time entries

### For Admins
- ✅ **User Management**: Manage employee accounts
- ✅ **Project Setup**: Create and assign projects
- ✅ **Task Management**: Define project-specific tasks
- ✅ **Client Management**: Manage external clients

## 🗄️ Database Structure

### Core Tables
- **`users`**: Employee information and roles
- **`clients`**: External company information
- **`projects`**: Client projects
- **`project_assignments`**: User-project relationships with hourly rates
- **`tasks`**: Project-specific work categories
- **`time_entries`**: Individual time records
- **`timesheets`**: Weekly summaries

### Key Relationships
```
User → Project Assignment → Project → Client
User → Time Entry → Project + Task
```

## 🔐 Security Features

- **Row Level Security (RLS)**: Users can only see their own data
- **Role-based Access**: Only employees can access timesheet features
- **Project Isolation**: Users only see projects they're assigned to
- **Data Validation**: Server-side validation of all inputs

## 🎨 UI/UX Features

- **Responsive Design**: Works on desktop and mobile
- **West End Workforce Branding**: Consistent with your app's design
- **Intuitive Forms**: Easy-to-use time entry interface
- **Real-time Validation**: Immediate feedback on form inputs
- **Loading States**: Clear indication of system status

## 🚧 Customization Options

### Adding New Fields
To add custom fields to time entries:

1. **Update the database schema** in `setup-timesheet-tables.sql`
2. **Modify the types** in `src/types/index.ts`
3. **Update the form** in `src/app/timesheet/page.tsx`

### Modifying Approval Workflow
The system supports multi-level approval:
- Employee submits time entries
- Client approver reviews (optional)
- Payroll manager final approval

### Adding New Roles
To add new user roles:

1. **Update the enum** in the database
2. **Modify the types** in `src/types/index.ts`
3. **Update navigation** in `src/components/Navigation.tsx`

## 🐛 Troubleshooting

### Common Issues

**"No projects found" error**
- Ensure the user has active project assignments
- Check that projects and tasks are marked as active
- Verify the user's role is 'employee'

**Permission denied errors**
- Check Row Level Security policies
- Ensure user is authenticated
- Verify database permissions

**Form not saving**
- Check browser console for errors
- Verify Supabase connection
- Ensure all required fields are filled

### Debug Mode

Enable debug logging by checking the browser console. The system logs:
- Database queries
- Authentication status
- Form validation errors

## 📱 Mobile Optimization

The timesheet system is fully responsive and includes:
- Touch-friendly form controls
- Mobile-optimized layouts
- Swipe gestures for navigation
- Optimized input fields for mobile devices

## 🔄 Data Export

The system supports exporting timesheet data for:
- Payroll processing
- Client billing
- Time analysis
- Compliance reporting

## 📈 Performance Tips

- **Indexes**: All major queries are indexed
- **Pagination**: Large datasets are paginated
- **Caching**: User data is cached locally
- **Lazy Loading**: Components load on demand

## 🆘 Support

If you encounter issues:

1. **Check the browser console** for error messages
2. **Verify your Supabase setup** and credentials
3. **Review the database schema** for missing tables
4. **Check user permissions** and role assignments

## 🔮 Future Enhancements

Planned features include:
- **Time tracking timer** with start/stop functionality
- **Bulk time entry** for multiple days
- **Mobile app** for field workers
- **Integration** with payroll systems
- **Advanced reporting** and analytics
- **Client portal** for time approval

---

**Need help?** Check the main `README.md` for general app setup, or review the database schema in `database-schema.sql` for complete system details.
