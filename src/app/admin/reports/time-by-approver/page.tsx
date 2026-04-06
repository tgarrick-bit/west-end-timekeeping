'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useAdminFilter } from '@/contexts/AdminFilterContext'
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
  approved_by?: string
  approved_at?: string
  project_id?: string
  employees?: {
    first_name: string
    last_name: string
    department: string
    hourly_rate: number
    client_id?: string
    department_id?: string
  }
  projects?: {
    name: string
    code: string
  }
  approver?: {
    first_name: string
    last_name: string
  }
}

const inputStyle = { padding: '8px 12px', border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12.5, color: '#1a1a1a', outline: 'none' } as const
const selectStyle = { ...inputStyle, width: '100%', background: 'white' } as const
const labelStyle = { display: 'block' as const, fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const, marginBottom: 6 }
const sectionLabel = { fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const, marginBottom: 12 }

function focusIn(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) { e.currentTarget.style.borderColor = '#d3ad6b'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(211,173,107,0.15)' }
function focusOut(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) { e.currentTarget.style.borderColor = '#e8e4df'; e.currentTarget.style.boxShadow = 'none' }

function StatusBadge({ status }: { status: string }) {
  const color = status === 'approved' ? '#2d9b6e' : (status === 'pending' || status === 'submitted') ? '#c4983a' : '#999'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 9, fontWeight: 500, borderRadius: 3, padding: '2px 8px', background: status === 'approved' ? 'rgba(45,155,110,0.08)' : (status === 'pending' || status === 'submitted') ? 'rgba(196,152,58,0.08)' : 'rgba(0,0,0,0.03)' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ color }}>{status}</span>
    </span>
  )
}

