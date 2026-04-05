'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'
import { Download } from 'lucide-react'

interface ExpenseData {
  id: string
  employee_id: string
  project_id?: string
  expense_date: string
  amount: number
  category: string
  description: string
  receipt_url?: string
  status: string
  payment_method?: string
  is_reimbursable: boolean
  is_billable: boolean
  submitted_at?: string
  approved_at?: string
  approved_by?: string
  employees?: { first_name: string; last_name: string; department?: string; email: string }
  projects?: { name: string; code: string }
  approver?: { first_name: string; last_name: string; email: string } | null
}

const inputStyle = { padding: '8px 12px', border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12.5, color: '#1a1a1a', outline: 'none' } as const
const selectStyle = { ...inputStyle, width: '100%', background: 'white' } as const
const labelStyle = { display: 'block' as const, fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const, marginBottom: 6 }
const sectionLabel = { fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const, marginBottom: 12 }

function focusIn(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) { e.currentTarget.style.borderColor = '#d3ad6b'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(211,173,107,0.15)' }
function focusOut(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) { e.currentTarget.style.borderColor = '#e8e4df'; e.currentTarget.style.boxShadow = 'none' }

function StatusBadge({ status }: { status: string }) {
  const color = status === 'approved' ? '#2d9b6e' : (status === 'pending' || status === 'submitted') ? '#c4983a' : status === 'rejected' ? '#b91c1c' : '#999'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 9, fontWeight: 500, borderRadius: 3, padding: '2px 8px', background: status === 'approved' ? 'rgba(45,155,110,0.08)' : (status === 'pending' || status === 'submitted') ? 'rgba(196,152,58,0.08)' : status === 'rejected' ? 'rgba(185,28,28,0.08)' : 'rgba(0,0,0,0.03)' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ color }}>{status}</span>
    </span>
  )
}

