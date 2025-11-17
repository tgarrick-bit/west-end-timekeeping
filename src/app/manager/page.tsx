'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import TimesheetModal from '@/components/TimesheetModal'
import Image from 'next/image'
import { 
  FileText,
  CheckCircle,
  XCircle,
  LogOut,
  AlertCircle,
  ChevronDown,
  Eye,
  Receipt,
  Download,
  Calendar,
  User,
  RefreshCw,
  SlidersHorizontal,
  Search,
} from 'lucide-react'

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
    return [safeFirst, safeMiddle, safeLast].filter(Boolean).join(' ')
  }

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
  manager_id: string | null
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
  created_at: string
  updated_at: string
}

interface TimesheetEntry {
  id: string
  timesheet_id: string
  date: string
  project_id: string
  hours: number
  description: string | null
  project?: {
    id: string
    name: string
    code: string
  }
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
  receipt_url?: string | null
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
  receipt_url?: string | null
}

type ProjectOption = {
  id: string
  name: string
  code: string
}

export default function ManagerPage() {
  const router = useRouter()
  const { employee } = useAuth()
  const supabase = createClientComponentClient()
  
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [managerId, setManagerId] = useState<string | null>(null)

  const [selectedExpense, setSelectedExpense] = useState<any>(null)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [selectedTimesheet, setSelectedTimesheet] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)

  // project filter + metadata
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([])
  const [timesheetProjectMap, setTimesheetProjectMap] = useState<Record<string, string[]>>({})

  // in-card timesheet filters
  const [timesheetEmployeeFilter, setTimesheetEmployeeFilter] = useState<string>('all')
  const [timesheetWeekFilter, setTimesheetWeekFilter] = useState<string>('all')
  const [timesheetStatusCardFilter, setTimesheetStatusCardFilter] = useState<string>('all')

  const [searchTerm, setSearchTerm] = useState<string>('')

  useEffect(() => {
    fetchManagerId()
  }, [])

  useEffect(() => {
    if (managerId) {
      loadSubmissions()
    }
  }, [managerId])

  const fetchManagerId = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setManagerId(user.id)
    }
  }

  // Normalize to Sunday–Saturday week and return label + end date
  const getWeekRange = (dateStr: string) => {
    const d = new Date(dateStr)
    const day = d.getDay() // 0=Sun
    const sunday = new Date(d)
    sunday.setDate(d.getDate() - day)
    const saturday = new Date(sunday)
    saturday.setDate(sunday.getDate() + 6)

    const fmt = (date: Date) => {
      const month = date.toLocaleDateString('en-US', { month: 'short' })
      const dayNum = date.getDate().toString().padStart(2, '0')
      return `${month} ${dayNum}`
    }

    const label = `${fmt(sunday)} - ${fmt(saturday)}, ${saturday.getFullYear()}`
    const endDate = saturday
    return { label, endDate }
  }

  const loadSubmissions = async () => {
    if (!managerId) return
    setIsLoading(true)
    
    try {
      // 1) Get employees for this manager (same as before)
      const { data: allEmployees, error: empError } = await supabase
        .from('employees')
        .select('*')
        .or(`id.eq.${managerId},manager_id.eq.${managerId}`)
        .order('last_name', { ascending: true })

      if (empError) throw empError
      if (!allEmployees || allEmployees.length === 0) {
        setEmployees([])
        setSubmissions([])
        setProjectOptions([])
        setTimesheetProjectMap({})
        return
      }

      setEmployees(allEmployees as Employee[])
      const employeeIds = (allEmployees as Employee[]).map(e => e.id)

      // 2) Get projects this manager can approve (from time_approvers)
      const { data: approverRows, error: approverError } = await supabase
        .from('time_approvers')
        .select('project_id')
        .eq('employee_id', managerId)
        .eq('can_approve', true)

      if (approverError) throw approverError

      const approverProjectIds = (approverRows || [])
        .map(r => r.project_id)
        .filter(Boolean)

      let timesheets: any[] = []
      let timesheetEntries: any[] = []

      if (approverProjectIds.length > 0) {
        // 3a) Manager has project-level approver assignments:
        // find timesheet_entries that match those projects + employees
        const { data: entryRows, error: entryError } = await supabase
  .from('timesheet_entries')
  .select('timesheet_id, project_id')
  .in('project_id', approverProjectIds)

        if (entryError) throw entryError

        const timesheetIds = Array.from(
          new Set((entryRows || []).map(e => e.timesheet_id).filter(Boolean))
        )

        if (timesheetIds.length === 0) {
          // No relevant timesheets
          setSubmissions([])
          setProjectOptions([])
          setTimesheetProjectMap({})
          return
        }

        // Load only timesheets that have at least one entry on a project
        // this manager approves, and belong to this manager's employees
        const { data: tsData, error: tsError } = await supabase
          .from('timesheets')
          .select('*')
          .in('id', timesheetIds)
          .in('employee_id', employeeIds)

        if (tsError) throw tsError
        timesheets = tsData || []

        // Also load entries with project metadata for those timesheets
        const { data: fullEntries, error: fullEntryError } = await supabase
          .from('timesheet_entries')
          .select(`
            id,
            timesheet_id,
            project_id,
            project:projects!timesheet_entries_project_id_fkey (
              id,
              name,
              code
            )
          `)
          .in('timesheet_id', timesheetIds)

        if (fullEntryError) throw fullEntryError
        timesheetEntries = fullEntries || []
      } else {
        // 3b) No project-level approver rows yet:
        // fallback to original behaviour (all timesheets for this manager's employees)
        const { data: tsData, error: tsError } = await supabase
          .from('timesheets')
          .select('*')
          .in('employee_id', employeeIds)

        if (tsError) throw tsError
        timesheets = tsData || []

        if (timesheets.length > 0) {
          const { data: fullEntries, error: fullEntryError } = await supabase
            .from('timesheet_entries')
            .select(`
              id,
              timesheet_id,
              project_id,
              project:projects!timesheet_entries_project_id_fkey (
                id,
                name,
                code
              )
            `)
            .in('timesheet_id', timesheets.map(t => t.id))

          if (fullEntryError) throw fullEntryError
          timesheetEntries = fullEntries || []
        }
      }

      // 4) Build project filter options + map of timesheet -> project ids
      const projectMap: Record<string, ProjectOption> = {}
      const tMap: Record<string, string[]> = {}

      timesheetEntries.forEach((entry: any) => {
        if (!entry.project_id) return
        if (!tMap[entry.timesheet_id]) {
          tMap[entry.timesheet_id] = []
        }
        tMap[entry.timesheet_id].push(entry.project_id)

        if (entry.project) {
          projectMap[entry.project.id] = {
            id: entry.project.id,
            name: entry.project.name,
            code: entry.project.code
          }
        }
      })

      setTimesheetProjectMap(tMap)
      setProjectOptions(Object.values(projectMap))

      // 5) Build submission objects (timesheets + expenses like before)
      let allSubmissions: Submission[] = []

      const timesheetSubmissions = timesheets.map((t: any) => {
        const { label: week_range, endDate } = getWeekRange(t.week_ending)
        const emp = (allEmployees as Employee[]).find(e => e.id === t.employee_id)
        const hourlyRate = emp?.hourly_rate || 0
        return {
          id: t.id,
          type: 'timesheet' as const,
          employee: emp,
          date: endDate.toISOString(),
          amount: (t.total_hours || 0) * hourlyRate,
          hours: t.total_hours,
          overtime_hours: t.overtime_hours,
          status: t.status,
          week_range,
          description: `Week ending ${endDate.toLocaleDateString()}`
        }
      })

      allSubmissions = [...allSubmissions, ...timesheetSubmissions]

      // EXPENSES: unchanged – still by employees
      const { data: expenses, error: expError } = await supabase
        .from('expenses')
        .select('*')
        .in('employee_id', employeeIds)

      if (expError) throw expError

      if (expenses && expenses.length > 0) {
        const expenseSubmissions = (expenses as any[]).map(e => ({
          id: e.id,
          type: 'expense' as const,
          employee: (allEmployees as Employee[]).find(emp => emp.id === e.employee_id),
          date: e.expense_date,
          amount: e.amount,
          status: e.status,
          description: e.description,
          category: e.category,
          receipt_url: e.receipt_url
        }))
        allSubmissions = [...allSubmissions, ...expenseSubmissions]
      }

      // Sort by date desc (same as before)
      allSubmissions.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )

      setSubmissions(allSubmissions)
    } catch (error) {
      console.error('Error loading submissions:', error)
      // On error, don't blow up the UI
      setSubmissions([])
      setProjectOptions([])
      setTimesheetProjectMap({})
    } finally {
      setIsLoading(false)
    }
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

  const handleViewExpense = (expense: Submission) => {
    setSelectedExpense(expense)
    setShowExpenseModal(true)
  }

  const handleApprove = async (submission: Submission) => {
    const table = submission.type === 'timesheet' ? 'timesheets' : 'expenses'
    
    const { error } = await supabase
      .from(table)
      .update({ 
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: managerId
      })
      .eq('id', submission.id)

    if (!error) {
      loadSubmissions()
      
      if (selectedTimesheet?.id === submission.id) {
        setIsModalOpen(false)
        setSelectedTimesheet(null)
      }
      if (selectedExpense?.id === submission.id) {
        setShowExpenseModal(false)
        setSelectedExpense(null)
      }
    }
  }

  const handleReject = async (submission: Submission) => {
    const reason = prompt('Please provide a reason for rejection (this will be visible to the employee):')
    if (!reason) return

    const table = submission.type === 'timesheet' ? 'timesheets' : 'expenses'
    const reasonField = submission.type === 'timesheet' ? 'comments' : 'rejection_reason'
    
    const { error } = await supabase
      .from(table)
      .update({ 
        status: 'rejected',
        approved_at: new Date().toISOString(),
        approved_by: managerId,
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
        setShowExpenseModal(false)
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

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  // base stats (for overview chips)
  const allTimesheetsCount = submissions.filter(s => s.type === 'timesheet').length
  const timesheetPendingCount = submissions.filter(s => s.status === 'submitted' && s.type === 'timesheet').length
  const expensePendingCount = submissions.filter(s => s.status === 'submitted' && s.type === 'expense').length
  const approvedTimesheetCount = submissions.filter(s => s.status === 'approved' && s.type === 'timesheet').length
  const approvedExpenseCount = submissions.filter(s => s.status === 'approved' && s.type === 'expense').length

  // Search + project filter applied before card-level filters
  const baseFilteredSubmissions = (() => {
    let filtered = submissions

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(s => {
        const emp = s.employee
        const name = formatName(emp?.first_name, emp?.middle_name, emp?.last_name, 'firstLast').toLowerCase()
        const email = emp?.email?.toLowerCase() || ''
        const cat = (s.category || '').toLowerCase()
        const desc = (s.description || '').toLowerCase()
        const week = (s.week_range || '').toLowerCase()
        return (
          name.includes(term) ||
          email.includes(term) ||
          cat.includes(term) ||
          desc.includes(term) ||
          week.includes(term)
        )
      })
    }

    if (projectFilter !== 'all') {
      filtered = filtered.filter(s => {
        if (s.type !== 'timesheet') return true
        const projectIds = timesheetProjectMap[s.id] || []
        return projectIds.includes(projectFilter)
      })
    }

    return filtered
  })()
  
  const allTimesheetSubmissions = baseFilteredSubmissions.filter(s => s.type === 'timesheet')
  const allExpenseSubmissions = baseFilteredSubmissions.filter(s => s.type === 'expense')

  // options for in-card filters (alpha)
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

  // visible timesheets: filters + alpha sort
  const visibleTimesheetsAllTab = allTimesheetSubmissions
    .filter(s => {
      if (timesheetEmployeeFilter !== 'all' && s.employee?.id !== timesheetEmployeeFilter) return false
      if (timesheetWeekFilter !== 'all' && s.week_range !== timesheetWeekFilter) return false
      if (timesheetStatusCardFilter !== 'all' && s.status !== timesheetStatusCardFilter) return false
      return true
    })
    .sort((a, b) =>
      formatName(
        a.employee?.first_name,
        a.employee?.middle_name,
        a.employee?.last_name
      ).localeCompare(
        formatName(
          b.employee?.first_name,
          b.employee?.middle_name,
          b.employee?.last_name
        )
      )
    )

  // visible expenses: filters + alpha sort
  const visibleExpensesAllTab = allExpenseSubmissions
    .filter(e => {
      if (timesheetEmployeeFilter !== 'all' && e.employee?.id !== timesheetEmployeeFilter) return false
      return true
    })
    .sort((a, b) =>
      formatName(
        a.employee?.first_name,
        a.employee?.middle_name,
        a.employee?.last_name
      ).localeCompare(
        formatName(
          b.employee?.first_name,
          b.employee?.middle_name,
          b.employee?.last_name
        )
      )
    )

  const visibleTimesheetsCountAllTab = visibleTimesheetsAllTab.length
  const visibleExpensesCountAllTab = visibleExpensesAllTab.length

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e31c79] mx-auto"></div>
          <p className="mt-3 text-gray-600">Loading submissions...</p>
        </div>
      </div>
    )
  }

  const greeting = getTimeBasedGreeting()
  const displayName = employee?.first_name || 'Employee'

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
  }

  return (
    <div className="min-h-screen bg-[#F7F8FC]">
      {/* HEADER */}
      <header className="bg-[#05202E] shadow-sm">
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
                  Manager Portal
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={loadSubmissions}
                className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-200 hover:text-white transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
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

      {/* PAGE TITLE */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[#05202E]">Review dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">
                Review and approve timesheets and expenses for your team.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* NAV TABS – Review + Reports */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button 
              onClick={() => router.push('/manager')}
              className="py-3 text-sm font-medium text-[#05202E] border-b-2 border-[#e31c79]"
            >
              Review
            </button>

            <div className="relative group">
              <button className="py-3 text-sm font-medium text-gray-500 hover:text-[#05202E] flex items-center gap-1">
                Reports
                <ChevronDown className="h-4 w-4" />
              </button>
              <div className="absolute left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                <div className="py-2 text-sm">
                  <div className="px-4 py-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Time reports
                  </div>
                  <a href="/manager/reports/time-by-project" className="block px-4 py-1.5 hover:bg-gray-50 text-gray-700">
                    Time by project
                  </a>
                  <a href="/manager/reports/time-by-employee" className="block px-4 py-1.5 hover:bg-gray-50 text-gray-700">
                    Time by employee
                  </a>
                  <a href="/manager/reports/time-by-class" className="block px-4 py-1.5 hover:bg-gray-50 text-gray-700">
                    Time by class
                  </a>
                  <a href="/manager/reports/time-by-approver" className="block px-4 py-1.5 hover:bg-gray-50 text-gray-700">
                    Time by approver
                  </a>
                  <a href="/manager/reports/time-missing" className="block px-4 py-1.5 hover:bg-gray-50 text-gray-700">
                    Time missing
                  </a>

                  <div className="border-t my-2" />

                  <div className="px-4 py-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Expense reports
                  </div>
                  <a href="/manager/reports/expenses-by-employee" className="block px-4 py-1.5 hover:bg-gray-50 text-gray-700">
                    Expenses by employee
                  </a>
                  <a href="/manager/reports/expenses-by-project" className="block px-4 py-1.5 hover:bg-gray-50 text-gray-700">
                    Expenses by project
                  </a>
                  <a href="/manager/reports/expenses-by-approver" className="block px-4 py-1.5 hover:bg-gray-50 text-gray-700">
                    Expenses by approver
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TOP FILTER BAR – Project-only + rows per page */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-3 gap-3">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-[#e31c79]" />
                <span className="sr-only">Filters</span>
              </div>

              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#e31c79]"
              >
                <option value="all">Project: All</option>
                {projectOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.code}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Rows per page:</span>
              <select className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#e31c79]">
                <option>100</option>
                <option>50</option>
                <option>25</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* OVERVIEW CHIPS */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-center">
            <div className="flex flex-wrap gap-4 justify-center">
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-gray-200 text-sm text-gray-900 bg-[#E5DDD8]">
                <span className="font-semibold">Timesheets</span>
                <span>|</span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Approved: {approvedTimesheetCount}
                </span>
                <span>|</span>
                <span className="flex items-center gap-1 text-amber-700">
                  <AlertCircle className="h-4 w-4" />
                  Pending: {timesheetPendingCount}
                </span>
              </div>

              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-gray-200 text-sm text-gray-900 bg-[#E5DDD8]">
                <span className="font-semibold">Expenses</span>
                <span>|</span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Approved: {approvedExpenseCount}
                </span>
                <span>|</span>
                <span className="flex items-center gap-1 text-amber-700">
                  <AlertCircle className="h-4 w-4" />
                  Pending: {expensePendingCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT – Timesheets + Expenses (with search above cards) */}
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
          {/* TIMESHEETS */}
          <div className="border-b border-gray-100 rounded-t-2xl overflow-hidden">
            <div className="bg-[#05202E] px-4 py-3 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-white">Timesheets</h3>
              <div className="flex items-center space-x-2 text-xs text-gray-300">
                <span>
                  {visibleTimesheetsCountAllTab > 0 ? '1 – ' : '0 of '}
                  {visibleTimesheetsCountAllTab} of {allTimesheetsCount}
                </span>
              </div>
            </div>

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
                        {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                      </span>
                    </div>
                    <div className="w-24 text-right font-medium">
                      {submission.hours?.toFixed(2) || '0.00'}
                    </div>
                    <div className="w-32 flex justify-end items-center gap-2">
                      {submission.status === 'submitted' && (
                        <>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleApprove(submission)
                            }}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleReject(submission)
                            }}
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

          {/* EXPENSES */}
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
                        {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                      </span>
                    </div>
                    <div className="w-24 text-right font-medium">
                      ${expense.amount.toFixed(2)}
                    </div>
                    <div className="w-32 flex justify-end items-center gap-2">
                      {expense.status === 'submitted' && (
                        <>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleApprove(expense)
                            }}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleReject(expense)
                            }}
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

      {/* Expense Details Modal */}
      {showExpenseModal && selectedExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-[#e31c79] text-white p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Expense Details</h2>
                <button
                  onClick={() => {
                    setShowExpenseModal(false)
                    setSelectedExpense(null)
                  }}
                  className="text-white hover:text-gray-200"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="flex items-center gap-4">
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  selectedExpense.status === 'approved' ? 'bg-green-500 text-white' :
                  selectedExpense.status === 'submitted' ? 'bg-yellow-500 text-white' :
                  selectedExpense.status === 'rejected' ? 'bg-red-500 text-white' :
                  'bg-gray-500 text-white'
                }`}>
                  {selectedExpense.status.charAt(0).toUpperCase() + selectedExpense.status.slice(1)}
                </span>
                <span className="flex items-center gap-2 text-white">
                  <Calendar className="h-4 w-4" />
                  Expense Date:{' '}
                  {new Date(selectedExpense.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-gray-50 rounded">
                  <p className="text-sm text-gray-600 mb-1">Amount</p>
                  <p className="text-2xl font-bold text-[#e31c79]">
                    ${selectedExpense.amount.toFixed(2)}
                  </p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded">
                  <p className="text-sm text-gray-600 mb-1">Category</p>
                  <p className="text-xl font-bold">
                    {selectedExpense.category || '-'}
                  </p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded">
                  <p className="text-sm text-gray-600 mb-1">Employee</p>
                  <p className="text-lg font-bold">
                    {formatName(
                      selectedExpense.employee?.first_name,
                      selectedExpense.employee?.middle_name,
                      selectedExpense.employee?.last_name,
                      'firstLast'
                    )}
                  </p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded">
                  <p className="text-sm text-gray-600 mb-1">Department</p>
                  <p className="text-lg font-bold text-green-600">
                    {selectedExpense.employee?.department || 'General'}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-[#e31c79]" />
                  Expense information
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          Field
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          Details
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">Date</td>
                        <td className="py-3 px-4">
                          {new Date(selectedExpense.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">Category</td>
                        <td className="py-3 px-4">
                          {selectedExpense.category || 'Not specified'}
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">Amount</td>
                        <td className="py-3 px-4 text-lg font-bold text-[#e31c79]">
                          ${selectedExpense.amount.toFixed(2)}
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">Employee</td>
                        <td className="py-3 px-4">
                          {formatName(
                            selectedExpense.employee?.first_name,
                            selectedExpense.employee?.middle_name,
                            selectedExpense.employee?.last_name,
                            'firstLast'
                          )}
                          <br />
                          <span className="text-sm text-gray-500">
                            {selectedExpense.employee?.email}
                          </span>
                        </td>
                      </tr>
                      {selectedExpense.description && (
                        <tr className="hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">Description</td>
                          <td className="py-3 px-4">
                            {selectedExpense.description}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Receipt section */}
              {selectedExpense.receipt_url ? (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#e31c79]" />
                    Receipt attachment
                  </h3>
                  <div className="border rounded-lg p-4 bg-gray-50">
                    {selectedExpense.receipt_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <div>
                        <img 
                          src={selectedExpense.receipt_url} 
                          alt="Expense receipt" 
                          className="max-w-full h-auto rounded shadow-md cursor-pointer mb-3"
                          style={{ maxHeight: '400px', objectFit: 'contain' }}
                          onClick={() => window.open(selectedExpense.receipt_url, '_blank')}
                        />
                        <p className="text-sm text-gray-500 text-center">
                          Click image to view full size
                        </p>
                      </div>
                    ) : selectedExpense.receipt_url.match(/\.pdf$/i) ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="h-10 w-10 text-gray-400" />
                          <div>
                            <p className="font-medium">PDF receipt</p>
                            <p className="text-sm text-gray-500">
                              Click to view in a new tab
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => window.open(selectedExpense.receipt_url, '_blank')}
                          className="px-4 py-2 bg-[#e31c79] text-white rounded hover:bg-[#c71865] flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View receipt
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="h-10 w-10 text-gray-400" />
                          <div>
                            <p className="font-medium">Receipt file</p>
                            <p className="text-sm text-gray-500">
                              Click to download
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => window.open(selectedExpense.receipt_url, '_blank')}
                          className="px-4 py-2 bg-[#e31c79] text-white rounded hover:bg-[#c71865] flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#e31c79]" />
                    Receipt attachment
                  </h3>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50 text-center">
                    <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No receipt attached</p>
                  </div>
                </div>
              )}

              <div className="bg-gray-100 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Expense total:</span>
                  <span className="text-2xl font-bold text-[#e31c79]">
                    ${selectedExpense.amount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t flex justify-between">
              <button
                onClick={() => {
                  setShowExpenseModal(false)
                  setSelectedExpense(null)
                }}
                className="px-6 py-2 text-gray-700 hover:text-gray-900 font-medium"
              >
                Close
              </button>
              
              {selectedExpense.status === 'submitted' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      handleReject(selectedExpense)
                    }}
                    className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2 font-medium"
                  >
                    <XCircle className="h-5 w-5" />
                    Reject
                  </button>
                  <button
                    onClick={() => {
                      handleApprove(selectedExpense)
                    }}
                    className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2 font-medium"
                  >
                    <CheckCircle className="h-5 w-5" />
                    Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
