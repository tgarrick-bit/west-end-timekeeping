'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useAdminFilter } from '@/contexts/AdminFilterContext'
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
  employees?: { first_name: string; last_name: string; department?: string; email: string; client_id?: string; department_id?: string }
  projects?: { name: string; code: string; client_name?: string }
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

export default function ExpensesByProjectReport() {
  const router = useRouter()
  const { user } = useAuth()
  const { selectedClientId, selectedDepartmentId } = useAdminFilter()
  const supabase = createClient()

  const now = new Date()
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const today = now.toISOString().split('T')[0]

  const [startDate, setStartDate] = useState(firstOfMonth)
  const [endDate, setEndDate] = useState(today)
  const [selectedProject, setSelectedProject] = useState('-All-')
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
  const [pageLoading, setPageLoading] = useState(true)

  const expenseTypes = ['-All-', 'Airfare', 'Breakfast', 'Dinner', 'Fuel', 'Incidental', 'Lodging', 'Lunch', 'Meals and Incidentals(GSA)', 'Mileage', 'Miscellaneous', 'Parking', 'Rental Car - Standard size']
  const paymentMethods = ['-All-', 'Company Card', 'Personal Card', 'Cash', 'Check', 'Direct Bill']

  const [projectListData, setProjectListData] = useState<{id: string, name: string, code: string}[]>([])

  useEffect(() => {
    const loadFilters = async () => {
      const { data } = await supabase.from('projects').select('id, name, code').eq('status', 'active').order('name')
      if (data) setProjectListData(data)
      setPageLoading(false)
    }
    loadFilters()
  }, [])

  const handleRunReport = async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from('expenses')
        .select(`*, employees!inner (first_name, last_name, department, email, client_id, department_id), projects (name, code, client_name)`)
        .gte('expense_date', startDate)
        .lte('expense_date', endDate)
      if (selectedProject !== '-All-') { query = query.eq('project_id', selectedProject) }
      if (selectedExpenseType !== '-All-') { query = query.eq('category', selectedExpenseType) }
      if (selectedPaymentMethod !== '-All-') { query = query.eq('payment_method', selectedPaymentMethod) }
      if (reimbursableOnly) { query = query.eq('is_reimbursable', true) } else if (nonReimbursableOnly) { query = query.eq('is_reimbursable', false) }
      if (billableOnly) { query = query.eq('is_billable', true) } else if (nonBillableOnly) { query = query.eq('is_billable', false) }
      const { data, error } = await query
      if (error) { console.error('Error fetching report data:', error) } else if (data) {
        let filtered = data as any[]
        if (selectedClientId) { filtered = filtered.filter(r => r.employees?.client_id === selectedClientId) }
        if (selectedDepartmentId) { filtered = filtered.filter(r => r.employees?.department_id === selectedDepartmentId) }
        setReportData(filtered as ExpenseData[])
      }
    } catch (error) { console.error('Error generating report:', error) }
    finally { setIsLoading(false) }
  }

  const handleExportToExcel = () => {
    if (reportData.length === 0) { alert('No data to export. Please run the report first.'); return }
    const exportData: any[] = []
    if (summaryOnly) {
      const projectGroups: { [key: string]: ExpenseData[] } = {}
      reportData.forEach(expense => { const key = expense.project_id || 'no-project'; if (!projectGroups[key]) { projectGroups[key] = [] }; projectGroups[key].push(expense) })
      Object.values(projectGroups).forEach(expenses => {
        const project = expenses[0].projects
        const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0)
        const reimbursableAmount = expenses.filter(e => e.is_reimbursable).reduce((sum, exp) => sum + exp.amount, 0)
        const billableAmount = expenses.filter(e => e.is_billable).reduce((sum, exp) => sum + exp.amount, 0)
        exportData.push({ 'Project': project ? `${project.name} (${project.code})` : 'No Project Assigned', 'Client': project?.client_name || '', 'Total Expenses': totalAmount.toFixed(2), 'Reimbursable': reimbursableAmount.toFixed(2), 'Billable': billableAmount.toFixed(2), 'Expense Count': expenses.length.toString(), 'Employee Count': new Set(expenses.map(e => e.employee_id)).size.toString() })
      })
    } else {
      reportData.forEach(expense => {
        exportData.push({ 'Project': expense.projects ? `${expense.projects.name} (${expense.projects.code})` : 'No Project', 'Client': expense.projects?.client_name || '', 'Employee': expense.employees ? `${expense.employees.first_name} ${expense.employees.last_name}` : 'Unknown', 'Date': expense.expense_date, 'Category': expense.category, 'Description': expense.description, 'Amount': expense.amount.toFixed(2), 'Payment Method': expense.payment_method || '', 'Reimbursable': expense.is_reimbursable ? 'Yes' : 'No', 'Billable': expense.is_billable ? 'Yes' : 'No', 'Status': expense.status })
      })
    }
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(exportData)
    if (exportData.length > 0) { const colWidths = Object.keys(exportData[0]).map(key => { const maxLength = Math.max(key.length, ...exportData.map((row) => { const v = row[key]; return v ? String(v).length : 0 })); return { wch: Math.min(maxLength + 2, 30) } }); ws['!cols'] = colWidths }
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses by Project')
    XLSX.writeFile(wb, `expenses_by_project_${startDate}_to_${endDate}.xlsx`)
  }

  const totals = reportData.reduce((acc, expense) => { acc.totalAmount += expense.amount; acc.reimbursable += expense.is_reimbursable ? expense.amount : 0; acc.billable += expense.is_billable ? expense.amount : 0; acc.count += 1; return acc }, { totalAmount: 0, reimbursable: 0, billable: 0, count: 0 })
  const uniqueProjects = new Set(reportData.map(e => e.project_id || 'no-project')).size

  if (pageLoading) {
    return (
      <div style={{ padding: '36px 40px' }}>
        <div style={{ height: 24, width: 220, background: '#f5f2ee', borderRadius: 6, marginBottom: 8 }} className="anim-shimmer" />
        <div style={{ height: 13, width: 300, background: '#f5f2ee', borderRadius: 6, marginBottom: 32 }} className="anim-shimmer" />
        <div style={{ background: '#FFFFFF', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '22px 24px' }}>
          {[0,1,2,3,4,5].map(i => (<div key={i} style={{ height: 38, background: '#f5f2ee', borderRadius: 7, marginBottom: 16 }} className="anim-shimmer" />))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '36px 40px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', letterSpacing: -0.3, margin: 0 }}>Expenses by Project</h1>
      <p style={{ fontSize: 13, fontWeight: 400, color: '#999', marginTop: 4, marginBottom: 28 }}>Generate expense reports grouped by project</p>

      <div style={{ background: '#FFFFFF', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '28px 28px' }}>
        <div style={sectionLabel}>Report Parameters</div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 24 }}>
          <div><label style={labelStyle}>Date Start</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} onFocus={focusIn} onBlur={focusOut} /></div>
          <div><label style={labelStyle}>Date Stop</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} onFocus={focusIn} onBlur={focusOut} /></div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16, marginBottom: 24 }}>
          <div><label style={labelStyle}>Project</label><select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} style={selectStyle} onFocus={focusIn} onBlur={focusOut}><option value="-All-">-All-</option>{projectListData.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}</select></div>
          <div><label style={labelStyle}>Expense Type</label><select value={selectedExpenseType} onChange={(e) => setSelectedExpenseType(e.target.value)} style={selectStyle} onFocus={focusIn} onBlur={focusOut}>{expenseTypes.map(t => (<option key={t} value={t}>{t}</option>))}</select></div>
          <div><label style={labelStyle}>Payment Method</label><select value={selectedPaymentMethod} onChange={(e) => setSelectedPaymentMethod(e.target.value)} style={selectStyle} onFocus={focusIn} onBlur={focusOut}>{paymentMethods.map(m => (<option key={m} value={m}>{m}</option>))}</select></div>
        </div>

        <div style={sectionLabel}>Options</div>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8, marginBottom: 24 }}>
          {[
            { label: 'Reimbursable Only', checked: reimbursableOnly, onChange: (v: boolean) => { setReimbursableOnly(v); if (v) setNonReimbursableOnly(false) } },
            { label: 'Non-Reimbursable Only', checked: nonReimbursableOnly, onChange: (v: boolean) => { setNonReimbursableOnly(v); if (v) setReimbursableOnly(false) } },
            { label: 'Billable Only', checked: billableOnly, onChange: (v: boolean) => { setBillableOnly(v); if (v) setNonBillableOnly(false) } },
            { label: 'Non-Billable Only', checked: nonBillableOnly, onChange: (v: boolean) => { setNonBillableOnly(v); if (v) setBillableOnly(false) } },
            { label: 'Include Details', checked: includeDetails, onChange: setIncludeDetails },
            { label: 'Summary Only', checked: summaryOnly, onChange: setSummaryOnly },
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
            {[
              { label: 'Total Expenses', value: `$${totals.totalAmount.toFixed(2)}`, color: '#e31c79' },
              { label: 'Projects', value: String(uniqueProjects), color: '#1a1a1a' },
              { label: 'Reimbursable', value: `$${totals.reimbursable.toFixed(2)}`, color: '#2d9b6e' },
              { label: 'Billable', value: `$${totals.billable.toFixed(2)}`, color: '#1a1a1a' },
              { label: 'Count', value: String(totals.count), color: '#1a1a1a' },
            ].map((card, i) => (
              <div key={i} style={{ background: '#FFFFFF', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '22px 24px' }}>
                <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: 1.2, color: '#c0bab2', marginBottom: 6 }}>{card.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: card.color }}>{card.value}</div>
              </div>
            ))}
          </div>

          {!summaryOnly ? (
            <div style={{ background: '#FFFFFF', border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Project', 'Employee', 'Date', 'Category', 'Description', 'Amount', 'Status'].map(h => (
                      <th key={h} style={{ padding: '11px 20px', fontSize: 9, fontWeight: 500, letterSpacing: 1.2, color: '#c0bab2', textTransform: 'uppercase' as const, borderBottom: '0.5px solid #f0ece7', textAlign: h === 'Amount' ? 'right' : h === 'Status' ? 'center' : 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((expense) => (
                    <tr key={expense.id} style={{ borderBottom: '0.5px solid #f5f2ee' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#FDFCFB')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                      <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a' }}>{expense.projects ? `${expense.projects.name} (${expense.projects.code})` : 'No Project'}</td>
                      <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a' }}>{expense.employees ? `${expense.employees.first_name} ${expense.employees.last_name}` : 'Unknown'}</td>
                      <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a' }}>{new Date(expense.expense_date).toLocaleDateString()}</td>
                      <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a' }}>{expense.category}</td>
                      <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a' }}>{expense.description}</td>
                      <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a', textAlign: 'right', fontWeight: 600 }}>${expense.amount.toFixed(2)}</td>
                      <td style={{ padding: '12px 20px', textAlign: 'center' }}><StatusBadge status={expense.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ background: '#FFFFFF', border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Project', 'Client', 'Total Amount', 'Reimbursable', 'Billable', 'Expenses', 'Employees'].map(h => (
                      <th key={h} style={{ padding: '11px 20px', fontSize: 9, fontWeight: 500, letterSpacing: 1.2, color: '#c0bab2', textTransform: 'uppercase' as const, borderBottom: '0.5px solid #f0ece7', textAlign: ['Total Amount', 'Reimbursable', 'Billable'].includes(h) ? 'right' : ['Expenses', 'Employees'].includes(h) ? 'center' : 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const projectGroups: { [key: string]: ExpenseData[] } = {}
                    reportData.forEach(expense => { const key = expense.project_id || 'no-project'; if (!projectGroups[key]) { projectGroups[key] = [] }; projectGroups[key].push(expense) })
                    return Object.values(projectGroups).map((expenses, index) => {
                      const project = expenses[0].projects
                      const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0)
                      const reimbursableAmount = expenses.filter(e => e.is_reimbursable).reduce((sum, exp) => sum + exp.amount, 0)
                      const billableAmount = expenses.filter(e => e.is_billable).reduce((sum, exp) => sum + exp.amount, 0)
                      const uniqueEmployees = new Set(expenses.map(e => e.employee_id)).size
                      return (
                        <tr key={index} style={{ borderBottom: '0.5px solid #f5f2ee' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#FDFCFB')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                          <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a' }}>{project ? `${project.name} (${project.code})` : 'No Project Assigned'}</td>
                          <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a' }}>{project?.client_name || 'N/A'}</td>
                          <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a', textAlign: 'right', fontWeight: 600 }}>${totalAmount.toFixed(2)}</td>
                          <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#2d9b6e', textAlign: 'right' }}>${reimbursableAmount.toFixed(2)}</td>
                          <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a', textAlign: 'right' }}>${billableAmount.toFixed(2)}</td>
                          <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a', textAlign: 'center' }}>{expenses.length}</td>
                          <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a', textAlign: 'center' }}>{uniqueEmployees}</td>
                        </tr>
                      )
                    })
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
