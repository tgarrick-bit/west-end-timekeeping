'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'
import {
  Lock,
  Unlock,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
  Users,
  DollarSign,
  RefreshCw,
  ChevronDown,
} from 'lucide-react'
import { getPeriodLabel, type PayPeriod } from '@/lib/payPeriods'

interface TimesheetRow {
  id: string
  employee_id: string
  week_ending: string
  total_hours: number
  overtime_hours: number
  status: string
  approved_at: string | null
  approved_by: string | null
  payroll_approved_at: string | null
  employee?: {
    first_name: string
    last_name: string
    middle_name?: string
    email: string
    department?: string
    hourly_rate: number
    bill_rate?: number
    employee_id?: string
    employee_type?: string
    is_exempt: boolean
  }
}

export default function PayrollPage() {
  const router = useRouter()
  const supabase = createClient()

  const [periods, setPeriods] = useState<PayPeriod[]>([])
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null)
  const [timesheets, setTimesheets] = useState<TimesheetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [approverMap, setApproverMap] = useState<Record<string, string>>({})

  useEffect(() => {
    loadPeriods()
  }, [])

  useEffect(() => {
    if (selectedPeriodId) loadTimesheets()
  }, [selectedPeriodId])

  const loadPeriods = async () => {
    setLoading(true)
    const res = await fetch('/api/pay-periods')
    const data = await res.json()
    if (data.periods) {
      setPeriods(data.periods)
      // Auto-select current/most recent open period
      const open = data.periods.find((p: PayPeriod) => p.status === 'open')
      if (open) setSelectedPeriodId(open.id!)
      else if (data.periods.length > 0) setSelectedPeriodId(data.periods[0].id!)
    }
    setLoading(false)
  }

  const selectedPeriod = periods.find(p => p.id === selectedPeriodId)

  const loadTimesheets = async () => {
    if (!selectedPeriod) return
    setLoading(true)

    const { data, error } = await supabase
      .from('timesheets')
      .select(`
        *,
        employee:employees!timesheets_employee_id_fkey (
          first_name, last_name, middle_name, email, department,
          hourly_rate, bill_rate, employee_id, employee_type, is_exempt
        )
      `)
      .gte('week_ending', selectedPeriod.start_date)
      .lte('week_ending', selectedPeriod.end_date)
      .order('week_ending', { ascending: true })

    if (!error && data) {
      setTimesheets(data as TimesheetRow[])

      // Resolve approver initials
      const approverIds = [...new Set(data.map((t: any) => t.approved_by).filter(Boolean))]
      if (approverIds.length > 0) {
        const { data: approvers } = await supabase
          .from('employees')
          .select('id, first_name, last_name')
          .in('id', approverIds)
        if (approvers) {
          const map: Record<string, string> = {}
          approvers.forEach(a => {
            map[a.id] = `${(a.first_name || '')[0]}${(a.last_name || '')[0]}`.toUpperCase()
          })
          setApproverMap(map)
        }
      }
    }
    setLoading(false)
  }

  // Stats
  const approved = timesheets.filter(t => t.status === 'approved' || t.status === 'client_approved')
  const finalized = timesheets.filter(t => t.status === 'payroll_approved')
  const submitted = timesheets.filter(t => t.status === 'submitted')
  const draft = timesheets.filter(t => t.status === 'draft')
  const rejected = timesheets.filter(t => t.status === 'rejected')

  const totalHours = timesheets.reduce((sum, t) => sum + (t.total_hours || 0), 0)
  const approvedHours = approved.reduce((sum, t) => sum + (t.total_hours || 0), 0)
  const finalizedHours = finalized.reduce((sum, t) => sum + (t.total_hours || 0), 0)

  // Bulk finalize all approved timesheets
  const handleBulkFinalize = async () => {
    if (approved.length === 0) {
      alert('No approved timesheets to finalize')
      return
    }
    const confirmed = confirm(
      `Finalize ${approved.length} approved timesheet(s) for payroll?\n\n` +
      `Total hours: ${approvedHours.toFixed(2)}\n` +
      `This will lock these timesheets for payroll processing.`
    )
    if (!confirmed) return

    setProcessing(true)
    let success = 0
    let failed = 0

    for (const ts of approved) {
      try {
        const res = await fetch(`/api/timesheets/${ts.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'finalize' }),
        })
        if (res.ok) success++
        else failed++
      } catch {
        failed++
      }
    }

    alert(`Finalized: ${success} succeeded, ${failed} failed`)
    await loadTimesheets()
    setProcessing(false)
  }

  // Lock/unlock period
  const handleToggleLock = async () => {
    if (!selectedPeriod) return
    const action = selectedPeriod.is_locked ? 'unlock' : 'lock'
    const confirmed = confirm(
      action === 'lock'
        ? 'Lock this pay period? No further changes will be allowed.'
        : 'Unlock this pay period? This will allow further changes.'
    )
    if (!confirmed) return

    const res = await fetch('/api/pay-periods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, periodId: selectedPeriod.id }),
    })
    if (res.ok) loadPeriods()
  }

  // Export payroll data
  const handleExport = () => {
    const exportable = timesheets.filter(t =>
      t.status === 'payroll_approved' || t.status === 'approved'
    )
    if (exportable.length === 0) {
      alert('No approved/finalized timesheets to export')
      return
    }

    const rows = exportable.map(t => {
      const emp = t.employee
      const hourlyRate = emp?.hourly_rate || 0
      const billRate = emp?.bill_rate || 0
      const isExempt = emp?.is_exempt || false
      const regularHours = isExempt ? (t.total_hours || 0) : Math.min(t.total_hours || 0, 40)
      const otHours = isExempt ? 0 : (t.overtime_hours || Math.max(0, (t.total_hours || 0) - 40))
      const regularPay = regularHours * hourlyRate
      const otPay = otHours * hourlyRate * 1.5
      const totalPay = regularPay + otPay
      const regularBill = regularHours * billRate
      const otBill = otHours * billRate * 1.5
      const totalBill = regularBill + otBill

      const weekEnd = new Date(t.week_ending + 'T00:00:00')
      const dow = weekEnd.toLocaleDateString('en-US', { weekday: 'long' })
      const monthName = weekEnd.toLocaleDateString('en-US', { month: 'long' })
      const startOfYear = new Date(weekEnd.getFullYear(), 0, 1)
      const daysSince = Math.floor((weekEnd.getTime() - startOfYear.getTime()) / 86400000)
      const weekNum = Math.ceil((daysSince + startOfYear.getDay() + 1) / 7)

      return {
        'Employee': `${emp?.last_name || ''}, ${emp?.first_name || ''}`,
        'Employee ID': emp?.employee_id || '',
        'Email': emp?.email || '',
        'Department': emp?.department || '',
        'Employee Type': emp?.employee_type || '',
        'Exempt': isExempt ? 'Y' : 'N',
        'Week Ending': t.week_ending,
        'DOW': dow,
        'Week #': weekNum,
        'Month': monthName,
        'Regular Hours': regularHours.toFixed(2),
        'OT Hours': otHours.toFixed(2),
        'Total Hours': (t.total_hours || 0).toFixed(2),
        'Type': otHours > 0 ? 'OT' : 'Reg',
        'Pay Rate': `$${hourlyRate.toFixed(2)}`,
        'Regular Pay': `$${regularPay.toFixed(2)}`,
        'OT Pay': `$${otPay.toFixed(2)}`,
        'Total Pay': `$${totalPay.toFixed(2)}`,
        'Bill Rate': `$${billRate.toFixed(2)}`,
        'Regular Bill': `$${regularBill.toFixed(2)}`,
        'OT Bill': `$${otBill.toFixed(2)}`,
        'Total Bill': `$${totalBill.toFixed(2)}`,
        'Status': t.status === 'payroll_approved' ? 'Finalized' : 'Approved',
        'Approved By': t.approved_by ? (approverMap[t.approved_by] || '') : '',
        'Approved At': t.approved_at ? new Date(t.approved_at).toLocaleDateString() : '',
        'Finalized At': t.payroll_approved_at ? new Date(t.payroll_approved_at).toLocaleDateString() : '',
      }
    })

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    const colWidths = Object.keys(rows[0] || {}).map(key => ({
      wch: Math.min(Math.max(key.length, ...rows.map(r => String((r as any)[key]).length)) + 2, 30)
    }))
    ws['!cols'] = colWidths
    XLSX.utils.book_append_sheet(wb, ws, 'Payroll')

    const periodLabel = selectedPeriod ? getPeriodLabel(selectedPeriod).replace(/[^a-zA-Z0-9]/g, '_') : 'export'
    XLSX.writeFile(wb, `Payroll_${periodLabel}.xlsx`)
  }

  // Detailed export — one row per timesheet entry per project, with project-specific rates
  const handleDetailedExport = async () => {
    if (!selectedPeriod) return

    const exportable = timesheets.filter(t =>
      t.status === 'payroll_approved' || t.status === 'approved' || t.status === 'client_approved'
    )
    if (exportable.length === 0) {
      alert('No approved/finalized timesheets to export')
      return
    }

    // Fetch all entries for these timesheets with project info
    const tsIds = exportable.map(t => t.id)
    const { data: entries } = await supabase
      .from('timesheet_entries')
      .select(`
        *,
        project:projects!timesheet_entries_project_id_fkey (
          id, name, code, client_id,
          client:clients (name)
        )
      `)
      .in('timesheet_id', tsIds)
      .order('date', { ascending: true })

    if (!entries || entries.length === 0) {
      alert('No timesheet entries found')
      return
    }

    // Fetch project-specific rates for all employee/project combos
    const empIds = [...new Set(exportable.map(t => t.employee_id))]
    const projIds = [...new Set(entries.map((e: any) => e.project_id).filter(Boolean))]

    let rateMap: Record<string, { pay_rate: number | null; bill_rate: number | null }> = {}
    if (projIds.length > 0 && empIds.length > 0) {
      const { data: assignments } = await supabase
        .from('project_employees')
        .select('employee_id, project_id, pay_rate, bill_rate')
        .in('employee_id', empIds)
        .in('project_id', projIds)

      if (assignments) {
        assignments.forEach((a: any) => {
          rateMap[`${a.employee_id}_${a.project_id}`] = {
            pay_rate: a.pay_rate,
            bill_rate: a.bill_rate,
          }
        })
      }
    }

    // Build the timesheet lookup
    const tsMap = new Map(exportable.map(t => [t.id, t]))

    const rows = entries.map((entry: any) => {
      const ts = tsMap.get(entry.timesheet_id)
      const emp = ts?.employee
      const proj = entry.project
      const entryDate = new Date(entry.date + 'T00:00:00')
      const dow = entryDate.toLocaleDateString('en-US', { weekday: 'short' })

      // Project-specific rate, fallback to employee global rate
      const assignmentKey = `${ts?.employee_id}_${entry.project_id}`
      const assignment = rateMap[assignmentKey]
      const payRate = assignment?.pay_rate || emp?.hourly_rate || 0
      const billRate = assignment?.bill_rate || emp?.bill_rate || 0
      const hours = entry.hours || 0

      return {
        'Employee': emp ? `${emp.last_name}, ${emp.first_name}` : '',
        'Employee ID': emp?.employee_id || '',
        'Employee Type': emp?.employee_type || '',
        'Exempt': emp?.is_exempt ? 'Y' : 'N',
        'Date': entry.date,
        'DOW': dow,
        'Project': proj?.name || '',
        'Project Code': proj?.code || '',
        'Client': proj?.client?.name || '',
        'Hours': hours.toFixed(2),
        'Pay Rate': `$${payRate.toFixed(2)}`,
        'Pay Amount': `$${(hours * payRate).toFixed(2)}`,
        'Bill Rate': `$${billRate.toFixed(2)}`,
        'Bill Amount': `$${(hours * billRate).toFixed(2)}`,
        'Description': entry.description || '',
        'Week Ending': ts?.week_ending || '',
        'Status': ts?.status === 'payroll_approved' ? 'Finalized' : 'Approved',
        'Rate Source': assignment?.pay_rate ? 'Project' : 'Employee Default',
      }
    })

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    const colWidths = Object.keys(rows[0] || {}).map(key => ({
      wch: Math.min(Math.max(key.length, ...rows.map((r: any) => String(r[key]).length)) + 2, 30)
    }))
    ws['!cols'] = colWidths
    XLSX.utils.book_append_sheet(wb, ws, 'Payroll Detail')

    const periodLabel = selectedPeriod ? getPeriodLabel(selectedPeriod).replace(/[^a-zA-Z0-9]/g, '_') : 'export'
    XLSX.writeFile(wb, `Payroll_Detail_${periodLabel}.xlsx`)
  }

  const formatName = (emp: TimesheetRow['employee']) =>
    emp ? `${emp.last_name}, ${emp.first_name}` : 'Unknown'

  const statusBadge = (status: string) => {
    const base = 'inline-flex px-2 py-0.5'
    const radius = 'rounded-[3px]'
    const font = 'text-[9px] font-medium'
    switch (status) {
      case 'payroll_approved': return `${base} ${radius} ${font} bg-emerald-100 text-emerald-800`
      case 'client_approved': return `${base} ${radius} ${font} bg-blue-100 text-blue-800`
      case 'approved': return `${base} ${radius} ${font} bg-green-100 text-green-800`
      case 'submitted': return `${base} ${radius} ${font} bg-yellow-100 text-yellow-800`
      case 'rejected': return `${base} ${radius} ${font} bg-red-100 text-red-800`
      default: return `${base} ${radius} ${font} bg-[#FAFAF8] text-[#1a1a1a]`
    }
  }

  const statusLabel = (status: string) => {
    switch (status) {
      case 'payroll_approved': return 'Finalized'
      case 'client_approved': return 'Client OK'
      case 'approved': return 'Approved'
      case 'submitted': return 'Pending'
      case 'rejected': return 'Rejected'
      default: return 'Draft'
    }
  }

  return (
    <>
      <div style={{ padding: '36px 40px' }}>
        {/* Page Header */}
        <div className="mb-6">
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a' }}>Payroll</h1>
          <p style={{ fontSize: 13, fontWeight: 400, color: '#bbb' }}>Manage pay periods, finalize timesheets, and export payroll data</p>
        </div>

        {/* Period Selector */}
        <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '20px 22px', marginBottom: 24 }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, color: '#c0bab2' }}>Pay Period</label>
              <select
                value={selectedPeriodId || ''}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                style={{ border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12, padding: '6px 10px' }}
                className="focus:outline-none focus:border-[#d3ad6b]"
              >
                {periods.length === 0 && <option value="">No periods generated</option>}
                {periods.map(p => (
                  <option key={p.id} value={p.id!}>
                    {getPeriodLabel(p as PayPeriod)} {p.is_locked ? '🔒' : ''} ({p.status})
                  </option>
                ))}
              </select>
              <button onClick={loadTimesheets} className="p-2 hover:bg-[#FDFCFB] rounded-lg" title="Refresh">
                <RefreshCw className="h-4 w-4" style={{ color: '#777' }} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              {selectedPeriod && (
                <button
                  onClick={handleToggleLock}
                  style={{ border: '0.5px solid #e0dcd7', borderRadius: 7, fontSize: 12, color: '#777', padding: '6px 12px' }}
                  className="flex items-center gap-2 hover:border-[#ccc] hover:text-[#555]"
                >
                  {selectedPeriod.is_locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  {selectedPeriod.is_locked ? 'Unlock Period' : 'Lock Period'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '20px 22px' }}>
            <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, color: '#c0bab2' }}>Total</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a' }}>{timesheets.length}</div>
            <div style={{ fontSize: 11, color: '#999' }}>{totalHours.toFixed(1)} hrs</div>
          </div>
          <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '20px 22px' }}>
            <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, color: '#c0bab2' }}>Approved</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a' }}>{approved.length}</div>
            <div style={{ fontSize: 11, color: '#999' }}>{approvedHours.toFixed(1)} hrs</div>
          </div>
          <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '20px 22px' }}>
            <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, color: '#c0bab2' }}>Finalized</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a' }}>{finalized.length}</div>
            <div style={{ fontSize: 11, color: '#999' }}>{finalizedHours.toFixed(1)} hrs</div>
          </div>
          <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '20px 22px' }}>
            <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, color: '#c0bab2' }}>Pending</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#e31c79' }}>{submitted.length}</div>
          </div>
          <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '20px 22px' }}>
            <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, color: '#c0bab2' }}>Draft / Rejected</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a' }}>{draft.length + rejected.length}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={handleBulkFinalize}
            disabled={processing || approved.length === 0}
            className="flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ padding: '8px 16px', background: '#e31c79', color: '#fff', borderRadius: 7, fontSize: 12, fontWeight: 500 }}
            onMouseEnter={(e) => { if (!processing && approved.length > 0) (e.currentTarget.style.background = '#cc1069'); }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#e31c79'; }}
          >
            <CheckCircle className="h-4 w-4" />
            Finalize All Approved ({approved.length})
          </button>
          <button
            onClick={handleExport}
            disabled={finalized.length === 0 && approved.length === 0}
            className="flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#ccc] hover:text-[#555]"
            style={{ padding: '8px 16px', background: '#fff', border: '0.5px solid #e0dcd7', color: '#777', borderRadius: 7, fontSize: 12, fontWeight: 500 }}
          >
            <Download className="h-4 w-4" />
            Export Summary
          </button>
          <button
            onClick={handleDetailedExport}
            disabled={finalized.length === 0 && approved.length === 0}
            className="flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#ccc] hover:text-[#555]"
            style={{ padding: '8px 16px', background: '#fff', border: '0.5px solid #e0dcd7', color: '#777', borderRadius: 7, fontSize: 12, fontWeight: 500 }}
          >
            <Download className="h-4 w-4" />
            Export Detailed (by entry)
          </button>
        </div>

        {/* Timesheets Table */}
        <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '14px 22px', borderBottom: '0.5px solid #f0ece7' }}>
            <h3 style={{ fontSize: 12, fontWeight: 600 }}>
              Timesheets for {selectedPeriod ? getPeriodLabel(selectedPeriod as PayPeriod) : '—'}
            </h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <svg className="animate-spin" width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <circle cx="11" cy="11" r="8" stroke="rgba(227, 28, 121, 0.15)" strokeWidth="2" />
                  <path d="M19 11a8 8 0 00-8-8" stroke="#e31c79" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <p className="text-[13px]" style={{ color: '#bbb' }}>Loading...</p>
              </div>
            </div>
          ) : timesheets.length === 0 ? (
            <div className="p-8 text-center text-[#999]">
              <Clock className="h-8 w-8 mx-auto mb-2 text-[#bbb]" />
              <p>No timesheets found for this pay period.</p>
              <p className="text-sm mt-1">Timesheets will appear here once employees submit them.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left px-4 py-2" style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase' }}>Employee</th>
                  <th className="text-left px-4 py-2" style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase' }}>Week Ending</th>
                  <th className="text-right px-4 py-2" style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase' }}>Reg Hrs</th>
                  <th className="text-right px-4 py-2" style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase' }}>OT Hrs</th>
                  <th className="text-right px-4 py-2" style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase' }}>Total</th>
                  <th className="text-right px-4 py-2" style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase' }}>Pay</th>
                  <th className="text-center px-4 py-2" style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase' }}>Status</th>
                  <th className="text-center px-4 py-2" style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase' }}>Approved</th>
                </tr>
              </thead>
              <tbody>
                {timesheets.map((ts, i) => {
                  const emp = ts.employee
                  const isExempt = emp?.is_exempt || false
                  const rate = emp?.hourly_rate || 0
                  const regHrs = isExempt ? (ts.total_hours || 0) : Math.min(ts.total_hours || 0, 40)
                  const otHrs = isExempt ? 0 : (ts.overtime_hours || Math.max(0, (ts.total_hours || 0) - 40))
                  const pay = (regHrs * rate) + (otHrs * rate * 1.5)

                  return (
                    <tr key={ts.id} style={{ borderBottom: '0.5px solid #f5f2ee' }} className="hover:bg-[#FDFCFB]">
                      <td className="px-4 py-2" style={{ fontSize: 12.5, color: '#555' }}>
                        <div style={{ fontWeight: 500, color: '#1a1a1a' }}>{formatName(emp)}</div>
                        <div style={{ fontSize: 11, color: '#999' }}>
                          {emp?.department || ''} {emp?.employee_type ? `· ${emp.employee_type}` : ''}
                          {isExempt ? ' · Exempt' : ''}
                        </div>
                      </td>
                      <td className="px-4 py-2" style={{ fontSize: 12.5, color: '#555' }}>{ts.week_ending}</td>
                      <td className="px-4 py-2 text-right" style={{ fontSize: 12.5, color: '#555' }}>{regHrs.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right" style={{ fontSize: 12.5, color: '#555' }}>{otHrs.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right" style={{ fontSize: 12.5, fontWeight: 500, color: '#1a1a1a' }}>{(ts.total_hours || 0).toFixed(2)}</td>
                      <td className="px-4 py-2 text-right" style={{ fontSize: 12.5, fontWeight: 500, color: '#1a1a1a' }}>${pay.toFixed(2)}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={statusBadge(ts.status)}>{statusLabel(ts.status)}</span>
                      </td>
                      <td className="px-4 py-2 text-center text-xs text-[#999]">
                        {ts.approved_by ? approverMap[ts.approved_by] || '—' : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot style={{ borderTop: '0.5px solid #e8e4df' }}>
                <tr style={{ fontWeight: 600, fontSize: 12.5 }}>
                  <td className="px-4 py-2 text-[#1a1a1a]">Totals ({timesheets.length} timesheets)</td>
                  <td></td>
                  <td className="px-4 py-2 text-right">
                    {timesheets.reduce((s, t) => {
                      const isEx = t.employee?.is_exempt || false
                      return s + (isEx ? (t.total_hours || 0) : Math.min(t.total_hours || 0, 40))
                    }, 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {timesheets.reduce((s, t) => {
                      const isEx = t.employee?.is_exempt || false
                      return s + (isEx ? 0 : (t.overtime_hours || Math.max(0, (t.total_hours || 0) - 40)))
                    }, 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right">{totalHours.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right">
                    ${timesheets.reduce((s, t) => {
                      const emp = t.employee
                      const rate = emp?.hourly_rate || 0
                      const isEx = emp?.is_exempt || false
                      const reg = isEx ? (t.total_hours || 0) : Math.min(t.total_hours || 0, 40)
                      const ot = isEx ? 0 : (t.overtime_hours || Math.max(0, (t.total_hours || 0) - 40))
                      return s + (reg * rate) + (ot * rate * 1.5)
                    }, 0).toFixed(2)}
                  </td>
                  <td></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
