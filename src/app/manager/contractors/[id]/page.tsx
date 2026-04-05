'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  User,
  Clock,
  DollarSign,
  Mail,
  Phone,
  ArrowLeft,
} from 'lucide-react'

interface EmployeeDetail {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string | null
  role: string | null
  department: string | null
  hire_date: string | null
  employee_type: string | null
  hourly_rate: number | null
  status: string | null
  manager_id: string | null
}

interface TimesheetRow {
  id: string
  week_ending: string
  total_hours: number
  overtime_hours: number
  status: string
}

interface ExpenseReportRow {
  id: string
  title: string
  total_amount: number
  status: string
  created_at: string
}

const StatusBadge = ({ status }: { status: string }) => {
  const colorMap: Record<string, { bg: string; color: string; border: string }> = {
    active: { bg: '#ecfdf5', color: '#2d9b6e', border: '#2d9b6e' },
    inactive: { bg: '#FAFAF8', color: '#777', border: '#e8e4df' },
    pending: { bg: '#FFF8E1', color: '#c4983a', border: '#c4983a' },
    submitted: { bg: '#FFF8E1', color: '#c4983a', border: '#c4983a' },
    approved: { bg: '#ecfdf5', color: '#2d9b6e', border: '#2d9b6e' },
    rejected: { bg: '#fef2f2', color: '#b91c1c', border: '#b91c1c' },
    draft: { bg: '#FAFAF8', color: '#777', border: '#e8e4df' },
  }
  const c = colorMap[status] || { bg: '#FAFAF8', color: '#777', border: '#e8e4df' }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        fontSize: 9,
        fontWeight: 500,
        borderRadius: 3,
        background: c.bg,
        color: c.color,
        border: `0.5px solid ${c.border}`,
      }}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export default function ContractorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null)
  const [timesheets, setTimesheets] = useState<TimesheetRow[]>([])
  const [expenseReports, setExpenseReports] = useState<ExpenseReportRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const employeeId = params.id as string

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError('')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not authenticated'); return }

      // Fetch employee with ownership check
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single()

      if (empError || !empData) {
        setError('Employee not found.')
        return
      }

      if (empData.manager_id !== user.id) {
        setError('You do not have access to this employee.')
        return
      }

      setEmployee(empData as EmployeeDetail)

      // Fetch recent timesheets (last 4 weeks)
      const fourWeeksAgo = new Date()
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)
      const { data: tsData } = await supabase
        .from('timesheets')
        .select('id, week_ending, total_hours, overtime_hours, status')
        .eq('employee_id', employeeId)
        .gte('week_ending', fourWeeksAgo.toISOString().split('T')[0])
        .order('week_ending', { ascending: false })

      setTimesheets((tsData || []) as TimesheetRow[])

      // Fetch recent expense reports
      const { data: erData } = await supabase
        .from('expense_reports')
        .select('id, title, total_amount, status, created_at')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })
        .limit(5)

      setExpenseReports((erData || []) as ExpenseReportRow[])
    } catch (err) {
      console.error('Error loading contractor detail:', err)
      setError('Something went wrong.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleContact = (method: 'email' | 'phone') => {
    if (!employee) return
    if (method === 'email') {
      window.open(`mailto:${employee.email}`)
    } else if (method === 'phone' && employee.phone) {
      window.open(`tel:${employee.phone}`)
    }
  }

  if (isLoading) {
    const shimmer: React.CSSProperties = {
      background: 'linear-gradient(90deg, #f5f2ee 25%, #ece8e3 50%, #f5f2ee 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      borderRadius: 4,
    }
    return (
      <div style={{ padding: '36px 40px' }}>
        <style dangerouslySetInnerHTML={{ __html: '@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }' }} />
        <div style={{ ...shimmer, width: 120, height: 14, marginBottom: 24 }} />
        <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: 24, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ ...shimmer, width: 52, height: 52, borderRadius: '50%' }} />
          <div style={{ flex: 1 }}>
            <div style={{ ...shimmer, width: 200, height: 24 }} />
            <div style={{ ...shimmer, width: 160, height: 13, marginTop: 8 }} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: 24 }}>
              <div style={{ ...shimmer, width: 80, height: 11, animationDelay: `${i * 0.1}s` }} />
              <div style={{ ...shimmer, width: 60, height: 20, marginTop: 8, animationDelay: `${i * 0.1}s` }} />
            </div>
          ))}
        </div>
        {[0, 1].map(i => (
          <div key={i} style={{ ...shimmer, width: '100%', height: 120, borderRadius: 10, marginBottom: 16, animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '36px 40px' }}>
        <div style={{ background: '#fff', border: '0.5px solid #b91c1c', borderRadius: 10, padding: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 12.5, color: '#b91c1c' }}>{error}</span>
        </div>
        <button
          onClick={() => router.back()}
          style={{
            marginTop: 16,
            background: '#e31c79',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '8px 20px',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Go Back
        </button>
      </div>
    )
  }

  if (!employee) return null

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 1,
    color: '#c0bab2',
    textTransform: 'uppercase',
    marginBottom: 16,
  }

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    border: '0.5px solid #e8e4df',
    borderRadius: 10,
    padding: 24,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#c0bab2',
  }

  const valueStyle: React.CSSProperties = {
    fontSize: 12.5,
    fontWeight: 400,
    color: '#555',
    marginTop: 2,
  }

  const totalHours = timesheets.reduce((s, t) => s + (t.total_hours || 0), 0)

  return (
    <div style={{ padding: '36px 40px' }}>
      {/* Back link */}
      <button
        onClick={() => router.push('/manager/contractors')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: 'none',
          color: '#e31c79',
          fontSize: 12,
          cursor: 'pointer',
          padding: 0,
          marginBottom: 24,
        }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Contractors
      </button>

      {/* Header card */}
      <div style={{ ...cardStyle, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'rgba(227,28,121,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <User className="w-6 h-6" style={{ color: '#e31c79' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
              {employee.first_name} {employee.last_name}
            </h1>
            <p style={{ fontSize: 13, fontWeight: 400, color: '#999', marginTop: 2 }}>
              {employee.department || employee.role || 'Team Member'}
            </p>
            <p style={{ fontSize: 11, color: '#ccc', marginTop: 2 }}>
              ID: {employee.id.slice(0, 8)}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleContact('email')}
              style={{
                background: '#e31c79',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Mail className="h-3.5 w-3.5" />
              Email
            </button>
            {employee.phone && (
              <button
                onClick={() => handleContact('phone')}
                style={{
                  background: 'white',
                  color: '#777',
                  border: '0.5px solid #e0dcd7',
                  borderRadius: 6,
                  padding: '8px 16px',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Phone className="h-3.5 w-3.5" />
                Call
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Hourly Rate', value: employee.hourly_rate ? `$${employee.hourly_rate}/hr` : '-' },
          { label: 'Recent Hours', value: `${totalHours.toFixed(1)} hrs` },
          { label: 'Employee Type', value: employee.employee_type || '-' },
          { label: 'Status', value: employee.status || 'unknown' },
        ].map((stat) => (
          <div key={stat.label} style={cardStyle}>
            <p style={labelStyle}>{stat.label}</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a', marginTop: 4 }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ ...cardStyle, marginBottom: 20 }}>
        <h2 style={sectionHeaderStyle}>Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <button
            onClick={() => router.push('/manager/timesheets')}
            style={{
              background: '#e31c79',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '12px 20px',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Clock className="h-4 w-4" />
            Review Timesheets
          </button>
          <button
            onClick={() => router.push('/manager/expenses')}
            style={{
              background: 'white',
              color: '#777',
              border: '0.5px solid #e0dcd7',
              borderRadius: 6,
              padding: '12px 20px',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <DollarSign className="h-4 w-4" />
            Review Expenses
          </button>
        </div>
      </div>

      {/* Details grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Personal Info */}
        <div style={cardStyle}>
          <h2 style={sectionHeaderStyle}>Personal Information</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <span style={labelStyle}>Email</span>
              <p style={valueStyle}>{employee.email}</p>
            </div>
            {employee.phone && (
              <div>
                <span style={labelStyle}>Phone</span>
                <p style={valueStyle}>{employee.phone}</p>
              </div>
            )}
            <div>
              <span style={labelStyle}>Role</span>
              <p style={valueStyle}>{employee.role || '-'}</p>
            </div>
            <div>
              <span style={labelStyle}>Department</span>
              <p style={valueStyle}>{employee.department || '-'}</p>
            </div>
            {employee.hire_date && (
              <div>
                <span style={labelStyle}>Hire Date</span>
                <p style={valueStyle}>{new Date(employee.hire_date).toLocaleDateString()}</p>
              </div>
            )}
            <div>
              <span style={labelStyle}>Status</span>
              <div style={{ marginTop: 4 }}>
                <StatusBadge status={employee.status || 'inactive'} />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Timesheets */}
        <div style={cardStyle}>
          <h2 style={sectionHeaderStyle}>Recent Timesheets</h2>
          {timesheets.length === 0 ? (
            <p style={{ fontSize: 12.5, color: '#999' }}>No recent timesheets</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {timesheets.map(ts => (
                <div
                  key={ts.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: '#FDFCFB',
                    borderRadius: 7,
                    border: '0.5px solid #f5f2ee',
                  }}
                >
                  <div>
                    <span style={{ fontSize: 12, color: '#555' }}>
                      Week of {new Date(ts.week_ending).toLocaleDateString()}
                    </span>
                    <span style={{ fontSize: 11, color: '#999', marginLeft: 8 }}>
                      {ts.total_hours}h{ts.overtime_hours > 0 ? ` (OT: ${ts.overtime_hours}h)` : ''}
                    </span>
                  </div>
                  <StatusBadge status={ts.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Expense Reports */}
      <div style={cardStyle}>
        <h2 style={sectionHeaderStyle}>Recent Expense Reports</h2>
        {expenseReports.length === 0 ? (
          <p style={{ fontSize: 12.5, color: '#999' }}>No recent expense reports</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {expenseReports.map(er => (
              <div
                key={er.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: '#FDFCFB',
                  borderRadius: 7,
                  border: '0.5px solid #f5f2ee',
                }}
              >
                <div>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#555' }}>{er.title}</span>
                  <span style={{ fontSize: 11, color: '#999', marginLeft: 8 }}>
                    ${(er.total_amount || 0).toFixed(2)}
                  </span>
                </div>
                <StatusBadge status={er.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
