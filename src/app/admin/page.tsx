'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { useAdminFilter } from '@/contexts/AdminFilterContext'
import TimesheetModal from '@/components/TimesheetModal'
import { AppShell } from '@/components/layout'
import { SkeletonStats, SkeletonList } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import ConfirmModal from '@/components/ui/ConfirmModal'
import {
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  Settings,
  RotateCw,
  Users,
  Building2,
  Briefcase,
  DollarSign,
  BarChart3,
  Eye,
  Send,
  Bell,
  ArrowUpDown,
  Search,
} from 'lucide-react'
// NotificationBell is now in the sidebar

// Shared helper for names: "Last, First Middle" by default
function formatName(
  first?: string,
  middle?: string,
  last?: string,
  style: 'lastFirst' | 'firstLast' = 'lastFirst'
) {
  const safeFirst = first?.trim() || ''
  const safeMiddle = middle?.trim() || ''
  const safeLast = last?.trim() || ''

  if (style === 'firstLast') {
    // "First Middle Last"
    return [safeFirst, safeMiddle, safeLast].filter(Boolean).join(' ')
  }

  // Default: "Last, First Middle"
  const firstPart = [safeFirst, safeMiddle].filter(Boolean).join(' ')
  if (!safeLast) return firstPart || ''
  if (!firstPart) return safeLast
  return `${safeLast}, ${firstPart}`
}

interface Employee {
  id: string
  first_name: string
  middle_name?: string
  last_name: string
  email: string
  employee_id: string
  department: string | null
  client_id: string | null
  department_id: string | null
  hourly_rate: number
  bill_rate: number | null
  manager_id: string | null
  role: string               // 'employee' | 'manager' | 'admin'
  is_active?: boolean
}

interface Timesheet {
  id: string
  employee_id: string
  week_ending: string
  total_hours: number
  overtime_hours: number
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  submitted_at: string | null
  approved_at: string | null
  approved_by: string | null
  comments: string | null
  rejection_reason?: string | null
  created_at: string
  updated_at: string
}

interface Expense {
  id: string
  employee_id: string
  expense_date: string
  amount: number
  category: string
  description: string | null
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  submitted_at: string | null
  approved_at: string | null
  approved_by: string | null
  rejection_reason: string | null
}

type Submission = {
  id: string
  type: 'timesheet' | 'expense'
  employee?: Employee
  date: string
  amount: number
  hours?: number
  status: string
  description?: string
  category?: string
  overtime_hours?: number
  week_range?: string
  rejection_reason?: string | null
}

