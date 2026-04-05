'use client'

import Link from 'next/link'
import {
  Clock,
  Users,
  Briefcase,
  UserCheck,
  AlertTriangle,
  Receipt,
  FolderOpen,
  ShieldCheck,
  BarChart3,
} from 'lucide-react'

const timeReports = [
  {
    title: 'Time by Project',
    description: 'View hours logged grouped by project with date range filtering.',
    href: '/admin/reports/time-by-project',
    icon: Briefcase,
  },
  {
    title: 'Time by Employee',
    description: 'View hours logged grouped by employee with type and class filters.',
    href: '/admin/reports/time-by-employee',
    icon: Users,
  },
  {
    title: 'Time by Class',
    description: 'View hours grouped by classification or department.',
    href: '/admin/reports/time-by-class',
    icon: FolderOpen,
  },
  {
    title: 'Time by Approver',
    description: 'View approved timesheets grouped by the approving manager.',
    href: '/admin/reports/time-by-approver',
    icon: UserCheck,
  },
  {
    title: 'Missing Timesheets',
    description: 'Identify employees who have not submitted timesheets for a period.',
    href: '/admin/reports/time-missing',
    icon: AlertTriangle,
  },
]

const expenseReports = [
  {
    title: 'Expenses by Employee',
    description: 'View expense submissions grouped by employee with category filters.',
    href: '/admin/reports/expenses-by-employee',
    icon: Users,
  },
  {
    title: 'Expenses by Project',
    description: 'View expenses grouped by project with billable and reimbursable filters.',
    href: '/admin/reports/expenses-by-project',
    icon: Briefcase,
  },
  {
    title: 'Expenses by Approver',
    description: 'View approved expenses grouped by the approving manager.',
    href: '/admin/reports/expenses-by-approver',
    icon: ShieldCheck,
  },
]

export default function ReportsHub() {
  return (
    <div style={{ padding: '36px 40px' }}>
      {/* Page Header */}
      <div className="mb-6 anim-slide-up stagger-1">
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', letterSpacing: -0.3 }}>
          Reports
        </h1>
        <p style={{ fontSize: 13, fontWeight: 400, color: '#999' }}>
          Generate and export time and expense reports across all employees and projects.
        </p>
      </div>

      {/* Time Reports Section */}
      <div className="mb-8 anim-slide-up stagger-2">
        <div className="flex items-center gap-2 mb-4">
          <Clock style={{ width: 14, height: 14, color: '#c0bab2' }} />
          <h2 style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' }}>
            Time Reports
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {timeReports.map((report) => {
            const Icon = report.icon
            return (
              <Link key={report.href} href={report.href} style={{ textDecoration: 'none' }}>
                <div
                  style={{
                    background: '#fff',
                    border: '0.5px solid #e8e4df',
                    borderRadius: 10,
                    padding: '22px 24px',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease, transform 0.15s ease',
                    minHeight: 110,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#e31c79'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e8e4df'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Icon style={{ width: 16, height: 16, color: '#e31c79', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                      {report.title}
                    </span>
                  </div>
                  <p style={{ fontSize: 11.5, color: '#999', lineHeight: 1.5, margin: 0 }}>
                    {report.description}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Expense Reports Section */}
      <div className="anim-slide-up stagger-3">
        <div className="flex items-center gap-2 mb-4">
          <Receipt style={{ width: 14, height: 14, color: '#c0bab2' }} />
          <h2 style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' }}>
            Expense Reports
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {expenseReports.map((report) => {
            const Icon = report.icon
            return (
              <Link key={report.href} href={report.href} style={{ textDecoration: 'none' }}>
                <div
                  style={{
                    background: '#fff',
                    border: '0.5px solid #e8e4df',
                    borderRadius: 10,
                    padding: '22px 24px',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease, transform 0.15s ease',
                    minHeight: 110,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#e31c79'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e8e4df'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Icon style={{ width: 16, height: 16, color: '#e31c79', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                      {report.title}
                    </span>
                  </div>
                  <p style={{ fontSize: 11.5, color: '#999', lineHeight: 1.5, margin: 0 }}>
                    {report.description}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
