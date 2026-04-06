'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useAdminFilter } from '@/contexts/AdminFilterContext'
import { createClient } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'
import { Download } from 'lucide-react'

interface Employee {
  id: string
  first_name: string
  last_name: string
  department?: string | null
  employee_type?: string | null
  email: string
  hourly_rate?: number | null
  status?: string | null
  client_id?: string | null
  department_id?: string | null
}

interface MissingTimeData {
  employee: Employee
  missing_dates: string[]
  weeks_missing: number
  last_submission?: string | null
  assigned_projects?: string[]
}

const inputStyle = { padding: '8px 12px', border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12.5, color: '#1a1a1a', outline: 'none' } as const
const selectStyle = { ...inputStyle, width: '100%', background: 'white' } as const
const labelStyle = { display: 'block' as const, fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const, marginBottom: 6 }
const sectionLabel = { fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const, marginBottom: 12 }

function focusIn(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) { e.currentTarget.style.borderColor = '#d3ad6b'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(211,173,107,0.15)' }
function focusOut(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) { e.currentTarget.style.borderColor = '#e8e4df'; e.currentTarget.style.boxShadow = 'none' }

export default function TimeMissingReport() {
  const router = useRouter()
  const { user } = useAuth()
  const { selectedClientId, selectedDepartmentId } = useAdminFilter()
  const supabase = createClient()

  const now = new Date()
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const today = now.toISOString().split('T')[0]

  const [startDate, setStartDate] = useState(firstOfMonth)
  const [endDate, setEndDate] = useState(today)
  const [selectedUser, setSelectedUser] = useState('-All-')
  const [selectedEmployeeType, setSelectedEmployeeType] = useState('-All-')
  const [selectedProject, setSelectedProject] = useState('-All-')
  const [byProject, setByProject] = useState(false)
  const [byDay, setByDay] = useState(false)
  const [reportData, setReportData] = useState<MissingTimeData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  const [employeeList, setEmployeeList] = useState<{id: string, first_name: string, last_name: string}[]>([])
  const [projectList, setProjectList] = useState<{id: string, name: string, code: string}[]>([])

  const employeeTypes = ['-All-', 'Internal', 'Hourly', '1099', 'Corp2Corp', 'Salary', 'External']

  useEffect(() => {
    const loadFilters = async () => {
      const [empRes, projRes] = await Promise.all([
        supabase.from('employees').select('id, first_name, last_name').eq('is_active', true).order('last_name'),
        supabase.from('projects').select('id, name, code').eq('status', 'active').order('name'),
      ])
      if (empRes.data) setEmployeeList(empRes.data)
      if (projRes.data) setProjectList(projRes.data)
      setPageLoading(false)
    }
    loadFilters()
  }, [])

  const handleRunReport = async () => {
    setIsLoading(true)
    try {
      let employeeQuery = supabase.from('employees').select('*').eq('is_active', true)
      if (selectedEmployeeType !== '-All-') { employeeQuery = employeeQuery.eq('employee_type', selectedEmployeeType) }
      if (selectedUser !== '-All-') { employeeQuery = employeeQuery.eq('id', selectedUser) }
      const { data: employees, error: empError } = await employeeQuery
      if (empError) { console.error('Error fetching employees:', empError); setIsLoading(false); return }

      let filteredEmployees = employees || []
      if (selectedClientId) {
        filteredEmployees = filteredEmployees.filter(e => e.client_id === selectedClientId)
      }
      if (selectedDepartmentId) {
        filteredEmployees = filteredEmployees.filter(e => e.department_id === selectedDepartmentId)
      }

      const missingTimeData: MissingTimeData[] = []
      for (const employee of filteredEmployees) {
        const { data: timesheets } = await supabase
          .from('timesheets')
          .select('week_ending')
          .eq('employee_id', employee.id)
          .gte('week_ending', startDate)
          .lte('week_ending', endDate || startDate)

        const submittedWeeks = timesheets?.map(t => t.week_ending) || []
        const allWeeks = getAllWeeksInRange(startDate, endDate || startDate)
        const missingWeeks = allWeeks.filter(week => !submittedWeeks.includes(week))

        if (missingWeeks.length > 0) {
          const { data: lastTimesheet } = await supabase
            .from('timesheets')
            .select('week_ending')
            .eq('employee_id', employee.id)
            .order('week_ending', { ascending: false })
            .limit(1)
            .single()

          missingTimeData.push({
            employee: employee,
            missing_dates: missingWeeks,
            weeks_missing: missingWeeks.length,
            last_submission: lastTimesheet?.week_ending,
            assigned_projects: []
          })
        }
      }
      setReportData(missingTimeData)
    } catch (error) { console.error('Error generating report:', error) }
    finally { setIsLoading(false) }
  }

  const getAllWeeksInRange = (start: string, end: string): string[] => {
    const weeks: string[] = []
    const startDate = new Date(start)
    const endDate = new Date(end)
    startDate.setDate(startDate.getDate() - startDate.getDay())
    while (startDate <= endDate) {
      const weekEnd = new Date(startDate)
      weekEnd.setDate(weekEnd.getDate() + 6)
      weeks.push(weekEnd.toISOString().split('T')[0])
      startDate.setDate(startDate.getDate() + 7)
    }
    return weeks
  }

  const handleExportToExcel = () => {
    if (reportData.length === 0) { alert('No data to export. Please run the report first.'); return }
    let exportData: any[] = []
    if (byDay) {
      reportData.forEach(row => {
        row.missing_dates.forEach(date => {
          exportData.push({
            'Employee': `${row.employee.first_name} ${row.employee.last_name}`,
            'Department': row.employee.department || '',
            'Employee Type': row.employee.employee_type || '',
            'Email': row.employee.email,
            'Missing Date': date,
            'Last Submission': row.last_submission || 'Never',
            'Status': 'Missing'
          })
        })
      })
    } else {
      reportData.forEach(row => {
        exportData.push({
          'Employee': `${row.employee.first_name} ${row.employee.last_name}`,
          'Department': row.employee.department || '',
          'Employee Type': row.employee.employee_type || '',
          'Email': row.employee.email,
          'Weeks Missing': row.weeks_missing.toString(),
          'Missing Dates': row.missing_dates.join(', '),
          'Last Submission': row.last_submission || 'Never'
        })
      })
    }
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(exportData)
    if (exportData.length > 0) {
      const colWidths = Object.keys(exportData[0]).map(key => {
        const maxLength = Math.max(key.length, ...exportData.map((row) => { const v = row[key]; return v ? String(v).length : 0 }))
        return { wch: Math.min(maxLength + 2, 30) }
      })
      ws['!cols'] = colWidths
    }
    XLSX.utils.book_append_sheet(wb, ws, 'Time Missing')
    XLSX.writeFile(wb, `time_missing_${startDate}_to_${endDate || startDate}.xlsx`)
  }

  if (pageLoading) {
    return (
      <div style={{ padding: '36px 40px' }}>
        <div style={{ height: 24, width: 180, background: '#f5f2ee', borderRadius: 6, marginBottom: 8 }} className="anim-shimmer" />
        <div style={{ height: 13, width: 320, background: '#f5f2ee', borderRadius: 6, marginBottom: 32 }} className="anim-shimmer" />
        <div style={{ background: '#FFFFFF', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '22px 24px' }}>
          {[0,1,2,3,4].map(i => (<div key={i} style={{ height: 38, background: '#f5f2ee', borderRadius: 7, marginBottom: 16 }} className="anim-shimmer" />))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '36px 40px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', letterSpacing: -0.3, margin: 0 }}>Time Missing</h1>
      <p style={{ fontSize: 13, fontWeight: 400, color: '#999', marginTop: 4, marginBottom: 28 }}>Identify employees with missing timesheet submissions</p>

      <div style={{ background: '#FFFFFF', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '28px 28px' }}>
        <div style={sectionLabel}>Report Parameters</div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 24 }}>
          <div>
            <label style={labelStyle}>Date Start</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
          </div>
          <div>
            <label style={labelStyle}>Date Stop</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} onFocus={focusIn} onBlur={focusOut} placeholder=" " />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16, marginBottom: 24 }}>
          <div>
            <label style={labelStyle}>User</label>
            <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} style={selectStyle} onFocus={focusIn} onBlur={focusOut}>
              <option value="-All-">-All-</option>
              {employeeList.map(e => <option key={e.id} value={e.id}>{e.last_name}, {e.first_name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Employee Type</label>
            <select value={selectedEmployeeType} onChange={(e) => setSelectedEmployeeType(e.target.value)} style={selectStyle} onFocus={focusIn} onBlur={focusOut}>
              {employeeTypes.map(type => (<option key={type} value={type}>{type}</option>))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Project</label>
            <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} style={selectStyle} onFocus={focusIn} onBlur={focusOut}>
              <option value="-All-">-All-</option>
              {projectList.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
            </select>
          </div>
        </div>

        <div style={sectionLabel}>Options</div>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8, marginBottom: 24 }}>
          {[
            { label: 'By Project', checked: byProject, onChange: setByProject },
            { label: 'By Day', checked: byDay, onChange: setByDay },
          ].map(opt => (
            <label key={opt.label} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={opt.checked} onChange={(e) => opt.onChange(e.target.checked)} style={{ accentColor: '#e31c79' }} />
              <span style={{ fontSize: 12.5, color: '#1a1a1a' }}>{opt.label}</span>
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          {reportData.length > 0 && (
            <button onClick={handleExportToExcel} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12, fontWeight: 500, color: '#1a1a1a', background: 'white', cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#e31c79' }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e8e4df' }}>
              <Download style={{ width: 14, height: 14 }} /> Export to Excel
            </button>
          )}
          <button onClick={handleRunReport} disabled={isLoading}
            style={{ padding: '8px 24px', borderRadius: 7, fontSize: 12, fontWeight: 600, border: 'none', color: isLoading ? '#999' : 'white', background: isLoading ? '#f5f2ee' : '#e31c79', cursor: isLoading ? 'not-allowed' : 'pointer' }}
            onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.background = '#cc1069' }} onMouseLeave={(e) => { if (!isLoading) e.currentTarget.style.background = '#e31c79' }}>
            {isLoading ? 'Running...' : 'Run Report'}
          </button>
        </div>
      </div>

      {/* Results */}
      {reportData.length > 0 && (
        <div style={{ marginTop: 24 }}>
          {/* Warning card */}
          <div style={{ background: '#FFFFFF', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#c4983a', flexShrink: 0 }} />
              <div>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1a1a1a' }}>{reportData.length} employees with missing timesheets</span>
                <span style={{ fontSize: 12.5, color: '#999', marginLeft: 12 }}>
                  {reportData.reduce((sum, d) => sum + d.weeks_missing, 0)} total weeks missing
                </span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div style={{ background: '#FFFFFF', border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Employee', 'Department', 'Employee Type',
                    ...(!byDay ? ['Weeks Missing'] : []),
                    byDay ? 'Missing Date' : 'Missing Dates',
                    'Last Submission'
                  ].map(h => (
                    <th key={h} style={{ padding: '11px 20px', fontSize: 9, fontWeight: 500, letterSpacing: 1.2, color: '#c0bab2', textTransform: 'uppercase' as const, borderBottom: '0.5px solid #f0ece7', textAlign: h === 'Weeks Missing' ? 'center' : 'left' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {byDay ? (
                  reportData.flatMap(row =>
                    row.missing_dates.map((date) => (
                      <tr key={`${row.employee.id}-${date}`} style={{ borderBottom: '0.5px solid #f5f2ee' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#FDFCFB')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                        <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a' }}>{row.employee.first_name} {row.employee.last_name}</td>
                        <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a' }}>{row.employee.department || 'N/A'}</td>
                        <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a' }}>{row.employee.employee_type || 'N/A'}</td>
                        <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a' }}>{new Date(date).toLocaleDateString()}</td>
                        <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a' }}>
                          {row.last_submission ? new Date(row.last_submission).toLocaleDateString() : <span style={{ color: '#c0bab2' }}>Never</span>}
                        </td>
                      </tr>
                    ))
                  )
                ) : (
                  reportData.map((row) => (
                    <tr key={row.employee.id} style={{ borderBottom: '0.5px solid #f5f2ee' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#FDFCFB')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                      <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a' }}>{row.employee.first_name} {row.employee.last_name}</td>
                      <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a' }}>{row.employee.department || 'N/A'}</td>
                      <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a' }}>{row.employee.employee_type || 'N/A'}</td>
                      <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 9, fontWeight: 500, borderRadius: 3, padding: '2px 8px', background: 'rgba(185,28,28,0.08)' }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#b91c1c', flexShrink: 0 }} />
                          <span style={{ color: '#b91c1c' }}>{row.weeks_missing}</span>
                        </span>
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row.missing_dates.map(d => new Date(d).toLocaleDateString()).join(', ')}
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a' }}>
                        {row.last_submission ? new Date(row.last_submission).toLocaleDateString() : <span style={{ color: '#c0bab2' }}>Never</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No missing time */}
      {reportData.length === 0 && !isLoading && endDate && (
        <div style={{ marginTop: 24 }}>
          <div style={{ background: '#FFFFFF', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '40px 28px', textAlign: 'center' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2d9b6e', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>All employees have submitted timesheets</p>
            <p style={{ fontSize: 12.5, color: '#999', marginTop: 4 }}>No missing time entries found for the selected period.</p>
          </div>
        </div>
      )}
    </div>
  )
}
