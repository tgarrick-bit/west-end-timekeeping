'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'
import { Download } from 'lucide-react'

interface ReportData {
  id: string
  week_ending: string
  total_hours: number
  overtime_hours: number
  status: string
  employee_id: string
  project_id?: string
  employees?: {
    first_name: string
    last_name: string
    department: string
    hourly_rate: number
  }
  projects?: {
    name: string
    code: string
  }
}

export default function TimeByProjectReport() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  const [startDate, setStartDate] = useState('2025-09-07')
  const [endDate, setEndDate] = useState('2025-09-13')
  const [selectedProject, setSelectedProject] = useState('-All-')
  const [selectedUser, setSelectedUser] = useState('-All-')
  const [selectedTimeType, setSelectedTimeType] = useState('-All-')
  const [selectedClass, setSelectedClass] = useState('-All-')
  const [forceCompleteWeeks, setForceCompleteWeeks] = useState(false)
  const [includeUnapproved, setIncludeUnapproved] = useState(false)
  const [includeBillRates, setIncludeBillRates] = useState(false)
  const [includePayRates, setIncludePayRates] = useState(false)
  const [includeDetails, setIncludeDetails] = useState(false)
  const [includeZeroHours, setIncludeZeroHours] = useState(false)
  const [summaryOnly, setSummaryOnly] = useState(false)
  const [reportData, setReportData] = useState<ReportData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  const timeTypes = [
    '-All-',
    'Regular',
    'Overtime',
    'Doubletime',
    'Sick',
    'Vacation',
    'Holiday',
    'Non-billable',
    'Overtime *',
    'regular *'
  ]

  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 400)
    return () => clearTimeout(timer)
  }, [])

  const handleRunReport = async () => {
    setIsLoading(true)

    try {
      let query = supabase
        .from('timesheets')
        .select(`
          *,
          employees!inner (
            first_name,
            last_name,
            department,
            hourly_rate
          ),
          projects (
            name,
            code
          )
        `)
        .gte('week_ending', startDate)
        .lte('week_ending', endDate)

      if (!includeUnapproved) {
        query = query.eq('status', 'approved')
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching report data:', error)
      } else if (data) {
        const approverIds = [...new Set(
          (data as any[]).map(r => r.approved_by).filter(Boolean)
        )]
        let approverMap: Record<string, string> = {}
        if (approverIds.length > 0) {
          const { data: approvers } = await supabase
            .from('employees')
            .select('id, first_name, last_name')
            .in('id', approverIds)
          if (approvers) {
            approverMap = Object.fromEntries(
              approvers.map(a => [
                a.id,
                `${(a.first_name || '')[0] || ''}${(a.last_name || '')[0] || ''}`.toUpperCase()
              ])
            )
          }
        }
        const enriched = (data as any[]).map(r => ({
          ...r,
          approved_by_name: r.approved_by ? (approverMap[r.approved_by] || '') : ''
        }))
        setReportData(enriched as ReportData[])
      }
    } catch (error) {
      console.error('Error generating report:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportToExcel = () => {
    if (reportData.length === 0) {
      alert('No data to export. Please run the report first.')
      return
    }

    const exportData = reportData.map(row => {
      const regularHours = Math.min(row.total_hours || 0, 40)
      const overtimeHours = row.overtime_hours || Math.max(0, (row.total_hours || 0) - 40)
      const hourlyRate = row.employees?.hourly_rate || 0
      const regularAmount = regularHours * hourlyRate
      const overtimeAmount = overtimeHours * hourlyRate * 1.5

      const weekEndDate = new Date(row.week_ending + 'T00:00:00')
      const dayOfWeek = weekEndDate.toLocaleDateString('en-US', { weekday: 'long' })
      const monthName = weekEndDate.toLocaleDateString('en-US', { month: 'long' })
      const startOfYear = new Date(weekEndDate.getFullYear(), 0, 1)
      const daysSinceStart = Math.floor((weekEndDate.getTime() - startOfYear.getTime()) / 86400000)
      const weekNumber = Math.ceil((daysSinceStart + startOfYear.getDay() + 1) / 7)

      const rowData: any = {
        'Project': row.projects?.name || 'No Project Assigned',
        'Project Code': row.projects?.code || '',
        'Employee': `${row.employees?.first_name} ${row.employees?.last_name}`,
        'Department': row.employees?.department || '',
        'Week Ending': row.week_ending,
        'DOW': dayOfWeek,
        'Week #': weekNumber,
        'Month': monthName,
        'Regular Hours': regularHours.toFixed(2),
        'Overtime Hours': overtimeHours.toFixed(2),
        'Total Hours': row.total_hours?.toFixed(2) || '0.00',
        'Type': overtimeHours > 0 ? 'OT' : 'Reg',
        'Status': row.status.charAt(0).toUpperCase() + row.status.slice(1),
        'Approved By': (row as any).approved_by_name || '',
      }

      if (includePayRates) {
        rowData['Pay Rate'] = `$${hourlyRate.toFixed(2)}`
        rowData['Regular Amount'] = `$${regularAmount.toFixed(2)}`
        rowData['Overtime Amount'] = `$${overtimeAmount.toFixed(2)}`
        rowData['Total Amount'] = `$${(regularAmount + overtimeAmount).toFixed(2)}`
      }

      if (includeBillRates) {
        rowData['Bill Rate'] = 'N/A'
        rowData['Billed Amount'] = 'N/A'
      }

      return rowData
    })

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(exportData)

    const colWidths = Object.keys(exportData[0] || {}).map(key => {
      const maxLength = Math.max(
        key.length,
        ...exportData.map(row => String(row[key]).length)
      )
      return { wch: Math.min(maxLength + 2, 30) }
    })
    ws['!cols'] = colWidths

    XLSX.utils.book_append_sheet(wb, ws, 'Time by Project')

    const fileName = `time_by_project_${startDate}_to_${endDate}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  if (pageLoading) {
    return (
      <div style={{ padding: '36px 40px' }}>
        <div style={{ height: 24, width: 200, background: '#f5f2ee', borderRadius: 6, marginBottom: 8 }} className="anim-shimmer" />
        <div style={{ height: 13, width: 300, background: '#f5f2ee', borderRadius: 6, marginBottom: 32 }} className="anim-shimmer" />
        <div style={{ background: '#FFFFFF', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '22px 24px' }}>
          <div style={{ height: 12, width: 180, background: '#f5f2ee', borderRadius: 6, marginBottom: 24 }} className="anim-shimmer" />
          <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
            <div style={{ height: 38, width: 180, background: '#f5f2ee', borderRadius: 7 }} className="anim-shimmer" />
            <div style={{ height: 38, width: 180, background: '#f5f2ee', borderRadius: 7 }} className="anim-shimmer" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div style={{ height: 38, background: '#f5f2ee', borderRadius: 7 }} className="anim-shimmer" />
            <div style={{ height: 38, background: '#f5f2ee', borderRadius: 7 }} className="anim-shimmer" />
            <div style={{ height: 38, background: '#f5f2ee', borderRadius: 7 }} className="anim-shimmer" />
            <div style={{ height: 38, background: '#f5f2ee', borderRadius: 7 }} className="anim-shimmer" />
          </div>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ height: 16, width: 160, background: '#f5f2ee', borderRadius: 6, marginBottom: 12 }} className="anim-shimmer" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '36px 40px' }}>
      {/* Page Title */}
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', letterSpacing: -0.3, margin: 0 }}>Time by Project</h1>
      <p style={{ fontSize: 13, fontWeight: 400, color: '#999', marginTop: 4, marginBottom: 28 }}>Generate time reports grouped by project</p>

      {/* Report Configuration Card */}
      <div style={{ background: '#FFFFFF', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '28px 28px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const, marginBottom: 20 }}>Report Parameters</div>

        {/* Date Range */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 24 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const, marginBottom: 6 }}>Date Start</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ padding: '8px 12px', border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12.5, color: '#1a1a1a', outline: 'none' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#d3ad6b'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(211,173,107,0.15)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#e8e4df'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const, marginBottom: 6 }}>Date Stop</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ padding: '8px 12px', border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12.5, color: '#1a1a1a', outline: 'none' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#d3ad6b'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(211,173,107,0.15)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#e8e4df'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', paddingBottom: 4 }}>
            <input
              type="checkbox"
              checked={forceCompleteWeeks}
              onChange={(e) => setForceCompleteWeeks(e.target.checked)}
              style={{ accentColor: '#e31c79' }}
            />
            <span style={{ fontSize: 12, color: '#1a1a1a' }}>Force Complete Weeks</span>
          </label>
        </div>

        {/* Filters */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const, marginBottom: 6 }}>Project</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12.5, color: '#1a1a1a', background: 'white', outline: 'none' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#d3ad6b'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(211,173,107,0.15)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#e8e4df'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <option>-All-</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const, marginBottom: 6 }}>User</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12.5, color: '#1a1a1a', background: 'white', outline: 'none' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#d3ad6b'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(211,173,107,0.15)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#e8e4df'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <option>-All-</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const, marginBottom: 6 }}>Time Type</label>
            <select
              value={selectedTimeType}
              onChange={(e) => setSelectedTimeType(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12.5, color: '#1a1a1a', background: 'white', outline: 'none' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#d3ad6b'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(211,173,107,0.15)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#e8e4df'; e.currentTarget.style.boxShadow = 'none' }}
            >
              {timeTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const, marginBottom: 6 }}>Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12.5, color: '#1a1a1a', background: 'white', outline: 'none' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#d3ad6b'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(211,173,107,0.15)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#e8e4df'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <option>-All-</option>
            </select>
          </div>
        </div>

        {/* Options */}
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const, marginBottom: 12 }}>Options</div>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8, marginBottom: 24 }}>
          {[
            { label: 'Include Unapproved', checked: includeUnapproved, onChange: (v: boolean) => setIncludeUnapproved(v) },
            { label: 'Include Bill Rates', checked: includeBillRates, onChange: (v: boolean) => setIncludeBillRates(v) },
            { label: 'Include Pay Rates', checked: includePayRates, onChange: (v: boolean) => setIncludePayRates(v) },
            { label: 'Include Details', checked: includeDetails, onChange: (v: boolean) => setIncludeDetails(v) },
            { label: 'Include Zero Hours', checked: includeZeroHours, onChange: (v: boolean) => setIncludeZeroHours(v) },
            { label: 'Summary Only', checked: summaryOnly, onChange: (v: boolean) => setSummaryOnly(v) },
          ].map(opt => (
            <label key={opt.label} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={opt.checked}
                onChange={(e) => opt.onChange(e.target.checked)}
                style={{ accentColor: '#e31c79' }}
              />
              <span style={{ fontSize: 12.5, color: '#1a1a1a' }}>{opt.label}</span>
            </label>
          ))}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          {reportData.length > 0 && (
            <button
              onClick={handleExportToExcel}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12, fontWeight: 500, color: '#1a1a1a', background: 'white', cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#e31c79' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e8e4df' }}
            >
              <Download style={{ width: 14, height: 14 }} />
              Export to Excel
            </button>
          )}
          <button
            onClick={handleRunReport}
            disabled={isLoading}
            style={{
              padding: '8px 24px',
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              color: 'white',
              background: isLoading ? '#f5f2ee' : '#e31c79',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              ...(isLoading ? { color: '#999' } : {}),
            }}
            onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.background = '#cc1069' }}
            onMouseLeave={(e) => { if (!isLoading) e.currentTarget.style.background = '#e31c79' }}
          >
            {isLoading ? 'Running...' : 'Run Report'}
          </button>
        </div>
      </div>

      {/* Results */}
      {reportData.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ background: '#FFFFFF', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '16px 20px' }}>
            <p style={{ fontSize: 12.5, color: '#999' }}>
              Found <span style={{ fontWeight: 600, color: '#1a1a1a' }}>{reportData.length}</span> timesheet records for the selected period.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
