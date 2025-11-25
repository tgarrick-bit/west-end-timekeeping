'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import TimesheetModal from '@/components/TimesheetModal'
import Image from 'next/image'
import { 
  Clock, 
  FileText,
  CheckCircle,
  XCircle,
  LogOut,
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
  User,
  ArrowUpDown,
  Search,
} from 'lucide-react'

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
  hourly_rate: number
  bill_rate: number | null
  manager_id: string | null
  role: string               // 'employee' | 'manager' | 'admin'
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
  const supabase = createClientComponentClient()
  
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('submitted')
  const [adminId, setAdminId] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'all' | 'approved' | 'pending' | 'rejected' | 'unsubmitted'>('pending')
  const [managerFilter, setManagerFilter] = useState<string>('all')
  const [employeeFilter, setEmployeeFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')

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
          router.push('/dashboard')
        }
        return
      }
      
      setAdminId(user.id)
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
    
    const confirmed = confirm(
      `Send reminder to ${formatName(
        submission.employee.first_name,
        submission.employee.middle_name,
        submission.employee.last_name,
        'firstLast'
      )} for unsubmitted timecard?`
    )
    if (!confirmed) return
    
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'timecard_reminder',
          recipient_id: submission.employee.id,
          recipient_email: submission.employee.email,
          data: {
            week_ending: submission.date,
            employee_name: formatName(
              submission.employee.first_name,
              submission.employee.middle_name,
              submission.employee.last_name,
              'firstLast'
            ),
            status: 'unsubmitted'
          }
        })
      })
      
      if (response.ok) {
        alert('Reminder sent successfully!')
      } else {
        alert('Failed to send reminder')
      }
    } catch (error) {
      console.error('Error sending reminder:', error)
      alert('Error sending reminder')
    }
  }

  const handleSendApprovalReminder = async (managerId: string, managerName: string, pendingSubmissions: Submission[]) => {
    const manager = employees.find(e => e.id === managerId)
    if (!manager) {
      alert('Manager not found')
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
    
    const confirmMessage = `Send approval reminder to ${managerName} for ${pendingSubmissions.length} pending timecard(s)?\n\nPending approvals:\n${detailsList}${pendingSubmissions.length > 5 ? `\n... and ${pendingSubmissions.length - 5} more` : ''}`
    
    const confirmed = confirm(confirmMessage)
    if (!confirmed) return
    
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
        alert(`Reminder sent successfully to ${managerName}!`)
      } else {
        alert('Failed to send reminder')
      }
    } catch (error) {
      console.error('Error sending reminder:', error)
      alert('Error sending reminder')
    }
  }

  const handleBulkSubmittalReminders = async () => {
    const unsubmittedWithEmployees = submissions.filter(
      s => s.type === 'timesheet' && s.status === 'draft' && s.employee
    )
    
    if (unsubmittedWithEmployees.length === 0) {
      alert('No unsubmitted timecards to send reminders for')
      return
    }
    
    const confirmed = confirm(`Send reminders to ${unsubmittedWithEmployees.length} employees for unsubmitted timecards?`)
    if (!confirmed) return
    
    let sent = 0
    let failed = 0
    
    for (const submission of unsubmittedWithEmployees) {
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
              employee_name: formatName(
                submission.employee!.first_name,
                submission.employee!.middle_name,
                submission.employee!.last_name,
                'firstLast'
              ),
              status: 'unsubmitted'
            }
          })
        })
        
        if (response.ok) sent++
        else failed++
      } catch (error) {
        failed++
      }
    }
    
    alert(`Reminders sent: ${sent} successful, ${failed} failed`)
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
    const table = submission.type === 'timesheet' ? 'timesheets' : 'expenses'
    
    const { error } = await supabase
      .from(table)
      .update({ 
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: adminId
      })
      .eq('id', submission.id)

    if (!error) {
      loadSubmissions()
      
      if (selectedTimesheet?.id === submission.id) {
        setIsModalOpen(false)
        setSelectedTimesheet(null)
      }
      if (selectedExpense?.id === submission.id) {
        setIsExpenseModalOpen(false)
        setSelectedExpense(null)
      }
    }
  }

  const handleReject = async (submission: Submission) => {
    const reason = prompt('Please provide a reason for rejection:')
    if (!reason) return

    const table = submission.type === 'timesheet' ? 'timesheets' : 'expenses'
    const reasonField = 'rejection_reason'
    
    const { error } = await supabase
      .from(table)
      .update({ 
        status: 'rejected',
        approved_at: new Date().toISOString(),
        approved_by: adminId,
        [reasonField]: reason
      })
      .eq('id', submission.id)

    if (!error) {
      loadSubmissions()
      
      if (selectedTimesheet?.id === submission.id) {
        setIsModalOpen(false)
        setSelectedTimesheet(null)
      }
      if (selectedExpense?.id === submission.id) {
        setIsExpenseModalOpen(false)
        setSelectedExpense(null)
      }
    }
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
      await handleReject(submission)
    }
  }

  const handleBulkApprove = async () => {
    for (const submissionId of selectedItems) {
      const submission = submissions.find(s => s.id === submissionId)
      if (submission && submission.status === 'submitted') {
        await handleApprove(submission)
      }
    }
    setSelectedItems(new Set())
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
      <div className="min-h-screen bg-[#F7F8FC] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e31c79] mx-auto"></div>
          <p className="mt-3 text-gray-600">Loading admin dashboard...</p>
        </div>
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
    <div className="min-h-screen bg-[#F7F8FC]">
      {/* Header */}
      <header className="bg-[#33393c] shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Image
                src="/WE-logo-SEPT2024v3-WHT.png"
                alt="West End Workforce"
                width={180}
                height={40}
                className="h-9 w-auto"
                priority
              />
              <div className="border-l border-gray-600 pl-3">
                <p className="text-xs text-gray-300 uppercase tracking-wide">
                  Admin Portal
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/manager')}
                className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 text-xs text-gray-200 hover:text-white border border-white/20 rounded-full"
              >
                Manager view
              </button>
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm text-gray-100 truncate max-w-[220px]">
                  {greeting}, {displayName}
                </span>
              </div>
              <button
                onClick={async () => { await supabase.auth.signOut(); router.push('/auth/login'); }}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-200 hover:text-white transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>    

      {/* Page Title */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <h1 className="text-2xl font-semibold text-[#33393c]">Admin dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Monitor submissions, approvals, and reminders across the organization.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs (top-level sections) */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-6">
            <button 
              onClick={() => router.push('/admin')}
              className="py-3 text-sm font-medium text-[#33393c] border-b-2 border-[#e31c79] whitespace-nowrap"
            >
              Review & Approve
            </button>
            
            <button 
              onClick={() => router.push('/admin/employees')}
              className="py-3 text-sm font-medium text-gray-500 hover:text-[#33393c] border-b-2 border-transparent hover:border-gray-200 whitespace-nowrap"
            >
              Employees
            </button>
            
            <button 
              onClick={() => router.push('/admin/clients')}
              className="py-3 text-sm font-medium text-gray-500 hover:text-[#33393c] border-b-2 border-transparent hover:border-gray-200 whitespace-nowrap"
            >
              Clients
            </button>
            
            <button 
              onClick={() => router.push('/admin/projects')}
              className="py-3 text-sm font-medium text-gray-500 hover:text-[#33393c] border-b-2 border-transparent hover:border-gray-200 whitespace-nowrap"
            >
              Projects
            </button>

            <button 
              onClick={() => router.push('/admin/billing')}
              className="py-3 text-sm font-medium text-gray-500 hover:text-[#33393c] border-b-2 border-transparent hover:border-gray-200 whitespace-nowrap"
            >
              Billing
            </button>

            <div className="relative group">
              <button className="py-3 text-sm font-medium text-gray-500 hover:text-[#33393c] flex items-center gap-1 border-b-2 border-transparent hover:border-gray-200 whitespace-nowrap">
                Reports
                <ChevronDown className="h-4 w-4" />
              </button>
              <div className="absolute left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                <div className="py-2 text-sm">
                  <div className="px-4 py-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Time reports
                  </div>
                  <a href="/admin/reports/time-by-project" className="block px-4 py-1.5 hover:bg-gray-50 text-gray-700">
                    Time by project
                  </a>
                  <a href="/admin/reports/time-by-employee" className="block px-4 py-1.5 hover:bg-gray-50 text-gray-700">
                    Time by employee
                  </a>
                </div>
              </div>
            </div>

            <button 
              onClick={() => router.push('/admin/settings')}
              className="py-3 text-sm font-medium text-gray-500 hover:text-[#33393c] border-b-2 border-transparent hover:border-gray-200 flex items-center gap-2 whitespace-nowrap"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
          </div>
        </div>
      </div>

{/* Quick Stats Bar */}
<div className="bg-white border-b border-gray-200">
  <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-4">
        <div className="inline-flex items-center gap-2 text-sm text-gray-800">
          <Users className="h-4 w-4 text-gray-500" />
          <span className="text-gray-600">Employees:</span> 
          <span className="font-semibold ml-1">{employees.length}</span>
        </div>
        <div className="inline-flex items-center gap-2 text-sm text-gray-800">
          <DollarSign className="h-4 w-4 text-gray-500" />
          <span className="text-gray-600">Pending amount:</span> 
          <span className="font-semibold ml-1 text-[#e31c79]">
            ${submissions
              .filter(s => s.status === 'submitted')
              .reduce((sum, s) => sum + s.amount, 0)
              .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="inline-flex items-center gap-2 text-sm text-gray-800">
          <Clock className="h-4 w-4 text-gray-500" />
          <span className="text-gray-600">Pending hours:</span> 
          <span className="font-semibold ml-1">
            {submissions
              .filter(s => s.status === 'submitted' && s.type === 'timesheet')
              .reduce((sum, s) => sum + (s.hours || 0), 0)
              .toFixed(2)}
          </span>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        <button 
          onClick={loadSubmissions}
          className="flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm text-gray-700 hover:text-gray-900 border border-gray-200 rounded-full hover:bg-gray-50"
        >
          <RotateCw className="h-3 w-3" />
          Refresh data
        </button>
      </div>
    </div>
  </div>
</div>

      {/* Controls - filters line */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-3 gap-3">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Department:</span>
                <select className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg bg-white">
                  <option value="all">All</option>
                  <option value="engineering">Commerce</option>
                  <option value="sales">Healthcare</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Manager:</span>
                <select 
                  className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg bg-white"
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
                <span className="text-sm text-gray-700">Project:</span>
                <select
                  className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg bg-white"
                >
                  <option value="all">All</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Employee:</span>
                <select
                  className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg bg-white"
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
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Items per page:</span>
              <select className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white">
                <option>100</option>
                <option>50</option>
                <option>25</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats row */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Time summary</span>
              <div className="mt-1 flex flex-wrap items-center gap-4 text-sm">
                <span>Approved: <strong className="text-green-600">{approvedTimesheetCount}</strong></span>
                <span>Pending: <strong className="text-orange-600">{timesheetPendingCount}</strong></span>
                <span>Rejected: <strong className="text-red-600">{rejectedTimesheetCount}</strong></span>
                <span>Draft: <strong className="text-gray-700">{draftTimesheetCount}</strong></span>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Expense summary</span>
              <div className="mt-1 flex flex-wrap items-center gap-4 text-sm sm:justify-end">
                <span>Approved: <strong className="text-green-600">{approvedExpenseCount}</strong></span>
                <span>Pending: <strong className="text-orange-600">{expensePendingCount}</strong></span>
                <span>Rejected: <strong className="text-red-600">{rejectedExpenseCount}</strong></span>
                <span>Draft: <strong className="text-gray-700">{draftExpenseCount}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monitoring Dashboard */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h3 className="text-lg font-semibold text-[#33393c] mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5 text-[#e31c79]" />
            Monitoring dashboard
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Submittal Monitoring */}
            <div className="border border-gray-200 rounded-2xl p-4 bg-white">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">Timecard submittals</h4>
                  <p className="text-sm text-gray-600 mt-1">Employees with unsubmitted timecards</p>
                </div>
                <button
                  onClick={handleBulkSubmittalReminders}
                  disabled={draftTimesheetCount === 0}
                  className={`px-3 py-1 text-xs sm:text-sm rounded-full ${
                    draftTimesheetCount === 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-[#e31c79] text-white hover:bg-[#c71865]'
                  }`}
                >
                  Send all reminders
                </button>
              </div>
              
              <div className="space-y-2">
                {draftTimesheetCount === 0 ? (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    All timecards submitted
                  </p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-red-600">
                      {draftTimesheetCount} unsubmitted timecard{draftTimesheetCount !== 1 ? 's' : ''}
                    </p>
                    {submissions
  .filter(s => s.type === 'timesheet' && s.status === 'draft')
  .slice(0, 5)
  .map(submission => (
    <div key={submission.id} className="flex justify-between items-center text-sm py-1">
      <span className="text-gray-700">
        {formatName(
          submission.employee?.first_name,
          submission.employee?.middle_name,
          submission.employee?.last_name
        )} — Week: {submission.week_range?.split(',')[0]}
      </span>
      <button
        onClick={() => handleSendSubmittalReminder(submission)}
        className="text-[#e31c79] hover:text-[#c71865] text-xs flex items-center gap-1"
      >
        <Send className="h-3 w-3" />
        Send reminder
      </button>
    </div>
  ))}

                    {draftTimesheetCount > 5 && (
                      <p className="text-xs text-gray-500 mt-2">
                        +{draftTimesheetCount - 5} more...
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Approval Monitoring by Manager */}
            <div className="border border-gray-200 rounded-2xl p-4 bg-white">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">Pending approvals by manager</h4>
                  <p className="text-sm text-gray-600 mt-1">Managers with pending timecards to approve</p>
                </div>
              </div>
              
              <div className="space-y-2">
                {timesheetPendingCount === 0 ? (
                  <p className="text-sm text-green-600 flex items-center gap-1">
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
                          className={`border rounded-xl p-2 ${
                            isOverdue ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium text-sm text-gray-900">
                                {data.managerName}
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                <span className={`font-medium ${isOverdue ? 'text-red-600' : 'text-orange-600'}`}>
                                  {data.count} pending
                                </span>
                                {' • '}
                                {data.totalHours.toFixed(2)} hours
                                {isOverdue && (
                                  <>
                                    {' • '}
                                    <span className="text-red-600">⚠ {daysOld} days old</span>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex gap-2 ml-4">
                              {managerId !== 'unassigned' && (
                                <button
                                  onClick={() => handleSendApprovalReminder(managerId, data.managerName, data.submissions)}
                                  className="px-2 py-1 text-xs bg-[#e31c79] text-white rounded-full hover:bg-[#c71865] flex items-center gap-1"
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

          {/* Quick Actions */}
          <div className="mt-4 flex gap-4">
            <button
              onClick={() => setActiveTab('unsubmitted')}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View all unsubmitted →
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View all pending approvals →
            </button>
          </div>
        </div>
      </div>

{/* MAIN CONTENT – Timesheets + Expenses WITH FILTERS/SORTING */}
<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
  {/* Search above cards */}
  <div className="mb-4 flex justify-between items-center">
    <div className="relative w-full sm:w-80">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <input
        type="text"
        placeholder="Search by employee, email, category..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#e31c79]"
      />
    </div>
  </div>

  <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
    {/* TIMESHEETS CARD */}
    <div className="border-b border-gray-100 rounded-t-2xl overflow-hidden">
      <div className="bg-[#33393c] px-4 py-3 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-white">Timesheets</h3>
              <div className="flex items-center space-x-2 text-xs text-gray-300">
                <span>
                  {visibleTimesheetsCountAllTab > 0 ? '1 – ' : '0 of '}
                  {visibleTimesheetsCountAllTab} of {allTimesheetsCount}
                </span>
              </div>
            </div>

            {/* Currently filtered pill */}
            {hasTimesheetFilters && (
              <div className="px-4 pt-2 pb-3 bg-white">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs text-gray-700">
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
                    className="ml-2 text-blue-600 hover:text-blue-700 underline decoration-blue-300"
                  >
                    Reset filters
                  </button>
                </div>
              </div>
            )}
            
            {allTimesheetsCount === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 bg-gray-50">
                No timesheets to display.
              </div>
            ) : (
              <>
                {/* Filter row */}
                <div className="px-4 py-2 bg-gray-50 flex items-center text-xs font-semibold text-gray-600 border-b border-gray-200">
                  <div className="w-8" />
                  <div className="flex-1 pr-2">
                    <select
                      value={timesheetEmployeeFilter}
                      onChange={(e) => setTimesheetEmployeeFilter(e.target.value)}
                      className="w-full text-xs px-2 py-1 border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#e31c79]"
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
                      className="w-full text-xs px-2 py-1 border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#e31c79]"
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
                      className="w-full text-xs px-2 py-1 border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#e31c79]"
                    >
                      <option value="all">Status</option>
                      {statusOptions.map(status => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24 text-right uppercase tracking-wide">
                    Hours
                  </div>
                  <div className="w-32 text-right uppercase tracking-wide">
                    Actions
                  </div>
                </div>
                
                {visibleTimesheetsAllTab.map((submission, index) => (
                  <div
                    key={submission.id}
                    className={`px-4 py-3 flex items-center text-sm ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-gray-100 border-b border-gray-100`}
                  >
                    <div className="w-8" />
                    <div className="flex-1">
                      <div className="text-gray-900 font-medium">
                        {formatName(
                          submission.employee?.first_name,
                          submission.employee?.middle_name,
                          submission.employee?.last_name
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {submission.employee?.department || 'No department'}
                      </div>
                    </div>
                    <div className="w-40 text-sm text-gray-800">
                      {submission.week_range}
                    </div>
                    <div className="w-32 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        submission.status === 'approved' ? 'bg-green-100 text-green-800' :
                        submission.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                        submission.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {submission.status === 'submitted' ? 'Pending' :
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
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleReject(submission)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => handleViewTimesheet(submission)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        disabled={processingId === submission.id}
                        title="View timesheet"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="bg-gray-50 px-4 py-2 flex justify-end items-center">
                  <span className="text-sm font-semibold text-gray-800">
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
          <div className="mt-6 rounded-2xl overflow-hidden border border-gray-100">
            <div className="bg-[#e31c79] px-4 py-3 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-white">Expenses</h3>
              <div className="flex items-center space-x-2 text-xs text-white/90">
                <span>
                  {visibleExpensesCountAllTab > 0 ? '1 – ' : '0 of '}
                  {visibleExpensesCountAllTab} of {allExpenseSubmissions.length}
                </span>
              </div>
            </div>
            
            {visibleExpensesAllTab.length === 0 ? (
              <div className="bg-gray-50 px-4 py-8 text-center text-gray-500">
                {timesheetEmployeeFilter !== 'all'
                  ? 'No expenses for the selected employee.'
                  : 'No expenses to display.'}
              </div>
            ) : (
              <>
                {/* Header row */}
                <div className="px-4 py-2 bg-gray-50 flex items-center text-xs font-semibold text-gray-600 border-b border-gray-200 uppercase tracking-wide">
                  <div className="w-8" />
                  <div className="flex-1">Employee</div>
                  <div className="w-32">Type</div>
                  <div className="w-40">Date</div>
                  <div className="w-32 text-center">Status</div>
                  <div className="w-24 text-right">Amount</div>
                  <div className="w-32 text-right">Actions</div>
                </div>
                
                {visibleExpensesAllTab.map((expense, index) => (
                  <div
                    key={expense.id}
                    className={`px-4 py-3 flex items-center text-sm ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-gray-100 border-b border-gray-100`}
                  >
                    <div className="w-8" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {formatName(
                          expense.employee?.first_name,
                          expense.employee?.middle_name,
                          expense.employee?.last_name
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
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
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        expense.status === 'approved' ? 'bg-green-100 text-green-800' :
                        expense.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                        expense.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
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
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleReject(expense)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => handleViewExpense(expense)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                
                <div className="bg-gray-50 px-4 py-2 flex justify-end items-center">
                  <span className="text-sm font-semibold text-gray-800">
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Expense details
              </h3>
              <button
                onClick={() => {
                  setIsExpenseModalOpen(false)
                  setSelectedExpense(null)
                }}
                className="p-1 rounded hover:bg-gray-100"
              >
                <XCircle className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-2 text-sm text-gray-700">
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
                    className="text-blue-600 hover:underline"
                  >
                    View uploaded receipt
                  </a>
                </div>
              )}

              {selectedExpense.rejection_reason && (
                <div className="text-red-700">
                  <span className="font-medium">Rejection reason: </span>
                  {selectedExpense.rejection_reason}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsExpenseModalOpen(false)
                  setSelectedExpense(null)
                }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
