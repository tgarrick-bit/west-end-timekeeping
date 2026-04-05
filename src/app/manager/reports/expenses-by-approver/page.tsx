'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'
import { Download } from 'lucide-react'

interface ExpenseData {
  id: string; employee_id: string; project_id?: string; expense_date: string; amount: number; category: string
  description: string; receipt_url?: string; status: string; payment_method?: string; is_reimbursable: boolean
  is_billable: boolean; submitted_at?: string; approved_at?: string; approved_by?: string
  employees?: { first_name: string; last_name: string; department?: string; email: string }
  projects?: { name: string; code: string }
  approver?: { first_name: string; last_name: string; email: string } | null
}

const StatusBadge = ({ status }: { status: string }) => {
  const m: Record<string, { bg: string; color: string; border: string }> = {
    approved: { bg: '#ecfdf5', color: '#2d9b6e', border: '#2d9b6e' },
    pending: { bg: '#FFF8E1', color: '#c4983a', border: '#c4983a' },
    submitted: { bg: '#FFF8E1', color: '#c4983a', border: '#c4983a' },
    rejected: { bg: '#fef2f2', color: '#b91c1c', border: '#b91c1c' },
  }
  const c = m[status] || { bg: '#FAFAF8', color: '#777', border: '#e8e4df' }
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', fontSize: 9, fontWeight: 500, borderRadius: 3, background: c.bg, color: c.color, border: `0.5px solid ${c.border}` }}>{status}</span>
}

