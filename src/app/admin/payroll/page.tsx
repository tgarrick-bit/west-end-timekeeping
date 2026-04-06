'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAdminFilter } from '@/contexts/AdminFilterContext'
import { useToast } from '@/components/ui/Toast'
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
  Calendar,
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
    client_id?: string
    department_id?: string
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
  const { selectedClientId, selectedDepartmentId } = useAdminFilter()

  const [periods, setPeriods] = useState<PayPeriod[]>([])
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null)
  const [timesheets, setTimesheets] = useState<TimesheetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [approverMap, setApproverMap] = useState<Record<string, string>>({})
  const [generating, setGenerating] = useState(false)
  const { toast } = useToast()

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

  const handleGeneratePayPeriods = async () => {
    setGenerating(true)
    try {
      // Generate from 1 year ago through 3 months ahead
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      const threeMonthsOut = new Date()
      threeMonthsOut.setMonth(threeMonthsOut.getMonth() + 3)

      const res = await fetch('/api/pay-periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          from: oneYearAgo.toISOString().split('T')[0],
          to: threeMonthsOut.toISOString().split('T')[0],
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast('success', `Generated ${data.generated || 0} pay period(s) (past year through next 3 months).`)
        await loadPeriods()
      } else {
        toast('error', data.error || 'Failed to generate pay periods')
      }
    } catch (err) {
      console.error('Error generating pay periods:', err)
      toast('error', 'Error generating pay periods')
    } finally {
      setGenerating(false)
    }
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
          client_id, department_id, hourly_rate, bill_rate, employee_id, employee_type, is_exempt
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

  // Apply admin context filters
  const filteredTimesheets = timesheets.filter(t => {
    if (selectedClientId && t.employee?.client_id !== selectedClientId) return false
    if (selectedDepartmentId && t.employee?.department_id !== selectedDepartmentId) return false
    return true
  })

  // Stats
  const approved = filteredTimesheets.filter(t => t.status === 'approved' || t.status === 'client_approved')
  const finalized = filteredTimesheets.filter(t => t.status === 'payroll_approved')
  const submitted = filteredTimesheets.filter(t => t.status === 'submitted')
  const draft = filteredTimesheets.filter(t => t.status === 'draft')
  const rejected = filteredTimesheets.filter(t => t.status === 'rejected')

  const totalHours = filteredTimesheets.reduce((sum, t) => sum + (t.total_hours || 0), 0)
  const approvedHours = approved.reduce((sum, t) => sum + (t.total_hours || 0), 0)
  const finalizedHours = finalized.reduce((sum, t) => sum + (t.total_hours || 0), 0)

  // Bulk finalize all approved timesheets
  const handleBulkFinalize = async () => {
    if (approved.length === 0) {
      toast('warning', 'No approved timesheets to finalize')
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

    toast(failed === 0 ? 'success' : 'warning', `Finalized: ${success} succeeded, ${failed} failed`)
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
      toast('warning', 'No approved/finalized timesheets to export')
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

  // QuickBooks-compatible CSV export
  const handleQuickBooksExport = () => {
    const exportable = timesheets.filter(t =>
      t.status === 'payroll_approved' || t.status === 'approved' || t.status === 'client_approved'
    )
    if (exportable.length === 0) {
      toast('warning', 'No approved/finalized timesheets to export')
      return
    }

    const rows = exportable.map(t => {
      const emp = t.employee
      const hourlyRate = emp?.hourly_rate || 0
      const isExempt = emp?.is_exempt || false
      const regularHours = isExempt ? (t.total_hours || 0) : Math.min(t.total_hours || 0, 40)
      const otHours = isExempt ? 0 : (t.overtime_hours || Math.max(0, (t.total_hours || 0) - 40))
      const regularPay = regularHours * hourlyRate
      const otPay = otHours * hourlyRate * 1.5
      const totalPay = regularPay + otPay

      return {
        'Employee Name': emp ? `${emp.last_name}, ${emp.first_name}` : '',
        'Employee ID': emp?.employee_id || '',
        'Pay Period Start': selectedPeriod?.start_date || '',
        'Pay Period End': selectedPeriod?.end_date || '',
        'Regular Hours': regularHours.toFixed(2),
        'Overtime Hours': otHours.toFixed(2),
        'Total Hours': (t.total_hours || 0).toFixed(2),
        'Pay Rate': hourlyRate.toFixed(2),
        'Regular Pay': regularPay.toFixed(2),
        'OT Pay': otPay.toFixed(2),
        'Total Pay': totalPay.toFixed(2),
        'Department': emp?.department || '',
        'Project/Job': '',
        'Class': emp?.employee_type || '',
      }
    })

    const headers = Object.keys(rows[0])
    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        headers.map(h => {
          const val = (row as any)[h]
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
            return `"${val.replace(/"/g, '""')}"`
          }
          return val
        }).join(',')
      ),
    ].join('\n')

    const periodLabel = selectedPeriod ? getPeriodLabel(selectedPeriod).replace(/[^a-zA-Z0-9]/g, '_') : 'export'
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `QuickBooks_${periodLabel}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // ADP/Paychex simple format export
  const handleADPExport = () => {
    const exportable = timesheets.filter(t =>
      t.status === 'payroll_approved' || t.status === 'approved' || t.status === 'client_approved'
    )
    if (exportable.length === 0) {
      toast('warning', 'No approved/finalized timesheets to export')
      return
    }

    const rows: any[] = []

    exportable.forEach(t => {
      const emp = t.employee
      const hourlyRate = emp?.hourly_rate || 0
      const isExempt = emp?.is_exempt || false
      const regularHours = isExempt ? (t.total_hours || 0) : Math.min(t.total_hours || 0, 40)
      const otHours = isExempt ? 0 : (t.overtime_hours || Math.max(0, (t.total_hours || 0) - 40))

      // Regular hours row
      if (regularHours > 0) {
        rows.push({
          'Employee ID': emp?.employee_id || '',
          'Hours': regularHours.toFixed(2),
          'Earnings Code': 'REG',
          'Rate': hourlyRate.toFixed(2),
          'Amount': (regularHours * hourlyRate).toFixed(2),
        })
      }

      // OT hours row
      if (otHours > 0) {
        rows.push({
          'Employee ID': emp?.employee_id || '',
          'Hours': otHours.toFixed(2),
          'Earnings Code': 'OT',
          'Rate': (hourlyRate * 1.5).toFixed(2),
          'Amount': (otHours * hourlyRate * 1.5).toFixed(2),
        })
      }
    })

    if (rows.length === 0) {
      toast('warning', 'No hours to export')
      return
    }

    const headers = Object.keys(rows[0])
    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        headers.map(h => (row as any)[h]).join(',')
      ),
    ].join('\n')

    const periodLabel = selectedPeriod ? getPeriodLabel(selectedPeriod).replace(/[^a-zA-Z0-9]/g, '_') : 'export'
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ADP_Paychex_${periodLabel}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Detailed export — one row per timesheet entry per project, with project-specific rates
  const handleDetailedExport = async () => {
    if (!selectedPeriod) return

    const exportable = timesheets.filter(t =>
      t.status === 'payroll_approved' || t.status === 'approved' || t.status === 'client_approved'
    )
    if (exportable.length === 0) {
      toast('warning', 'No approved/finalized timesheets to export')
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
      toast('warning', 'No timesheet entries found')
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

  // Tracker ATS format (replaces SpringAhead export)
  const handleTrackerExport = async () => {
    if (!selectedPeriod) return

    const exportable = timesheets.filter(t =>
      t.status === 'payroll_approved' || t.status === 'approved' || t.status === 'client_approved'
    )
    if (exportable.length === 0) {
      toast('warning', 'No approved/finalized timesheets to export')
      return
    }

    setGenerating(true)
    try {
      const tsIds = exportable.map(t => t.id)
      const { data: entries } = await supabase
        .from('timesheet_entries')
        .select('timesheet_id, date, hours')
        .in('timesheet_id', tsIds)
        .order('date', { ascending: true })

      if (!entries || entries.length === 0) {
        toast('warning', 'No timesheet entries found')
        return
      }

      const tsMap = new Map(exportable.map(t => [t.id, t]))

      const rows = entries.map((entry: any) => {
        const ts = tsMap.get(entry.timesheet_id)
        const emp = ts?.employee
        return {
          'Candidate Last Name': emp?.last_name || '',
          'Candidate First Name': emp?.first_name || '',
          'Regular Hours': (entry.hours || 0).toFixed(2),
          'Date': entry.date,
          'Weekending Date': ts?.week_ending || '',
        }
      })

      const headers = Object.keys(rows[0])
      const csvContent = [
        headers.join(','),
        ...rows.map(row =>
          headers.map(h => {
            const val = (row as any)[h]
            if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
              return `"${val.replace(/"/g, '""')}"`
            }
            return val
          }).join(',')
        ),
      ].join('\n')

      const periodLabel = selectedPeriod ? getPeriodLabel(selectedPeriod).replace(/[^a-zA-Z0-9]/g, '_') : 'export'
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Tracker_ATS_${periodLabel}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } finally {
      setGenerating(false)
    }
  }

  const formatName = (emp: TimesheetRow['employee']) =>
    emp ? `${emp.last_name}, ${emp.first_name}` : 'Unknown'

  const statusBadge = (status: string) => {
    const dotColors: Record<string, string> = {
      payroll_approved: '#2d9b6e',
      client_approved: '#2d9b6e',
      approved: '#2d9b6e',
      submitted: '#c4983a',
      rejected: '#b91c1c',
      draft: '#c0bab2',
    }
    const bgColors: Record<string, string> = {
      payroll_approved: 'rgba(45,155,110,0.08)',
      client_approved: 'rgba(45,155,110,0.08)',
      approved: 'rgba(45,155,110,0.08)',
      submitted: 'rgba(196,152,58,0.08)',
      rejected: 'rgba(185,28,28,0.08)',
      draft: 'rgba(192,186,178,0.08)',
    }
    const textColors: Record<string, string> = {
      payroll_approved: '#2d9b6e',
      client_approved: '#2d9b6e',
      approved: '#2d9b6e',
      submitted: '#c4983a',
      rejected: '#b91c1c',
      draft: '#999',
    }
    return { dot: dotColors[status] || '#c0bab2', bg: bgColors[status] || 'transparent', text: textColors[status] || '#999' }
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

  // Skeleton loading state
  if (loading && timesheets.length === 0) {
    return (
      <div style={{ padding: '36px 40px' }}>
        <div className="mb-6">
          <div className="anim-shimmer" style={{ width: 120, height: 24, borderRadius: 6, marginBottom: 8 }} />
          <div className="anim-shimmer" style={{ width: 320, height: 14, borderRadius: 4 }} />
        </div>

        {/* Period selector skeleton */}
        <div className="anim-slide-up stagger-1" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '20px 22px', marginBottom: 24 }}>
          <div className="anim-shimmer" style={{ width: 280, height: 32, borderRadius: 7 }} />
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[1, 2, 3, 4, 5].map(n => (
            <div key={n} className={`anim-slide-up stagger-${n}`} style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '22px 24px' }}>
              <div className="anim-shimmer" style={{ width: 60, height: 8, borderRadius: 3, marginBottom: 12 }} />
              <div className="anim-shimmer" style={{ width: 50, height: 28, borderRadius: 4 }} />
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="anim-slide-up stagger-6" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '14px 22px', borderBottom: '0.5px solid #f0ece7' }}>
            <div className="anim-shimmer" style={{ width: 200, height: 14, borderRadius: 4 }} />
          </div>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ padding: '12px 20px', borderBottom: '0.5px solid #f5f2ee' }} className="flex items-center gap-6">
              <div className="anim-shimmer" style={{ width: 140, height: 14, borderRadius: 4 }} />
              <div className="anim-shimmer" style={{ width: 80, height: 14, borderRadius: 4 }} />
              <div className="anim-shimmer" style={{ width: 50, height: 14, borderRadius: 4 }} />
              <div className="anim-shimmer" style={{ width: 50, height: 14, borderRadius: 4 }} />
              <div className="anim-shimmer" style={{ width: 60, height: 14, borderRadius: 4 }} />
              <div className="anim-shimmer" style={{ width: 60, height: 18, borderRadius: 3 }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div style={{ padding: '36px 40px' }}>
        {/* Page Header */}
        <div className="mb-6 anim-slide-up stagger-1">
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', letterSpacing: -0.3 }}>Payroll</h1>
          <p style={{ fontSize: 13, fontWeight: 400, color: '#999' }}>Manage pay periods, finalize timesheets, and export payroll data</p>
        </div>

        {/* Period Selector */}
        <div className="anim-slide-up stagger-1" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '20px 22px', marginBottom: 24 }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1.2, color: '#c0bab2' }}>Pay Period</label>
              <select
                value={selectedPeriodId || ''}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                style={{ border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12, padding: '6px 10px' }}
                className="focus:outline-none focus:border-[#d3ad6b] focus:shadow-[0_0_0_3px_rgba(211,173,107,0.08)]"
              >
                {periods.length === 0 && <option value="">No periods generated</option>}
                {periods.map(p => (
                  <option key={p.id} value={p.id!}>
                    {getPeriodLabel(p as PayPeriod)} {p.is_locked ? '🔒' : ''} ({p.status})
                  </option>
                ))}
              </select>
              <button onClick={loadTimesheets} className="p-2 hover:bg-[#FDFCFB] rounded-lg transition-colors" title="Refresh">
                <RefreshCw className="h-4 w-4" style={{ color: '#777' }} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleGeneratePayPeriods}
                disabled={generating}
                className="flex items-center gap-2 disabled:opacity-50 transition-colors"
                style={{ border: '0.5px solid #e0dcd7', borderRadius: 7, fontSize: 12, fontWeight: 600, color: '#777', padding: '8px 18px', background: '#fff', cursor: 'pointer' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d3ad6b'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e0dcd7'; }}
              >
                <Calendar className="h-4 w-4" />
                {generating ? 'Generating...' : 'Generate / Sync Periods'}
              </button>
              {selectedPeriod && (
                <button
                  onClick={handleToggleLock}
                  style={{ border: '0.5px solid #e0dcd7', borderRadius: 7, fontSize: 12, fontWeight: 600, color: '#777', padding: '8px 18px' }}
                  className="flex items-center gap-2 hover:border-[#d3ad6b] transition-colors"
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
          {[
            { label: 'Total', value: filteredTimesheets.length, sub: `${totalHours.toFixed(1)} hrs`, accent: true },
            { label: 'Approved', value: approved.length, sub: `${approvedHours.toFixed(1)} hrs` },
            { label: 'Finalized', value: finalized.length, sub: `${finalizedHours.toFixed(1)} hrs` },
            { label: 'Pending', value: submitted.length, pink: true },
            { label: 'Draft / Rejected', value: draft.length + rejected.length },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={`anim-slide-up stagger-${i + 1} group`}
              style={{
                background: '#fff',
                border: '0.5px solid #e8e4df',
                borderRadius: 10,
                padding: '22px 24px',
                transition: 'border-color 0.15s ease',
                cursor: 'default',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = i === 0 ? '#e31c79' : '#d3ad6b' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e8e4df' }}
            >
              <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1.2, color: '#c0bab2' }}>{stat.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: stat.pink ? '#e31c79' : '#1a1a1a' }}>{stat.value}</div>
              {stat.sub && <div style={{ fontSize: 11, color: '#999' }}>{stat.sub}</div>}
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mb-6 anim-slide-up stagger-3">
          <button
            onClick={handleBulkFinalize}
            disabled={processing || approved.length === 0}
            className="flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ padding: '8px 18px', background: '#e31c79', color: '#fff', borderRadius: 7, fontSize: 12, fontWeight: 600 }}
            onMouseEnter={(e) => { if (!processing && approved.length > 0) { e.currentTarget.style.background = '#cc1069'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#e31c79'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <CheckCircle className="h-4 w-4" />
            Finalize All Approved ({approved.length})
          </button>
          <button
            onClick={handleExport}
            disabled={finalized.length === 0 && approved.length === 0}
            className="flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ padding: '8px 18px', background: '#fff', border: '0.5px solid #e0dcd7', color: '#777', borderRadius: 7, fontSize: 12, fontWeight: 600 }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d3ad6b'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e0dcd7'; }}
          >
            <Download className="h-4 w-4" />
            Export Summary
          </button>
          <button
            onClick={handleDetailedExport}
            disabled={finalized.length === 0 && approved.length === 0}
            className="flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ padding: '8px 18px', background: '#fff', border: '0.5px solid #e0dcd7', color: '#777', borderRadius: 7, fontSize: 12, fontWeight: 600 }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d3ad6b'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e0dcd7'; }}
          >
            <Download className="h-4 w-4" />
            Export Detailed (by entry)
          </button>

          {/* Payroll system exports */}
          <div style={{ width: 1, height: 24, background: '#e8e4df', margin: '0 4px' }} />
          <button
            onClick={handleQuickBooksExport}
            disabled={finalized.length === 0 && approved.length === 0}
            className="flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ padding: '8px 18px', background: '#fff', border: '0.5px solid #e0dcd7', color: '#777', borderRadius: 7, fontSize: 12, fontWeight: 600 }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d3ad6b'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e0dcd7'; }}
          >
            <Download className="h-4 w-4" />
            Export for QuickBooks
          </button>
          <button
            onClick={handleADPExport}
            disabled={finalized.length === 0 && approved.length === 0}
            className="flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ padding: '8px 18px', background: '#fff', border: '0.5px solid #e0dcd7', color: '#777', borderRadius: 7, fontSize: 12, fontWeight: 600 }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d3ad6b'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e0dcd7'; }}
          >
            <Download className="h-4 w-4" />
            Export for ADP/Paychex
          </button>
          <button
            onClick={handleTrackerExport}
            disabled={generating || (finalized.length === 0 && approved.length === 0)}
            className="flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ padding: '8px 18px', background: '#e31c79', border: 'none', color: '#fff', borderRadius: 7, fontSize: 12, fontWeight: 600 }}
            onMouseEnter={(e) => { if (!generating) { e.currentTarget.style.background = '#cc1069'; } }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#e31c79'; }}
          >
            <Download className="h-4 w-4" />
            {generating ? 'Generating...' : 'Export for Tracker ATS'}
          </button>
        </div>

        {/* Timesheets Table */}
        <div className="anim-slide-up stagger-4" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '14px 22px', borderBottom: '0.5px solid #f0ece7' }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>
              Timesheets for {selectedPeriod ? getPeriodLabel(selectedPeriod as PayPeriod) : '\u2014'}
            </h3>
          </div>

          {loading ? (
            <div style={{ padding: '20px' }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ padding: '12px 0', borderBottom: '0.5px solid #f5f2ee' }} className="flex items-center gap-6">
                  <div className="anim-shimmer" style={{ width: 140, height: 14, borderRadius: 4 }} />
                  <div className="anim-shimmer" style={{ width: 80, height: 14, borderRadius: 4 }} />
                  <div className="anim-shimmer" style={{ width: 50, height: 14, borderRadius: 4 }} />
                  <div className="anim-shimmer" style={{ width: 60, height: 18, borderRadius: 3 }} />
                </div>
              ))}
            </div>
          ) : filteredTimesheets.length === 0 ? (
            <div className="p-8 text-center">
              <Clock className="h-8 w-8 mx-auto mb-2" style={{ color: '#c0bab2' }} />
              <p style={{ fontSize: 13, color: '#999' }}>No timesheets found for this pay period.</p>
              <p style={{ fontSize: 11, color: '#c0bab2', marginTop: 4 }}>Timesheets will appear here once employees submit them.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  {['Employee', 'Week Ending', 'Reg Hrs', 'OT Hrs', 'Total', 'Pay', 'Status', 'Approved'].map(h => (
                    <th
                      key={h}
                      className={`${['Reg Hrs', 'OT Hrs', 'Total', 'Pay'].includes(h) ? 'text-right' : h === 'Status' || h === 'Approved' ? 'text-center' : 'text-left'}`}
                      style={{ padding: '11px 20px', fontSize: 9, fontWeight: 500, letterSpacing: 1.2, color: '#c0bab2', textTransform: 'uppercase', borderBottom: '0.5px solid #f0ece7' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTimesheets.map((ts) => {
                  const emp = ts.employee
                  const isExempt = emp?.is_exempt || false
                  const rate = emp?.hourly_rate || 0
                  const regHrs = isExempt ? (ts.total_hours || 0) : Math.min(ts.total_hours || 0, 40)
                  const otHrs = isExempt ? 0 : (ts.overtime_hours || Math.max(0, (ts.total_hours || 0) - 40))
                  const pay = (regHrs * rate) + (otHrs * rate * 1.5)
                  const badge = statusBadge(ts.status)

                  return (
                    <tr key={ts.id} style={{ borderBottom: '0.5px solid #f5f2ee', transition: 'background 0.15s ease' }} className="hover:bg-[#FDFCFB]">
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ fontSize: 12.5, fontWeight: 500, color: '#1a1a1a' }}>{formatName(emp)}</div>
                        <div style={{ fontSize: 10.5, color: '#c0bab2' }}>
                          {emp?.department || ''} {emp?.employee_type ? `\u00b7 ${emp.employee_type}` : ''}
                          {isExempt ? ' \u00b7 Exempt' : ''}
                        </div>
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#555' }}>{ts.week_ending}</td>
                      <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#555', textAlign: 'right' }}>{regHrs.toFixed(2)}</td>
                      <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#555', textAlign: 'right' }}>{otHrs.toFixed(2)}</td>
                      <td style={{ padding: '12px 20px', fontSize: 12.5, fontWeight: 500, color: '#1a1a1a', textAlign: 'right' }}>{(ts.total_hours || 0).toFixed(2)}</td>
                      <td style={{ padding: '12px 20px', fontSize: 12.5, fontWeight: 500, color: '#1a1a1a', textAlign: 'right' }}>${pay.toFixed(2)}</td>
                      <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 9, fontWeight: 500, borderRadius: 3, padding: '2px 8px', background: badge.bg, color: badge.text }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: badge.dot }} />
                          {statusLabel(ts.status)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'center', fontSize: 11, color: '#c0bab2' }}>
                        {ts.approved_by ? approverMap[ts.approved_by] || '\u2014' : '\u2014'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot style={{ borderTop: '0.5px solid #e8e4df' }}>
                <tr>
                  <td style={{ padding: '12px 20px', fontSize: 12.5, fontWeight: 600, color: '#1a1a1a' }}>Totals ({filteredTimesheets.length} timesheets)</td>
                  <td></td>
                  <td style={{ padding: '12px 20px', fontSize: 12.5, fontWeight: 600, textAlign: 'right' }}>
                    {filteredTimesheets.reduce((s, t) => {
                      const isEx = t.employee?.is_exempt || false
                      return s + (isEx ? (t.total_hours || 0) : Math.min(t.total_hours || 0, 40))
                    }, 0).toFixed(2)}
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: 12.5, fontWeight: 600, textAlign: 'right' }}>
                    {filteredTimesheets.reduce((s, t) => {
                      const isEx = t.employee?.is_exempt || false
                      return s + (isEx ? 0 : (t.overtime_hours || Math.max(0, (t.total_hours || 0) - 40)))
                    }, 0).toFixed(2)}
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: 12.5, fontWeight: 600, textAlign: 'right' }}>{totalHours.toFixed(2)}</td>
                  <td style={{ padding: '12px 20px', fontSize: 12.5, fontWeight: 600, textAlign: 'right' }}>
                    ${filteredTimesheets.reduce((s, t) => {
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
