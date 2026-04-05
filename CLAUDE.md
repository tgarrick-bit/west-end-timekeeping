# West End Workforce - Timekeeping App

## Project Overview

Private time and expense tracking platform for West End Workforce (WOSB/WBE staffing firm). Replaces SpringAhead. Four user roles: Employee, Manager, Admin, Client Approver. Deployed at `time.westendworkforce.ca`.

**Repo:** `git@github.com:tgarrick-bit/west-end-timekeeping.git`

## Tech Stack

- **Framework:** Next.js 14 with App Router, TypeScript
- **Styling:** Tailwind CSS + inline styles (Montserrat font)
- **Database:** Supabase (PostgreSQL + Auth + Storage)
- **Deployment:** Vercel
- **Monitoring:** Sentry + LogRocket (planned)

## Architecture

### Routing Structure

```
src/app/
├── page.tsx                    # Redirects to login
├── auth/login/page.tsx         # Login page
├── dashboard/page.tsx          # Post-login landing (requires auth)
├── timesheets/page.tsx         # Employee timesheet entry
├── expenses/page.tsx           # Employee expense entry
├── employee/                   # Employee portal
│   ├── page.tsx
│   └── layout.tsx
├── timesheet/entry/page.tsx    # Timesheet entry
├── expense/entry/page.tsx      # Expense entry
├── client/                     # Client approver portal
│   ├── page.tsx
│   ├── timesheets/page.tsx
│   └── expenses/page.tsx
├── manager/                    # Manager section
│   ├── page.tsx                # Manager dashboard
│   ├── layout.tsx              # Manager layout with nav tabs
│   ├── pending/page.tsx        # Approval queue
│   ├── contractors/            # Team management
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── timesheets/page.tsx
│   ├── expenses/page.tsx
│   ├── reports/                # Manager reports (all working)
│   │   ├── page.tsx
│   │   ├── time-by-project/
│   │   ├── time-by-employee/
│   │   ��── time-by-approver/
│   │   ├── time-by-class/
│   │   ├── time-missing/
���   │   ├── expenses-by-project/
│   │   ├── expenses-by-employee/
│   │   └── expenses-by-approver/
│   └── financial/page.tsx
├── admin/                      # Admin section
│   ├── page.tsx                # Admin dashboard with review/approve
│   ├── layout.tsx              # Admin layout (Sidebar + AdminNav)
│   ├── employees/              # Employee management
│   │   ├── page.tsx
│   │   └── import/page.tsx     # Excel/CSV import
│   ├── clients/page.tsx        # Client management (CRUD)
│   ├── projects/               # Project management
│   │   ├── page.tsx            # Project list
│   │   └── [id]/page.tsx       # Project edit (overview, budget, invoicing, people, approvers, time settings)
│   ├── timesheets/page.tsx     # Timesheet review
│   ├── expenses/page.tsx       # Expense review
���   ├── payroll/page.tsx        # Payroll management
│   ├── billing/page.tsx        # Billing
│   ├── audit/page.tsx          # Audit log viewer (filterable, paginated)
│   ├── reports/                # Reports (all working)
│   │   ├── time-by-project/
│   │   ├── time-by-employee/
│   │   ├── time-by-approver/
│   │   ├── time-by-class/
│   │   ├── time-missing/
│   │   ├── expenses-by-project/
│   │   ├── expenses-by-employee/
│   │   └── expenses-by-approver/
│   └── settings/page.tsx       # System settings
└── app_backup/                 # Old versions - reference only, do not modify
```

### Key Components

```
src/components/
├── layout/
│   ├── AppShell.tsx               # Sidebar + content wrapper
���   ├── AuthenticatedShell.tsx     # Auth-gated shell
│   ├── Sidebar.tsx                # Role-based sidebar navigation
│   └── AdminNav.tsx               # Admin tab navigation
├── ui/
│   ├── Skeleton.tsx               # Skeleton loading components
│   └── NotificationBell.tsx       # Bell icon + dropdown in sidebar
├── auth/
│   ├── AuthContext.tsx
│   └── ProtectedRoute.tsx
├── Navigation.tsx                 # Legacy role-based nav items
├── ClientManagement.tsx           # Client CRUD component
└── ...
```

### Contexts

```
src/contexts/
├── AuthContext.tsx              # Auth + role management (useAuth hook)
├── NotificationContext.tsx      # Notification toast context
```

### Database Schema

**Core tables:**
- `employees` -- user accounts with roles (employee, manager, admin, client_approver, payroll)
- `clients` -- client companies
- `projects` -- client projects (status: active/completed/on-hold, includes billing_rate, budget, active_po, invoice_item, time_type, max_daily_hours, time_increment)
- `project_employees` -- links users to projects with hourly rates (pay_rate, bill_rate)
- `time_approvers` -- who can approve time for which projects
- `tasks` -- project-specific task codes
- `time_entries` -- daily time tracking (hours stored in minutes)
- `timesheets` -- weekly aggregation (status enum: draft/submitted/client_approved/payroll_approved/rejected)
- `expense_categories` -- expense types with spending limits
- `expense_items` -- individual expenses
- `expense_reports` -- monthly expense aggregation
- `notifications` -- in-app notification inbox (user_id, type, title, message, is_read, metadata)
- `audit_logs` -- system-wide audit trail (user_id, action, timestamp, metadata)
- `notification_logs` -- email/system notification history