export default function ExpensesByApproverReport() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const [startDate, setStartDate] = useState(firstOfMonth)
  const [endDate, setEndDate] = useState(lastOfMonth)
  const [selectedUser, setSelectedUser] = useState('')
  const [employeeOptions, setEmployeeOptions] = useState<{id: string; name: string}[]>([])
  const [managedEmployeeIds, setManagedEmployeeIds] = useState<string[]>([])
  const [includeUnapproved, setIncludeUnapproved] = useState(false)
  const [reportData, setReportData] = useState<ExpenseData[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return
      const { data: myEmps } = await supabase.from('employees').select('id, first_name, last_name').eq('manager_id', authUser.id).order('last_name')
      const empList = (myEmps || []).map(e => ({ id: e.id, name: `${e.first_name} ${e.last_name}` }))
      setEmployeeOptions(empList)
      setManagedEmployeeIds(empList.map(e => e.id))
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRunReport = async () => {
    setIsLoading(true)
    try {
      if (managedEmployeeIds.length === 0) { setReportData([]); setIsLoading(false); return }
      let query = supabase.from('expenses').select(`*, employees!inner (first_name, last_name, department, email), projects (name, code)`)
        .in('employee_id', managedEmployeeIds)
        .gte('expense_date', startDate).lte('expense_date', endDate)
      if (!includeUnapproved) { query = query.eq('status', 'approved') } else { query = query.in('status', ['approved', 'pending', 'submitted', 'rejected']) }
      if (selectedUser) { query = query.eq('employee_id', selectedUser) }
      const { data, error } = await query
      if (error) { console.error('Error:', error) } else if (data) {
        // Batch lookup approver names instead of N+1 queries
        const approverIds = [...new Set((data as ExpenseData[]).map(d => d.approved_by).filter(Boolean) as string[])]
        let approverMap: Record<string, { first_name: string; last_name: string; email: string }> = {}
        if (approverIds.length > 0) {
          const { data: approvers } = await supabase.from('employees').select('id, first_name, last_name, email').in('id', approverIds)
          if (approvers) {
            approvers.forEach(a => { approverMap[a.id] = { first_name: a.first_name, last_name: a.last_name, email: a.email } })
          }
        }
        const dataWithApprovers = (data as ExpenseData[]).map(expense => ({
          ...expense,
          approver: expense.approved_by ? approverMap[expense.approved_by] || null : null
        }))
        setReportData(dataWithApprovers)
      }
    } catch (error) { console.error('Error:', error) } finally { setIsLoading(false) }
  }

  const handleExportToExcel = () => {
    if (reportData.length === 0) { alert('No data to export.'); return }
    const exportData: any[] = []
    const groups: { [key: string]: ExpenseData[] } = {}
    reportData.forEach(e => { const k = e.approved_by || 'unapproved'; if (!groups[k]) groups[k] = []; groups[k].push(e) })
    Object.entries(groups).forEach(([id, expenses]) => {
      const approver = expenses[0].approver
      const name = approver ? `${approver.first_name} ${approver.last_name}` : id === 'unapproved' ? 'Unapproved' : 'Unknown'
      expenses.forEach(e => { exportData.push({ 'Approver': name, 'Employee': e.employees ? `${e.employees.first_name} ${e.employees.last_name}` : 'Unknown', 'Date': e.expense_date, 'Category': e.category, 'Amount': e.amount.toFixed(2), 'Status': e.status, 'Approved Date': e.approved_at ? new Date(e.approved_at).toLocaleDateString() : 'N/A' }) })
    })
    const wb = XLSX.utils.book_new(); const ws = XLSX.utils.json_to_sheet(exportData)
    if (exportData.length > 0) { ws['!cols'] = Object.keys(exportData[0]).map(k => ({ wch: Math.min(Math.max(k.length, ...exportData.map(r => r[k] ? String(r[k]).length : 0)) + 2, 30) })) }
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses by Approver'); XLSX.writeFile(wb, `expenses_by_approver_${startDate}_to_${endDate}.xlsx`)
  }

  const totals = reportData.reduce((acc, e) => {
    acc.totalAmount += e.amount; acc.approved += e.status === 'approved' ? e.amount : 0
    acc.pending += (e.status === 'pending' || e.status === 'submitted') ? e.amount : 0
    acc.approvedCount += e.status === 'approved' ? 1 : 0; acc.pendingCount += (e.status === 'pending' || e.status === 'submitted') ? 1 : 0
    return acc
  }, { totalAmount: 0, approved: 0, pending: 0, approvedCount: 0, pendingCount: 0 })

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
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: 0, letterSpacing: -0.3 }}>Expenses by Approver</h1>
        <p style={{ fontSize: 13, fontWeight: 400, color: '#999', marginTop: 4 }}>Generate expense reports grouped by approver</p>
      </div>

      <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase', margin: '0 0 16px 0' }}>Report Details</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div><label style={labelSt}>Date Start</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputSt} /></div>
            <div><label style={labelSt}>Date Stop</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputSt} /></div>
          </div>
          <div><label style={labelSt}>User</label><select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} style={selectSt}><option value="">-All-</option>{employeeOptions.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center' }}><input type="checkbox" checked={includeUnapproved} onChange={e => setIncludeUnapproved(e.target.checked)} style={checkSt} /><span style={spanSt}>Include Unapproved</span></label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            {reportData.length > 0 && <button onClick={handleExportToExcel} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', background: '#fff', color: '#777', border: '0.5px solid #e0dcd7', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}><Download style={{ width: 16, height: 16 }} /> Export to Excel</button>}
            <button onClick={handleRunReport} disabled={isLoading} style={{ padding: '8px 24px', borderRadius: 6, fontSize: 12, fontWeight: 500, border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', background: isLoading ? '#f5f2ee' : '#e31c79', color: isLoading ? '#999' : '#fff' }}>{isLoading ? 'Running...' : 'Run'}</button>
          </div>

          {reportData.length > 0 && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
                <div style={{ padding: 16, background: '#FDFCFB', borderRadius: 10, border: '0.5px solid #f5f2ee' }}><p style={{ fontSize: 12, color: '#999', margin: 0 }}>Total Expenses</p><p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', margin: '4px 0 0' }}>${totals.totalAmount.toFixed(2)}</p></div>
                <div style={{ padding: 16, background: '#FDFCFB', borderRadius: 10, border: '0.5px solid #f5f2ee' }}><p style={{ fontSize: 12, color: '#999', margin: 0 }}>Approved</p><p style={{ fontSize: 14, fontWeight: 600, color: '#2d9b6e', margin: '4px 0 0' }}>${totals.approved.toFixed(2)} <span style={{ fontSize: 11, color: '#999' }}>({totals.approvedCount})</span></p></div>
                <div style={{ padding: 16, background: '#FDFCFB', borderRadius: 10, border: '0.5px solid #f5f2ee' }}><p style={{ fontSize: 12, color: '#999', margin: 0 }}>Pending</p><p style={{ fontSize: 14, fontWeight: 600, color: '#c4983a', margin: '4px 0 0' }}>${totals.pending.toFixed(2)} <span style={{ fontSize: 11, color: '#999' }}>({totals.pendingCount})</span></p></div>
                <div style={{ padding: 16, background: '#FDFCFB', borderRadius: 10, border: '0.5px solid #f5f2ee' }}><p style={{ fontSize: 12, color: '#999', margin: 0 }}>Total Count</p><p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', margin: '4px 0 0' }}>{reportData.length}</p></div>
              </div>

              <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    {['Approver', 'Employee', 'Department', 'Date', 'Category', 'Description', 'Amount', 'Status', 'Approved Date'].map(h => (
                      <th key={h} style={{ ...thSt, textAlign: h === 'Amount' ? 'right' : ['Status', 'Approved Date'].includes(h) ? 'center' : 'left' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {reportData
                      .sort((a, b) => {
                        const aName = a.approver ? `${a.approver.first_name} ${a.approver.last_name}` : 'zzz'
                        const bName = b.approver ? `${b.approver.first_name} ${b.approver.last_name}` : 'zzz'
                        if (aName !== bName) return aName.localeCompare(bName)
                        return new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime()
                      })
                      .map(e => (
                        <tr key={e.id} style={{ borderBottom: '0.5px solid #f5f2ee' }} onMouseEnter={ev => ev.currentTarget.style.background='#FDFCFB'} onMouseLeave={ev => ev.currentTarget.style.background='transparent'}>
                          <td style={tdSt}>{e.approver ? `${e.approver.first_name} ${e.approver.last_name}` : e.status === 'approved' ? 'Unknown Approver' : '-'}</td>
                          <td style={tdSt}>{e.employees ? `${e.employees.first_name} ${e.employees.last_name}` : 'Unknown'}</td>
                          <td style={tdSt}>{e.employees?.department || 'N/A'}</td>
                          <td style={tdSt}>{new Date(e.expense_date).toLocaleDateString()}</td>
                          <td style={tdSt}>{e.category}</td>
                          <td style={tdSt}>{e.description}</td>
                          <td style={{ ...tdSt, textAlign: 'right', fontWeight: 600 }}>${e.amount.toFixed(2)}</td>
                          <td style={{ ...tdSt, textAlign: 'center' }}><StatusBadge status={e.status} /></td>
                          <td style={{ ...tdSt, textAlign: 'center' }}>{e.approved_at ? new Date(e.approved_at).toLocaleDateString() : '-'}</td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot><tr style={{ background: '#FDFCFB' }}>
                    <td colSpan={6} style={{ ...tdSt, fontWeight: 600 }}>Total</td>
                    <td style={{ ...tdSt, textAlign: 'right', fontWeight: 600 }}>${totals.totalAmount.toFixed(2)}</td>
                    <td colSpan={2} style={tdSt} />
                  </tr></tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