export default function AdminPage() {
  const router = useRouter()
  const { employee } = useAuth()
  const supabase = createClient()
  const { selectedClientId: ctxClientId, selectedDepartmentId: ctxDepartmentId } = useAdminFilter()

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('submitted')
  const [adminId, setAdminId] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'all' | 'approved' | 'pending' | 'rejected' | 'unsubmitted'>('pending')
  const [managerFilter, setManagerFilter] = useState<string>('all')
  const [employeeFilter, setEmployeeFilter] = useState<string>('all')
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [clientsList, setClientsList] = useState<{id: string, name: string}[]>([])
  const [projectClientMap, setProjectClientMap] = useState<Record<string, string>>({})
  const [employeeClientMap, setEmployeeClientMap] = useState<Record<string, string>>({})

  // Missing timesheet detection
  const [missingEmployees, setMissingEmployees] = useState<Employee[]>([])

  // Modal state
  const [selectedTimesheet, setSelectedTimesheet] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [selectedExpense, setSelectedExpense] = useState<any>(null)
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)

  // CARD-LEVEL FILTERS & SORTS (manager-style)
  const [timesheetEmployeeFilter, setTimesheetEmployeeFilter] = useState<string>('all')
  const [timesheetWeekFilter, setTimesheetWeekFilter] = useState<string>('all')
  const [timesheetStatusCardFilter, setTimesheetStatusCardFilter] = useState<string>('all')

  const [timesheetEmployeeSort, setTimesheetEmployeeSort] = useState<'asc' | 'desc' | null>(null)
  const [timesheetWeekSort, setTimesheetWeekSort] = useState<'asc' | 'desc' | null>(null)

  const [expenseEmployeeSort, setExpenseEmployeeSort] = useState<'asc' | 'desc' | null>(null)
  const [expenseDateSort, setExpenseDateSort] = useState<'asc' | 'desc' | null>(null)

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean
    title: string
    message: string
    confirmLabel?: string
    variant?: 'danger' | 'primary'
    inputLabel?: string
    inputPlaceholder?: string
    inputRequired?: boolean
    onConfirm: (inputValue?: string) => void
  }>({ open: false, title: '', message: '', onConfirm: () => {} })

  // Bulk progress
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null)

  const { toast } = useToast()

  useEffect(() => {
    checkAdminAndLoad()
  }, [])

  useEffect(() => {
    if (adminId) {
      loadSubmissions()
    }
  }, [adminId, statusFilter, activeTab])

  const checkAdminAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: adminData } = await supabase
        .from('employees')
        .select('*')
        .eq('id', user.id)
        .single()

      if (adminData?.role !== 'admin') {
        if (adminData?.role === 'manager') {
          router.push('/manager')
        } else {
          router.push('/employee')
        }
        return
      }
      
      setAdminId(user.id)

      // Load clients + project-client mapping for client filter
      const { data: clientsData } = await supabase.from('clients').select('id, name').eq('is_active', true).order('name')
      if (clientsData) setClientsList(clientsData)

      const { data: projectsData } = await supabase.from('projects').select('id, client_id')
      if (projectsData) {
        const pcMap: Record<string, string> = {}
        projectsData.forEach(p => { if (p.client_id) pcMap[p.id] = p.client_id })
        setProjectClientMap(pcMap)
      }
    }
  }

  const loadSubmissions = async () => {
    if (!adminId) return
    
    setIsLoading(true)
    
    try {
      const { data: allEmployees } = await supabase
        .from('employees')
        .select('*')
        .order('last_name', { ascending: true })
  
      if (allEmployees) {
        setEmployees(allEmployees as Employee[])
        const employeeIds = (allEmployees as Employee[]).map(e => e.id)
        
        let allSubmissions: Submission[] = []
  
        const { data: timesheets } = await supabase
          .from('timesheets')
          .select('*')
          .in('employee_id', employeeIds)
  
        if (timesheets) {
          const timesheetSubmissions = (timesheets as any[]).map(t => {
            const weekEnd = new Date(t.week_ending)
            const weekStart = new Date(weekEnd)
            weekStart.setDate(weekStart.getDate() - 6)
            
            const formatDate = (date: Date) => {
              const month = date.toLocaleDateString('en-US', { month: 'short' })
              const day = date.getDate().toString().padStart(2, '0')
              return `${month} ${day}`
            }
            
            return {
              id: t.id,
              type: 'timesheet' as const,
              employee: (allEmployees as Employee[]).find(e => e.id === t.employee_id),
              date: t.week_ending,
              amount: (t.total_hours || 0) * ((allEmployees as Employee[]).find(e => e.id === t.employee_id)?.hourly_rate || 0),
              hours: t.total_hours,
              overtime_hours: t.overtime_hours,
              status: t.status,
              week_range: `${formatDate(weekStart)} - ${formatDate(weekEnd)}, ${weekEnd.getFullYear()}`,
              description: `Week ending ${weekEnd.toLocaleDateString()}`,
              rejection_reason: t.rejection_reason || t.comments
            }
          })
          allSubmissions = [...allSubmissions, ...timesheetSubmissions]
        }
  
        const { data: expenses } = await supabase
          .from('expenses')
          .select('*')
          .in('employee_id', employeeIds)
  
        if (expenses) {
          const expenseSubmissions = (expenses as any[]).map(e => ({
            id: e.id,
            type: 'expense' as const,
            employee: (allEmployees as Employee[]).find(emp => emp.id === e.employee_id),
            date: e.expense_date,
            amount: e.amount,
            status: e.status,
            description: e.description,
            category: e.category,
            rejection_reason: e.rejection_reason
          }))
          allSubmissions = [...allSubmissions, ...expenseSubmissions]
        }

        // Keep submissions sorted by date (latest first) for raw list
        allSubmissions.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )
  
        setSubmissions(allSubmissions)

        // Detect missing timesheets for current week
        const now = new Date()
        const dayOfWeek = now.getDay()
        const currentSaturday = new Date(now)
        currentSaturday.setDate(now.getDate() + (6 - dayOfWeek))
        const weekEnding = currentSaturday.toISOString().split('T')[0]

        const activeEmployees = (allEmployees as Employee[]).filter(e =>
          e.is_active !== false && e.role === 'employee'
        )
        const employeesWithTimesheets = new Set(
          allSubmissions
            .filter(s => s.type === 'timesheet' && s.date?.split('T')[0] === weekEnding)
            .map(s => s.employee?.id)
            .filter(Boolean)
        )
        const missing = activeEmployees.filter(e => !employeesWithTimesheets.has(e.id))
        setMissingEmployees(missing)
      }
    } catch (error) {
      console.error('Error loading submissions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getPendingByManager = () => {
    const pendingByManager = new Map<string, {
      managerId: string,
      managerName: string,
      managerEmail: string,
      count: number,
      submissions: Submission[],
      totalHours: number,
      oldestPending: string
    }>()
    
    submissions
      .filter(s => s.type === 'timesheet' && s.status === 'submitted')
      .forEach(submission => {
        if (!submission.employee) return
        
        const managerId = submission.employee.manager_id || 'unassigned'
        
        if (managerId === 'unassigned') {
          if (!pendingByManager.has('unassigned')) {
            pendingByManager.set('unassigned', {
              managerId: 'unassigned',
              managerName: 'Unassigned (No Manager)',
              managerEmail: '',
              count: 0,
              submissions: [],
              totalHours: 0,
              oldestPending: submission.date
            })
          }
        } else {
          const manager = employees.find(e => e.id === managerId)
          if (!manager) return
          
          if (!pendingByManager.has(managerId)) {
            pendingByManager.set(managerId, {
              managerId,
              managerName: formatName(manager.first_name, manager.middle_name, manager.last_name),
              managerEmail: manager.email,
              count: 0,
              submissions: [],
              totalHours: 0,
              oldestPending: submission.date
            })
          }
        }
        
        const key = managerId === 'unassigned' ? 'unassigned' : managerId
        const data = pendingByManager.get(key)!
        data.count++
        data.submissions.push(submission)
        data.totalHours += submission.hours || 0
        
        if (new Date(submission.date) < new Date(data.oldestPending)) {
          data.oldestPending = submission.date
        }
      })
    
    return pendingByManager
  }

  const handleSendSubmittalReminder = async (submission: Submission) => {
    if (!submission.employee) return

    const empName = formatName(
      submission.employee.first_name,
      submission.employee.middle_name,
      submission.employee.last_name,
      'firstLast'
    )

    setConfirmModal({
      open: true,
      title: 'Send Reminder',
      message: `Send reminder to ${empName} for unsubmitted timecard?`,
      confirmLabel: 'Send',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, open: false }))
        try {
          const response = await fetch('/api/notifications/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'timecard_reminder',
              recipient_id: submission.employee!.id,
              recipient_email: submission.employee!.email,
              data: {
                week_ending: submission.date,
                employee_name: empName,
                status: 'unsubmitted'
              }
            })
          })

          if (response.ok) {
            toast('success', 'Reminder sent successfully!')
          } else {
            toast('error', 'Failed to send reminder')
          }
        } catch (error) {
          console.error('Error sending reminder:', error)
          toast('error', 'Error sending reminder')
        }
      }
    })
  }

  const handleSendApprovalReminder = async (managerId: string, managerName: string, pendingSubmissions: Submission[]) => {
    const manager = employees.find(e => e.id === managerId)
    if (!manager) {
      toast('error', 'Manager not found')
      return
    }

    const pendingDetails = pendingSubmissions.map(s => ({
      employee: formatName(
        s.employee?.first_name,
        s.employee?.middle_name,
        s.employee?.last_name,
        'firstLast'
      ),
      week: s.week_range?.split(',')[0] || s.date
    }))

    const detailsList = pendingDetails
      .slice(0, 5)
      .map(d => `• ${d.employee} - ${d.week}`)
      .join('\n')
    
    const summaryText = `Send approval reminder to ${managerName} for ${pendingSubmissions.length} pending timecard(s)?`

    setConfirmModal({
      open: true,
      title: 'Send Approval Reminder',
      message: summaryText,
      confirmLabel: 'Send',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, open: false }))
        try {
          const response = await fetch('/api/notifications/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'approval_reminder',
              recipient_id: managerId,
              recipient_email: manager.email,
              data: {
                manager_name: managerName,
                pending_count: pendingSubmissions.length,
                pending_details: pendingDetails,
                status: 'pending_approval'
              }
            })
          })

          if (response.ok) {
            toast('success', `Reminder sent successfully to ${managerName}!`)
          } else {
            toast('error', 'Failed to send reminder')
          }
        } catch (error) {
          console.error('Error sending reminder:', error)
          toast('error', 'Error sending reminder')
        }
      }
    })
  }

  const handleBulkSubmittalReminders = async () => {
    const unsubmittedWithEmployees = submissions.filter(
      s => s.type === 'timesheet' && s.status === 'draft' && s.employee
    )
    
    if (unsubmittedWithEmployees.length === 0) {
      toast('info', 'No unsubmitted timecards to send reminders for')
      return
    }
    
    setConfirmModal({
      open: true,
      title: 'Send Bulk Reminders',
      message: `Send reminders to ${unsubmittedWithEmployees.length} employees for unsubmitted timecards?`,
      confirmLabel: 'Send All',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, open: false }))
        let sent = 0
        let failed = 0

        for (let i = 0; i < unsubmittedWithEmployees.length; i++) {
          const sub = unsubmittedWithEmployees[i]
          setBulkProgress({ current: i + 1, total: unsubmittedWithEmployees.length })
          try {
            const response = await fetch('/api/notifications/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'timecard_reminder',
                recipient_id: sub.employee!.id,
                recipient_email: sub.employee!.email,
                data: {
                  week_ending: sub.date,
                  employee_name: formatName(
                    sub.employee!.first_name,
                    sub.employee!.middle_name,
                    sub.employee!.last_name,
                    'firstLast'
                  ),
                  status: 'unsubmitted'
                }
              })
            })
            if (response.ok) sent++
            else failed++
          } catch {
            failed++
          }
        }
        setBulkProgress(null)
        if (failed === 0) toast('success', `All ${sent} reminders sent.`)
        else toast('warning', `Sent ${sent}, failed ${failed}.`)
      }
    })
  }

  const handleViewTimesheet = async (submission: Submission) => {
    if (submission.type !== 'timesheet') return
    
    try {
      setProcessingId(submission.id)
      
      const { data: timesheetData, error: timesheetError } = await supabase
        .from('timesheets')
        .select(`
          *,
          employee:employees!timesheets_employee_id_fkey (
            id,
            first_name,
            middle_name,
            last_name,
            email,
            department,
            hourly_rate
          )
        `)
        .eq('id', submission.id)
        .single()

      if (timesheetError) throw timesheetError

      const { data: entries, error: entriesError } = await supabase
        .from('timesheet_entries')
        .select(`
          *,
          project:projects!timesheet_entries_project_id_fkey (
            id,
            name,
            code
          )
        `)
        .eq('timesheet_id', submission.id)
        .order('date', { ascending: true })
      
      if (entriesError) throw entriesError

      const totalHours = timesheetData.total_hours || 0
      const overtimeHours = timesheetData.overtime_hours ?? Math.max(0, totalHours - 40)

      const timesheetWithDetails = {
        ...timesheetData,
        total_hours: totalHours,
        overtime_hours: overtimeHours,
        entries: entries || []
      }

      setSelectedTimesheet(timesheetWithDetails)
      setIsModalOpen(true)
    } catch (error) {
      console.error('Error fetching timesheet details:', error)
    } finally {
      setProcessingId(null)
    }
  }

  const handleViewExpense = async (submission: Submission) => {
    if (submission.type !== 'expense') return
  
    try {
      setProcessingId(submission.id)
  
      const { data: expenseData, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', submission.id)
        .single()
  
      if (error) throw error
  
      setSelectedExpense({
        ...expenseData,
        employee: submission.employee,
      })
      setIsExpenseModalOpen(true)
    } catch (err) {
      console.error('Error loading expense details:', err)
    } finally {
      setProcessingId(null)
    }
  }  

  const handleApprove = async (submission: Submission) => {
    try {
      if (submission.type === 'timesheet') {
        const res = await fetch(`/api/timesheets/${submission.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'approve' }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to approve timesheet')
        }
      } else {
        const res = await fetch(`/api/expense-reports/${submission.id}/finalize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'approve' }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to approve expense')
        }
      }

      loadSubmissions()

      if (selectedTimesheet?.id === submission.id) {
        setIsModalOpen(false)
        setSelectedTimesheet(null)
      }
      if (selectedExpense?.id === submission.id) {
        setIsExpenseModalOpen(false)
        setSelectedExpense(null)
      }
      toast('success', `${submission.type === 'timesheet' ? 'Timesheet' : 'Expense'} approved.`)
    } catch (error: any) {
      console.error('Error approving:', error)
      toast('error', error?.message || 'Error approving submission')
    }
  }

  const handleReject = async (submission: Submission, reason?: string) => {
    if (!reason || !reason.trim()) return

    try {
      if (submission.type === 'timesheet') {
        const res = await fetch(`/api/timesheets/${submission.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reject', rejectionReason: reason.trim() }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to reject timesheet')
        }
      } else {
        const res = await fetch(`/api/expense-reports/${submission.id}/finalize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reject', reason: reason.trim() }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to reject expense')
        }
      }

      loadSubmissions()

      if (selectedTimesheet?.id === submission.id) {
        setIsModalOpen(false)
        setSelectedTimesheet(null)
      }
      if (selectedExpense?.id === submission.id) {
        setIsExpenseModalOpen(false)
        setSelectedExpense(null)
      }
      toast('success', `${submission.type === 'timesheet' ? 'Timesheet' : 'Expense'} rejected.`)
    } catch (error: any) {
      console.error('Error rejecting:', error)
      toast('error', error?.message || 'Error rejecting submission')
    }
  }

  const promptReject = (submission: Submission) => {
    setConfirmModal({
      open: true,
      title: `Reject ${submission.type === 'timesheet' ? 'Timesheet' : 'Expense'}`,
      message: 'Please provide a reason for rejection. This will be visible to the employee.',
      confirmLabel: 'Reject',
      variant: 'danger',
      inputLabel: 'Rejection Reason',
      inputPlaceholder: 'Enter the reason for rejection...',
      inputRequired: true,
      onConfirm: async (reason) => {
        setConfirmModal(prev => ({ ...prev, open: false }))
        await handleReject(submission, reason)
      }
    })
  }

  const handleModalApprove = async () => {
    if (!selectedTimesheet) return
    
    const submission = submissions.find(s => s.id === selectedTimesheet.id)
    if (submission) {
      await handleApprove(submission)
    }
  }

  const handleModalReject = async () => {
    if (!selectedTimesheet) return

    const submission = submissions.find(s => s.id === selectedTimesheet.id)
    if (submission) {
      promptReject(submission)
    }
  }

  const handleBulkApprove = async () => {
    const items = Array.from(selectedItems)
    const toApprove = items.map(id => submissions.find(s => s.id === id)).filter(s => s && s.status === 'submitted') as Submission[]

    if (toApprove.length === 0) {
      toast('info', 'No pending items selected.')
      return
    }

    for (let i = 0; i < toApprove.length; i++) {
      setBulkProgress({ current: i + 1, total: toApprove.length })
      await handleApprove(toApprove[i])
    }
    setBulkProgress(null)
    setSelectedItems(new Set())
  }

  const handleFinalizeForPayroll = async (submission: Submission) => {
    if (submission.type !== 'timesheet') return

    const empName = formatName(submission.employee?.first_name, submission.employee?.middle_name, submission.employee?.last_name, 'firstLast')

    setConfirmModal({
      open: true,
      title: 'Finalize for Payroll',
      message: `Finalize this timesheet for payroll processing?\n\nEmployee: ${empName}\nWeek: ${submission.week_range}\nHours: ${submission.hours?.toFixed(2)}`,
      confirmLabel: 'Finalize',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, open: false }))
        try {
          const res = await fetch(`/api/timesheets/${submission.id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'finalize' }),
          })
          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data.error || 'Failed to finalize timesheet')
          }
          toast('success', 'Timesheet finalized for payroll.')
          loadSubmissions()
        } catch (error: any) {
          console.error('Error finalizing:', error)
          toast('error', error?.message || 'Error finalizing timesheet for payroll')
        }
      }
    })
  }

  const toggleItemSelection = (id: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
  }

  const selectAllVisible = () => {
    const visibleIds = new Set(
      submissions
        .filter(s => s.type === 'timesheet' && s.status === 'submitted')
        .map(s => s.id)
    )
    setSelectedItems(visibleIds)
  }

  // SUMMARY COUNTS
  const allTimesheetsCount = submissions.filter(s => s.type === 'timesheet').length
  const timesheetPendingCount = submissions.filter(s => s.status === 'submitted' && s.type === 'timesheet').length
  const expensePendingCount = submissions.filter(s => s.status === 'submitted' && s.type === 'expense').length
  const approvedCount = submissions.filter(s => s.status === 'approved').length
  const approvedTimesheetCount = submissions.filter(s => s.status === 'approved' && s.type === 'timesheet').length
  const approvedExpenseCount = submissions.filter(s => s.status === 'approved' && s.type === 'expense').length
  const draftTimesheetCount = submissions.filter(s => s.status === 'draft' && s.type === 'timesheet').length
  const draftExpenseCount = submissions.filter(s => s.status === 'draft' && s.type === 'expense').length
  const rejectedTimesheetCount = submissions.filter(s => s.status === 'rejected' && s.type === 'timesheet').length
  const rejectedExpenseCount = submissions.filter(s => s.status === 'rejected' && s.type === 'expense').length

  // FILTERED SUBMISSIONS (tabs + top filters + search)
  const filteredSubmissions = (() => {
    let filtered = submissions

    // Search by employee name/email/category/description/week
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(s => {
        const emp = s.employee
        const nameFirstLast = formatName(emp?.first_name, emp?.middle_name, emp?.last_name, 'firstLast').toLowerCase()
        const email = emp?.email?.toLowerCase() || ''
        const cat = (s.category || '').toLowerCase()
        const desc = (s.description || '').toLowerCase()
        const week = (s.week_range || '').toLowerCase()
        return (
          nameFirstLast.includes(term) ||
          email.includes(term) ||
          cat.includes(term) ||
          desc.includes(term) ||
          week.includes(term)
        )
      })
    }
  
    if (activeTab === 'all') filtered = filtered
    else if (activeTab === 'approved') filtered = filtered.filter(s => s.status === 'approved')
    else if (activeTab === 'pending') filtered = filtered.filter(s => s.status === 'submitted')
    else if (activeTab === 'rejected') filtered = filtered.filter(s => s.status === 'rejected')
    else if (activeTab === 'unsubmitted') filtered = filtered.filter(s => s.status === 'draft')
  
    if (managerFilter && managerFilter !== 'all') {
      filtered = filtered.filter(s => s.employee?.manager_id === managerFilter)
    }
  
    if (employeeFilter && employeeFilter !== 'all') {
      filtered = filtered.filter(s => s.employee?.id === employeeFilter)
    }

    if (clientFilter && clientFilter !== 'all') {
      filtered = filtered.filter(s => {
        // Check employee's direct client assignment
        if ((s.employee as any)?.client_id === clientFilter) return true
        return false
      })
    }

    // Apply admin context filters (from AdminNav bar)
    if (ctxClientId) {
      filtered = filtered.filter(s => s.employee?.client_id === ctxClientId)
    }
    if (ctxDepartmentId) {
      filtered = filtered.filter(s => s.employee?.department_id === ctxDepartmentId)
    }

    return filtered
  })()

  const pendingTimesheets = filteredSubmissions.filter(
    s => s.type === 'timesheet' && s.status === 'submitted'
  )
  const pendingExpenses = filteredSubmissions.filter(
    s => s.type === 'expense' && s.status === 'submitted'
  )  

  // CARD-LEVEL BASE DATA (respect top filters + search)
  const baseCardSubmissions = (() => {
    let filtered = submissions

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(s => {
        const emp = s.employee
        const nameFirstLast = formatName(emp?.first_name, emp?.middle_name, emp?.last_name, 'firstLast').toLowerCase()
        const email = emp?.email?.toLowerCase() || ''
        const cat = (s.category || '').toLowerCase()
        const desc = (s.description || '').toLowerCase()
        const week = (s.week_range || '').toLowerCase()
        return (
          nameFirstLast.includes(term) ||
          email.includes(term) ||
          cat.includes(term) ||
          desc.includes(term) ||
          week.includes(term)
        )
      })
    }

    if (managerFilter && managerFilter !== 'all') {
      filtered = filtered.filter(s => s.employee?.manager_id === managerFilter)
    }
    if (employeeFilter && employeeFilter !== 'all') {
      filtered = filtered.filter(s => s.employee?.id === employeeFilter)
    }
    if (clientFilter && clientFilter !== 'all') {
      filtered = filtered.filter(s => (s.employee as any)?.client_id === clientFilter)
    }
    // Apply admin context filters (from AdminNav bar)
    if (ctxClientId) {
      filtered = filtered.filter(s => s.employee?.client_id === ctxClientId)
    }
    if (ctxDepartmentId) {
      filtered = filtered.filter(s => s.employee?.department_id === ctxDepartmentId)
    }
    return filtered
  })()

  const allTimesheetSubmissions = baseCardSubmissions.filter(s => s.type === 'timesheet')
  const allExpenseSubmissions = baseCardSubmissions.filter(s => s.type === 'expense')

  // options for in-card filters (alpha by name)
  const timesheetEmployeeOptions: Employee[] = Array.from(
    new Map(
      allTimesheetSubmissions
        .filter(s => s.employee)
        .map(s => [s.employee!.id, s.employee!])
    ).values()
  ).sort((a, b) =>
    formatName(a.first_name, a.middle_name, a.last_name).localeCompare(
      formatName(b.first_name, b.middle_name, b.last_name)
    )
  )

  const weekOptions: string[] = Array.from(
    new Set(
      allTimesheetSubmissions
        .map(s => s.week_range)
        .filter(Boolean)
    )
  ) as string[]

  const statusOptions = ['submitted', 'approved', 'rejected', 'draft']

  // visible timesheets for cards (filter + sort)
  const visibleTimesheetsAllTab = allTimesheetSubmissions
    .filter(s => {
      if (timesheetEmployeeFilter !== 'all' && s.employee?.id !== timesheetEmployeeFilter) return false
      if (timesheetWeekFilter !== 'all' && s.week_range !== timesheetWeekFilter) return false
      if (timesheetStatusCardFilter !== 'all' && s.status !== timesheetStatusCardFilter) return false
      return true
    })
    .sort((a, b) => {
      const nameA = formatName(a.employee?.first_name, a.employee?.middle_name, a.employee?.last_name)
      const nameB = formatName(b.employee?.first_name, b.employee?.middle_name, b.employee?.last_name)

      if (timesheetEmployeeSort) {
        const cmp = nameA.localeCompare(nameB)
        return timesheetEmployeeSort === 'asc' ? cmp : -cmp
      }
      if (timesheetWeekSort) {
        const aWeek = a.week_range || ''
        const bWeek = b.week_range || ''
        const cmp = aWeek.localeCompare(bWeek)
        return timesheetWeekSort === 'asc' ? cmp : -cmp
      }
      // Default: alpha by name
      return nameA.localeCompare(nameB)
    })

    const visibleExpensesAllTab = allExpenseSubmissions
    .filter(e => {
      if (timesheetEmployeeFilter !== 'all' && e.employee?.id !== timesheetEmployeeFilter) return false
      return true
    })
    .sort((a, b) => {
      const nameA = formatName(
        a.employee?.first_name,
        a.employee?.middle_name,
        a.employee?.last_name
      )
      const nameB = formatName(
        b.employee?.first_name,
        b.employee?.middle_name,
        b.employee?.last_name
      )
      return nameA.localeCompare(nameB)
    })  

  const visibleTimesheetsCountAllTab = visibleTimesheetsAllTab.length
  const visibleExpensesCountAllTab = visibleExpensesAllTab.length

  if (isLoading) {
    return (
      <div style={{ padding: '36px 40px' }} className="space-y-6">
        <div>
          <div className="anim-shimmer w-48 h-7 rounded mb-2" />
          <div className="anim-shimmer w-80 h-4 rounded" />
        </div>
        <SkeletonStats count={4} />
        <SkeletonList rows={6} />
      </div>
    )
  }

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const greeting = getTimeBasedGreeting()
  const displayName = employee?.first_name || 'Admin'

  const employeeFilterLabel =
    timesheetEmployeeFilter !== 'all'
      ? (() => {
          const emp = employees.find(e => e.id === timesheetEmployeeFilter)
          return emp ? formatName(emp.first_name, emp.middle_name, emp.last_name) : 'Employee'
        })()
      : null

  const hasTimesheetFilters =
    timesheetEmployeeFilter !== 'all' ||
    timesheetWeekFilter !== 'all' ||
    timesheetStatusCardFilter !== 'all'

  const resetTimesheetFilters = () => {
    setTimesheetEmployeeFilter('all')
    setTimesheetWeekFilter('all')
    setTimesheetStatusCardFilter('all')
    setTimesheetEmployeeSort(null)
    setTimesheetWeekSort(null)
  }

  return (
    <>
      {/* Page Title */}
      <div style={{ padding: '36px 40px 0 40px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', letterSpacing: -0.3, margin: 0 }}>
          Admin Dashboard
        </h1>
        <p style={{ fontSize: 13, fontWeight: 400, color: '#999', marginTop: 4 }}>
          Monitor submissions, approvals, and reminders across the organization.
        </p>
      </div>

      {/* Navigation tabs provided by AdminNav in layout */}

{/* Dashboard Overview */}
<div style={{ padding: '24px 40px 0 40px' }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const }}>Overview</div>
    <button
      onClick={loadSubmissions}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', fontSize: 12, fontWeight: 500, color: '#777', background: '#fff', border: '0.5px solid #e0dcd7', borderRadius: 6, cursor: 'pointer' }}
      onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = '#ccc' }}
      onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = '#e0dcd7' }}
    >
      <RotateCw className="h-3 w-3" />
      Refresh
    </button>
  </div>

  {/* Hero + Action Cards Row */}
  {(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const satDate = new Date(now);
    satDate.setDate(now.getDate() + (6 - dayOfWeek));
    const weekEndingStr = satDate.toISOString().split('T')[0];
    const companyHoursThisWeek = submissions
      .filter(s => s.type === 'timesheet' && s.date?.split('T')[0] === weekEndingStr)
      .reduce((sum, s) => sum + (s.hours || 0), 0);
    const pendingAll = submissions.filter(s => s.status === 'submitted').length;
    const payrollReady = submissions.filter(s => s.status === 'approved' && s.type === 'timesheet').length;
    const pendingHours = submissions.filter(s => s.status === 'submitted' && s.type === 'timesheet').reduce((sum, s) => sum + (s.hours || 0), 0);

    return (
      <div className="grid grid-cols-12 gap-4 anim-slide-up stagger-1" style={{ marginBottom: 16 }}>
        {/* Hero: Company Hours */}
        <div style={{
          gridColumn: 'span 5',
          background: '#1a1a1a',
          borderRadius: 12,
          padding: '28px 30px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(227,28,121,0.06)' }} />
          <div style={{ position: 'absolute', bottom: -30, right: 40, width: 80, height: 80, borderRadius: '50%', background: 'rgba(227,28,121,0.04)' }} />
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: 1.2, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const }}>Company Hours This Week</div>
          <div style={{ fontSize: 48, fontWeight: 700, color: '#e31c79', lineHeight: 1.1, marginTop: 8 }}>{companyHoursThisWeek.toFixed(0)}<span style={{ fontSize: 18, fontWeight: 500, color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>hrs</span></div>
          <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' as const }}>Employees</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginTop: 2 }}>{employees.filter(e => e.role === 'employee').length}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' as const }}>Approved</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#2d9b6e', marginTop: 2 }}>{approvedCount}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' as const }}>Pending Hrs</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#c4983a', marginTop: 2 }}>{pendingHours.toFixed(0)}</div>
            </div>
          </div>
        </div>

        {/* Action Cards Column */}
        <div style={{ gridColumn: 'span 7', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {/* Pending Approvals */}
          <div
            onClick={() => setActiveTab('pending')}
            style={{
              background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '20px 18px',
              cursor: 'pointer', transition: 'border-color 0.15s ease',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#c4983a'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8e4df'; }}
          >
            <div>
              <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const }}>Pending</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: pendingAll > 0 ? '#c4983a' : '#1a1a1a', lineHeight: 1.1, marginTop: 6 }}>{pendingAll}</div>
            </div>
            <div style={{ fontSize: 10, color: '#e31c79', fontWeight: 500, marginTop: 12 }}>Review &rarr;</div>
          </div>

          {/* Missing Timesheets */}
          <div
            style={{
              background: missingEmployees.length > 0 ? '#fef8f8' : '#fff',
              border: `0.5px solid ${missingEmployees.length > 0 ? '#f5d0d0' : '#e8e4df'}`,
              borderRadius: 10, padding: '20px 18px',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const }}>Missing</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: missingEmployees.length > 0 ? '#b91c1c' : '#2d9b6e', lineHeight: 1.1, marginTop: 6 }}>
                {missingEmployees.length > 0 ? missingEmployees.length : '\u2713'}
              </div>
            </div>
            {missingEmployees.length > 0 && (
              <div style={{ fontSize: 10, color: '#b91c1c', fontWeight: 500, marginTop: 12 }}>not submitted</div>
            )}
            {missingEmployees.length === 0 && (
              <div style={{ fontSize: 10, color: '#2d9b6e', fontWeight: 500, marginTop: 12 }}>all submitted</div>
            )}
          </div>

          {/* Payroll Ready */}
          <div
            onClick={() => router.push('/admin/payroll')}
            style={{
              background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '20px 18px',
              cursor: 'pointer', transition: 'border-color 0.15s ease',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#2d9b6e'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8e4df'; }}
          >
            <div>
              <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const }}>Payroll Ready</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: payrollReady > 0 ? '#2d9b6e' : '#1a1a1a', lineHeight: 1.1, marginTop: 6 }}>{payrollReady}</div>
            </div>
            <div style={{ fontSize: 10, color: '#e31c79', fontWeight: 500, marginTop: 12 }}>Payroll &rarr;</div>
          </div>
        </div>
      </div>
    );
  })()}
</div>

      {/* Controls - filters line */}
      <div style={{ padding: '0 40px' }}>
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-3 gap-3">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 11, color: '#c0bab2' }}>Department:</span>
                <select style={{ fontSize: 12, padding: '6px 12px', border: '0.5px solid #e8e4df', borderRadius: 7, background: '#fff', outline: 'none' }}
                onFocus={(e: any) => { e.currentTarget.style.borderColor = '#d3ad6b'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(211,173,107,0.08)' }}
                onBlur={(e: any) => { e.currentTarget.style.borderColor = '#e8e4df'; e.currentTarget.style.boxShadow = 'none' }}>
                  <option value="all">All</option>
                  <option value="engineering">Commerce</option>
                  <option value="sales">Healthcare</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span style={{ fontSize: 11, color: '#c0bab2' }}>Manager:</span>
                <select 
                  style={{ fontSize: 12, padding: '6px 12px', border: '0.5px solid #e8e4df', borderRadius: 7, background: '#fff', outline: 'none' }}
                onFocus={(e: any) => { e.currentTarget.style.borderColor = '#d3ad6b'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(211,173,107,0.08)' }}
                onBlur={(e: any) => { e.currentTarget.style.borderColor = '#e8e4df'; e.currentTarget.style.boxShadow = 'none' }}
                  value={managerFilter}
                  onChange={(e) => setManagerFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  {employees
                    .filter(e => e.role === 'manager' || e.role === 'admin')
                    .slice()
                    .sort((a, b) =>
                      formatName(a.first_name, a.middle_name, a.last_name).localeCompare(
                        formatName(b.first_name, b.middle_name, b.last_name)
                      )
                    )
                    .map(manager => (
                      <option key={manager.id} value={manager.id}>
                        {formatName(manager.first_name, manager.middle_name, manager.last_name)}
                      </option>
                    ))
                  }
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span style={{ fontSize: 11, color: '#c0bab2' }}>Project:</span>
                <select
                  style={{ fontSize: 12, padding: '6px 12px', border: '0.5px solid #e8e4df', borderRadius: 7, background: '#fff', outline: 'none' }}
                onFocus={(e: any) => { e.currentTarget.style.borderColor = '#d3ad6b'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(211,173,107,0.08)' }}
                onBlur={(e: any) => { e.currentTarget.style.borderColor = '#e8e4df'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <option value="all">All</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span style={{ fontSize: 11, color: '#c0bab2' }}>Employee:</span>
                <select
                  style={{ fontSize: 12, padding: '6px 12px', border: '0.5px solid #e8e4df', borderRadius: 7, background: '#fff', outline: 'none' }}
                onFocus={(e: any) => { e.currentTarget.style.borderColor = '#d3ad6b'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(211,173,107,0.08)' }}
                onBlur={(e: any) => { e.currentTarget.style.borderColor = '#e8e4df'; e.currentTarget.style.boxShadow = 'none' }}
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  {employees
                    .slice()
                    .sort((a, b) =>
                      formatName(a.first_name, a.middle_name, a.last_name).localeCompare(
                        formatName(b.first_name, b.middle_name, b.last_name)
                      )
                    )
                    .map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {formatName(emp.first_name, emp.middle_name, emp.last_name)}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span style={{ fontSize: 11, color: '#c0bab2' }}>Client:</span>
                <select
                  style={{ fontSize: 12, padding: '6px 12px', border: '0.5px solid #e8e4df', borderRadius: 7, background: '#fff', outline: 'none' }}
                  onFocus={(e: any) => { e.currentTarget.style.borderColor = '#d3ad6b'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(211,173,107,0.08)' }}
                  onBlur={(e: any) => { e.currentTarget.style.borderColor = '#e8e4df'; e.currentTarget.style.boxShadow = 'none' }}
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  {clientsList.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span style={{ fontSize: 11, color: '#c0bab2' }}>Items per page:</span>
              <select className="text-sm border border-[#e8e4df] rounded-lg px-2 py-1.5 bg-white">
                <option>100</option>
                <option>50</option>
                <option>25</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats row */}
      <div style={{ padding: '16px 40px' }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const }}>Time summary</span>
            <div className="mt-1 flex flex-wrap items-center gap-4" style={{ fontSize: 12.5, color: '#555' }}>
              <span>Approved: <strong style={{ color: '#2d9b6e' }}>{approvedTimesheetCount}</strong></span>
              <span>Pending: <strong style={{ color: '#c4983a' }}>{timesheetPendingCount}</strong></span>
              <span>Rejected: <strong style={{ color: '#b91c1c' }}>{rejectedTimesheetCount}</strong></span>
              <span>Draft: <strong style={{ color: '#555' }}>{draftTimesheetCount}</strong></span>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const }}>Expense summary</span>
            <div className="mt-1 flex flex-wrap items-center gap-4 sm:justify-end" style={{ fontSize: 12.5, color: '#555' }}>
              <span>Approved: <strong style={{ color: '#2d9b6e' }}>{approvedExpenseCount}</strong></span>
              <span>Pending: <strong style={{ color: '#c4983a' }}>{expensePendingCount}</strong></span>
              <span>Rejected: <strong style={{ color: '#b91c1c' }}>{rejectedExpenseCount}</strong></span>
              <span>Draft: <strong style={{ color: '#555' }}>{draftExpenseCount}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      <div style={{ padding: '0 40px 0 40px' }}>
        <div style={{ paddingTop: 24, paddingBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const, marginBottom: 16 }}>Analytics</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Hours by Status */}
            <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10 }}>
              <div style={{ padding: '14px 22px', borderBottom: '0.5px solid #f0ece7', fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>Timesheet Status Breakdown</div>
              <div style={{ padding: '16px 22px' }}>
              <div className="space-y-2">
                {[
                  { label: 'Approved', count: approvedTimesheetCount, barColor: '#2d9b6e', total: allTimesheetsCount },
                  { label: 'Pending', count: timesheetPendingCount, barColor: '#c4983a', total: allTimesheetsCount },
                  { label: 'Draft', count: draftTimesheetCount, barColor: '#ccc', total: allTimesheetsCount },
                  { label: 'Rejected', count: rejectedTimesheetCount, barColor: '#b91c1c', total: allTimesheetsCount },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between mb-1">
                      <span style={{ fontSize: 12.5, color: '#777' }}>{item.label}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1a1a1a' }}>{item.count}</span>
                    </div>
                    <div style={{ width: '100%', height: 6, borderRadius: 3, background: '#f5f2ee' }}>
                      <div
                        style={{ height: 6, borderRadius: 3, transition: 'width 0.5s ease', background: item.barColor, width: `${item.total > 0 ? (item.count / item.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            </div>

            {/* Hours by Department */}
            <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10 }}>
              <div style={{ padding: '14px 22px', borderBottom: '0.5px solid #f0ece7', fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>Hours by Department</div>
              <div style={{ padding: '16px 22px' }}>
              <div className="space-y-2">
                {(() => {
                  const deptHours: Record<string, number> = {}
                  submissions.filter(s => s.type === 'timesheet').forEach(s => {
                    const dept = s.employee?.department || 'Unassigned'
                    deptHours[dept] = (deptHours[dept] || 0) + (s.hours || 0)
                  })
                  const maxHours = Math.max(...Object.values(deptHours), 1)
                  return Object.entries(deptHours)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([dept, hours]) => (
                      <div key={dept}>
                        <div className="flex justify-between mb-1">
                          <span style={{ fontSize: 12.5, color: '#777' }} className="truncate">{dept}</span>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1a1a1a' }}>{hours.toFixed(1)} hrs</span>
                        </div>
                        <div style={{ width: '100%', height: 6, borderRadius: 3, background: '#f5f2ee' }}>
                          <div
                            style={{ height: 6, borderRadius: 3, transition: 'width 0.5s ease', background: '#e31c79', width: `${(hours / maxHours) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))
                })()}
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monitoring Dashboard */}
      <div style={{ padding: '0 40px' }}>
        <div style={{ paddingTop: 24, paddingBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const, marginBottom: 16 }}>Monitoring</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Submittal Monitoring */}
            <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '20px 22px' }}>
              <div className="flex justify-between items-start" style={{ marginBottom: 12 }}>
                <div>
                  <h4 style={{ fontSize: 12.5, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Timecard submittals</h4>
                  <p style={{ fontSize: 11, color: '#777', marginTop: 4 }}>Employees with unsubmitted timecards</p>
                </div>
                <button
                  onClick={handleBulkSubmittalReminders}
                  disabled={draftTimesheetCount === 0}
                  style={{ padding: '5px 12px', fontSize: 12, fontWeight: 500, borderRadius: 6, border: 'none', cursor: draftTimesheetCount === 0 ? 'not-allowed' : 'pointer', background: draftTimesheetCount === 0 ? '#eee' : '#e31c79', color: draftTimesheetCount === 0 ? '#aaa' : '#fff' }}
                  onMouseEnter={e => { if (draftTimesheetCount > 0) (e.target as HTMLElement).style.background = '#cc1069' }}
                  onMouseLeave={e => { if (draftTimesheetCount > 0) (e.target as HTMLElement).style.background = '#e31c79' }}
                >
                  Send all reminders
                </button>
              </div>
              
              <div className="space-y-2">
                {draftTimesheetCount === 0 ? (
                  <p className="flex items-center gap-1" style={{ fontSize: 12.5, color: '#2d9b6e' }}>
                    <CheckCircle className="h-4 w-4" />
                    All timecards submitted
                  </p>
                ) : (
                  <>
                    <p style={{ fontSize: 12.5, fontWeight: 600, color: '#b91c1c' }}>
                      {draftTimesheetCount} unsubmitted timecard{draftTimesheetCount !== 1 ? 's' : ''}
                    </p>
                    {submissions
  .filter(s => s.type === 'timesheet' && s.status === 'draft')
  .slice(0, 5)
  .map(submission => (
    <div key={submission.id} className="flex justify-between items-center py-1">
      <span style={{ fontSize: 12.5, color: '#555' }}>
        {formatName(
          submission.employee?.first_name,
          submission.employee?.middle_name,
          submission.employee?.last_name
        )} — Week: {submission.week_range?.split(',')[0]}
      </span>
      <button
        onClick={() => handleSendSubmittalReminder(submission)}
        className="flex items-center gap-1"
        style={{ fontSize: 11, color: '#e31c79', background: 'none', border: 'none', cursor: 'pointer' }}
        onMouseEnter={e => { e.currentTarget.style.color = '#cc1069' }}
        onMouseLeave={e => { e.currentTarget.style.color = '#e31c79' }}
      >
        <Send className="h-3 w-3" />
        Send reminder
      </button>
    </div>
  ))}

                    {draftTimesheetCount > 5 && (
                      <p className="text-xs text-[#999] mt-2">
                        +{draftTimesheetCount - 5} more...
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Approval Monitoring by Manager */}
            <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '20px 22px' }}>
              <div className="flex justify-between items-start" style={{ marginBottom: 12 }}>
                <div>
                  <h4 style={{ fontSize: 12.5, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Pending approvals by manager</h4>
                  <p style={{ fontSize: 11, color: '#777', marginTop: 4 }}>Managers with pending timecards to approve</p>
                </div>
              </div>
              
              <div className="space-y-2">
                {timesheetPendingCount === 0 ? (
                  <p className="flex items-center gap-1" style={{ fontSize: 12.5, color: '#2d9b6e' }}>
                    <CheckCircle className="h-4 w-4" />
                    All timecards approved
                  </p>
                ) : (
                  <>
                    {Array.from(getPendingByManager().entries()).map(([managerId, data]) => {
                      const daysOld = Math.floor((new Date().getTime() - new Date(data.oldestPending).getTime()) / (1000 * 60 * 60 * 24))
                      const isOverdue = daysOld > 3
                      
                      return (
                        <div
                          key={managerId}
                          style={{
                            border: `0.5px solid ${isOverdue ? '#e8b4b4' : '#e8e4df'}`,
                            borderRadius: 10,
                            padding: '10px 14px',
                            background: isOverdue ? '#fef8f8' : '#FDFCFB',
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1a1a1a' }}>
                                {data.managerName}
                              </div>
                              <div style={{ fontSize: 11, color: '#777', marginTop: 4 }}>
                                <span style={{ fontWeight: 600, color: isOverdue ? '#b91c1c' : '#c4983a' }}>
                                  {data.count} pending
                                </span>
                                {' \u2022 '}
                                {data.totalHours.toFixed(2)} hours
                                {isOverdue && (
                                  <>
                                    {' \u2022 '}
                                    <span style={{ color: '#b91c1c' }}>{daysOld} days old</span>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex gap-2 ml-4">
                              {managerId !== 'unassigned' && (
                                <button
                                  onClick={() => handleSendApprovalReminder(managerId, data.managerName, data.submissions)}
                                  style={{ padding: '4px 10px', fontSize: 11, background: '#e31c79', color: '#fff', borderRadius: 6, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                  onMouseEnter={e => { (e.target as HTMLElement).style.background = '#cc1069' }}
                                  onMouseLeave={e => { (e.target as HTMLElement).style.background = '#e31c79' }}
                                >
                                  <Send className="h-3 w-3" />
                                  Remind
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Missing Timesheets for Current Week */}
          {missingEmployees.length > 0 && (
            <div style={{ marginTop: 24, background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '20px 22px' }}>
              <div className="flex justify-between items-start" style={{ marginBottom: 12 }}>
                <div>
                  <h4 className="flex items-center gap-2" style={{ fontSize: 12.5, fontWeight: 600, color: '#b91c1c', margin: 0 }}>
                    <AlertCircle className="h-4 w-4" />
                    Missing timesheets — current week
                  </h4>
                  <p style={{ fontSize: 12, color: '#b91c1c', marginTop: 4 }}>
                    {missingEmployees.length} active employee{missingEmployees.length !== 1 ? 's have' : ' has'} not created a timesheet for this week
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                {missingEmployees.slice(0, 10).map(emp => (
                  <div key={emp.id} className="flex justify-between items-center py-1">
                    <span style={{ fontSize: 12.5, color: '#1a1a1a' }}>
                      {formatName(emp.first_name, emp.middle_name, emp.last_name)}
                      <span style={{ fontSize: 11, color: '#c0bab2', marginLeft: 8 }}>{emp.department || ''}</span>
                    </span>
                  </div>
                ))}
                {missingEmployees.length > 10 && (
                  <p style={{ fontSize: 11, color: '#b91c1c', marginTop: 8 }}>
                    +{missingEmployees.length - 10} more...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-4" style={{ marginTop: 16 }}>
            <button
              onClick={() => setActiveTab('unsubmitted')}
              style={{ fontSize: 12, color: '#e31c79', background: 'none', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#cc1069' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#e31c79' }}
            >
              View all unsubmitted &rarr;
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              style={{ fontSize: 12, color: '#e31c79', background: 'none', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#cc1069' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#e31c79' }}
            >
              View all pending approvals &rarr;
            </button>
          </div>
        </div>
      </div>

{/* MAIN CONTENT – Timesheets + Expenses WITH FILTERS/SORTING */}
<div style={{ padding: '0 40px 40px 40px' }}>
  {/* Search above cards */}
  <div className="mb-4 flex justify-between items-center">
    <div className="relative w-full sm:w-80">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#bbb]" />
      <input
        type="text"
        placeholder="Search by employee, email, category..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 8, paddingBottom: 8, fontSize: 12, border: '0.5px solid #e8e4df', borderRadius: 7, outline: 'none', color: '#1a1a1a' }}
        onFocus={(e) => { e.currentTarget.style.borderColor = '#d3ad6b'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(211,173,107,0.08)' }}
        onBlur={(e) => { e.currentTarget.style.borderColor = '#e8e4df'; e.currentTarget.style.boxShadow = 'none' }}
      />
    </div>
  </div>

  <div style={{ background: '#fff', borderRadius: 10, border: '0.5px solid #e8e4df' }}>
    {/* TIMESHEETS CARD */}
    <div style={{ borderBottom: '0.5px solid #e8e4df', borderRadius: '10px 10px 0 0', overflow: 'hidden' }}>
      <div style={{ padding: '14px 22px', borderBottom: '0.5px solid #f0ece7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Timesheets</h3>
              <div style={{ fontSize: 11, color: '#999' }}>
                <span>
                  {visibleTimesheetsCountAllTab > 0 ? '1 – ' : '0 of '}
                  {visibleTimesheetsCountAllTab} of {allTimesheetsCount}
                </span>
              </div>
            </div>

            {/* Currently filtered pill */}
            {hasTimesheetFilters && (
              <div style={{ padding: '8px 16px 12px' }}>
                <div className="inline-flex items-center gap-2" style={{ padding: '4px 12px', borderRadius: 5, background: '#FDFCFB', border: '0.5px solid #e8e4df', fontSize: 11, color: '#555' }}>
                  <span className="font-semibold">Currently filtered by:</span>
                  {employeeFilterLabel && <span>Employee: {employeeFilterLabel}</span>}
                  {timesheetWeekFilter !== 'all' && <span>Week: {timesheetWeekFilter}</span>}
                  {timesheetStatusCardFilter !== 'all' && (
                    <span>
                      Status:{' '}
                      {timesheetStatusCardFilter.charAt(0).toUpperCase() +
                        timesheetStatusCardFilter.slice(1)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={resetTimesheetFilters}
                    style={{ marginLeft: 8, fontSize: 11, color: '#e31c79', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Reset filters
                  </button>
                </div>
              </div>
            )}
            
            {allTimesheetsCount === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#ccc', fontSize: 12.5 }}>
                No timesheets to display.
              </div>
            ) : (
              <>
                {/* Filter row */}
                <div className="flex items-center" style={{ padding: '8px 22px', borderBottom: '0.5px solid #f5f2ee' }}>
                  <div className="w-8" />
                  <div className="flex-1 pr-2">
                    <select
                      value={timesheetEmployeeFilter}
                      onChange={(e) => setTimesheetEmployeeFilter(e.target.value)}
                      style={{ width: '100%', fontSize: 11, padding: '4px 8px', border: '0.5px solid #e8e4df', borderRadius: 5, background: '#fff', outline: 'none' }}
                      onFocus={(e: any) => { e.currentTarget.style.borderColor = '#d3ad6b'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(211,173,107,0.08)' }}
                      onBlur={(e: any) => { e.currentTarget.style.borderColor = '#e8e4df'; e.currentTarget.style.boxShadow = 'none' }}
                    >
                      <option value="all">Employee</option>
                      {timesheetEmployeeOptions.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {formatName(emp.first_name, emp.middle_name, emp.last_name)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-40 pr-2">
                    <select
                      value={timesheetWeekFilter}
                      onChange={(e) => setTimesheetWeekFilter(e.target.value)}
                      style={{ width: '100%', fontSize: 11, padding: '4px 8px', border: '0.5px solid #e8e4df', borderRadius: 5, background: '#fff', outline: 'none' }}
                      onFocus={(e: any) => { e.currentTarget.style.borderColor = '#d3ad6b'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(211,173,107,0.08)' }}
                      onBlur={(e: any) => { e.currentTarget.style.borderColor = '#e8e4df'; e.currentTarget.style.boxShadow = 'none' }}
                    >
                      <option value="all">Week</option>
                      {weekOptions.map(week => (
                        <option key={week} value={week}>
                          {week}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-32 pr-2">
                    <select
                      value={timesheetStatusCardFilter}
                      onChange={(e) => setTimesheetStatusCardFilter(e.target.value)}
                      style={{ width: '100%', fontSize: 11, padding: '4px 8px', border: '0.5px solid #e8e4df', borderRadius: 5, background: '#fff', outline: 'none' }}
                      onFocus={(e: any) => { e.currentTarget.style.borderColor = '#d3ad6b'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(211,173,107,0.08)' }}
                      onBlur={(e: any) => { e.currentTarget.style.borderColor = '#e8e4df'; e.currentTarget.style.boxShadow = 'none' }}
                    >
                      <option value="all">Status</option>
                      {statusOptions.map(status => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24 text-right" style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase' as const }}>
                    Hours
                  </div>
                  <div className="w-32 text-right" style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase' as const }}>
                    Actions
                  </div>
                </div>
                
                {visibleTimesheetsAllTab.map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center"
                    style={{ padding: '10px 22px', fontSize: 12.5, fontWeight: 400, color: '#555', borderBottom: '0.5px solid #f5f2ee', cursor: 'default' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FDFCFB' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <div className="w-8" />
                    <div className="flex-1">
                      <div className="text-[#1a1a1a] font-medium">
                        {formatName(
                          submission.employee?.first_name,
                          submission.employee?.middle_name,
                          submission.employee?.last_name
                        )}
                      </div>
                      <div className="text-xs text-[#999]">
                        {submission.employee?.department || 'No department'}
                      </div>
                    </div>
                    <div className="w-40 text-sm text-[#1a1a1a]">
                      {submission.week_range}
                    </div>
                    <div className="w-32 text-center">
                      <span style={{ display: 'inline-flex', padding: '2px 8px', fontSize: 9, fontWeight: 500, borderRadius: 3, background: submission.status === 'payroll_approved' ? '#ecfdf5' : submission.status === 'approved' ? '#f0fdf4' : submission.status === 'submitted' ? '#fefce8' : submission.status === 'rejected' ? '#fef2f2' : '#f5f5f5', color: submission.status === 'payroll_approved' ? '#065f46' : submission.status === 'approved' ? '#166534' : submission.status === 'submitted' ? '#854d0e' : submission.status === 'rejected' ? '#991b1b' : '#555' }}>
                        {submission.status === 'submitted' ? 'Pending' :
                          submission.status === 'payroll_approved' ? 'Payroll' :
                          submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                      </span>
                    </div>
                    <div className="w-24 text-right font-medium">
                      {submission.hours?.toFixed(2) || '0.00'}
                    </div>
                    <div className="w-32 flex justify-end items-center gap-2">
                      {submission.status === 'submitted' && (
                        <>
                          <button
                            onClick={() => handleApprove(submission)}
                            style={{ padding: 4, color: '#2d9b6e', background: 'none', border: 'none', borderRadius: 5, cursor: 'pointer' }}
                            onMouseEnter={(e: any) => { e.currentTarget.style.background = '#f0faf5' }}
                            onMouseLeave={(e: any) => { e.currentTarget.style.background = 'none' }}
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => promptReject(submission)}
                            style={{ padding: 4, color: '#b91c1c', background: 'none', border: 'none', borderRadius: 5, cursor: 'pointer' }}
                            onMouseEnter={(e: any) => { e.currentTarget.style.background = '#fef2f2' }}
                            onMouseLeave={(e: any) => { e.currentTarget.style.background = 'none' }}
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {submission.status === 'approved' && (
                        <button
                          onClick={() => handleFinalizeForPayroll(submission)}
                          style={{ padding: '3px 10px', fontSize: 10, fontWeight: 500, background: '#e31c79', color: '#fff', borderRadius: 3, border: 'none', cursor: 'pointer' }}
                          onMouseEnter={e => { (e.target as HTMLElement).style.background = '#cc1069' }}
                          onMouseLeave={e => { (e.target as HTMLElement).style.background = '#e31c79' }}
                          title="Finalize for payroll"
                        >
                          Finalize
                        </button>
                      )}
                      <button
                        onClick={() => handleViewTimesheet(submission)}
                        style={{ padding: 4, color: '#e31c79', background: 'none', border: 'none', borderRadius: 5, cursor: 'pointer' }}
                        onMouseEnter={(e: any) => { e.currentTarget.style.background = '#fdf2f8' }}
                        onMouseLeave={(e: any) => { e.currentTarget.style.background = 'none' }}
                        disabled={processingId === submission.id}
                        title="View timesheet"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <div style={{ padding: '10px 22px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>
                    Total hours:{' '}
                    {visibleTimesheetsAllTab
                      .reduce((sum, s) => sum + (s.hours || 0), 0)
                      .toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* EXPENSES CARD */}
          <div style={{ marginTop: 24, borderRadius: 10, overflow: 'hidden', border: '0.5px solid #e8e4df', background: '#fff' }}>
            <div style={{ padding: '14px 22px', borderBottom: '0.5px solid #f0ece7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Expenses</h3>
              <div style={{ fontSize: 11, color: '#999' }}>
                <span>
                  {visibleExpensesCountAllTab > 0 ? '1 – ' : '0 of '}
                  {visibleExpensesCountAllTab} of {allExpenseSubmissions.length}
                </span>
              </div>
            </div>
            
            {visibleExpensesAllTab.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#ccc', fontSize: 12.5 }}>
                {timesheetEmployeeFilter !== 'all'
                  ? 'No expenses for the selected employee.'
                  : 'No expenses to display.'}
              </div>
            ) : (
              <>
                {/* Header row */}
                <div className="flex items-center" style={{ padding: '8px 22px', borderBottom: '0.5px solid #f5f2ee' }}>
                  <div className="w-8" />
                  <div className="flex-1" style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase' as const }}>Employee</div>
                  <div className="w-32" style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase' as const }}>Type</div>
                  <div className="w-40" style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase' as const }}>Date</div>
                  <div className="w-32 text-center" style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase' as const }}>Status</div>
                  <div className="w-24 text-right" style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase' as const }}>Amount</div>
                  <div className="w-32 text-right" style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase' as const }}>Actions</div>
                </div>
                
                {visibleExpensesAllTab.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center"
                    style={{ padding: '10px 22px', fontSize: 12.5, fontWeight: 400, color: '#555', borderBottom: '0.5px solid #f5f2ee', cursor: 'default' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FDFCFB' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <div className="w-8" />
                    <div className="flex-1">
                      <div className="font-medium text-[#1a1a1a]">
                        {formatName(
                          expense.employee?.first_name,
                          expense.employee?.middle_name,
                          expense.employee?.last_name
                        )}
                      </div>
                      <div className="text-xs text-[#999]">
                        {expense.employee?.email}
                      </div>
                    </div>
                    <div className="w-32 text-sm">
                      {expense.category || '-'}
                    </div>
                    <div className="w-40 text-sm">
                      {new Date(expense.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: '2-digit',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="w-32 text-center">
                      <span style={{ display: 'inline-flex', padding: '2px 8px', fontSize: 9, fontWeight: 500, borderRadius: 3, background: expense.status === 'approved' ? '#f0fdf4' : expense.status === 'submitted' ? '#fefce8' : expense.status === 'rejected' ? '#fef2f2' : '#f5f5f5', color: expense.status === 'approved' ? '#166534' : expense.status === 'submitted' ? '#854d0e' : expense.status === 'rejected' ? '#991b1b' : '#555' }}>
                        {expense.status === 'submitted' ? 'Pending' :
                          expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                      </span>
                    </div>
                    <div className="w-24 text-right font-medium">
                      ${expense.amount.toFixed(2)}
                    </div>
                    <div className="w-32 flex justify-end items-center gap-2">
                      {expense.status === 'submitted' && (
                        <>
                          <button 
                            onClick={() => handleApprove(expense)}
                            style={{ padding: 4, color: '#2d9b6e', background: 'none', border: 'none', borderRadius: 5, cursor: 'pointer' }}
                            onMouseEnter={(e: any) => { e.currentTarget.style.background = '#f0faf5' }}
                            onMouseLeave={(e: any) => { e.currentTarget.style.background = 'none' }}
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => promptReject(expense)}
                            style={{ padding: 4, color: '#b91c1c', background: 'none', border: 'none', borderRadius: 5, cursor: 'pointer' }}
                            onMouseEnter={(e: any) => { e.currentTarget.style.background = '#fef2f2' }}
                            onMouseLeave={(e: any) => { e.currentTarget.style.background = 'none' }}
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => handleViewExpense(expense)}
                        style={{ padding: 4, color: '#e31c79', background: 'none', border: 'none', borderRadius: 5, cursor: 'pointer' }}
                        onMouseEnter={(e: any) => { e.currentTarget.style.background = '#fdf2f8' }}
                        onMouseLeave={(e: any) => { e.currentTarget.style.background = 'none' }}
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                
                <div style={{ padding: '10px 22px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>
                    Total: $
                    {visibleExpensesAllTab
                      .reduce((sum, s) => sum + s.amount, 0)
                      .toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Timesheet Modal */}
      {selectedTimesheet && (
        <TimesheetModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedTimesheet(null)
          }}
          timesheet={selectedTimesheet}
          onApprove={handleModalApprove}
          onReject={handleModalReject}
        />
      )}

      {/* Expense Modal */}
      {isExpenseModalOpen && selectedExpense && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', zIndex: 50 }}>
          <div className="anim-scale-in" style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #e8e4df', maxWidth: 512, width: '100%', padding: 24 }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>
                Expense details
              </h3>
              <button
                onClick={() => {
                  setIsExpenseModalOpen(false)
                  setSelectedExpense(null)
                }}
                style={{ padding: 4, background: '#fff', border: '0.5px solid #e0dcd7', borderRadius: 5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
              >
                <XCircle style={{ width: 16, height: 16, color: '#999' }} />
              </button>
            </div>

            <div className="space-y-2" style={{ fontSize: 12.5, color: '#555' }}>
              <div>
                <span className="font-medium">Employee: </span>
                {selectedExpense.employee
                  ? `${formatName(
                      selectedExpense.employee.first_name,
                      selectedExpense.employee.middle_name,
                      selectedExpense.employee.last_name,
                      'firstLast'
                    )} (${selectedExpense.employee.email})`
                  : 'Unknown'}
              </div>
              <div>
                <span className="font-medium">Date: </span>
                {new Date(selectedExpense.expense_date).toLocaleDateString()}
              </div>
              <div>
                <span className="font-medium">Category: </span>
                {selectedExpense.category}
              </div>
              <div>
                <span className="font-medium">Amount: </span>
                ${selectedExpense.amount?.toFixed(2)}
              </div>

              {selectedExpense.vendor && (
                <div>
                  <span className="font-medium">Vendor: </span>
                  {selectedExpense.vendor}
                </div>
              )}

              {selectedExpense.description && (
                <div>
                  <span className="font-medium">Description: </span>
                  {selectedExpense.description}
                </div>
              )}

              {selectedExpense.receipt_url && (
                <div>
                  <span className="font-medium">Receipt: </span>
                  <a
                    href={selectedExpense.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#e31c79', textDecoration: 'underline' }}
                  >
                    View uploaded receipt
                  </a>
                </div>
              )}

              {selectedExpense.rejection_reason && (
                <div style={{ color: '#b91c1c' }}>
                  <span className="font-medium">Rejection reason: </span>
                  {selectedExpense.rejection_reason}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3" style={{ marginTop: 24 }}>
              <button
                onClick={() => {
                  setIsExpenseModalOpen(false)
                  setSelectedExpense(null)
                }}
                style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, background: '#fff', border: '0.5px solid #e0dcd7', color: '#777', borderRadius: 6, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm/Reject Modal */}
      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
        inputLabel={confirmModal.inputLabel}
        inputPlaceholder={confirmModal.inputPlaceholder}
        inputRequired={confirmModal.inputRequired}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, open: false }))}
      />

      {/* Bulk progress indicator */}
      {bulkProgress && (
        <div style={{
          position: 'fixed', bottom: 80, right: 24, zIndex: 9997,
          background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10,
          padding: '12px 18px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          fontFamily: 'var(--font-montserrat), Montserrat, sans-serif',
          fontSize: 12.5, fontWeight: 500, color: '#1a1a1a',
        }}>
          Processing {bulkProgress.current} of {bulkProgress.total}...
        </div>
      )}
    </>
  )
}
