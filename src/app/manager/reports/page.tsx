'use client'

import { useRouter } from 'next/navigation'
import {
  Clock,
  Users,
  Briefcase,
  UserCheck,
  AlertTriangle,
  Receipt,
  FolderOpen,
  ShieldCheck,
} from 'lucide-react'

export default function ReportsPage() {
  const router = useRouter()

  const timeReports = [
    { label: 'Time by Employee', sub: 'Hours grouped by team member', icon: Users, href: '/manager/reports/time-by-employee' },
    { label: 'Time by Project', sub: 'Hours grouped by project', icon: Briefcase, href: '/manager/reports/time-by-project' },
    { label: 'Time by Class', sub: 'Hours grouped by class/category', icon: FolderOpen, href: '/manager/reports/time-by-class' },
    { label: 'Time by Approver', sub: 'Hours grouped by approver', icon: UserCheck, href: '/manager/reports/time-by-approver' },
    { label: 'Time Missing', sub: 'Employees with missing timesheets', icon: AlertTriangle, href: '/manager/reports/time-missing' },
  ]

  const expenseReports = [
    { label: 'Expenses by Employee', sub: 'Expenses grouped by team member', icon: Users, href: '/manager/reports/expenses-by-employee' },
    { label: 'Expenses by Project', sub: 'Expenses grouped by project', icon: Briefcase, href: '/manager/reports/expenses-by-project' },
    { label: 'Expenses by Approver', sub: 'Expenses grouped by approver', icon: ShieldCheck, href: '/manager/reports/expenses-by-approver' },
  ]

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 1,
    color: '#c0bab2',
    textTransform: 'uppercase',
    marginBottom: 16,
  }

  return (
    <div style={{ padding: '36px 40px' }}>
      {/* Page title */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
          Reports
        </h1>
        <p style={{ fontSize: 13, fontWeight: 400, color: '#999', marginTop: 4 }}>
          Generate and export reports for your team
        </p>
      </div>

      {/* Time Reports */}
      <p style={sectionHeaderStyle}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Clock style={{ width: 12, height: 12 }} />
          Time Reports
        </span>
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 32 }}>
        {timeReports.map((report) => (
          <button
            key={report.href}
            onClick={() => router.push(report.href)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: 20,
              border: '0.5px solid #e8e4df',
              borderRadius: 10,
              background: '#fff',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#FDFCFB')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: 'rgba(227,28,121,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <report.icon className="w-5 h-5" style={{ color: '#e31c79' }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>{report.label}</p>
              <p style={{ fontSize: 11, color: '#999', margin: '4px 0 0 0' }}>{report.sub}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Expense Reports */}
      <p style={sectionHeaderStyle}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Receipt style={{ width: 12, height: 12 }} />
          Expense Reports
        </span>
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {expenseReports.map((report) => (
          <button
            key={report.href}
            onClick={() => router.push(report.href)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: 20,
              border: '0.5px solid #e8e4df',
              borderRadius: 10,
              background: '#fff',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#FDFCFB')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: 'rgba(227,28,121,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <report.icon className="w-5 h-5" style={{ color: '#e31c79' }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>{report.label}</p>
              <p style={{ fontSize: 11, color: '#999', margin: '4px 0 0 0' }}>{report.sub}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