**Auth:** Supabase Auth with role stored in employees table. Role checked client-side via AuthContext.

**SQL files:** `scripts/database/` contains schema definitions and migrations.

## Current State Summary

### Working
- **Employee dashboard** -- timesheets, expenses, project view, profile
- **Manager dashboard** -- approvals, contractor management, reports, financial overview
- **Client approver portal** -- timesheet and expense approval
- **Admin dashboard** -- review/approve, tab navigation
- **Admin employee management** -- CRUD, Excel/CSV import
- **Admin client management** -- CRUD via ClientManagement component
- **Admin project management** -- full CRUD with budget, invoicing, people, approvers, time settings (all persisted to DB)
- **Admin reports** -- time-by-project, time-by-employee, time-by-approver, time-by-class, time-missing, expenses-by-project, expenses-by-employee, expenses-by-approver
- **Admin audit log** -- filterable, paginated audit trail viewer
- **Notification inbox** -- bell icon in sidebar with unread badge, dropdown panel
- **Auth flow** -- login, role-based routing, protected routes
- **Navigation** -- role-aware sidebar + mobile responsive
- **Timesheet submission** -- weekly entry with daily cards, project breakdown

### Partially Done
- Admin billing page
- Admin settings page
- Admin payroll page

## Coding Conventions

### Patterns to Follow

**Data fetching pattern:**
```typescript
const supabase = createClient()  // from @/lib/supabase/client

const loadData = async () => {
  setLoading(true)
  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .eq('field', value)

  if (error) {
    console.error('Error:', error)
    return
  }
  setData(data)
  setLoading(false)
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
<SkeletonList rows={6} />
// or
<div className="w-4 h-4 border-2 border-[#e8e4df] border-t-[#e31c79] rounded-full animate-spin" />
```

### Style Guide

**Brand colors:**
- Primary Pink: `#e31c79` (action buttons, active indicators, badges)
- Page Background: `#FAFAF8`
- Card Background: `#FFFFFF` with `border: 0.5px solid #e8e4df`, `border-radius: 10px`
- Gold Focus Ring: `#d3ad6b` (input focus states)
- Text Primary: `#1a1a1a`
- Text Secondary: `#999`
- Labels: `#c0bab2` (uppercase, 9px, letter-spacing: 1)
- Dividers: `#f0ece7` or `#e8e4df`
- Success: `#2d9b6e`
- Error: `#b91c1c`

**Font:** Montserrat (loaded via next/font or Google Fonts)

**Page layout:**
```tsx
<div style={{ padding: '36px 40px' }}>
  {/* page content */}
</div>
```

**UI principles:**
- No shadows -- use borders only
- Skeleton loading states (not spinners) for page content
- Consistent card/table styling with 0.5px borders
- Tab navigation for admin sections
- Mobile-responsive with sidebar patterns
- Hover states with subtle background changes (#FDFCFB, #FAFAF8)

**Do NOT:**
- Use mock/simulated data in production pages
- Add box shadows to cards
- Add features without wiring to Supabase
- Break existing working pages
- Use fonts other than Montserrat

### TypeScript

- Use interfaces for all data shapes
- Types defined in `src/types/index.ts`
- Strict mode enabled

## Approval Workflow

```
Employee submits timesheet/expense
  -> Status: 'submitted'
  -> Client/Manager approves
  -> Status: 'client_approved'
  -> Admin/Payroll approves
  -> Status: 'payroll_approved'
  -> Ready for export

Rejection at any stage:
  -> Status: 'rejected' + rejection_reason
  -> Returns to employee for revision
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
- **Branch:** main -> auto-deploy
- **Build:** `next build` (standard Next.js)

## Important Notes

- There is an `app_backup/` directory with old page versions -- use for reference only, do not modify
- The `scripts/database/` directory has multiple SQL files and migration scripts
- Demo test accounts exist (admin@westendworkforce.com, etc.) -- do not remove
- Keep production database separate from demo data
- When building admin pages, the admin should have FULL visibility into everything managers and employees can see, plus system management capabilities
- The admin's Review & Approve tab should function like a super-manager view across ALL clients/projects

## Future Integration (not in scope now, but be aware)

- **Tracker ATS API** -- will sync employee clock times, project assignments daily
- **SpringAhead data migration** -- historical data import planned
- **Sentry + LogRocket** -- error monitoring to be added
- **Automated daily backups** -- Supabase backup strategy TBD
