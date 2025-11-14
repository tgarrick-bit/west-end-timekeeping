'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import TimesheetModal from '@/components/TimesheetModal'
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
  Bell
} from 'lucide-react'

interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
  employee_id: string
  department: string | null
  hourly_rate: number
  manager_id: string | null
  role: string
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
  const { user, employee } = useAuth()
  const supabase = createClientComponentClient()
  
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('submitted')
  const [adminId, setAdminId] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'all' | 'approved' | 'pending' | 'rejected' | 'unsubmitted'>('pending')
  const [managerFilter, setManagerFilter] = useState<string>('all')
  
  // Modal state for timesheet viewing
  const [selectedTimesheet, setSelectedTimesheet] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)

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
        setEmployees(allEmployees)
        const employeeIds = allEmployees.map(e => e.id)
        
        let allSubmissions: Submission[] = []
  
        const { data: timesheets } = await supabase
          .from('timesheets')
          .select('*')
          .in('employee_id', employeeIds)
  
        if (timesheets) {
          const timesheetSubmissions = timesheets.map(t => {
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
              employee: allEmployees.find(e => e.id === t.employee_id),
              date: t.week_ending,
              amount: (t.total_hours || 0) * (allEmployees.find(e => e.id === t.employee_id)?.hourly_rate || 0),
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
          const expenseSubmissions = expenses.map(e => ({
            id: e.id,
            type: 'expense' as const,
            employee: allEmployees.find(emp => emp.id === e.employee_id),
            date: e.expense_date,
            amount: e.amount,
            status: e.status,
            description: e.description,
            category: e.category,
            rejection_reason: e.rejection_reason
          }))
          allSubmissions = [...allSubmissions, ...expenseSubmissions]
        }
  
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

  // Function to group pending timecards by manager
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
              managerName: `${manager.first_name} ${manager.last_name}`,
              managerEmail: manager.email,
              count: 0,
              submissions: [],
              totalHours: 0,
              oldestPending: submission.date
            })
          }
        }
        
        const data = pendingByManager.get(managerId === 'unassigned' ? 'unassigned' : managerId)!
        data.count++
        data.submissions.push(submission)
        data.totalHours += submission.hours || 0
        
        if (new Date(submission.date) < new Date(data.oldestPending)) {
          data.oldestPending = submission.date
        }
      })
    
    return pendingByManager
  }

  // Send reminder to employee for unsubmitted timecard
  const handleSendSubmittalReminder = async (submission: Submission) => {
    if (!submission.employee) return
    
    const confirmed = confirm(`Send reminder to ${submission.employee.first_name} ${submission.employee.last_name} for unsubmitted timecard?`)
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
            employee_name: `${submission.employee.first_name} ${submission.employee.last_name}`,
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

  // Send reminder to manager for pending approvals
  const handleSendApprovalReminder = async (managerId: string, managerName: string, pendingSubmissions: Submission[]) => {
    const manager = employees.find(e => e.id === managerId)
    if (!manager) {
      alert('Manager not found')
      return
    }

    const pendingDetails = pendingSubmissions.map(s => ({
      employee: `${s.employee?.first_name} ${s.employee?.last_name}`,
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

  // Bulk send reminders for all unsubmitted timecards
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
              employee_name: `${submission.employee!.first_name} ${submission.employee!.last_name}`,
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

  // Count variables
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
  
  const filteredSubmissions = (() => {
    let filtered = submissions
    
    if (activeTab === 'all') filtered = submissions
    else if (activeTab === 'approved') filtered = submissions.filter(s => s.status === 'approved')
    else if (activeTab === 'pending') filtered = submissions.filter(s => s.status === 'submitted')
    else if (activeTab === 'rejected') filtered = submissions.filter(s => s.status === 'rejected')
    else if (activeTab === 'unsubmitted') filtered = submissions.filter(s => s.status === 'draft')
    
    if (managerFilter && managerFilter !== 'all') {
      filtered = filtered.filter(s => s.employee?.manager_id === managerFilter)
    }
    
    return filtered
  })()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-900 shadow-lg">
        <div className="max-w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-lg">
                <Briefcase className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">West End Workforce</h1>
                <span className="text-xs text-gray-300">Admin Portal</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-200">{user?.email}</span>
              <button
                onClick={() => router.push('/manager')}
                className="text-sm text-gray-200 hover:text-white"
              >
                Manager View
              </button>
              <button
                onClick={async () => { await supabase.auth.signOut(); router.push('/auth/login'); }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-200 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Page Title */}
      <div className="bg-white border-b">
        <div className="max-w-full px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-gray-100 border-b">
        <div className="max-w-full px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button 
              onClick={() => router.push('/admin')}
              className="py-3 text-sm font-medium text-gray-900 border-b-2 border-blue-600"
            >
              Review & Approve
            </button>
            
            <button 
              onClick={() => router.push('/admin/employees')}
              className="py-3 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Employees
            </button>
            
            <button 
              onClick={() => router.push('/admin/clients')}
              className="py-3 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Clients
            </button>
            
            <button 
              onClick={() => router.push('/admin/projects')}
              className="py-3 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Projects
            </button>

            <button 
              onClick={() => router.push('/admin/billing')}
              className="py-3 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Billing
            </button>

            <div className="relative group">
              <button className="py-3 text-sm font-medium text-gray-600 hover:text-gray-900">
                Reports
              </button>
              <div className="absolute left-0 mt-0 w-56 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="py-2">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Time Reports
                  </div>
                  <a href="/admin/reports/time-by-project" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Time by Project
                  </a>
                  <a href="/admin/reports/time-by-employee" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Time by Employee
                  </a>
                </div>
              </div>
            </div>

            <button 
              onClick={() => router.push('/admin/settings')}
              className="py-3 text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="bg-white border-b">
        <div className="max-w-full px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm">
                  <span className="text-gray-600">Employees:</span> 
                  <strong className="ml-1">{employees.length}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <span className="text-sm">
                  <span className="text-gray-600">Pending Amount:</span> 
                  <strong className="ml-1 text-orange-600">
                    ${submissions
                      .filter(s => s.status === 'submitted')
                      .reduce((sum, s) => sum + s.amount, 0)
                      .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm">
                  <span className="text-gray-600">Pending Hours:</span> 
                  <strong className="ml-1">
                    {submissions
                      .filter(s => s.status === 'submitted' && s.type === 'timesheet')
                      .reduce((sum, s) => sum + (s.hours || 0), 0)
                      .toFixed(2)}
                  </strong>
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button 
                onClick={loadSubmissions}
                className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border rounded hover:bg-gray-50"
              >
                <RotateCw className="h-3 w-3" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white border-b">
        <div className="max-w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">Department:</span>
                <select className="text-sm px-3 py-1 border border-gray-300 rounded">
                  <option value="all">- All -</option>
                  <option value="engineering">Engineering</option>
                  <option value="sales">Sales</option>
                  <option value="marketing">Marketing</option>
                  <option value="operations">Operations</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">Manager:</span>
                <select 
                  className="text-sm px-3 py-1 border border-gray-300 rounded"
                  value={managerFilter}
                  onChange={(e) => setManagerFilter(e.target.value)}
                >
                  <option value="all">- All -</option>
                  {employees
                    .filter(e => e.role === 'manager' || e.role === 'admin')
                    .map(manager => (
                      <option key={manager.id} value={manager.id}>
                        {manager.first_name} {manager.last_name}
                      </option>
                    ))
                  }
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">Employee:</span>
                <select className="text-sm px-3 py-1 border border-gray-300 rounded">
                  <option value="all">- All -</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Items per Page:</span>
              <select className="text-sm border rounded px-2 py-1">
                <option>100</option>
                <option>50</option>
                <option>25</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-gray-50 border-b">
        <div className="max-w-full px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-gray-700">Time Summary</span>
              <div className="mt-1 flex items-center space-x-6 text-sm">
                <span>Approved: <strong className="text-green-600">{approvedTimesheetCount}</strong></span>
                <span>Pending: <strong className="text-orange-600">{timesheetPendingCount}</strong></span>
                <span>Rejected: <strong className="text-red-600">{rejectedTimesheetCount}</strong></span>
                <span>Draft: <strong className="text-gray-600">{draftTimesheetCount}</strong></span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-gray-700">Expense Summary</span>
              <div className="mt-1 flex items-center justify-end space-x-6 text-sm">
                <span>Approved: <strong className="text-green-600">{approvedExpenseCount}</strong></span>
                <span>Pending: <strong className="text-orange-600">{expensePendingCount}</strong></span>
                <span>Rejected: <strong className="text-red-600">{rejectedExpenseCount}</strong></span>
                <span>Draft: <strong className="text-gray-600">{draftExpenseCount}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monitoring Dashboard */}
      <div className="bg-white border-b">
        <div className="max-w-full px-4 sm:px-6 lg:px-8 py-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Monitoring Dashboard
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Submittal Monitoring */}
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">Timecard Submittals</h4>
                  <p className="text-sm text-gray-600 mt-1">Employees with unsubmitted timecards</p>
                </div>
                <button
                  onClick={handleBulkSubmittalReminders}
                  disabled={draftTimesheetCount === 0}
                  className={`px-3 py-1 text-sm rounded ${
                    draftTimesheetCount === 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-orange-600 text-white hover:bg-orange-700'
                  }`}
                >
                  Send All Reminders
                </button>
              </div>
              
              <div className="space-y-2">
                {draftTimesheetCount === 0 ? (
                  <p className="text-sm text-green-600">✓ All timecards submitted</p>
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
                            {submission.employee?.first_name} {submission.employee?.last_name} - Week: {submission.week_range?.split(',')[0]}
                          </span>
                          <button
                            onClick={() => handleSendSubmittalReminder(submission)}
                            className="text-orange-600 hover:text-orange-800 text-xs flex items-center gap-1"
                          >
                            <Send className="h-3 w-3" />
                            Send Reminder
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
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">Pending Approvals by Manager</h4>
                  <p className="text-sm text-gray-600 mt-1">Managers with pending timecards to approve</p>
                </div>
              </div>
              
              <div className="space-y-2">
                {timesheetPendingCount === 0 ? (
                  <p className="text-sm text-green-600">✓ All timecards approved</p>
                ) : (
                  <>
                    {Array.from(getPendingByManager().entries()).map(([managerId, data]) => {
                      const daysOld = Math.floor((new Date().getTime() - new Date(data.oldestPending).getTime()) / (1000 * 60 * 60 * 24))
                      const isOverdue = daysOld > 3
                      
                      return (
                        <div key={managerId} className={`border rounded p-2 ${isOverdue ? 'bg-red-50 border-red-300' : 'bg-gray-50'}`}>
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
                                  className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 flex items-center gap-1"
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
              View All Unsubmitted →
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View All Pending Approvals →
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-100">
        <div className="max-w-full px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-0">
            <button 
              onClick={() => { setActiveTab('all'); setStatusFilter('all'); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'all' 
                  ? 'bg-white text-gray-900 border-blue-600' 
                  : 'bg-gray-200 text-gray-600 border-gray-300 hover:bg-gray-100'
              }`}
            >
              All ({submissions.length})
            </button>
            
            <button 
              onClick={() => { setActiveTab('pending'); setStatusFilter('submitted'); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'pending' 
                  ? 'bg-white text-gray-900 border-blue-600' 
                  : 'bg-gray-200 text-gray-600 border-gray-300 hover:bg-gray-100'
              }`}
            >
              Pending ({timesheetPendingCount + expensePendingCount})
            </button>
            
            <button 
              onClick={() => { setActiveTab('approved'); setStatusFilter('approved'); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'approved' 
                  ? 'bg-white text-gray-900 border-blue-600' 
                  : 'bg-gray-200 text-gray-600 border-gray-300 hover:bg-gray-100'
              }`}
            >
              Approved ({approvedCount})
            </button>
            
            <button 
              onClick={() => { setActiveTab('rejected'); setStatusFilter('rejected'); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'rejected' 
                  ? 'bg-white text-gray-900 border-blue-600' 
                  : 'bg-gray-200 text-gray-600 border-gray-300 hover:bg-gray-100'
              }`}
            >
              Rejected ({rejectedTimesheetCount + rejectedExpenseCount})
            </button>
            
            <button 
              onClick={() => { setActiveTab('unsubmitted'); setStatusFilter('draft'); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'unsubmitted' 
                  ? 'bg-white text-gray-900 border-blue-600' 
                  : 'bg-gray-200 text-gray-600 border-gray-300 hover:bg-gray-100'
              }`}
            >
              Unsubmitted ({draftTimesheetCount + draftExpenseCount})
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-full px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-white rounded shadow-sm">
          
          {/* ALL TAB CONTENT */}
          {activeTab === 'all' && (
            <div>
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-4">All Submissions</h2>
              </div>

              {/* Timecards Section */}
              <div className="border-b">
                <div className="bg-[#05202E] px-4 py-2 flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-white">All Timecards</h3>
                  <div className="flex items-center space-x-2 text-xs text-gray-300">
                    <span>1 - {allTimesheetsCount} of {allTimesheetsCount}</span>
                  </div>
                </div>
                
                {allTimesheetsCount === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500 bg-gray-50">
                    None
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-2 bg-gray-50 flex items-center text-sm font-medium text-gray-700 border-b">
                      <div className="w-8"></div>
                      <div className="flex-1">Employee</div>
                      <div className="w-32 text-center">Department</div>
                      <div className="w-24 text-right">Hours</div>
                      <div className="w-32 text-center">Status</div>
                      <div className="w-24 text-center">Actions</div>
                    </div>
                    
                    {filteredSubmissions.filter(s => s.type === 'timesheet').map((submission, index) => (
                      <div key={submission.id} className={`px-4 py-3 flex items-center ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      } hover:bg-gray-100 border-b`}>
                        <div className="w-8"></div>
                        <div className="flex-1">
                          <div className="text-sm">
                            <span className="font-medium">Week: </span>
                            <span className="ml-1">{submission.week_range}</span>
                          </div>
                          <div className="text-sm text-gray-600 mt-0.5">
                            {submission.employee?.first_name} {submission.employee?.last_name}
                          </div>
                        </div>
                        <div className="w-32 text-center text-sm text-gray-600">
                          {submission.employee?.department || 'N/A'}
                        </div>
                        <div className="w-24 text-right font-medium text-sm">
                          {submission.hours?.toFixed(2) || '0.00'}
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
                        <div className="w-24 text-center">
                          <button 
                            onClick={() => handleViewTimesheet(submission)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            disabled={processingId === submission.id}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {/* PENDING TAB CONTENT */}
          {activeTab === 'pending' && (
            <div>
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-4">Pending Approvals</h2>
              </div>

              <div className="border-b">
                <div className="bg-[#05202E] px-4 py-2 flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-white">Pending Timecards</h3>
                  <div className="flex items-center space-x-2 text-xs text-gray-300">
                    <span>{timesheetPendingCount} pending</span>
                  </div>
                </div>
                
                {filteredSubmissions.filter(s => s.type === 'timesheet' && s.status === 'submitted').length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500 bg-gray-50">
                    No pending timecards awaiting approval
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-2 bg-gray-50 flex items-center text-sm font-medium text-gray-700 border-b">
                      <input 
                        type="checkbox" 
                        className="mr-4" 
                        onChange={(e) => e.target.checked ? selectAllVisible() : setSelectedItems(new Set())} 
                      />
                      <div className="w-8"></div>
                      <div className="flex-1">Employee</div>
                      <div className="w-32 text-center">Manager</div>
                      <div className="w-32 text-center">Department</div>
                      <div className="w-24 text-right">Hours</div>
                      <div className="w-32 text-center">Actions</div>
                    </div>
                    
                    {filteredSubmissions.filter(s => s.type === 'timesheet' && s.status === 'submitted').map((submission, index) => {
                      const manager = submission.employee?.manager_id 
                        ? employees.find(e => e.id === submission.employee?.manager_id)
                        : null
                      
                      return (
                        <div key={submission.id} className={`px-4 py-3 flex items-center ${
                          index % 2 === 0 ? 'bg-yellow-50' : 'bg-white'
                        } hover:bg-yellow-100 border-b`}>
                          <input 
                            type="checkbox"
                            checked={selectedItems.has(submission.id)}
                            onChange={() => toggleItemSelection(submission.id)}
                            className="mr-4"
                          />
                          <div className="w-8">
                            <AlertCircle className="h-5 w-5 text-yellow-600" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm">
                              <span className="font-medium">Week: </span>
                              <span className="ml-1">{submission.week_range}</span>
                            </div>
                            <div className="text-sm text-gray-600 mt-0.5">
                              {submission.employee?.first_name} {submission.employee?.last_name}
                            </div>
                          </div>
                          <div className="w-32 text-center text-sm text-gray-600">
                            {manager ? `${manager.first_name} ${manager.last_name}` : 'Unassigned'}
                          </div>
                          <div className="w-32 text-center text-sm text-gray-600">
                            {submission.employee?.department || 'N/A'}
                          </div>
                          <div className="w-24 text-right font-medium text-sm">
                            {submission.hours?.toFixed(2) || '0.00'}
                          </div>
                          <div className="w-32 text-center flex items-center justify-center space-x-2">
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
                            <button 
                              onClick={() => handleViewTimesheet(submission)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              disabled={processingId === submission.id}
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}

                    {timesheetPendingCount > 0 && (
                      <div className="bg-gray-100 px-4 py-2 flex justify-between items-center">
                        <span className="text-sm font-bold">
                          Total: {filteredSubmissions.filter(s => s.type === 'timesheet' && s.status === 'submitted')
                            .reduce((sum, s) => sum + (s.hours || 0), 0).toFixed(2)} hours
                        </span>
                        <button 
                          onClick={handleBulkApprove}
                          disabled={selectedItems.size === 0}
                          className={`px-6 py-2 rounded font-medium flex items-center ${
                            selectedItems.size === 0 
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          Approve Selected ({selectedItems.size})
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* APPROVED TAB */}
          {activeTab === 'approved' && (
            <div>
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-4">Approved Submissions</h2>
              </div>
              <div className="px-4 py-8 text-center text-gray-500 bg-gray-50">
                {approvedCount === 0 ? 'No approved submissions' : `${approvedCount} approved submission(s)`}
              </div>
            </div>
          )}

          {/* REJECTED TAB */}
          {activeTab === 'rejected' && (
            <div>
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-4">Rejected Submissions</h2>
              </div>
              <div className="px-4 py-8 text-center text-gray-500 bg-gray-50">
                {rejectedTimesheetCount + rejectedExpenseCount === 0 ? 'No rejected submissions' : `${rejectedTimesheetCount + rejectedExpenseCount} rejected submission(s)`}
              </div>
            </div>
          )}

          {/* UNSUBMITTED TAB */}
          {activeTab === 'unsubmitted' && (
            <div>
              <div className="p-4 flex justify-between items-center">
                <h2 className="text-lg font-semibold">Unsubmitted Timecards</h2>
                <button
                  onClick={handleBulkSubmittalReminders}
                  disabled={draftTimesheetCount === 0}
                  className={`px-4 py-2 text-sm rounded flex items-center gap-2 ${
                    draftTimesheetCount === 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-orange-600 text-white hover:bg-orange-700'
                  }`}
                >
                  <Send className="h-4 w-4" />
                  Send Reminders to All ({draftTimesheetCount})
                </button>
              </div>
              
              <div className="border-b">
                <div className="bg-[#05202E] px-4 py-2 flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-white">Draft Timecards</h3>
                  <div className="flex items-center space-x-2 text-xs text-gray-300">
                    <span>{draftTimesheetCount} draft</span>
                  </div>
                </div>
                
                {draftTimesheetCount === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500 bg-gray-50">
                    No unsubmitted timecards
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-2 bg-gray-50 flex items-center text-sm font-medium text-gray-700 border-b">
                      <div className="w-8"></div>
                      <div className="flex-1">Employee</div>
                      <div className="w-32 text-center">Manager</div>
                      <div className="w-32 text-center">Department</div>
                      <div className="w-24 text-right">Hours</div>
                      <div className="w-40 text-center">Actions</div>
                    </div>
                    
                    {filteredSubmissions.filter(s => s.type === 'timesheet' && s.status === 'draft').map((submission, index) => {
                      const manager = submission.employee?.manager_id 
                        ? employees.find(e => e.id === submission.employee?.manager_id)
                        : null
                      
                      return (
                        <div key={submission.id} className={`px-4 py-3 flex items-center ${
                          index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                        } hover:bg-gray-100 border-b`}>
                          <div className="w-8">
                            <AlertCircle className="h-5 w-5 text-gray-400" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm">
                              <span className="font-medium">Week: </span>
                              <span className="ml-1">{submission.week_range}</span>
                            </div>
                            <div className="text-sm text-gray-600 mt-0.5">
                              {submission.employee?.first_name} {submission.employee?.last_name}
                            </div>
                          </div>
                          <div className="w-32 text-center text-sm text-gray-600">
                            {manager ? `${manager.first_name} ${manager.last_name}` : 'Unassigned'}
                          </div>
                          <div className="w-32 text-center text-sm text-gray-600">
                            {submission.employee?.department || 'N/A'}
                          </div>
                          <div className="w-24 text-right font-medium text-sm">
                            {submission.hours?.toFixed(2) || '0.00'}
                          </div>
                          <div className="w-40 text-center flex items-center justify-center space-x-2">
                            <button 
                              onClick={() => handleSendSubmittalReminder(submission)}
                              className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 flex items-center gap-1"
                            >
                              <Send className="h-3 w-3" />
                              Remind
                            </button>
                            <button 
                              onClick={() => handleViewTimesheet(submission)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              disabled={processingId === submission.id}
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            </div>
          )}
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
    </div>
  )
}