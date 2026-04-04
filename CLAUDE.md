# West End Workforce - Timekeeping App

## Project Overview

Private time and expense tracking platform for West End Workforce (WOSB/WBE staffing firm). Replaces SpringAhead. Three user roles: Employee, Manager, Admin. Currently deployed at `time.westendworkforce.ca`.

**Repo:** `git@github.com:tgarrick-bit/west-end-timekeeping.git`

## Tech Stack

- **Framework:** Next.js 14 with App Router, TypeScript
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL + Auth + Storage)
- **Deployment:** Vercel
- **Monitoring:** Sentry + LogRocket (planned)

## Architecture

### Routing Structure

```
src/app/
├── page.tsx                    # Redirects to login
├── login/page.tsx              # Login page
├── dashboard/page.tsx          # Post-login landing (requires auth)
├── timesheets/page.tsx         # Employee timesheet entry
├── expenses/page.tsx           # Employee expense entry
├── employee/page.tsx           # Employee portal
├── manager/                    # Manager section (WORKING - reference implementation)
│   ├── page.tsx                # Manager dashboard
│   ├── layout.tsx              # Manager layout with nav tabs
│   ├── approvals/page.tsx      # Approval queue
│   ├── contractors/             # Team management
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── timesheets/page.tsx
│   ├── expenses/page.tsx
│   ├── financial/page.tsx
│   └── reports/page.tsx
├── admin/                      # Admin section (NEEDS WORK - this is the focus)
│   ├── page.tsx                # Admin dashboard - has tabs + review/approve, partially wired
│   ├── employees/              # Employee management
│   │   ├── page.tsx
│   │   └── import/page.tsx     # Excel/CSV import (WORKING)
│   ├── clients/page.tsx        # Client management (NEEDS WIRING)
│   ├── projects/page.tsx       # Project management (NEEDS WIRING)
│   ├── billing/page.tsx        # Billing (NEEDS BUILDING)
│   ├── reports/                # Reports (NEEDS BUILDING)
│   │   ├── time-by-project/
│   │   ├── time-by-employee/
│   │   └── ...
│   └── settings/page.tsx       # System settings (NEEDS BUILDING)
└── app_backup/                 # Old versions - reference only, do not modify
```

### Key Components

```
src/components/
├── auth/ProtectedRoute.tsx         # Role-based route protection
├── navigation/TopNavigation.tsx    # Top nav bar
├── Navigation.tsx                  # Role-based nav items
├── EmployeeReviewDetail.tsx        # Manager review interface (reference)
├── ClientManagement.tsx            # Client CRUD component
└── ...
```

### Contexts

```
src/contexts/
├── AuthContext.tsx              # Auth + role management
```

### Database Schema

**Core tables:**
- `users` / `employees` — user accounts with roles (employee, manager, admin, client_approver, payroll)
- `clients` — client companies
- `projects` — client projects (status: active/completed/on-hold)
- `project_assignments` — links users to projects with hourly rates
- `tasks` — project-specific task codes
- `time_entries` — daily time tracking (hours stored in minutes)
- `timesheets` — weekly aggregation (status enum: draft/submitted/client_approved/payroll_approved/rejected)
- `expense_categories` — expense types with spending limits
- `expense_items` — individual expenses
- `expense_reports` — monthly expense aggregation

**Auth:** Supabase Auth with role stored in employees/users table. Role checked client-side via AuthContext.

**SQL files:** `scripts/database/` contains schema definitions. Key file: `setup-correct-schema.sql`

## Current State Summary

### ✅ Working (use as reference patterns)
- **Employee dashboard** — timesheets, expenses, project view, profile
- **Manager dashboard** — approvals, contractor management, reports, financial overview
- **Employee import** — Excel/CSV upload at `/admin/employees/import`
- **Auth flow** — login, role-based routing, protected routes
- **Navigation** — role-aware nav items, mobile responsive
- **Timesheet submission** — weekly entry with daily cards, project breakdown

### ⚠️ Partially Done (admin section)
- **Admin dashboard** (`/admin/page.tsx`) — has tab navigation and review/approve UI, but uses mixed patterns. Some data is fetched from Supabase, some is mock/simulated.
- **Admin employees page** — exists but needs full CRUD wiring
- **Admin clients page** — component exists (`ClientManagement.tsx`) but may not be fully wired
- **Admin projects page** — route exists, needs building

