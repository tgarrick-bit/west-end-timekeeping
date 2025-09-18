'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
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
  BarChart3
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
}

export default function AdminPage() {
  const router = useRouter()
  const { user, employee } = useAuth()
  const supabase = createClientComponentClient()
  
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('submitted')
  const [sortBy, setSortBy] = useState<'user' | 'project'>('user')
  const [adminId, setAdminId] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'all' | 'approved' | 'unapproved' | 'unsubmitted'>('unapproved')

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
      // Check if user is admin
      const { data: adminData } = await supabase
        .from('employees')
        .select('*')
        .eq('id', user.id)
        .single()

      if (adminData?.role !== 'admin') {
        // Redirect non-admins
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
      // Admin sees ALL employees
      const { data: allEmployees } = await supabase
        .from('employees')
        .select('*')
        .order('last_name', { ascending: true })

      if (allEmployees) {
        setEmployees(allEmployees)
        const employeeIds = allEmployees.map(e => e.id)
        
        let allSubmissions: Submission[] = []

        let actualStatusFilter = statusFilter
        if (activeTab === 'unsubmitted') {
          actualStatusFilter = 'draft'
        } else if (activeTab === 'unapproved') {
          actualStatusFilter = 'submitted'
        } else if (activeTab === 'approved') {
          actualStatusFilter = 'approved'
        }

        let timesheetQuery = supabase
          .from('timesheets')
          .select('*')
          .in('employee_id', employeeIds)
          
        if (activeTab !== 'all' && actualStatusFilter !== 'all') {
          timesheetQuery = timesheetQuery.eq('status', actualStatusFilter)
        }

        const { data: timesheets } = await timesheetQuery

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
              description: `Week ending ${weekEnd.toLocaleDateString()}`
            }
          })
          allSubmissions = [...allSubmissions, ...timesheetSubmissions]
        }

        let expenseQuery = supabase
          .from('expenses')
          .select('*')
          .in('employee_id', employeeIds)
          
        if (activeTab !== 'all' && actualStatusFilter !== 'all') {
          expenseQuery = expenseQuery.eq('status', actualStatusFilter)
        }

        const { data: expenses } = await expenseQuery

        if (expenses) {
          const expenseSubmissions = expenses.map(e => ({
            id: e.id,
            type: 'expense' as const,
            employee: allEmployees.find(emp => emp.id === e.employee_id),
            date: e.expense_date,
            amount: e.amount,
            status: e.status,
            description: e.description,
            category: e.category
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
    }
  }

  const handleReject = async (submission: Submission) => {
    const reason = prompt('Please provide a reason for rejection:')
    if (!reason) return

    const table = submission.type === 'timesheet' ? 'timesheets' : 'expenses'
    const reasonField = submission.type === 'timesheet' ? 'comments' : 'rejection_reason'
    
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

  const timesheetPendingCount = submissions.filter(s => s.status === 'submitted' && s.type === 'timesheet').length
  const expensePendingCount = submissions.filter(s => s.status === 'submitted' && s.type === 'expense').length
  const approvedCount = submissions.filter(s => s.status === 'approved').length
  const approvedTimesheetCount = submissions.filter(s => s.status === 'approved' && s.type === 'timesheet').length
  const approvedExpenseCount = submissions.filter(s => s.status === 'approved' && s.type === 'expense').length
  
  const filteredSubmissions = submissions

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
                  <a href="/admin/reports/time-by-department" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Time by Department
                  </a>
                  <a href="/admin/reports/time-by-client" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Time by Client
                  </a>
                  <a href="/admin/reports/time-missing" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Time Missing
                  </a>
                  <a href="/admin/reports/overtime-report" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Overtime Analysis
                  </a>
                  
                  <div className="border-t my-2"></div>
                  
                  <div className="px-4 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Expense Reports
                  </div>
                  <a href="/admin/reports/expenses-by-employee" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Expenses by Employee
                  </a>
                  <a href="/admin/reports/expenses-by-project" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Expenses by Project
                  </a>
                  <a href="/admin/reports/expenses-by-category" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Expenses by Category
                  </a>
                  
                  <div className="border-t my-2"></div>
                  
                  <div className="px-4 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Financial Reports
                  </div>
                  <a href="/admin/reports/revenue-analysis" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Revenue Analysis
                  </a>
                  <a href="/admin/reports/payroll-summary" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Payroll Summary
                  </a>
                  <a href="/admin/reports/profit-loss" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Profit & Loss
                  </a>
                  
                  <div className="border-t my-2"></div>
                  
                  <div className="px-4 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Employee Reports
                  </div>
                  <a href="/admin/reports/utilization" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Utilization Report
                  </a>
                  <a href="/admin/reports/attendance" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Attendance Summary
                  </a>
                  <a href="/admin/reports/employee-costs" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Employee Cost Analysis
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
                <select className="text-sm px-3 py-1 border border-gray-300 rounded">
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
              <div className="mt-1 flex items-center space-x-8 text-sm">
                <span>Approved: <strong>{approvedTimesheetCount}</strong></span>
                <span>Unapproved: <strong className="text-orange-600">{timesheetPendingCount}</strong></span>
                {timesheetPendingCount > 0 && (
                  <span className="text-blue-600 font-medium">
                    {timesheetPendingCount} Pending Approval{timesheetPendingCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-gray-700">Expense Summary</span>
              <div className="mt-1 flex items-center justify-end space-x-8 text-sm">
                <span>Approved: <strong>{approvedExpenseCount}</strong></span>
                <span>Unapproved: <strong className="text-orange-600">{expensePendingCount}</strong></span>
              </div>
            </div>
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
              All
            </button>
            <button 
              onClick={() => { setActiveTab('approved'); setStatusFilter('approved'); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'approved' 
                  ? 'bg-white text-gray-900 border-blue-600' 
                  : 'bg-gray-200 text-gray-600 border-gray-300 hover:bg-gray-100'
              }`}
            >
              Approved
            </button>
            <button 
              onClick={() => { setActiveTab('unapproved'); setStatusFilter('submitted'); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'unapproved' 
                  ? 'bg-white text-gray-900 border-blue-600' 
                  : 'bg-gray-200 text-gray-600 border-gray-300 hover:bg-gray-100'
              }`}
            >
              Unapproved
            </button>
            <button 
              onClick={() => { setActiveTab('unsubmitted'); setStatusFilter('draft'); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'unsubmitted' 
                  ? 'bg-white text-gray-900 border-blue-600' 
                  : 'bg-gray-200 text-gray-600 border-gray-300 hover:bg-gray-100'
              }`}
            >
              Unsubmitted Timecards
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - keeping same structure as manager page */}
      <div className="max-w-full px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-white rounded shadow-sm">
          
          {/* All Tab Content */}
          {activeTab === 'all' && (
            <div>
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-4">All Submissions</h2>
              </div>

              {/* Timecards Section */}
              <div className="border-b">
                <div className="bg-[#05202E] px-4 py-2 flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-white">Timecards</h3>
                  <div className="flex items-center space-x-2 text-xs text-gray-300">
                    <span>1 - {filteredSubmissions.filter(s => s.type === 'timesheet').length} of {filteredSubmissions.filter(s => s.type === 'timesheet').length}</span>
                  </div>
                </div>
                
                {filteredSubmissions.filter(s => s.type === 'timesheet').length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500 bg-gray-50">
                    None
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-2 bg-gray-50 flex items-center text-sm font-medium text-gray-700 border-b">
                      <input type="checkbox" className="mr-4" />
                      <div className="w-8"></div>
                      <div className="flex-1">Employee</div>
                      <div className="w-32 text-center">Department</div>
                      <div className="w-24 text-right">Hours</div>
                      <div className="w-32 text-center">Status</div>
                    </div>
                    
                    {filteredSubmissions.filter(s => s.type === 'timesheet').map((submission, index) => (
                      <div key={submission.id} className={`px-4 py-3 flex items-center ${
                        index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                      } hover:bg-gray-100 border-b`}>
                        <input 
                          type="checkbox"
                          checked={selectedItems.has(submission.id)}
                          onChange={() => toggleItemSelection(submission.id)}
                          className="mr-4"
                        />
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
                          <span className={`text-xs px-2 py-1 rounded ${
                            submission.status === 'approved' ? 'bg-green-100 text-green-700' :
                            submission.status === 'submitted' ? 'bg-yellow-100 text-yellow-700' :
                            submission.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {submission.status === 'submitted' ? 'Pending' : 
                             submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Expenses Section - same structure */}
              <div className="mt-4">
                <div className="bg-blue-900 px-4 py-2">
                  <h3 className="text-sm font-semibold text-white">Expenses</h3>
                </div>
                {filteredSubmissions.filter(s => s.type === 'expense').length === 0 ? (
                  <div className="bg-gray-50 px-4 py-8 text-center text-gray-500">
                    None
                  </div>
                ) : (
                  <>
                    {/* Add expense list here similar to timesheets */}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Other tabs follow same structure but with admin-specific features */}
          {/* ... rest of tab content ... */}

        </div>
      </div>
    </div>
  )
}