export default function ExpensesByApproverReport() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  const now = new Date()
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const today = now.toISOString().split('T')[0]

  const [startDate, setStartDate] = useState(firstOfMonth)
  const [endDate, setEndDate] = useState(today)
  const [selectedUser, setSelectedUser] = useState('')
  const [includeUnapproved, setIncludeUnapproved] = useState(false)
  const [reportData, setReportData] = useState<ExpenseData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  const [approverListData, setApproverListData] = useState<{id: string, first_name: string, last_name: string}[]>([])

  useEffect(() => {
    const loadFilters = async () => {
      const { data } = await supabase.from('employees').select('id, first_name, last_name').in('role', ['manager', 'admin', 'time_approver']).eq('is_active', true).order('last_name')
      if (data) setApproverListData(data)
      setPageLoading(false)
    }
    loadFilters()
  }, [])

  const handleRunReport = async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from('expenses')
        .select(`*, employees!inner (first_name, last_name, department, email), projects (name, code)`)
        .gte('expense_date', startDate)
        .lte('expense_date', endDate)
      if (!includeUnapproved) { query = query.eq('status', 'approved') }
      else { query = query.in('status', ['approved', 'pending', 'submitted', 'rejected']) }
      if (selectedUser) { query = query.eq('approved_by', selectedUser) }
      const { data, error } = await query
      if (error) { console.error('Error fetching report data:', error) }
      else if (data) {
        const dataWithApprovers = await Promise.all(
          (data as ExpenseData[]).map(async (expense) => {
            if (expense.approved_by) {
              const { data: approverData } = await supabase
                .from('employees')
                .select('first_name, last_name, email')
                .eq('id', expense.approved_by)
                .single()
              return { ...expense, approver: approverData }
            }
            return expense
          })
        )
        setReportData(dataWithApprovers)
      }
    } catch (error) { console.error('Error generating report:', error) }
    finally { setIsLoading(false) }
  }

  const handleExportToExcel = () => {
    if (reportData.length === 0) { alert('No data to export. Please run the report first.'); return }
    const exportData: any[] = []
    const approverGroups: { [key: string]: ExpenseData[] } = {}
    reportData.forEach(expense => { const key = expense.approved_by || 'unapproved'; if (!approverGroups[key]) { approverGroups[key] = [] }; approverGroups[key].push(expense) })
    Object.entries(approverGroups).forEach(([approverId, expenses]) => {
      const approver = expenses[0].approver
      const approverName = approver ? `${approver.first_name} ${approver.last_name}` : approverId === 'unapproved' ? 'Unapproved' : 'Unknown Approver'
      expenses.forEach(expense => {
        exportData.push({ 'Approver': approverName, 'Employee': expense.employees ? `${expense.employees.first_name} ${expense.employees.last_name}` : 'Unknown', 'Department': expense.employees?.department || '', 'Date': expense.expense_date, 'Category': expense.category, 'Description': expense.description, 'Amount': expense.amount.toFixed(2), 'Payment Method': expense.payment_method || '', 'Reimbursable': expense.is_reimbursable ? 'Yes' : 'No', 'Billable': expense.is_billable ? 'Yes' : 'No', 'Status': expense.status, 'Approved Date': expense.approved_at ? new Date(expense.approved_at).toLocaleDateString() : 'N/A' })
      })
    })
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(exportData)
    if (exportData.length > 0) { const colWidths = Object.keys(exportData[0]).map(key => { const maxLength = Math.max(key.length, ...exportData.map((row) => { const v = row[key]; return v ? String(v).length : 0 })); return { wch: Math.min(maxLength + 2, 30) } }); ws['!cols'] = colWidths }
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses by Approver')
    XLSX.writeFile(wb, `expenses_by_approver_${startDate}_to_${endDate}.xlsx`)
  }

  const totals = reportData.reduce((acc, expense) => {
    acc.totalAmount += expense.amount
    acc.approved += expense.status === 'approved' ? expense.amount : 0
    acc.pending += (expense.status === 'pending' || expense.status === 'submitted') ? expense.amount : 0
    acc.approvedCount += expense.status === 'approved' ? 1 : 0
    acc.pendingCount += (expense.status === 'pending' || expense.status === 'submitted') ? 1 : 0
    return acc
  }, { totalAmount: 0, approved: 0, pending: 0, approvedCount: 0, pendingCount: 0 })

  if (pageLoading) {
    return (
      <div style={{ padding: '36px 40px' }}>
        <div style={{ height: 24, width: 240, background: '#f5f2ee', borderRadius: 6, marginBottom: 8 }} className="anim-shimmer" />
        <div style={{ height: 13, width: 300, background: '#f5f2ee', borderRadius: 6, marginBottom: 32 }} className="anim-shimmer" />
        <div style={{ background: '#FFFFFF', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '22px 24px' }}>
          {[0,1,2,3].map(i => (<div key={i} style={{ height: 38, background: '#f5f2ee', borderRadius: 7, marginBottom: 16 }} className="anim-shimmer" />))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '36px 40px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', letterSpacing: -0.3, margin: 0 }}>Expenses by Approver</h1>
      <p style={{ fontSize: 13, fontWeight: 400, color: '#999', marginTop: 4, marginBottom: 28 }}>Generate expense reports grouped by approver</p>

      <div style={{ background: '#FFFFFF', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '28px 28px' }}>
        <div style={sectionLabel}>Report Parameters</div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 24 }}>
          <div><label style={labelStyle}>Date Start</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} onFocus={focusIn} onBlur={focusOut} /></div>
          <div><label style={labelStyle}>Date Stop</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} onFocus={focusIn} onBlur={focusOut} /></div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>User</label>
          <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} style={selectStyle} onFocus={focusIn} onBlur={focusOut}>
            <option value="">All Approvers</option>
            {approverListData.map(a => <option key={a.id} value={a.id}>{a.last_name}, {a.first_name}</option>)}
          </select>
        </div>

        <div style={sectionLabel}>Options</div>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8, marginBottom: 24 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={includeUnapproved} onChange={(e) => setIncludeUnapproved(e.target.checked)} style={{ accentColor: '#e31c79' }} />
            <span style={{ fontSize: 12.5, color: '#1a1a1a' }}>Include Unapproved</span>
          </label>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={{ background: '#FFFFFF', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '22px 24px' }}>
              <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: 1.2, color: '#c0bab2', marginBottom: 6 }}>Total Expenses</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#e31c79' }}>${totals.totalAmount.toFixed(2)}</div>
            </div>
            <div style={{ background: '#FFFFFF', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '22px 24px' }}>
              <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: 1.2, color: '#c0bab2', marginBottom: 6 }}>Approved</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#2d9b6e' }}>${totals.approved.toFixed(2)} <span style={{ fontSize: 12, fontWeight: 400, color: '#999' }}>({totals.approvedCount})</span></div>
            </div>
            <div style={{ background: '#FFFFFF', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '22px 24px' }}>
              <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: 1.2, color: '#c0bab2', marginBottom: 6 }}>Pending</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#c4983a' }}>${totals.pending.toFixed(2)} <span style={{ fontSize: 12, fontWeight: 400, color: '#999' }}>({totals.pendingCount})</span></div>
            </div>
            <div style={{ background: '#FFFFFF', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '22px 24px' }}>
              <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: 1.2, color: '#c0bab2', marginBottom: 6 }}>Total Count</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a' }}>{reportData.length}</div>
            </div>
          </div>

          {/* Table */}
          <div style={{ background: '#FFFFFF', border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Approver', 'Employee', 'Department', 'Date', 'Category', 'Description', 'Amount', 'Status', 'Approved Date'].map(h => (
                    <th key={h} style={{ padding: '11px 20px', fontSize: 9, fontWeight: 500, letterSpacing: 1.2, color: '#c0bab2', textTransform: 'uppercase' as const, borderBottom: '0.5px solid #f0ece7', textAlign: h === 'Amount' ? 'right' : (h === 'Status' || h === 'Approved Date') ? 'center' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportData
                  .sort((a, b) => {
                    const approverA = a.approver ? `${a.approver.first_name} ${a.approver.last_name}` : 'zzz'
                    const approverB = b.approver ? `${b.approver.first_name} ${b.approver.last_name}` : 'zzz'
                    if (approverA !== approverB) return approverA.localeCompare(approverB)
                    return new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime()
                  })
                  .map((expense) => (
                    <tr key={expense.id} style={{ borderBottom: '0.5px solid #f5f2ee' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#FDFCFB')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                      <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a' }}>
                        {expense.approver ? `${expense.approver.first_name} ${expense.approver.last_name}` : expense.status === 'approved' ? 'Unknown Approver' : '-'}
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a' }}>{expense.employees ? `${expense.employees.first_name} ${expense.employees.last_name}` : 'Unknown'}</td>
                      <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a' }}>{expense.employees?.department || 'N/A'}</td>
                      <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a' }}>{new Date(expense.expense_date).toLocaleDateString()}</td>
                      <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a' }}>{expense.category}</td>
                      <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a' }}>{expense.description}</td>
                      <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a', textAlign: 'right', fontWeight: 600 }}>${expense.amount.toFixed(2)}</td>
                      <td style={{ padding: '12px 20px', textAlign: 'center' }}><StatusBadge status={expense.status} /></td>
                      <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a', textAlign: 'center' }}>{expense.approved_at ? new Date(expense.approved_at).toLocaleDateString() : '-'}</td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '0.5px solid #f0ece7' }}>
                  <td colSpan={6} style={{ padding: '12px 20px', fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>Total</td>
                  <td style={{ padding: '12px 20px', fontSize: 12, fontWeight: 600, color: '#1a1a1a', textAlign: 'right' }}>${totals.totalAmount.toFixed(2)}</td>
                  <td colSpan={2} style={{ padding: '12px 20px' }} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