### ❌ Not Built Yet
- Admin billing page
- Admin reports pages (time-by-project, time-by-employee, etc.)
- Admin settings page
- System-wide user management (create/edit/deactivate users, assign roles)
- Audit logging
- Tracker API sync integration

## Coding Conventions

### Patterns to Follow

**Always reference the manager section as the gold standard.** The manager dashboard, approvals page, and contractor pages show the correct patterns for:
- Data fetching with Supabase client
- Loading states (spinner with brand color)
- Error handling
- Layout structure
- Navigation tabs

**Data fetching pattern:**
```typescript
const supabase = createClientComponentClient()

const loadData = async () => {
  setIsLoading(true)
  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .eq('field', value)
  
  if (error) {
    console.error('Error:', error)
    return
  }
  setData(data)
  setIsLoading(false)
}
```

**Auth check pattern:**
```typescript
const { user, employee } = useAuth()

useEffect(() => {
  if (employee?.role !== 'admin') {
    router.push('/dashboard')
  }
}, [employee])
```

**Loading state:**
```tsx
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e31c79] mx-auto"></div>
```

### Style Guide

**Brand colors:**
- Primary Pink: `#e31c79` (action buttons, approved status, spinners)
- Dark Blue: `#05202E` (headers, navigation backgrounds, text)
- Light Beige: `#E5DDD8` (section backgrounds, cards)
- Success Green for approved items
- Warning Orange for pending items
- Error Red for rejected items

**UI principles:**
- Simple list views over complex cards (follow SpringAhead's simplicity)
- Consistent card grid layouts
- Uniform card heights and spacing
- Tab navigation for admin sections (Review & Approve | Employees | Clients | Projects | Billing | Reports)
- Mobile-responsive with sidebar patterns

**Do NOT:**
- Use mock/simulated data in production pages (remove setTimeout fake data)
- Create overly complex card layouts
- Add features without wiring to Supabase
- Break existing working pages

### TypeScript

- Use interfaces for all data shapes
- Types defined in `src/types/index.ts`
- Strict mode enabled

## Admin Section — What Needs Doing

### Priority 1: Wire up existing admin pages to real data
The admin dashboard (`/admin/page.tsx`) currently has a backup version that uses simulated data (setTimeout with hardcoded stats). The active version fetches some real data but mixes patterns. Goal: make it consistent with manager dashboard patterns.

### Priority 2: User Management (Admin core function)
- List all users with role, status, department
- Create new users (Supabase Auth + employees table)
- Edit user details and role
- Activate/deactivate users
- Assign users to projects

### Priority 3: Client & Project Management
- CRUD for clients (ClientManagement component exists, may need updates)
- CRUD for projects with client association
- Project assignment management (who works on what, at what rate)
- Task code management per project

### Priority 4: Reports
- Time by project (date range filter)
- Time by employee (date range filter)
- Expense summary reports
- Export to CSV/Excel

### Priority 5: System Settings
- Pay period configuration
- Expense category management
- System-wide defaults
- Notification preferences

## Approval Workflow

```
Employee submits timesheet/expense
  → Status: 'submitted'
  → Client/Manager approves
  → Status: 'client_approved'
  → Admin/Payroll approves
  → Status: 'payroll_approved'
  → Ready for export

Rejection at any stage:
  → Status: 'rejected' + rejection_reason
  → Returns to employee for revision
```

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # Server-side only
DATABASE_URL=                      # Direct DB connection if needed
NEXT_PUBLIC_SITE_URL=              # Production: https://time.westendworkforce.ca
```

## Deployment

- **Platform:** Vercel
- **Domain:** time.westendworkforce.ca
- **Branch:** main → auto-deploy
- **Build:** `next build` (standard Next.js)

## Important Notes

- There is an `app_backup/` directory with old page versions — use for reference only, do not modify
- The `scripts/database/` directory has multiple SQL files — `setup-correct-schema.sql` is the canonical one
- Demo test accounts exist (admin@westendworkforce.com, etc.) — do not remove
- Keep production database separate from demo data
- When building admin pages, the admin should have FULL visibility into everything managers and employees can see, plus system management capabilities
- The admin's Review & Approve tab should function like a super-manager view across ALL clients/projects

## Future Integration (not in scope now, but be aware)

- **Tracker ATS API** — will sync employee clock times, project assignments daily
- **SpringAhead data migration** — historical data import planned
- **Sentry + LogRocket** — error monitoring to be added
- **Automated daily backups** — Supabase backup strategy TBD
