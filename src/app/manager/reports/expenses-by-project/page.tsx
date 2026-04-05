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
  projects?: { name: string; code: string; client_name?: string }
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

export default function ExpensesByProjectReport() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const [startDate, setStartDate] = useState(firstOfMonth)
  const [endDate, setEndDate] = useState(lastOfMonth)
  const [selectedProject, setSelectedProject] = useState('-All-')
  const [projectOptionsList, setProjectOptionsList] = useState<{id: string; name: string}[]>([])
  const [managedEmployeeIds, setManagedEmployeeIds] = useState<string[]>([])
  const [selectedExpenseType, setSelectedExpenseType] = useState('-All-')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('-All-')
  const [reimbursableOnly, setReimbursableOnly] = useState(false)
  const [nonReimbursableOnly, setNonReimbursableOnly] = useState(false)
  const [billableOnly, setBillableOnly] = useState(false)
  const [nonBillableOnly, setNonBillableOnly] = useState(false)
  const [includeDetails, setIncludeDetails] = useState(false)
  const [summaryOnly, setSummaryOnly] = useState(false)
  const [reportData, setReportData] = useState<ExpenseData[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const expenseTypes = ['-All-','Airfare','Breakfast','Dinner','Fuel','Incidental','Lodging','Lunch','Meals and Incidentals(GSA)','Mileage','Miscellaneous','Parking','Rental Car - Standard size']
  const paymentMethods = ['-All-','Company Card','Personal Card','Cash','Check','Direct Bill']

  useEffect(() => {
    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return
      const { data: myEmps } = await supabase.from('employees').select('id').eq('manager_id', authUser.id)
      setManagedEmployeeIds((myEmps || []).map(e => e.id))
      const { data: projects } = await supabase.from('projects').select('id, name').eq('status', 'active').order('name')
      setProjectOptionsList((projects || []).map(p => ({ id: p.id, name: p.name })))
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRunReport = async () => {
    setIsLoading(true)
    try {
      if (managedEmployeeIds.length === 0) { setReportData([]); setIsLoading(false); return }
      let query = supabase.from('expenses').select(`*, employees!inner (first_name, last_name, department, email), projects (name, code, client_name)`)
        .in('employee_id', managedEmployeeIds)
        .gte('expense_date', startDate).lte('expense_date', endDate)
      if (selectedProject !== '-All-') query = query.eq('project_id', selectedProject)
      if (selectedExpenseType !== '-All-') query = query.eq('category', selectedExpenseType)
      if (selectedPaymentMethod !== '-All-') query = query.eq('payment_method', selectedPaymentMethod)
      if (reimbursableOnly) query = query.eq('is_reimbursable', true)
      else if (nonReimbursableOnly) query = query.eq('is_reimbursable', false)
      if (billableOnly) query = query.eq('is_billable', true)
      else if (nonBillableOnly) query = query.eq('is_billable', false)
      const { data, error } = await query
      if (error) console.error('Error:', error)
      else if (data) setReportData(data as ExpenseData[])
    } catch (error) { console.error('Error:', error) } finally { setIsLoading(false) }
  }

  const handleExportToExcel = () => {
    if (reportData.length === 0) { alert('No data to export.'); return }
    const exportData: any[] = []
    if (summaryOnly) {
      const groups: { [key: string]: ExpenseData[] } = {}
      reportData.forEach(e => { const k = e.project_id || 'no-project'; if (!groups[k]) groups[k] = []; groups[k].push(e) })
      Object.values(groups).forEach(expenses => {
        const proj = expenses[0].projects; const total = expenses.reduce((s, e) => s + e.amount, 0)
        exportData.push({ 'Project': proj ? `${proj.name} (${proj.code})` : 'No Project', 'Client': proj?.client_name || '', 'Total Expenses': total.toFixed(2), 'Expense Count': expenses.length.toString() })
      })
    } else {
      reportData.forEach(e => { exportData.push({ 'Project': e.projects ? `${e.projects.name} (${e.projects.code})` : 'No Project', 'Employee': e.employees ? `${e.employees.first_name} ${e.employees.last_name}` : 'Unknown', 'Date': e.expense_date, 'Category': e.category, 'Amount': e.amount.toFixed(2), 'Status': e.status }) })
    }
    const wb = XLSX.utils.book_new(); const ws = XLSX.utils.json_to_sheet(exportData)
    if (exportData.length > 0) { ws['!cols'] = Object.keys(exportData[0]).map(k => ({ wch: Math.min(Math.max(k.length, ...exportData.map(r => r[k] ? String(r[k]).length : 0)) + 2, 30) })) }
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses by Project'); XLSX.writeFile(wb, `expenses_by_project_${startDate}_to_${endDate}.xlsx`)
  }

  const totals = reportData.reduce((acc, e) => { acc.totalAmount += e.amount; acc.reimbursable += e.is_reimbursable ? e.amount : 0; acc.billable += e.is_billable ? e.amount : 0; acc.count += 1; return acc }, { totalAmount: 0, reimbursable: 0, billable: 0, count: 0 })
  const uniqueProjects = new Set(reportData.map(e => e.project_id || 'no-project')).size

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
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: 0, letterSpacing: -0.3 }}>Expenses by Project</h1>
        <p style={{ fontSize: 13, fontWeight: 400, color: '#999', marginTop: 4 }}>Generate expense reports grouped by project</p>
      </div>

      <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase', margin: '0 0 16px 0' }}>Report Details</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div><label style={labelSt}>Date Start</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputSt} /></div>
            <div><label style={labelSt}>Date Stop</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputSt} /></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div><label style={labelSt}>Project</label><select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} style={selectSt}><option value="-All-">-All-</option>{projectOptionsList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label style={labelSt}>Expense Type</label><select value={selectedExpenseType} onChange={e => setSelectedExpenseType(e.target.value)} style={selectSt}>{expenseTypes.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label style={labelSt}>Payment Method</label><select value={selectedPaymentMethod} onChange={e => setSelectedPaymentMethod(e.target.value)} style={selectSt}>{paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Reimbursable Only', checked: reimbursableOnly, set: (v: boolean) => { setReimbursableOnly(v); if (v) setNonReimbursableOnly(false) } },
              { label: 'Non-Reimbursable Only', checked: nonReimbursableOnly, set: (v: boolean) => { setNonReimbursableOnly(v); if (v) setReimbursableOnly(false) } },
              { label: 'Billable Only', checked: billableOnly, set: (v: boolean) => { setBillableOnly(v); if (v) setNonBillableOnly(false) } },
              { label: 'Non-Billable Only', checked: nonBillableOnly, set: (v: boolean) => { setNonBillableOnly(v); if (v) setBillableOnly(false) } },
              { label: 'Include Details', checked: includeDetails, set: setIncludeDetails },
              { label: 'Summary Only', checked: summaryOnly, set: setSummaryOnly },
            ].map(opt => (
              <label key={opt.label} style={{ display: 'flex', alignItems: 'center' }}><input type="checkbox" checked={opt.checked} onChange={e => opt.set(e.target.checked)} style={checkSt} /><span style={spanSt}>{opt.label}</span></label>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            {reportData.length > 0 && <button onClick={handleExportToExcel} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', background: '#fff', color: '#777', border: '0.5px solid #e0dcd7', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}><Download style={{ width: 16, height: 16 }} /> Export to Excel</button>}
            <button onClick={handleRunReport} disabled={isLoading} style={{ padding: '8px 24px', borderRadius: 6, fontSize: 12, fontWeight: 500, border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', background: isLoading ? '#f5f2ee' : '#e31c79', color: isLoading ? '#999' : '#fff' }}>{isLoading ? 'Running...' : 'Run'}</button>
          </div>

          {reportData.length > 0 && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 16 }}>
                {[
                  { label: 'Total Expenses', value: `$${totals.totalAmount.toFixed(2)}`, color: '#1a1a1a' },
                  { label: 'Projects', value: String(uniqueProjects), color: '#1a1a1a' },
                  { label: 'Reimbursable', value: `$${totals.reimbursable.toFixed(2)}`, color: '#2d9b6e' },
                  { label: 'Billable', value: `$${totals.billable.toFixed(2)}`, color: '#e31c79' },
                  { label: 'Count', value: String(totals.count), color: '#1a1a1a' },
                ].map(s => (
                  <div key={s.label} style={{ padding: 16, background: '#FDFCFB', borderRadius: 10, border: '0.5px solid #f5f2ee' }}>
                    <p style={{ fontSize: 12, color: '#999', margin: 0 }}>{s.label}</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: s.color, margin: '4px 0 0' }}>{s.value}</p>
                  </div>
                ))}
              </div>

              <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
                {!summaryOnly ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>
                      {['Project', 'Employee', 'Date', 'Category', 'Description', 'Amount', 'Status'].map(h => (
                        <th key={h} style={{ ...thSt, textAlign: h === 'Amount' ? 'right' : h === 'Status' ? 'center' : 'left' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {reportData.map(e => (
                        <tr key={e.id} style={{ borderBottom: '0.5px solid #f5f2ee' }} onMouseEnter={ev => ev.currentTarget.style.background='#FDFCFB'} onMouseLeave={ev => ev.currentTarget.style.background='transparent'}>
                          <td style={tdSt}>{e.projects ? `${e.projects.name} (${e.projects.code})` : 'No Project'}</td>
                          <td style={tdSt}>{e.employees ? `${e.employees.first_name} ${e.employees.last_name}` : 'Unknown'}</td>
                          <td style={tdSt}>{new Date(e.expense_date).toLocaleDateString()}</td>
                          <td style={tdSt}>{e.category}</td>
                          <td style={tdSt}>{e.description}</td>
                          <td style={{ ...tdSt, textAlign: 'right', fontWeight: 600 }}>${e.amount.toFixed(2)}</td>
                          <td style={{ ...tdSt, textAlign: 'center' }}><StatusBadge status={e.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>
                      {['Project', 'Client', 'Total Amount', 'Reimbursable', 'Billable', 'Expenses', 'Employees'].map(h => (
                        <th key={h} style={{ ...thSt, textAlign: ['Total Amount','Reimbursable','Billable'].includes(h) ? 'right' : ['Expenses','Employees'].includes(h) ? 'center' : 'left' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {(() => {
                        const groups: { [key: string]: ExpenseData[] } = {}
                        reportData.forEach(e => { const k = e.project_id || 'no-project'; if (!groups[k]) groups[k] = []; groups[k].push(e) })
                        return Object.values(groups).map((expenses, i) => {
                          const proj = expenses[0].projects; const total = expenses.reduce((s, e) => s + e.amount, 0)
                          const reimb = expenses.filter(e => e.is_reimbursable).reduce((s, e) => s + e.amount, 0)
                          const bill = expenses.filter(e => e.is_billable).reduce((s, e) => s + e.amount, 0)
                          return (<tr key={i} style={{ borderBottom: '0.5px solid #f5f2ee' }} onMouseEnter={ev => ev.currentTarget.style.background='#FDFCFB'} onMouseLeave={ev => ev.currentTarget.style.background='transparent'}>
                            <td style={tdSt}>{proj ? `${proj.name} (${proj.code})` : 'No Project Assigned'}</td>
                            <td style={tdSt}>{proj?.client_name || 'N/A'}</td>
                            <td style={{ ...tdSt, textAlign: 'right', fontWeight: 600 }}>${total.toFixed(2)}</td>
                            <td style={{ ...tdSt, textAlign: 'right', color: '#2d9b6e' }}>${reimb.toFixed(2)}</td>
                            <td style={{ ...tdSt, textAlign: 'right', color: '#e31c79' }}>${bill.toFixed(2)}</td>
                            <td style={{ ...tdSt, textAlign: 'center' }}>{expenses.length}</td>
                            <td style={{ ...tdSt, textAlign: 'center' }}>{new Set(expenses.map(e => e.employee_id)).size}</td>
                          </tr>)
                        })
                      })()}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
