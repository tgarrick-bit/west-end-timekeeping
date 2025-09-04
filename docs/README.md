# West End Workforce - Timesheet & Expense Management System

A comprehensive, enterprise-grade timesheet and expense tracking system built for staffing companies with external client approval workflows.

## 🚀 Features

### Core Functionality
- **Daily Time Tracking**: Multi-project time entry with task codes and location tracking
- **Timesheet System**: `/timesheet` - Complete weekly timesheet with time entry functionality
- **Timesheet Overview**: `/timesheet` - Weekly view of all time entries
- **Expense Management**: Receipt upload, categorization, and approval workflows
- **Multi-Project Support**: Users can work on multiple projects simultaneously
- **External Client Approval**: Client representatives can approve their workers' time/expenses
- **Role-Based Access**: Employee, Client Approver, Admin, and Payroll roles
- **ATS Integration**: CSV export for payroll systems

### User Roles & Permissions
- **Employees**: Time entry, expense submission, project overview
- **Client Approvers**: Review and approve worker submissions
- **Admins**: User management, project setup, system configuration
- **Payroll**: Final approval and export capabilities

### Technical Features
- **Real-time Updates**: Live notifications and status updates
- **File Upload**: Receipt storage with compression and validation
- **Mobile Responsive**: Works seamlessly on all devices
- **Professional UI**: Clean, modern interface with West End Workforce branding

## 🎨 Branding

The system uses West End Workforce's official brand colors:
- **Primary Pink**: #e31c79 (main CTA buttons, headers, active states)
- **Dark Navy**: #05202E (navigation, text, backgrounds)
- **Light Gray**: #e5ddd8 (cards, subtle backgrounds)
- **Dark Gray**: #232020 (body text)
- **Blue Accent**: #465079 (secondary buttons, links)

## 🏗️ Architecture

### Frontend
- **Next.js 15** with TypeScript
- **Tailwind CSS** for styling
- **React Hook Form** with Zod validation
- **Supabase Auth** for authentication
- **Lucide React** for icons

### Backend
- **Supabase** for database and authentication
- **PostgreSQL** with optimized schema
- **Real-time subscriptions** for live updates
- **Row Level Security** for data protection

### Database Design
- **Normalized schema** with proper relationships
- **UUID primary keys** for security
- **Comprehensive indexing** for performance
- **Audit trails** with created_at/updated_at timestamps

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account and project

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd west-end-workforce
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

