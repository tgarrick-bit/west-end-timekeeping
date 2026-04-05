'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'
import { Download, AlertCircle } from 'lucide-react'

interface Employee { id: string; first_name: string; last_name: string; department?: string | null; employee_type?: string | null; email: string; hourly_rate?: number | null; status?: string | null }
interface MissingTimeData { employee: Employee; missing_dates: string[]; weeks_missing: number; last_submission?: string | null; assigned_projects?: string[] }

export default function TimeMissingReport() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  const [startDate, setStartDate] = useState('2025-09-07')
  const [endDate, setEndDate] = useState('')
  const [selectedUser, setSelectedUser] = useState('-All-')
  const [selectedEmployeeType, setSelectedEmployeeType] = useState('-All-')
  const [selectedProject, setSelectedProject] = useState('-All-')
  const [byProject, setByProject] = useState(false)
  const [byDay, setByDay] = useState(false)
  const [reportData, setReportData] = useState<MissingTimeData[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const employeeTypes = ['-All-','Internal','Hourly','1099','Corp2Corp','Salary','External']

  const getAllWeeksInRange = (start: string, end: string): string[] => {
    const weeks: string[] = []; const s = new Date(start); const e = new Date(end)
    s.setDate(s.getDate() - s.getDay())
    while (s <= e) { const we = new Date(s); we.setDate(we.getDate() + 6); weeks.push(we.toISOString().split('T')[0]); s.setDate(s.getDate() + 7) }
    return weeks
  }

  const handleRunReport = async () => {
    setIsLoading(true)
    try {
      let employeeQuery = supabase.from('employees').select('*').eq('status', 'active')
      if (selectedEmployeeType !== '-All-') { employeeQuery = employeeQuery.eq('employee_type', selectedEmployeeType) }
      const { data: employees, error: empError } = await employeeQuery
      if (empError) { console.error('Error:', empError); setIsLoading(false); return }

      const missingTimeData: MissingTimeData[] = []
      for (const employee of employees || []) {
        const { data: timesheets } = await supabase.from('timesheets').select('week_ending').eq('employee_id', employee.id).gte('week_ending', startDate).lte('week_ending', endDate || startDate)
        const submittedWeeks = timesheets?.map(t => t.week_ending) || []
        const allWeeks = getAllWeeksInRange(startDate, endDate || startDate)
        const missingWeeks = allWeeks.filter(week => !submittedWeeks.includes(week))
        if (missingWeeks.length > 0) {
          const { data: lastTimesheet } = await supabase.from('timesheets').select('week_ending').eq('employee_id', employee.id).order('week_ending', { ascending: false }).limit(1).single()
          missingTimeData.push({ employee, missing_dates: missingWeeks, weeks_missing: missingWeeks.length, last_submission: lastTimesheet?.week_ending, assigned_projects: [] })
        }
      }
      setReportData(missingTimeData)
    } catch (error) { console.error('Error:', error) } finally { setIsLoading(false) }
  }

  const handleExportToExcel = () => {
    if (reportData.length === 0) { alert('No data to export.'); return }
    let exportData: any[] = []
    if (byDay) {
      reportData.forEach(row => { row.missing_dates.forEach(date => { exportData.push({ 'Employee': `${row.employee.first_name} ${row.employee.last_name}`, 'Department': row.employee.department || '', 'Employee Type': row.employee.employee_type || '', 'Email': row.employee.email, 'Missing Date': date, 'Last Submission': row.last_submission || 'Never', 'Status': 'Missing' }) }) })
    } else {
      reportData.forEach(row => { exportData.push({ 'Employee': `${row.employee.first_name} ${row.employee.last_name}`, 'Department': row.employee.department || '', 'Employee Type': row.employee.employee_type || '', 'Email': row.employee.email, 'Weeks Missing': row.weeks_missing.toString(), 'Missing Dates': row.missing_dates.join(', '), 'Last Submission': row.last_submission || 'Never' }) })
    }
    const wb = XLSX.utils.book_new(); const ws = XLSX.utils.json_to_sheet(exportData)
    if (exportData.length > 0) { ws['!cols'] = Object.keys(exportData[0]).map(key => ({ wch: Math.min(Math.max(key.length, ...exportData.map(r => r[key] ? String(r[key]).length : 0)) + 2, 30) })) }
    XLSX.utils.book_append_sheet(wb, ws, 'Time Missing'); XLSX.writeFile(wb, `time_missing_${startDate}_to_${endDate || startDate}.xlsx`)
  }

  const labelSt: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: '#c0bab2', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }
  const inputSt: React.CSSProperties = { padding: '8px 12px', border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12, color: '#555', outline: 'none' }
  const selectSt: React.CSSProperties = { ...inputSt, width: '100%' }
  const checkSt: React.CSSProperties = { accentColor: '#e31c79' }
  const spanSt: React.CSSProperties = { marginLeft: 8, fontSize: 12, color: '#555' }
  const thSt: React.CSSProperties = { padding: '11px 20px', fontSize: 9, fontWeight: 500, letterSpacing: 1.2, color: '#c0bab2', textTransform: 'uppercase', borderBottom: '0.5px solid #f0ece7', textAlign: 'left' }
  const tdSt: React.CSSProperties = { padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a' }

  return (
    <div style={{ padding: '36px 40px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: 0, letterSpacing: -0.3 }}>Time Missing</h1>
        <p style={{ fontSize: 13, fontWeight: 400, color: '#999', marginTop: 4 }}>Identify employees with missing timesheet submissions</p>
      </div>

      <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase', margin: '0 0 16px 0' }}>Report Details</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div><label style={labelSt}>Date Start</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputSt} /></div>
            <div><label style={labelSt}>Date Stop</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputSt} /></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div><label style={labelSt}>User</label><select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} style={selectSt}><option>-All-</option></select></div>
            <div><label style={labelSt}>Employee Type</label><select value={selectedEmployeeType} onChange={e => setSelectedEmployeeType(e.target.value)} style={selectSt}>{employeeTypes.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label style={labelSt}>Project</label><select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} style={selectSt}><option>-All-</option></select></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[{ label: 'By Project', checked: byProject, set: setByProject }, { label: 'By Day', checked: byDay, set: setByDay }].map(opt => (
              <label key={opt.label} style={{ display: 'flex', alignItems: 'center' }}><input type="checkbox" checked={opt.checked} onChange={e => opt.set(e.target.checked)} style={checkSt} /><span style={spanSt}>{opt.label}</span></label>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            {reportData.length > 0 && <button onClick={handleExportToExcel} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', background: '#fff', color: '#777', border: '0.5px solid #e0dcd7', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}><Download style={{ width: 16, height: 16 }} /> Export to Excel</button>}
            <button onClick={handleRunReport} disabled={isLoading} style={{ padding: '8px 24px', borderRadius: 6, fontSize: 12, fontWeight: 500, border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', background: isLoading ? '#f5f2ee' : '#e31c79', color: isLoading ? '#999' : '#fff' }}>{isLoading ? 'Running...' : 'Run'}</button>
          </div>

          {reportData.length > 0 && (
            <div>
              <div style={{ padding: 16, background: '#FFF8E1', borderRadius: 10, border: '0.5px solid #c4983a', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <AlertCircle style={{ width: 20, height: 20, color: '#c4983a', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>{reportData.length} employees with missing timesheets</p>
                  <p style={{ fontSize: 12, color: '#555', margin: '4px 0 0' }}>Total of {reportData.reduce((sum, d) => sum + d.weeks_missing, 0)} weeks missing across all employees</p>
                </div>
              </div>
              <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    {['Employee', 'Department', 'Employee Type', ...(!byDay ? ['Weeks Missing'] : []), byDay ? 'Missing Date' : 'Missing Dates', 'Last Submission'].map(h => (
                      <th key={h} style={{ ...thSt, textAlign: h === 'Weeks Missing' ? 'center' : 'left' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {byDay ? (
                      reportData.flatMap(row => row.missing_dates.map((date) => (
                        <tr key={`${row.employee.id}-${date}`} style={{ borderBottom: '0.5px solid #f5f2ee' }} onMouseEnter={e => e.currentTarget.style.background='#FDFCFB'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                          <td style={tdSt}>{row.employee.first_name} {row.employee.last_name}</td>
                          <td style={tdSt}>{row.employee.department || 'N/A'}</td>
                          <td style={tdSt}>{row.employee.employee_type || 'N/A'}</td>
                          <td style={tdSt}>{new Date(date).toLocaleDateString()}</td>
                          <td style={tdSt}>{row.last_submission ? new Date(row.last_submission).toLocaleDateString() : 'Never'}</td>
                        </tr>
                      )))
                    ) : (
                      reportData.map(row => (
                        <tr key={row.employee.id} style={{ borderBottom: '0.5px solid #f5f2ee' }} onMouseEnter={e => e.currentTarget.style.background='#FDFCFB'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                          <td style={tdSt}>{row.employee.first_name} {row.employee.last_name}</td>
                          <td style={tdSt}>{row.employee.department || 'N/A'}</td>
                          <td style={tdSt}>{row.employee.employee_type || 'N/A'}</td>
                          <td style={{ ...tdSt, textAlign: 'center' }}>
                            <span style={{ padding: '2px 8px', borderRadius: 3, fontSize: 9, fontWeight: 500, background: '#fef2f2', color: '#b91c1c', border: '0.5px solid #b91c1c' }}>{row.weeks_missing}</span>
                          </td>
                          <td style={{ ...tdSt, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.missing_dates.map(d => new Date(d).toLocaleDateString()).join(', ')}</td>
                          <td style={tdSt}>{row.last_submission ? new Date(row.last_submission).toLocaleDateString() : <span style={{ color: '#999' }}>Never</span>}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {reportData.length === 0 && !isLoading && endDate && (
            <div style={{ padding: 24, background: '#ecfdf5', borderRadius: 10, border: '0.5px solid #2d9b6e', textAlign: 'center' }}>
              <AlertCircle style={{ width: 32, height: 32, color: '#2d9b6e', margin: '0 auto 8px' }} />
              <p style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>All employees have submitted timesheets</p>
              <p style={{ fontSize: 12, color: '#555', margin: '4px 0 0' }}>No missing time entries found for the selected period.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
