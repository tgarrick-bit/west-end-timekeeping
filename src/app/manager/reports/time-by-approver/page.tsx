'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'
import { Download } from 'lucide-react'

interface ReportData {
  id: string; week_ending: string; total_hours: number; overtime_hours: number; status: string
  employee_id: string; approved_by?: string; approved_at?: string; project_id?: string
  employees?: { first_name: string; last_name: string; department: string; hourly_rate: number }
  projects?: { name: string; code: string }
  approver?: { first_name: string; last_name: string }
}

const StatusBadge = ({ status }: { status: string }) => {
  const m: Record<string, { bg: string; color: string; border: string }> = {
    approved: { bg: '#ecfdf5', color: '#2d9b6e', border: '#2d9b6e' },
    pending: { bg: '#FFF8E1', color: '#c4983a', border: '#c4983a' },
    submitted: { bg: '#FFF8E1', color: '#c4983a', border: '#c4983a' },
  }
  const c = m[status] || { bg: '#FAFAF8', color: '#777', border: '#e8e4df' }
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', fontSize: 9, fontWeight: 500, borderRadius: 3, background: c.bg, color: c.color, border: `0.5px solid ${c.border}` }}>{status}</span>
}

export default function TimeByApproverReport() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  const [startDate, setStartDate] = useState('2025-09-07')
  const [endDate, setEndDate] = useState('2025-09-13')
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedTimeType, setSelectedTimeType] = useState('-All-')
  const [forceCompleteWeeks, setForceCompleteWeeks] = useState(false)
  const [byProject, setByProject] = useState(false)
  const [includeUnapproved, setIncludeUnapproved] = useState(false)
  const [includeDetails, setIncludeDetails] = useState(false)
  const [reportData, setReportData] = useState<ReportData[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const timeTypes = ['-All-','Regular','Overtime','Doubletime','Sick','Vacation','Holiday','Non-billable','Overtime *','regular *']

  const handleRunReport = async () => {
    setIsLoading(true)
    try {
      let query = supabase.from('timesheets').select(`*, employees!inner (first_name, last_name, department, hourly_rate), projects (name, code)`).gte('week_ending', startDate).lte('week_ending', endDate)
      if (!includeUnapproved) { query = query.eq('status', 'approved') } else { query = query.in('status', ['approved', 'pending', 'submitted']) }
      const { data, error } = await query
      if (error) { console.error('Error:', error) } else if (data) {
        const dataWithApprovers = await Promise.all(data.map(async (item) => {
          if (item.approved_by) { const { data: a } = await supabase.from('employees').select('first_name, last_name').eq('id', item.approved_by).single(); return { ...item, approver: a } }
          return item
        }))
        setReportData(dataWithApprovers as ReportData[])
      }
    } catch (error) { console.error('Error:', error) } finally { setIsLoading(false) }
  }

  const handleExportToExcel = () => {
    if (reportData.length === 0) { alert('No data to export.'); return }
    const exportData = reportData.map(row => {
      const regularHours = Math.min(row.total_hours || 0, 40); const overtimeHours = row.overtime_hours || Math.max(0, (row.total_hours || 0) - 40)
      const rowData: any = { 'Employee': `${row.employees?.first_name} ${row.employees?.last_name}`, 'Department': row.employees?.department || '', 'Week Ending': row.week_ending, 'Approver': row.approver ? `${row.approver.first_name} ${row.approver.last_name}` : 'Not Approved', 'Regular Hours': regularHours.toFixed(2), 'Overtime Hours': overtimeHours.toFixed(2), 'Total Hours': row.total_hours?.toFixed(2) || '0.00', 'Status': row.status.charAt(0).toUpperCase() + row.status.slice(1), 'Approved Date': row.approved_at ? new Date(row.approved_at).toLocaleDateString() : 'N/A' }
      if (byProject && row.projects) { rowData['Project'] = row.projects.name; rowData['Project Code'] = row.projects.code || '' }
      return rowData
    })
    const wb = XLSX.utils.book_new(); const ws = XLSX.utils.json_to_sheet(exportData)
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({ wch: Math.min(Math.max(key.length, ...exportData.map(row => String(row[key]).length)) + 2, 30) }))
    ws['!cols'] = colWidths; XLSX.utils.book_append_sheet(wb, ws, 'Time by Approver'); XLSX.writeFile(wb, `time_by_approver_${startDate}_to_${endDate}.xlsx`)
  }

  const totals = reportData.reduce((acc, row) => {
    acc.regularHours += Math.min(row.total_hours || 0, 40); acc.overtimeHours += row.overtime_hours || Math.max(0, (row.total_hours || 0) - 40); acc.totalHours += row.total_hours || 0
    acc.approvedCount += row.status === 'approved' ? 1 : 0; acc.pendingCount += row.status === 'pending' || row.status === 'submitted' ? 1 : 0
    return acc
  }, { regularHours: 0, overtimeHours: 0, totalHours: 0, approvedCount: 0, pendingCount: 0 })

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
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: 0, letterSpacing: -0.3 }}>Time by Approver</h1>
        <p style={{ fontSize: 13, fontWeight: 400, color: '#999', marginTop: 4 }}>Generate time reports grouped by approver</p>
      </div>

      <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase', margin: '0 0 16px 0' }}>Report Details</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div><label style={labelSt}>Date Start</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputSt} /></div>
            <div><label style={labelSt}>Date Stop</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputSt} /></div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 24 }}><input type="checkbox" checked={forceCompleteWeeks} onChange={e => setForceCompleteWeeks(e.target.checked)} style={checkSt} /><span style={spanSt}>Force Complete Weeks</span></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div><label style={labelSt}>User</label><select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} style={selectSt}><option value=""></option></select></div>
            <div><label style={labelSt}>Time Type</label><select value={selectedTimeType} onChange={e => setSelectedTimeType(e.target.value)} style={selectSt}>{timeTypes.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[{ label: 'By Project', checked: byProject, set: setByProject }, { label: 'Include Unapproved', checked: includeUnapproved, set: setIncludeUnapproved }, { label: 'Include Details', checked: includeDetails, set: setIncludeDetails }].map(opt => (
              <label key={opt.label} style={{ display: 'flex', alignItems: 'center' }}><input type="checkbox" checked={opt.checked} onChange={e => opt.set(e.target.checked)} style={checkSt} /><span style={spanSt}>{opt.label}</span></label>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            {reportData.length > 0 && <button onClick={handleExportToExcel} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', background: '#fff', color: '#777', border: '0.5px solid #e0dcd7', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}><Download style={{ width: 16, height: 16 }} /> Export to Excel</button>}
            <button onClick={handleRunReport} disabled={isLoading} style={{ padding: '8px 24px', borderRadius: 6, fontSize: 12, fontWeight: 500, border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', background: isLoading ? '#f5f2ee' : '#e31c79', color: isLoading ? '#999' : '#fff' }}>{isLoading ? 'Running...' : 'Run'}</button>
          </div>

          {reportData.length > 0 && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div style={{ padding: 16, background: '#FDFCFB', borderRadius: 10, border: '0.5px solid #f5f2ee' }}><p style={{ fontSize: 12, color: '#999', margin: 0 }}>Total Records</p><p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', margin: '4px 0 0' }}>{reportData.length}</p></div>
                <div style={{ padding: 16, background: '#FDFCFB', borderRadius: 10, border: '0.5px solid #f5f2ee' }}><p style={{ fontSize: 12, color: '#999', margin: 0 }}>Approved</p><p style={{ fontSize: 14, fontWeight: 600, color: '#2d9b6e', margin: '4px 0 0' }}>{totals.approvedCount}</p></div>
                <div style={{ padding: 16, background: '#FDFCFB', borderRadius: 10, border: '0.5px solid #f5f2ee' }}><p style={{ fontSize: 12, color: '#999', margin: 0 }}>Pending Review</p><p style={{ fontSize: 14, fontWeight: 600, color: '#c4983a', margin: '4px 0 0' }}>{totals.pendingCount}</p></div>
              </div>
              <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    {['Employee', 'Department', 'Week Ending', 'Approver', ...(byProject ? ['Project'] : []), 'Regular', 'Overtime', 'Total', 'Status'].map(h => (
                      <th key={h} style={{ ...thSt, textAlign: ['Regular','Overtime','Total'].includes(h) ? 'right' : h === 'Status' ? 'center' : 'left' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {reportData.map(row => {
                      const reg = Math.min(row.total_hours || 0, 40); const ot = row.overtime_hours || Math.max(0, (row.total_hours || 0) - 40)
                      return (<tr key={row.id} style={{ borderBottom: '0.5px solid #f5f2ee' }} onMouseEnter={e => e.currentTarget.style.background='#FDFCFB'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <td style={tdSt}>{row.employees?.first_name} {row.employees?.last_name}</td>
                        <td style={tdSt}>{row.employees?.department || 'N/A'}</td>
                        <td style={tdSt}>{new Date(row.week_ending).toLocaleDateString()}</td>
                        <td style={tdSt}>{row.approver ? `${row.approver.first_name} ${row.approver.last_name}` : '-'}</td>
                        {byProject && <td style={tdSt}>{row.projects?.name || 'N/A'}</td>}
                        <td style={{ ...tdSt, textAlign: 'right' }}>{reg.toFixed(2)}</td>
                        <td style={{ ...tdSt, textAlign: 'right' }}>{ot.toFixed(2)}</td>
                        <td style={{ ...tdSt, textAlign: 'right', fontWeight: 600 }}>{(row.total_hours || 0).toFixed(2)}</td>
                        <td style={{ ...tdSt, textAlign: 'center' }}><StatusBadge status={row.status} /></td>
                      </tr>)
                    })}
                  </tbody>
                  <tfoot><tr style={{ background: '#FDFCFB' }}>
                    <td colSpan={byProject ? 5 : 4} style={{ ...tdSt, fontWeight: 600 }}>Total</td>
                    <td style={{ ...tdSt, textAlign: 'right', fontWeight: 600 }}>{totals.regularHours.toFixed(2)}</td>
                    <td style={{ ...tdSt, textAlign: 'right', fontWeight: 600 }}>{totals.overtimeHours.toFixed(2)}</td>
                    <td style={{ ...tdSt, textAlign: 'right', fontWeight: 600 }}>{totals.totalHours.toFixed(2)}</td>
                    <td style={tdSt} />
                  </tr></tfoot>
                </table>
              </div>

              {includeDetails && (
                <div style={{ marginTop: 16, padding: 16, background: '#FDFCFB', borderRadius: 10, border: '0.5px solid #f5f2ee' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase', margin: '0 0 8px 0' }}>Report Details</p>
                  <p style={{ fontSize: 12, color: '#555', margin: 0 }}>
                    This report shows all timesheets grouped by their approvers for the selected period.
                    {includeUnapproved && ' Including unapproved entries allows you to see pending items awaiting review.'}
                    {byProject && ' Project breakdown helps identify which projects are consuming the most resources.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