4. **Set up the database**
   - Create a new Supabase project
   - Run the SQL commands from `database-schema.sql` in your Supabase SQL editor
   - For timesheet system only: Use `setup-timesheet-tables.sql` for focused setup
   - Enable storage and create a `receipts` bucket

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   Open [http://localhost:3000](http://localhost:3000) in your browser

## 🔐 Default Users

The system comes with pre-configured test users:

### Admin Access
- **Email**: admin@westendworkforce.com
- **Password**: admin123
- **Role**: System Administrator

### Employee Users
- **Email**: john.doe@westendworkforce.com
- **Password**: employee123
- **Role**: Employee

- **Email**: jane.smith@westendworkforce.com
- **Password**: employee123
- **Role**: Employee

- **Email**: mike.johnson@westendworkforce.com
- **Password**: employee123
- **Role**: Employee

### Client Approvers
- **Email**: hr@acme.com
- **Password**: client123
- **Role**: Client Approver (Acme Corporation)

- **Email**: finance@techstart.com
- **Password**: client123
- **Role**: Client Approver (TechStart Inc)

- **Email**: admin@globalsolutions.com
- **Password**: client123
- **Role**: Client Approver (Global Solutions)

### Payroll User
- **Email**: payroll@westendworkforce.com
- **Password**: payroll123
- **Role**: Payroll Manager

## 📊 Database Schema

### Core Tables
- **users**: User accounts with role-based permissions
- **clients**: External client companies
- **projects**: Client projects with rate information
- **project_assignments**: User-to-project relationships
- **tasks**: Project-specific task codes
- **time_entries**: Daily time tracking entries
- **timesheets**: Weekly time aggregation
- **expense_items**: Individual expense entries
- **expense_reports**: Monthly expense aggregation
- **expense_categories**: Expense classification
- **approvals**: Multi-level approval workflow
- **rate_tables**: Flexible rate management

### Key Relationships
- Users can be assigned to multiple projects
- Each project belongs to a client
- Time entries and expenses follow approval workflows
- Rate resolution: User+Project → Project Default → Global Rate

## 🔄 Approval Workflow

1. **Employee Submission**: User submits time/expenses
2. **Client Approval**: Client representative reviews and approves
3. **Payroll Processing**: Internal payroll team finalizes
4. **Export Ready**: Data available for ATS Tracker integration

## 📱 User Interface

### Employee Dashboard
- Quick time and expense entry
- Weekly timesheet overview
- Project status and assignments
- Recent activity feed

### Client Approver Portal
- Pending approval queue
- Detailed submission review
- Bulk approval capabilities
- Project-specific filtering

### Admin Interface
- User management and role assignment
- Project creation and configuration
- System-wide settings and reporting
- Client relationship management

### Payroll Dashboard
- Final approval queue
- Export tools for ATS integration
- Financial reporting and analytics
- Compliance monitoring

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables
Ensure all environment variables are properly set in your production environment:
- Supabase credentials
- App configuration
- Security settings

### Database Migration
Run the database schema in your production Supabase instance before deploying the application.

## 🔧 Development

### Project Structure
```
src/
├── app/                 # Next.js app router
├── components/          # Reusable UI components
├── contexts/           # React contexts (Auth, etc.)
├── lib/                # Utility functions and configurations
├── types/              # TypeScript type definitions
└── styles/             # Global styles and Tailwind config
```

### Key Components
- **Navigation**: Role-based navigation with mobile support
- **Dashboard**: Role-specific dashboard with key metrics
- **QuickEntry**: Fast time and expense entry forms
- **ProjectOverview**: Project status and activity summary
- **RecentActivity**: System activity feed

### Adding New Features
1. Define types in `src/types/index.ts`
2. Create components in `src/components/`
3. Add database schema if needed
4. Update navigation and routing
5. Test with different user roles

## 📈 Performance & Scalability

### Optimizations
- **Database indexing** on frequently queried fields
- **Real-time subscriptions** for live updates
- **Efficient queries** with proper joins
- **File compression** for receipt uploads
- **Caching strategies** for static data

### Monitoring
- Supabase dashboard for database performance
- Next.js built-in performance monitoring
- Error tracking and logging
- User activity analytics

## 🔒 Security

### Authentication
- Supabase Auth with JWT tokens
- Role-based access control
- Session management
- Password policies

### Data Protection
- Row Level Security (RLS) policies
- Input validation with Zod
- SQL injection prevention
- File upload security

### Privacy
- User data isolation
- Client data separation
- Audit logging
- GDPR compliance considerations

## 🧪 Testing

### Test Users
Use the provided test accounts to verify different user roles and workflows.

### Test Scenarios
1. **Employee Workflow**: Time entry → Expense submission → Submission
2. **Client Approval**: Review submissions → Approve/Reject → Comments
3. **Admin Management**: User creation → Project setup → System configuration
4. **Payroll Processing**: Final approval → Export → ATS integration

## 📞 Support

### Documentation
- This README provides comprehensive setup and usage information
- Code comments explain complex business logic
- TypeScript types serve as API documentation

### Common Issues
- **Authentication errors**: Check Supabase credentials and RLS policies
- **Database connection**: Verify Supabase project status and connection
- **File uploads**: Ensure storage bucket is properly configured
- **Role permissions**: Verify user role assignments in database

## 🚀 Future Enhancements

### Planned Features
- **Mobile App**: Native iOS/Android applications
- **Advanced Reporting**: Custom dashboard builder
- **Integration APIs**: RESTful API for third-party integrations
- **Advanced Analytics**: Business intelligence and insights
- **Multi-language Support**: Internationalization
- **Advanced Workflows**: Custom approval chains

### Technology Roadmap
- **Real-time Collaboration**: Live editing and commenting
- **AI Integration**: Smart expense categorization
- **Advanced Security**: Multi-factor authentication
- **Performance Optimization**: Edge caching and CDN

## 📄 License

This project is proprietary software developed for West End Workforce. All rights reserved.

## 🤝 Contributing

This is an internal system for West End Workforce. For questions or support, please contact the development team.

---

**Built with ❤️ for West End Workforce**
