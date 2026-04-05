'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'
import { 
  Clock, 
  LogOut,
  Calendar,
  ChevronRight,
  Download
} from 'lucide-react'

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
    employee_type?: string
  }
  projects?: {
    name: string
    code: string
  }
}

export default function TimeByEmployeeReport() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()
  
  const [startDate, setStartDate] = useState('2025-09-07')
  const [endDate, setEndDate] = useState('2025-09-13')
  const [selectedUser, setSelectedUser] = useState('-All-')
  const [selectedProject, setSelectedProject] = useState('-All-')
  const [selectedEmployeeType, setSelectedEmployeeType] = useState('-All-')
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

  const employeeTypes = [
    '-All-',
    'Internal',
    'Hourly',
    '1099',
    'Corp2Corp',
    'Salary',
    'External'
  ]

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
            hourly_rate,
            employee_type
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
        setReportData(data as ReportData[])
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
      
      const rowData: any = {
        'Employee': `${row.employees?.first_name} ${row.employees?.last_name}`,
        'Department': row.employees?.department || '',
        'Employee Type': row.employees?.employee_type || 'Regular',
        'Project': row.projects?.name || 'No Project Assigned',
        'Project Code': row.projects?.code || '',
        'Week Ending': row.week_ending,
        'Regular Hours': regularHours.toFixed(2),
        'Overtime Hours': overtimeHours.toFixed(2),
        'Total Hours': row.total_hours?.toFixed(2) || '0.00',
        'Status': row.status.charAt(0).toUpperCase() + row.status.slice(1)
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
    
    XLSX.utils.book_append_sheet(wb, ws, 'Time by Employee')
    
    const fileName = `time_by_employee_${startDate}_to_${endDate}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  return (
    <div style={{ padding: '36px 40px' }}>
      <style dangerouslySetInnerHTML={{ __html: '@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }' }} />

      {/* Page title */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: 0, letterSpacing: -0.3 }}>
          Time by Employee
        </h1>
        <p style={{ fontSize: 13, fontWeight: 400, color: '#999', marginTop: 4 }}>
          Generate time reports grouped by employee
        </p>
      </div>

      {/* Report Configuration */}
      <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase', margin: '0 0 16px 0' }}>Report Details</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Date Range */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#c0bab2', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 6 }}>Date Start</label>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      style={{ padding: '8px 12px', border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12, color: '#555', outline: 'none' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#c0bab2', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 6 }}>Date Stop</label>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      style={{ padding: '8px 12px', border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12, color: '#555', outline: 'none' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: 24 }}>
                  <input 
                    type="checkbox"
                    checked={forceCompleteWeeks}
                    onChange={(e) => setForceCompleteWeeks(e.target.checked)}
                    style={{ accentColor: '#e31c79' }}
                  />
                  <label style={{ marginLeft: 8, fontSize: 12, color: '#555' }}>Force Complete Weeks</label>
                </div>
              </div>

              {/* Filters */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#c0bab2', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 6 }}>User</label>
                  <select 
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12, color: '#555', outline: 'none' }}
                  >
                    <option>-All-</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#c0bab2', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 6 }}>Project</label>
                  <select 
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12, color: '#555', outline: 'none' }}
                  >
                    <option>-All-</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#c0bab2', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 6 }}>Employee Type</label>
                  <select 
                    value={selectedEmployeeType}
                    onChange={(e) => setSelectedEmployeeType(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12, color: '#555', outline: 'none' }}
                  >
                    {employeeTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div></div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#c0bab2', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 6 }}>Time Type</label>
                  <select 
                    value={selectedTimeType}
                    onChange={(e) => setSelectedTimeType(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12, color: '#555', outline: 'none' }}
                  >
                    {timeTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#c0bab2', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 6 }}>Class</label>
                  <select 
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12, color: '#555', outline: 'none' }}
                  >
                    <option>-All-</option>
                  </select>
                </div>
              </div>

              {/* Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center' }}>
                  <input 
                    type="checkbox"
                    checked={includeUnapproved}
                    onChange={(e) => setIncludeUnapproved(e.target.checked)}
                    style={{ accentColor: '#e31c79' }}
                  />
                  <span style={{ marginLeft: 8, fontSize: 12, color: '#555' }}>Include Unapproved</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center' }}>
                  <input 
                    type="checkbox"
                    checked={includeBillRates}
                    onChange={(e) => setIncludeBillRates(e.target.checked)}
                    style={{ accentColor: '#e31c79' }}
                  />
                  <span style={{ marginLeft: 8, fontSize: 12, color: '#555' }}>Include Bill Rates</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center' }}>
                  <input 
                    type="checkbox"
                    checked={includePayRates}
                    onChange={(e) => setIncludePayRates(e.target.checked)}
                    style={{ accentColor: '#e31c79' }}
                  />
                  <span style={{ marginLeft: 8, fontSize: 12, color: '#555' }}>Include Pay Rates</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center' }}>
                  <input 
                    type="checkbox"
                    checked={includeDetails}
                    onChange={(e) => setIncludeDetails(e.target.checked)}
                    style={{ accentColor: '#e31c79' }}
                  />
                  <span style={{ marginLeft: 8, fontSize: 12, color: '#555' }}>Include Details</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center' }}>
                  <input 
                    type="checkbox"
                    checked={includeZeroHours}
                    onChange={(e) => setIncludeZeroHours(e.target.checked)}
                    style={{ accentColor: '#e31c79' }}
                  />
                  <span style={{ marginLeft: 8, fontSize: 12, color: '#555' }}>Include Zero Hours</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center' }}>
                  <input 
                    type="checkbox"
                    checked={summaryOnly}
                    onChange={(e) => setSummaryOnly(e.target.checked)}
                    style={{ accentColor: '#e31c79' }}
                  />
                  <span style={{ marginLeft: 8, fontSize: 12, color: '#555' }}>Summary Only</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                {reportData.length > 0 && (
                  <button
                    onClick={handleExportToExcel}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', background: '#fff', color: '#777', border: '0.5px solid #e0dcd7', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
                  >
                    <Download className="h-4 w-4" />
                    Export to Excel
                  </button>
                )}
                <button
                  onClick={handleRunReport}
                  disabled={isLoading}
                  style={{ padding: '8px 24px', borderRadius: 6, fontSize: 12, fontWeight: 500, border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', background: isLoading ? '#f5f2ee' : '#e31c79', color: isLoading ? '#999' : '#fff', transition: 'all 0.15s' }}
                >
                  {isLoading ? 'Running...' : 'Run'}
                </button>
              </div>

              {/* Results Summary */}
              {reportData.length > 0 && (
                <div style={{ marginTop: 24, padding: 16, background: '#FDFCFB', borderRadius: 10, border: '0.5px solid #f5f2ee' }}>
                  <p style={{ fontSize: 12.5, color: '#555', margin: 0 }}>
                    Found {reportData.length} timesheet records for the selected period.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
  )
}