'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  BarChart3,
  Download,
  Calendar,
  DollarSign,
  Clock,
  Users,
  Receipt,
  PieChart,
  ArrowRight,
} from 'lucide-react'

interface ReportData {
  weeklySummary: {
    totalHours: number
    totalExpenses: number
    approvedHours: number
    pendingHours: number
    approvedExpenses: number
    pendingExpenses: number
    employeeCount: number
  }
  projectBreakdown: Array<{
    name: string
    hours: number
    expenses: number
    totalCost: number
    status: 'active' | 'completed' | 'on-hold'
  }>
  employeePerformance: Array<{
    name: string
    employeeId: string
    hours: number
    expenses: number
    efficiency: number
    status: 'approved' | 'pending' | 'rejected'
  }>
  expenseCategories: Array<{
    category: string
    amount: number
    count: number
    percentage: number
  }>
  timeTrends: Array<{
    week: string
    hours: number
    expenses: number
    employees: number
  }>
}

const StatusBadge = ({ status }: { status: string }) => {
  const colorMap: Record<string, { bg: string; color: string; border: string }> = {
    active: { bg: '#ecfdf5', color: '#2d9b6e', border: '#2d9b6e' },
    completed: { bg: '#FAFAF8', color: '#777', border: '#e8e4df' },
    'on-hold': { bg: '#FFF8E1', color: '#c4983a', border: '#c4983a' },
    approved: { bg: '#ecfdf5', color: '#2d9b6e', border: '#2d9b6e' },
    pending: { bg: '#FFF8E1', color: '#c4983a', border: '#c4983a' },
    rejected: { bg: '#fef2f2', color: '#b91c1c', border: '#b91c1c' },
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

export default function ReportsPage() {
  const router = useRouter()
  const { user, employee } = useAuth()
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState('current-week')
  const [exportFormat, setExportFormat] = useState('pdf')

  useEffect(() => {
    loadReportData()
  }, [])

  const loadReportData = async () => {
    // Simulate loading report data
    setTimeout(() => {
      const mockData: ReportData = {
        weeklySummary: {
          totalHours: 156.5,
          totalExpenses: 1247.30,
          approvedHours: 89.0,
          pendingHours: 67.5,
          approvedExpenses: 456.80,
          pendingExpenses: 790.50,
          employeeCount: 6
        },
        projectBreakdown: [
          { name: 'ABC Corp - Software Development', hours: 75.5, expenses: 456.80, totalCost: 8750.30, status: 'active' },
          { name: 'ABC Corp - Tech Infrastructure', hours: 45.0, expenses: 234.50, totalCost: 4509.50, status: 'active' },
          { name: 'ABC Corp - Data Analysis', hours: 22.0, expenses: 156.30, totalCost: 2026.30, status: 'active' },
          { name: 'ABC Corp - Project Management', hours: 14.0, expenses: 400.70, totalCost: 2080.70, status: 'completed' }
        ],
        employeePerformance: [
          { name: 'Mike Chen', employeeId: 'emp1', hours: 26.0, expenses: 0, efficiency: 95, status: 'pending' },
          { name: 'Sarah Johnson', employeeId: 'emp2', hours: 37.5, expenses: 245.80, efficiency: 98, status: 'pending' },
          { name: 'David Kim', employeeId: 'emp3', hours: 22.0, expenses: 156.30, efficiency: 92, status: 'pending' },
          { name: 'Lisa Wang', employeeId: 'emp4', hours: 40.0, expenses: 0, efficiency: 96, status: 'approved' },
          { name: 'Alex Rodriguez', employeeId: 'emp5', hours: 38.0, expenses: 0, efficiency: 89, status: 'pending' },
          { name: 'Emily Chen', employeeId: 'emp6', hours: 36.5, expenses: 89.99, efficiency: 94, status: 'pending' }
        ],
        expenseCategories: [
          { category: 'Software & Tools', amount: 456.80, count: 3, percentage: 36.6 },
          { category: 'Meals & Entertainment', amount: 245.80, count: 2, percentage: 19.7 },
          { category: 'Travel & Transportation', amount: 234.50, count: 2, percentage: 18.8 },
          { category: 'Office Supplies', amount: 156.30, count: 1, percentage: 12.5 },
          { category: 'Other', amount: 153.90, count: 2, percentage: 12.4 }
        ],
        timeTrends: [
          { week: 'Jan 6-12', hours: 142.0, expenses: 890.50, employees: 5 },
          { week: 'Jan 13-19', hours: 156.5, expenses: 1247.30, employees: 6 }
        ]
      }

      setReportData(mockData)
      setIsLoading(false)
    }, 1000)
  }

  const handleExport = (reportType: string) => {
    // In real app, this would generate and download the report
  }

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 95) return '#2d9b6e'
    if (efficiency >= 90) return '#c4983a'
    return '#b91c1c'
  }

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
    padding: 20,
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
        <div style={{ ...shimmer, width: 220, height: 24 }} />
        <div style={{ ...shimmer, width: 280, height: 13, marginTop: 8 }} />
        <div style={{ ...shimmer, width: '100%', height: 56, marginTop: 24, borderRadius: 10 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 20 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: 20 }}>
              <div style={{ ...shimmer, width: 80, height: 11, animationDelay: `${i * 0.1}s` }} />
              <div style={{ ...shimmer, width: 60, height: 22, marginTop: 8, animationDelay: `${i * 0.1}s` }} />
            </div>
          ))}
        </div>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ ...shimmer, width: '100%', height: 160, borderRadius: 10, marginTop: 20, animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="text-center py-12">
        <p style={{ fontSize: 13, color: '#999' }}>No report data available</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '36px 40px' }}>
      {/* Page title */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
          Reports & Analytics
        </h1>
        <p style={{ fontSize: 13, fontWeight: 400, color: '#999', marginTop: 4 }}>
          Comprehensive insights and export capabilities
        </p>
      </div>

      {/* Report Controls */}
      <div style={{ ...cardStyle, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar className="w-3.5 h-3.5" style={{ color: '#ccc' }} />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              style={{
                padding: '6px 10px',
                border: '0.5px solid #e8e4df',
                borderRadius: 7,
                fontSize: 12,
                color: '#555',
                outline: 'none',
              }}
            >
              <option value="current-week">Current Week</option>
              <option value="last-week">Last Week</option>
              <option value="current-month">Current Month</option>
              <option value="last-month">Last Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download className="w-3.5 h-3.5" style={{ color: '#ccc' }} />
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              style={{
                padding: '6px 10px',
                border: '0.5px solid #e8e4df',
                borderRadius: 7,
                fontSize: 12,
                color: '#555',
                outline: 'none',
              }}
            >
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
              <option value="csv">CSV</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => handleExport('weekly-summary')}
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
            <Download className="w-3.5 h-3.5" />
            Export Weekly Summary
          </button>
          <button
            onClick={() => handleExport('full-report')}
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
            <Download className="w-3.5 h-3.5" />
            Export Full Report
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Total Hours', value: reportData.weeklySummary.totalHours.toString(), sub: 'This week' },
          { label: 'Total Expenses', value: `$${reportData.weeklySummary.totalExpenses.toLocaleString()}`, sub: 'This week' },
          { label: 'Pending Items', value: (reportData.weeklySummary.pendingHours + reportData.weeklySummary.pendingExpenses).toString(), sub: 'Awaiting approval' },
          { label: 'Active Employees', value: reportData.weeklySummary.employeeCount.toString(), sub: 'This week' },
        ].map((stat) => (
          <div key={stat.label} style={cardStyle}>
            <p style={{ fontSize: 11, fontWeight: 500, color: '#999', margin: 0 }}>{stat.label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginTop: 4 }}>{stat.value}</p>
            <p style={{ fontSize: 11, color: '#ccc', marginTop: 2 }}>{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Project Breakdown */}
      <div style={{ ...cardStyle, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={sectionHeaderStyle}>Project Breakdown</h2>
          <button
            onClick={() => handleExport('project-breakdown')}
            style={{
              background: '#e31c79',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '6px 14px',
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Download className="w-3 h-3" />
            Export
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Project', 'Hours', 'Expenses', 'Total Cost', 'Status'].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: h === 'Project' ? 'left' : 'center',
                    padding: '10px 16px',
                    fontSize: 9,
                    fontWeight: 500,
                    letterSpacing: 1,
                    color: '#ccc',
                    textTransform: 'uppercase',
                    borderBottom: '0.5px solid #f5f2ee',
                    background: 'transparent',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reportData.projectBreakdown.map((project, index) => (
              <tr
                key={index}
                style={{ borderBottom: '0.5px solid #f5f2ee' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#FDFCFB')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 400, color: '#555' }}>
                    {project.name.split(' - ')[1]}
                  </div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 1 }}>
                    {project.name.split(' - ')[0]}
                  </div>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12.5, color: '#555' }}>
                  {project.hours} hrs
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12.5, color: '#555' }}>
                  ${project.expenses.toFixed(2)}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12.5, fontWeight: 500, color: '#555' }}>
                  ${project.totalCost.toFixed(2)}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <StatusBadge status={project.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Employee Performance */}
      <div style={{ ...cardStyle, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={sectionHeaderStyle}>Employee Performance</h2>
          <button
            onClick={() => handleExport('employee-performance')}
            style={{
              background: 'white',
              color: '#777',
              border: '0.5px solid #e0dcd7',
              borderRadius: 6,
              padding: '6px 14px',
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Download className="w-3 h-3" />
            Export
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Employee', 'Hours', 'Expenses', 'Efficiency', 'Status', 'Actions'].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: h === 'Employee' ? 'left' : 'center',
                    padding: '10px 16px',
                    fontSize: 9,
                    fontWeight: 500,
                    letterSpacing: 1,
                    color: '#ccc',
                    textTransform: 'uppercase',
                    borderBottom: '0.5px solid #f5f2ee',
                    background: 'transparent',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reportData.employeePerformance.map((emp, index) => (
              <tr
                key={index}
                style={{ borderBottom: '0.5px solid #f5f2ee' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#FDFCFB')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 400, color: '#555' }}>{emp.name}</div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 1 }}>ID: {emp.employeeId}</div>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12.5, color: '#555' }}>
                  {emp.hours} hrs
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12.5, color: '#555' }}>
                  ${emp.expenses.toFixed(2)}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: getEfficiencyColor(emp.efficiency) }}>
                    {emp.efficiency}%
                  </span>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <StatusBadge status={emp.status} />
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <button
                    onClick={() => router.push(`/manager/approvals?employee=${emp.employeeId}&type=both`)}
                    style={{ background: 'none', border: 'none', color: '#e31c79', cursor: 'pointer', padding: 4 }}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expense Categories */}
      <div style={{ ...cardStyle, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={sectionHeaderStyle}>Expense Categories</h2>
          <button
            onClick={() => handleExport('expense-categories')}
            style={{
              background: '#e31c79',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '6px 14px',
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Download className="w-3 h-3" />
            Export
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reportData.expenseCategories.map((category, index) => (
              <div
                key={index}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      backgroundColor: `hsl(${index * 60}, 50%, 55%)`,
                    }}
                  />
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 400, color: '#555', margin: 0 }}>
                      {category.category}
                    </p>
                    <p style={{ fontSize: 10, color: '#999', margin: 0, marginTop: 1 }}>
                      {category.count} items
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
                    ${category.amount.toFixed(2)}
                  </p>
                  <p style={{ fontSize: 10, color: '#999', margin: 0, marginTop: 1 }}>
                    {category.percentage}%
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div
              style={{
                width: 160,
                height: 160,
                background: '#FDFCFB',
                borderRadius: '50%',
                border: '0.5px solid #f5f2ee',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PieChart className="w-10 h-10" style={{ color: '#ddd' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Export Options */}
      <div style={cardStyle}>
        <h2 style={sectionHeaderStyle}>Quick Export Options</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { icon: Clock, label: 'Timesheet Summary', sub: 'All approved hours', type: 'timesheet-summary' },
            { icon: Receipt, label: 'Expense Summary', sub: 'All approved expenses', type: 'expense-summary' },
            { icon: DollarSign, label: 'Billing Report', sub: 'Ready for invoicing', type: 'billing-report' },
          ].map((item) => (
            <button
              key={item.type}
              onClick={() => handleExport(item.type)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 16,
                border: '0.5px solid #e8e4df',
                borderRadius: 10,
                background: '#fff',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 7,
                  background: 'rgba(227,28,121,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <item.icon className="w-4 h-4" style={{ color: '#e31c79' }} />
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 500, color: '#555', margin: 0 }}>{item.label}</p>
                <p style={{ fontSize: 11, color: '#999', margin: 0, marginTop: 2 }}>{item.sub}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