export default function TimeByApproverReport() {
  const router = useRouter()
  const { user } = useAuth()
  const { selectedClientId, selectedDepartmentId } = useAdminFilter()
  const supabase = createClient()

  const now = new Date()
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const today = now.toISOString().split('T')[0]

  const [startDate, setStartDate] = useState(firstOfMonth)
  const [endDate, setEndDate] = useState(today)
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedTimeType, setSelectedTimeType] = useState('-All-')
  const [forceCompleteWeeks, setForceCompleteWeeks] = useState(false)
  const [byProject, setByProject] = useState(false)
  const [includeUnapproved, setIncludeUnapproved] = useState(false)
  const [includeDetails, setIncludeDetails] = useState(false)
  const [reportData, setReportData] = useState<ReportData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  const [approverList, setApproverList] = useState<{id: string, first_name: string, last_name: string}[]>([])

  const timeTypes = ['-All-', 'Regular', 'Overtime', 'Doubletime', 'Sick', 'Vacation', 'Holiday', 'Non-billable', 'Overtime *', 'regular *']

  useEffect(() => {
    const loadFilters = async () => {
      const { data } = await supabase.from('employees').select('id, first_name, last_name').in('role', ['manager', 'admin', 'time_approver']).eq('is_active', true).order('last_name')
      if (data) setApproverList(data)
      setPageLoading(false)
    }
    loadFilters()
  }, [])

  const handleRunReport = async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from('timesheets')
        .select(`*, employees!inner (first_name, last_name, department, hourly_rate, client_id, department_id), projects (name, code)`)
        .gte('week_ending', startDate)
        .lte('week_ending', endDate)

      if (!includeUnapproved) {
        query = query.eq('status', 'approved')
      } else {
        query = query.in('status', ['approved', 'pending', 'submitted'])
      }

      if (selectedUser) {
        query = query.eq('approved_by', selectedUser)
      }

      const { data, error } = await query
      if (error) { console.error('Error fetching report data:', error) }
      else if (data) {
        let filtered = data as any[]
        if (selectedClientId) {
          filtered = filtered.filter(r => r.employees?.client_id === selectedClientId)
        }
        if (selectedDepartmentId) {
          filtered = filtered.filter(r => r.employees?.department_id === selectedDepartmentId)
        }
        const dataWithApprovers = await Promise.all(
          filtered.map(async (item) => {
            if (item.approved_by) {
              const { data: approverData } = await supabase
                .from('employees')
                .select('first_name, last_name')
                .eq('id', item.approved_by)
                .single()
              return { ...item, approver: approverData }
            }
            return item
          })
        )
        setReportData(dataWithApprovers as ReportData[])
      }
    } catch (error) { console.error('Error generating report:', error) }
    finally { setIsLoading(false) }
  }

  const handleExportToExcel = () => {
    if (reportData.length === 0) { alert('No data to export. Please run the report first.'); return }
    const exportData = reportData.map(row => {
      const regularHours = Math.min(row.total_hours || 0, 40)
      const overtimeHours = row.overtime_hours || Math.max(0, (row.total_hours || 0) - 40)
      const hourlyRate = row.employees?.hourly_rate || 0
      const regularAmount = regularHours * hourlyRate
      const overtimeAmount = overtimeHours * hourlyRate * 1.5
      const rowData: any = {
        'Employee': `${row.employees?.first_name} ${row.employees?.last_name}`,
        'Department': row.employees?.department || '',
        'Week Ending': row.week_ending,
        'Approver': row.approver ? `${row.approver.first_name} ${row.approver.last_name}` : 'Not Approved',
        'Regular Hours': regularHours.toFixed(2),
        'Overtime Hours': overtimeHours.toFixed(2),
        'Total Hours': row.total_hours?.toFixed(2) || '0.00',
        'Status': row.status.charAt(0).toUpperCase() + row.status.slice(1),
        'Approved Date': row.approved_at ? new Date(row.approved_at).toLocaleDateString() : 'N/A'
      }
      if (byProject && row.projects) {
        rowData['Project'] = row.projects.name
        rowData['Project Code'] = row.projects.code || ''
      }
      return rowData
    })
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(exportData)
    const colWidths = Object.keys(exportData[0] || {}).map(key => {
      const maxLength = Math.max(key.length, ...exportData.map(row => String(row[key]).length))
      return { wch: Math.min(maxLength + 2, 30) }
    })
    ws['!cols'] = colWidths
    XLSX.utils.book_append_sheet(wb, ws, 'Time by Approver')
    XLSX.writeFile(wb, `time_by_approver_${startDate}_to_${endDate}.xlsx`)
  }

  const totals = reportData.reduce((acc, row) => {
    const regularHours = Math.min(row.total_hours || 0, 40)
    const overtimeHours = row.overtime_hours || Math.max(0, (row.total_hours || 0) - 40)
    acc.regularHours += regularHours
    acc.overtimeHours += overtimeHours
    acc.totalHours += row.total_hours || 0
    acc.approvedCount += row.status === 'approved' ? 1 : 0
    acc.pendingCount += row.status === 'pending' || row.status === 'submitted' ? 1 : 0
    return acc
  }, { regularHours: 0, overtimeHours: 0, totalHours: 0, approvedCount: 0, pendingCount: 0 })

  if (pageLoading) {
    return (
      <div style={{ padding: '36px 40px' }}>
        <div style={{ height: 24, width: 200, background: '#f5f2ee', borderRadius: 6, marginBottom: 8 }} className="anim-shimmer" />
        <div style={{ height: 13, width: 300, background: '#f5f2ee', borderRadius: 6, marginBottom: 32 }} className="anim-shimmer" />
        <div style={{ background: '#FFFFFF', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '22px 24px' }}>
          {[0,1,2,3].map(i => (<div key={i} style={{ height: 38, background: '#f5f2ee', borderRadius: 7, marginBottom: 16 }} className="anim-shimmer" />))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '36px 40px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', letterSpacing: -0.3, margin: 0 }}>Time by Approver</h1>
      <p style={{ fontSize: 13, fontWeight: 400, color: '#999', marginTop: 4, marginBottom: 28 }}>Generate time reports grouped by approver</p>

      <div style={{ background: '#FFFFFF', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '28px 28px' }}>
        <div style={sectionLabel}>Report Parameters</div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 24 }}>
          <div>
            <label style={labelStyle}>Date Start</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
          </div>
          <div>
            <label style={labelStyle}>Date Stop</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', paddingBottom: 4 }}>
            <input type="checkbox" checked={forceCompleteWeeks} onChange={(e) => setForceCompleteWeeks(e.target.checked)} style={{ accentColor: '#e31c79' }} />
            <span style={{ fontSize: 12, color: '#1a1a1a' }}>Force Complete Weeks</span>
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div>
            <label style={labelStyle}>User</label>
            <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} style={selectStyle} onFocus={focusIn} onBlur={focusOut}>
              <option value="">All Approvers</option>
              {approverList.map(a => <option key={a.id} value={a.id}>{a.last_name}, {a.first_name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Time Type</label>
            <select value={selectedTimeType} onChange={(e) => setSelectedTimeType(e.target.value)} style={selectStyle} onFocus={focusIn} onBlur={focusOut}>
              {timeTypes.map(type => (<option key={type} value={type}>{type}</option>))}
            </select>
          </div>
        </div>

        <div style={sectionLabel}>Options</div>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8, marginBottom: 24 }}>
          {[
            { label: 'By Project', checked: byProject, onChange: setByProject },
            { label: 'Include Unapproved', checked: includeUnapproved, onChange: setIncludeUnapproved },
            { label: 'Include Details', checked: includeDetails, onChange: setIncludeDetails },
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
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={{ background: '#FFFFFF', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '22px 24px' }}>
              <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: 1.2, color: '#c0bab2', marginBottom: 6 }}>Total Records</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a' }}>{reportData.length}</div>
            </div>
            <div style={{ background: '#FFFFFF', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '22px 24px' }}>
              <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: 1.2, color: '#c0bab2', marginBottom: 6 }}>Approved</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#2d9b6e' }}>{totals.approvedCount}</div>
            </div>
            <div style={{ background: '#FFFFFF', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '22px 24px' }}>
              <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: 1.2, color: '#c0bab2', marginBottom: 6 }}>Pending Review</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#c4983a' }}>{totals.pendingCount}</div>
            </div>
          </div>

          {/* Table */}
          <div style={{ background: '#FFFFFF', border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Employee', 'Department', 'Week Ending', 'Approver',
                    ...(byProject ? ['Project'] : []),
                    'Regular', 'Overtime', 'Total', 'Status'
                  ].map(h => (
                    <th key={h} style={{ padding: '11px 20px', fontSize: 9, fontWeight: 500, letterSpacing: 1.2, color: '#c0bab2', textTransform: 'uppercase' as const, borderBottom: '0.5px solid #f0ece7', textAlign: ['Regular', 'Overtime', 'Total'].includes(h) ? 'right' : 'left' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportData.map((row) => {
                  const regularHours = Math.min(row.total_hours || 0, 40)
                  const overtimeHours = row.overtime_hours || Math.max(0, (row.total_hours || 0) - 40)
                  return (
                    <tr key={row.id} style={{ borderBottom: '0.5px solid #f5f2ee' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#FDFCFB')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                      <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a' }}>{row.employees?.first_name} {row.employees?.last_name}</td>
                      <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a' }}>{row.employees?.department || 'N/A'}</td>
                      <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a' }}>{new Date(row.week_ending).toLocaleDateString()}</td>
                      <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a' }}>{row.approver ? `${row.approver.first_name} ${row.approver.last_name}` : '-'}</td>
                      {byProject && <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a' }}>{row.projects?.name || 'N/A'}</td>}
                      <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a', textAlign: 'right' }}>{regularHours.toFixed(2)}</td>
                      <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a', textAlign: 'right' }}>{overtimeHours.toFixed(2)}</td>
                      <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a', textAlign: 'right', fontWeight: 600 }}>{(row.total_hours || 0).toFixed(2)}</td>
                      <td style={{ padding: '12px 20px' }}><StatusBadge status={row.status} /></td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '0.5px solid #f0ece7' }}>
                  <td colSpan={byProject ? 5 : 4} style={{ padding: '12px 20px', fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>Total</td>
                  <td style={{ padding: '12px 20px', fontSize: 12, fontWeight: 600, color: '#1a1a1a', textAlign: 'right' }}>{totals.regularHours.toFixed(2)}</td>
                  <td style={{ padding: '12px 20px', fontSize: 12, fontWeight: 600, color: '#1a1a1a', textAlign: 'right' }}>{totals.overtimeHours.toFixed(2)}</td>
                  <td style={{ padding: '12px 20px', fontSize: 12, fontWeight: 600, color: '#1a1a1a', textAlign: 'right' }}>{totals.totalHours.toFixed(2)}</td>
                  <td style={{ padding: '12px 20px' }} />
                </tr>
              </tfoot>
            </table>
          </div>

          {includeDetails && (
            <div style={{ marginTop: 16, background: '#FFFFFF', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '20px 24px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>Report Details</div>
              <p style={{ fontSize: 12.5, color: '#999', margin: 0, lineHeight: 1.6 }}>
                This report shows all timesheets grouped by their approvers for the selected period.
                {includeUnapproved && ' Including unapproved entries allows you to see pending items awaiting review.'}
                {byProject && ' Project breakdown helps identify which projects are consuming the most resources.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
