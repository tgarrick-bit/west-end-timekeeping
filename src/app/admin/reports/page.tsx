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
  RotateCw
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

export default function ManagerPage() {
  const router = useRouter()
  const { user, employee } = useAuth()
  const supabase = createClientComponentClient()
  
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('submitted')
  const [sortBy, setSortBy] = useState<'user' | 'project'>('user')
  const [managerId, setManagerId] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'all' | 'approved' | 'unapproved' | 'unsubmitted'>('unapproved')

  useEffect(() => {
    fetchManagerId()
  }, [])

  useEffect(() => {
    if (managerId) {
      loadSubmissions()
    }
  }, [managerId, statusFilter, activeTab])

  const fetchManagerId = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setManagerId(user.id)
    }
  }

  const loadSubmissions = async () => {
    if (!managerId) return
    
    setIsLoading(true)
    
    try {
      const { data: allEmployees } = await supabase
        .from('employees')
        .select('*')

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
        approved_by: managerId
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
        approved_by: managerId,
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e31c79] mx-auto"></div>
          <p className="mt-3 text-gray-600">Loading submissions...</p>
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
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">West End Workforce</h1>
                <span className="text-xs text-gray-300">Approval Management</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-200">{user?.email}</span>
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
            <h1 className="text-2xl font-semibold text-gray-900">Review</h1>
          </div>
        </div>
      </div>

      {/* Navigation Tabs - Add this after the Page Title section */}
      <div className="bg-gray-100 border-b">
        <div className="max-w-full px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button 
              onClick={() => router.push('/manager')}
              className="py-3 text-sm font-medium text-gray-900 border-b-2 border-[#e31c79]"
            >
              Review
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
                  <a href="/manager/reports/time-by-project" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Time by Project
                  </a>
                  <a href="/manager/reports/time-by-employee" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Time by Employee
                  </a>
                  <a href="/manager/reports/time-by-class" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Time by Class
                  </a>
                  <a href="/manager/reports/time-by-approver" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Time by Approver
                  </a>
                  <a href="/manager/reports/time-missing" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Time Missing
                  </a>
                  
                  <div className="border-t my-2"></div>
                  
                  <div className="px-4 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Expense Reports
                  </div>
                  <a href="/manager/reports/expenses-by-employee" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Expenses by Employee
                  </a>
                  <a href="/manager/reports/expenses-by-project" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Expenses by Project
                  </a>
                  <a href="/manager/reports/expenses-by-approver" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Expenses by Approver
                  </a>
                </div>
              </div>
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
                <span className="text-sm text-gray-700">Time Detail Level:</span>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'user' | 'project')}
                  className="text-sm px-3 py-1 border border-gray-300 rounded"
                >
                  <option value="user">By User</option>
                  <option value="project">By Project</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">Time Project:</span>
                <select className="text-sm px-3 py-1 border border-gray-300 rounded">
                  <option value="all">- All -</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">User Class:</span>
                <select className="text-sm px-3 py-1 border border-gray-300 rounded">
                  <option value="all">- All -</option>
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
                <span>Unapproved: <strong className="text-[#e31c79]">{timesheetPendingCount}</strong></span>
                {timesheetPendingCount > 0 && (
                  <span className="text-blue-600 font-medium">
                    {timesheetPendingCount} Warning{timesheetPendingCount > 1 ? 's' : ''}!
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-gray-700">Expense Summary</span>
              <div className="mt-1 flex items-center justify-end space-x-8 text-sm">
                <span>Approved: <strong>{approvedExpenseCount}</strong></span>
                <span>Unapproved: <strong className="text-[#e31c79]">{expensePendingCount}</strong></span>
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
                  ? 'bg-white text-gray-900 border-[#e31c79]' 
                  : 'bg-gray-200 text-gray-600 border-gray-300 hover:bg-gray-100'
              }`}
            >
              All
            </button>
            <button 
              onClick={() => { setActiveTab('approved'); setStatusFilter('approved'); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'approved' 
                  ? 'bg-white text-gray-900 border-[#e31c79]' 
                  : 'bg-gray-200 text-gray-600 border-gray-300 hover:bg-gray-100'
              }`}
            >
              Approved
            </button>
            <button 
              onClick={() => { setActiveTab('unapproved'); setStatusFilter('submitted'); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'unapproved' 
                  ? 'bg-white text-gray-900 border-[#e31c79]' 
                  : 'bg-gray-200 text-gray-600 border-gray-300 hover:bg-gray-100'
              }`}
            >
              Unapproved
            </button>
            <button 
              onClick={() => { setActiveTab('unsubmitted'); setStatusFilter('draft'); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'unsubmitted' 
                  ? 'bg-white text-gray-900 border-[#e31c79]' 
                  : 'bg-gray-200 text-gray-600 border-gray-300 hover:bg-gray-100'
              }`}
            >
              Unsubmitted Timecards
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-full px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-white rounded shadow-sm">
          
          {/* All Tab Content */}
          {activeTab === 'all' && (
            <div>
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-4">All</h2>
              </div>

              {/* Timecards Section */}
              <div className="border-b">
                <div className="bg-[#33393c] px-4 py-2 flex justify-between items-center">
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
                      <div className="flex-1">User</div>
                      <div className="w-32 text-center">Comments</div>
                      <div className="w-24 text-right">Hours</div>
                      <div className="w-32 text-center">Approval</div>
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
                        <div className="w-32 text-center"></div>
                        <div className="w-24 text-right font-medium text-sm">
                          {submission.hours?.toFixed(2) || '0.00'}
                        </div>
                        <div className="w-32 text-center">
                          <span className={`text-xs ${
                            submission.status === 'approved' ? 'text-green-600' :
                            submission.status === 'submitted' ? 'text-gray-600' :
                            submission.status === 'rejected' ? 'text-red-600' :
                            'text-gray-500'
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

              {/* Expenses Section */}
              <div className="mt-4">
                <div className="bg-[#e31c79] px-4 py-2">
                  <h3 className="text-sm font-semibold text-white">Expenses</h3>
                </div>
                <div className="bg-gray-50 px-4 py-8 text-center text-gray-500">
                  None
                </div>
              </div>
            </div>
          )}

          {/* Approved Tab Content */}
          {activeTab === 'approved' && (
            <div>
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-4">Approved</h2>
              </div>

              {/* Timecards Section */}
              <div className="border-b">
                <div className="bg-[#33393c] px-4 py-2">
                  <h3 className="text-sm font-semibold text-white">Timecards</h3>
                </div>
                
                {filteredSubmissions.filter(s => s.type === 'timesheet' && s.status === 'approved').length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500 bg-gray-50">
                    None
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-2 bg-gray-50 flex items-center text-sm font-medium text-gray-700 border-b">
                      <input type="checkbox" className="mr-4" />
                      <div className="w-8"></div>
                      <div className="flex-1">User</div>
                      <div className="w-32 text-center">Comments</div>
                      <div className="w-24 text-right">Hours</div>
                      <div className="w-32 text-center">Approval</div>
                    </div>
                    
                    {filteredSubmissions.filter(s => s.type === 'timesheet' && s.status === 'approved').map((submission, index) => (
                      <div key={submission.id} className={`px-4 py-3 flex items-center ${
                        index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                      } hover:bg-gray-100 border-b`}>
                        <input 
                          type="checkbox"
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
                        <div className="w-32 text-center"></div>
                        <div className="w-24 text-right font-medium text-sm">
                          {submission.hours?.toFixed(2) || '0.00'}
                        </div>
                        <div className="w-32 text-center">
                          <span className="text-xs text-green-600">Approved</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Expenses Section */}
              <div className="mt-4">
                <div className="bg-[#e31c79] px-4 py-2">
                  <h3 className="text-sm font-semibold text-white">Expenses</h3>
                </div>
                <div className="bg-gray-50 px-4 py-8 text-center text-gray-500">
                  None
                </div>
              </div>

              {/* Bottom Section */}
              <div className="p-4 mt-8 bg-gray-50 rounded">
                <div className="flex justify-between items-center">
                  <div className="flex space-x-16">
                    <div>
                      <div className="text-sm font-semibold mb-2">1. Confirm Selection</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex">
                          <span className="text-gray-600 w-40">Approved Time</span>
                          <span>Selected <strong>0</strong> of <strong>{approvedTimesheetCount}</strong></span>
                        </div>
                        <div className="flex">
                          <span className="text-gray-600 w-40">Unapproved Time</span>
                          <span>Selected <strong>0</strong> of <strong>0</strong></span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-semibold mb-2">2. Review Selected</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex">
                          <span className="text-gray-600 w-40">Approved Expense</span>
                          <span>Selected <strong>0</strong> of <strong>{approvedExpenseCount}</strong></span>
                        </div>
                        <div className="flex">
                          <span className="text-gray-600 w-40">Unapproved Expense</span>
                          <span>Selected <strong>0</strong> of <strong>0</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    disabled
                    className="px-6 py-2 rounded font-medium bg-gray-300 text-gray-500 cursor-not-allowed flex items-center"
                  >
                    Approve for Accounting
                    <span className="ml-2">→</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Unapproved Tab Content */}
          {activeTab === 'unapproved' && (
            <div>
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-4">Unapproved</h2>
              </div>

              {/* Timecards Section */}
              <div className="border-b">
                <div className="bg-[#33393c] px-4 py-2 flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-white">Timecards</h3>
                  <div className="flex items-center space-x-2 text-xs text-gray-300">
                    <span>1 - {timesheetPendingCount} of {timesheetPendingCount}</span>
                  </div>
                </div>
                
                {timesheetPendingCount === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500 bg-gray-50">
                    None
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
                      <div className="flex-1">User</div>
                      <div className="w-32 text-center">Comments</div>
                      <div className="w-24 text-right">Hours</div>
                      <div className="w-32 text-center">Approval</div>
                    </div>
                    
                    {filteredSubmissions.filter(s => s.type === 'timesheet' && s.status === 'submitted').map((submission, index) => (
                      <div key={submission.id} className={`px-4 py-3 flex items-center ${
                        index % 2 === 0 ? 'bg-yellow-50' : 'bg-white'
                      } hover:bg-yellow-100 border-b`}>
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
                        <div className="w-32 text-center"></div>
                        <div className="w-24 text-right font-medium text-sm">
                          {submission.hours?.toFixed(2) || '0.00'}
                        </div>
                        <div className="w-32 text-center flex items-center justify-center space-x-2">
                          <span className="text-gray-600 text-xs">Pending</span>
                          <button className="p-0.5">
                            <Settings className="h-4 w-4 text-gray-400" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {timesheetPendingCount > 0 && (
                      <div className="bg-gray-100 px-4 py-2 flex justify-between items-center">
                        <label className="flex items-center space-x-2">
                          <input type="checkbox" className="rounded" />
                          <span className="text-sm text-gray-700 font-medium">Send Approval Reminders</span>
                        </label>
                        <span className="text-sm font-bold">
                          Total: {filteredSubmissions.filter(s => s.type === 'timesheet' && s.status === 'submitted')
                            .reduce((sum, s) => sum + (s.hours || 0), 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Expenses Section */}
              <div className="mt-4">
                <div className="bg-[#e31c79] px-4 py-2">
                  <h3 className="text-sm font-semibold text-white">Expenses</h3>
                </div>
                <div className="bg-gray-50 px-4 py-8 text-center text-gray-500">
                  None
                </div>
              </div>

              {/* Bottom Action Section */}
              <div className="p-4 mt-8 bg-gray-50 rounded">
                <div className="flex justify-between items-center">
                  <div className="flex space-x-16">
                    <div>
                      <div className="text-sm font-semibold mb-2">1. Confirm Selection</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex">
                          <span className="text-gray-600 w-40">Approved Time</span>
                          <span>Selected <strong>0</strong> of <strong>0</strong></span>
                        </div>
                        <div className="flex">
                          <span className="text-gray-600 w-40">Unapproved Time</span>
                          <span>Selected <strong>{selectedItems.size}</strong> of <strong>{timesheetPendingCount}</strong></span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-semibold mb-2">2. Review Selected</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex">
                          <span className="text-gray-600 w-40">Approved Expense</span>
                          <span>Selected <strong>0</strong> of <strong>0</strong></span>
                        </div>
                        <div className="flex">
                          <span className="text-gray-600 w-40">Unapproved Expense</span>
                          <span>Selected <strong>0</strong> of <strong>0</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={handleBulkApprove}
                    disabled={selectedItems.size === 0}
                    className={`px-6 py-2 rounded font-medium flex items-center ${
                      selectedItems.size === 0 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    Approve for Accounting
                    <span className="ml-2">→</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Unsubmitted Tab */}
          {activeTab === 'unsubmitted' && (
            <div className="p-4">
              <h2 className="text-lg font-semibold mb-4">Unsubmitted Timecards</h2>
              <div className="text-center py-12 text-gray-500">
                None
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}