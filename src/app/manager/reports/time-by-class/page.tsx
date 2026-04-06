'use client'

import { useToast } from '@/components/ui/Toast';
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

const StatusBadge = ({ status }: { status: string }) => {
  const m: Record<string, { bg: string; color: string; border: string }> = {
    approved: { bg: '#ecfdf5', color: '#2d9b6e', border: '#2d9b6e' },
    pending: { bg: '#FFF8E1', color: '#c4983a', border: '#c4983a' },
  }
  const c = m[status] || { bg: '#FAFAF8', color: '#777', border: '#e8e4df' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', fontSize: 9, fontWeight: 500, borderRadius: 3, background: c.bg, color: c.color, border: `0.5px solid ${c.border}` }}>
      {status}
    </span>
  )
}

export default function TimeByClassReport() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()
  const { toast } = useToast();

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const [startDate, setStartDate] = useState(firstOfMonth)
  const [endDate, setEndDate] = useState(lastOfMonth)
  const [managedEmployeeIds, setManagedEmployeeIds] = useState<string[]>([])
  const [selectedClass, setSelectedClass] = useState('-All-')
  const [selectedTimeType, setSelectedTimeType] = useState('-All-')
  const [forceCompleteWeeks, setForceCompleteWeeks] = useState(false)
  const [byUser, setByUser] = useState(false)
  const [includeUnapproved, setIncludeUnapproved] = useState(false)
  const [includeBillRates, setIncludeBillRates] = useState(false)
  const [includePayRates, setIncludePayRates] = useState(false)
  const [includeDetails, setIncludeDetails] = useState(false)
  const [includeZeroHours, setIncludeZeroHours] = useState(false)
  const [summaryOnly, setSummaryOnly] = useState(false)
  const [reportData, setReportData] = useState<ReportData[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const timeTypes = ['-All-','Regular','Overtime','Doubletime','Sick','Vacation','Holiday','Non-billable','Overtime *','regular *']

  useEffect(() => {
    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return
      const { data: myEmps } = await supabase.from('employees').select('id').eq('manager_id', authUser.id)
      setManagedEmployeeIds((myEmps || []).map(e => e.id))
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRunReport = async () => {
    setIsLoading(true)
    try {
      if (managedEmployeeIds.length === 0) { setReportData([]); setIsLoading(false); return }
      let query = supabase
        .from('timesheets')
        .select(`*, employees!inner (first_name, last_name, department, hourly_rate), projects (name, code)`)
        .in('employee_id', managedEmployeeIds)
        .gte('week_ending', startDate)
        .lte('week_ending', endDate)
      if (!includeUnapproved) { query = query.eq('status', 'approved') }
      const { data, error } = await query
      if (error) { console.error('Error fetching report data:', error) }
      else if (data) { setReportData(data as ReportData[]) }
    } catch (error) { console.error('Error generating report:', error) }
    finally { setIsLoading(false) }
  }

  const handleExportToExcel = () => {
    if (reportData.length === 0) { toast('warning', 'No data to export. Please run the report first.'); return }
    const exportData = reportData.map(row => {
      const regularHours = Math.min(row.total_hours || 0, 40)
      const overtimeHours = row.overtime_hours || Math.max(0, (row.total_hours || 0) - 40)
      const hourlyRate = row.employees?.hourly_rate || 0
      const regularAmount = regularHours * hourlyRate
      const overtimeAmount = overtimeHours * hourlyRate * 1.5
      const rowData: any = {
        'Class': row.projects?.name || 'No Class Assigned', 'Class Code': row.projects?.code || '',
        'Employee': `${row.employees?.first_name} ${row.employees?.last_name}`, 'Department': row.employees?.department || '',
        'Week Ending': row.week_ending, 'Regular Hours': regularHours.toFixed(2), 'Overtime Hours': overtimeHours.toFixed(2),
        'Total Hours': row.total_hours?.toFixed(2) || '0.00', 'Status': row.status.charAt(0).toUpperCase() + row.status.slice(1)
      }
      if (includePayRates) { rowData['Pay Rate'] = `$${hourlyRate.toFixed(2)}`; rowData['Regular Amount'] = `$${regularAmount.toFixed(2)}`; rowData['Overtime Amount'] = `$${overtimeAmount.toFixed(2)}`; rowData['Total Amount'] = `$${(regularAmount + overtimeAmount).toFixed(2)}` }
      if (includeBillRates) { rowData['Bill Rate'] = 'N/A'; rowData['Billed Amount'] = 'N/A' }
      return rowData
    })
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(exportData)
    const colWidths = Object.keys(exportData[0] || {}).map(key => { const maxLength = Math.max(key.length, ...exportData.map(row => String(row[key]).length)); return { wch: Math.min(maxLength + 2, 30) } })
    ws['!cols'] = colWidths
    XLSX.utils.book_append_sheet(wb, ws, 'Time by Class')
    XLSX.writeFile(wb, `time_by_class_${startDate}_to_${endDate}.xlsx`)
  }

  const totals = reportData.reduce((acc, row) => {
    const regularHours = Math.min(row.total_hours || 0, 40)
    const overtimeHours = row.overtime_hours || Math.max(0, (row.total_hours || 0) - 40)
    const hourlyRate = row.employees?.hourly_rate || 0
    acc.regularHours += regularHours; acc.overtimeHours += overtimeHours; acc.totalHours += row.total_hours || 0
    acc.regularAmount += regularHours * hourlyRate; acc.overtimeAmount += overtimeHours * hourlyRate * 1.5
    return acc
  }, { regularHours: 0, overtimeHours: 0, totalHours: 0, regularAmount: 0, overtimeAmount: 0 })

  const labelSt: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: '#c0bab2', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }
  const inputSt: React.CSSProperties = { padding: '8px 12px', border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12, color: '#555', outline: 'none' }
  const selectSt: React.CSSProperties = { ...inputSt, width: '100%' }
  const checkSt: React.CSSProperties = { accentColor: '#e31c79' }
  const spanSt: React.CSSProperties = { marginLeft: 8, fontSize: 12, color: '#555' }
  const thSt: React.CSSProperties = { padding: '11px 20px', fontSize: 9, fontWeight: 500, letterSpacing: 1.2, color: '#c0bab2', textTransform: 'uppercase', borderBottom: '0.5px solid #f0ece7', background: 'transparent' }
  const tdSt: React.CSSProperties = { padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a' }

  return (
    <div style={{ padding: '36px 40px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: 0, letterSpacing: -0.3 }}>Time by Class</h1>
        <p style={{ fontSize: 13, fontWeight: 400, color: '#999', marginTop: 4 }}>Generate time reports grouped by class</p>
      </div>

      <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase', margin: '0 0 16px 0' }}>Report Details</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div><label style={labelSt}>Date Start</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputSt} /></div>
            <div><label style={labelSt}>Date Stop</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputSt} /></div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 24 }}><input type="checkbox" checked={forceCompleteWeeks} onChange={(e) => setForceCompleteWeeks(e.target.checked)} style={checkSt} /><span style={spanSt}>Force Complete Weeks</span></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div><label style={labelSt}>Class</label><select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} style={selectSt}><option>-All-</option></select></div>
            <div><label style={labelSt}>Time Type</label><select value={selectedTimeType} onChange={(e) => setSelectedTimeType(e.target.value)} style={selectSt}>{timeTypes.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'By User', checked: byUser, set: setByUser },
              { label: 'Include Unapproved', checked: includeUnapproved, set: setIncludeUnapproved },
              { label: 'Include Bill Rates', checked: includeBillRates, set: setIncludeBillRates },
              { label: 'Include Pay Rates', checked: includePayRates, set: setIncludePayRates },
              { label: 'Include Details', checked: includeDetails, set: setIncludeDetails },
              { label: 'Include Zero Hours', checked: includeZeroHours, set: setIncludeZeroHours },
              { label: 'Summary Only', checked: summaryOnly, set: setSummaryOnly },
            ].map(opt => (
              <label key={opt.label} style={{ display: 'flex', alignItems: 'center' }}>
                <input type="checkbox" checked={opt.checked} onChange={(e) => opt.set(e.target.checked)} style={checkSt} />
                <span style={spanSt}>{opt.label}</span>
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            {reportData.length > 0 && (
              <button onClick={handleExportToExcel} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', background: '#fff', color: '#777', border: '0.5px solid #e0dcd7', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                <Download style={{ width: 16, height: 16 }} /> Export to Excel
              </button>
            )}
            <button onClick={handleRunReport} disabled={isLoading} style={{ padding: '8px 24px', borderRadius: 6, fontSize: 12, fontWeight: 500, border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', background: isLoading ? '#f5f2ee' : '#e31c79', color: isLoading ? '#999' : '#fff' }}>
              {isLoading ? 'Running...' : 'Run'}
            </button>
          </div>

          {reportData.length > 0 && (
            <div>
              <div style={{ padding: 16, background: '#FDFCFB', borderRadius: 10, border: '0.5px solid #f5f2ee', marginBottom: 16 }}>
                <p style={{ fontSize: 12.5, color: '#555', margin: 0 }}>Found {reportData.length} timesheet records for the selected period.</p>
              </div>

              {!summaryOnly && (
                <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Class', 'Employee', 'Department', 'Regular Hours', 'Overtime', 'Total Hours',
                          ...(includePayRates ? ['Pay Rate', 'Total Amount'] : []), 'Status'].map(h => (
                          <th key={h} style={{ ...thSt, textAlign: h === 'Class' || h === 'Employee' || h === 'Department' ? 'left' : 'right' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((row) => {
                        const regularHours = Math.min(row.total_hours || 0, 40)
                        const overtimeHours = row.overtime_hours || Math.max(0, (row.total_hours || 0) - 40)
                        const hourlyRate = row.employees?.hourly_rate || 0
                        const totalAmount = (regularHours * hourlyRate) + (overtimeHours * hourlyRate * 1.5)
                        return (
                          <tr key={row.id} style={{ borderBottom: '0.5px solid #f5f2ee' }} onMouseEnter={e => e.currentTarget.style.background = '#FDFCFB'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={tdSt}>{row.projects?.name || 'No Class Assigned'}</td>
                            <td style={tdSt}>{row.employees?.first_name} {row.employees?.last_name}</td>
                            <td style={tdSt}>{row.employees?.department || 'N/A'}</td>
                            <td style={{ ...tdSt, textAlign: 'right' }}>{regularHours.toFixed(2)}</td>
                            <td style={{ ...tdSt, textAlign: 'right' }}>{overtimeHours.toFixed(2)}</td>
                            <td style={{ ...tdSt, textAlign: 'right', fontWeight: 600 }}>{(row.total_hours || 0).toFixed(2)}</td>
                            {includePayRates && (<><td style={{ ...tdSt, textAlign: 'right' }}>${hourlyRate.toFixed(2)}</td><td style={{ ...tdSt, textAlign: 'right', fontWeight: 600 }}>${totalAmount.toFixed(2)}</td></>)}
                            <td style={{ ...tdSt, textAlign: 'center' }}><StatusBadge status={row.status} /></td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#FDFCFB' }}>
                        <td colSpan={3} style={{ ...tdSt, fontWeight: 600 }}>Total</td>
                        <td style={{ ...tdSt, textAlign: 'right', fontWeight: 600 }}>{totals.regularHours.toFixed(2)}</td>
                        <td style={{ ...tdSt, textAlign: 'right', fontWeight: 600 }}>{totals.overtimeHours.toFixed(2)}</td>
                        <td style={{ ...tdSt, textAlign: 'right', fontWeight: 600 }}>{totals.totalHours.toFixed(2)}</td>
                        {includePayRates && (<><td style={tdSt} /><td style={{ ...tdSt, textAlign: 'right', fontWeight: 600 }}>${(totals.regularAmount + totals.overtimeAmount).toFixed(2)}</td></>)}
                        <td style={tdSt} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {summaryOnly && (
                <div style={{ padding: 24, background: '#FDFCFB', borderRadius: 10, border: '0.5px solid #f5f2ee' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase', margin: '0 0 16px 0' }}>Summary</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div><p style={{ fontSize: 12, color: '#999', margin: 0 }}>Total Regular Hours:</p><p style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', margin: '4px 0 0' }}>{totals.regularHours.toFixed(2)}</p></div>
                    <div><p style={{ fontSize: 12, color: '#999', margin: 0 }}>Total Overtime Hours:</p><p style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', margin: '4px 0 0' }}>{totals.overtimeHours.toFixed(2)}</p></div>
                    <div><p style={{ fontSize: 12, color: '#999', margin: 0 }}>Total Hours:</p><p style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', margin: '4px 0 0' }}>{totals.totalHours.toFixed(2)}</p></div>
                    {includePayRates && (<div><p style={{ fontSize: 12, color: '#999', margin: 0 }}>Total Amount:</p><p style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', margin: '4px 0 0' }}>${(totals.regularAmount + totals.overtimeAmount).toFixed(2)}</p></div>)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
