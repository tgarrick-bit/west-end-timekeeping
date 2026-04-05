'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Settings } from 'lucide-react'

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
  const { user, employee } = useAuth()
  const supabase = createClient()
  
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
      <div className="flex items-center justify-center" style={{ padding: '36px 40px' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e31c79] mx-auto"></div>
          <p className="mt-3" style={{ fontSize: '13px', color: '#bbb' }}>Loading submissions...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Page Title */}
      <div style={{ padding: '36px 40px 0 40px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Review</h1>
        <p style={{ fontSize: '13px', fontWeight: 400, color: '#bbb', marginTop: '4px' }}>Review and approve timesheets and expenses</p>
      </div>

      {/* Controls */}
      <div style={{ padding: '16px 40px' }}>
        <div className="flex justify-between items-center">
          <div className="flex items-center" style={{ gap: '16px' }}>
            <div className="flex items-center" style={{ gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 400, color: '#999' }}>Time Detail Level:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'user' | 'project')}
                style={{ fontSize: '12px', padding: '5px 10px', border: '0.5px solid #e8e4df', borderRadius: '7px', color: '#555', background: 'white' }}
              >
                <option value="user">By User</option>
                <option value="project">By Project</option>
              </select>
            </div>

            <div className="flex items-center" style={{ gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 400, color: '#999' }}>Time Project:</span>
              <select style={{ fontSize: '12px', padding: '5px 10px', border: '0.5px solid #e8e4df', borderRadius: '7px', color: '#555', background: 'white' }}>
                <option value="all">- All -</option>
              </select>
            </div>

            <div className="flex items-center" style={{ gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 400, color: '#999' }}>User Class:</span>
              <select style={{ fontSize: '12px', padding: '5px 10px', border: '0.5px solid #e8e4df', borderRadius: '7px', color: '#555', background: 'white' }}>
                <option value="all">- All -</option>
              </select>
            </div>
          </div>

          <div className="flex items-center" style={{ gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 400, color: '#999' }}>Items per Page:</span>
            <select style={{ fontSize: '12px', padding: '5px 10px', border: '0.5px solid #e8e4df', borderRadius: '7px', color: '#555', background: 'white' }}>
              <option>100</option>
              <option>50</option>
              <option>25</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{ padding: '0 40px 16px 40px' }}>
        <div className="flex items-center justify-between">
          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#c0bab2', textTransform: 'uppercase', letterSpacing: '1px' }}>Time Summary</span>
            <div className="flex items-center" style={{ gap: '24px', marginTop: '4px', fontSize: '12.5px', color: '#555' }}>
              <span>Approved: <strong style={{ fontWeight: 600, color: '#1a1a1a' }}>{approvedTimesheetCount}</strong></span>
              <span>Unapproved: <strong style={{ fontWeight: 600, color: '#e31c79' }}>{timesheetPendingCount}</strong></span>
              {timesheetPendingCount > 0 && (
                <span style={{ fontWeight: 600, color: '#e31c79' }}>
                  {timesheetPendingCount} Warning{timesheetPendingCount > 1 ? 's' : ''}!
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#c0bab2', textTransform: 'uppercase', letterSpacing: '1px' }}>Expense Summary</span>
            <div className="flex items-center justify-end" style={{ gap: '24px', marginTop: '4px', fontSize: '12.5px', color: '#555' }}>
              <span>Approved: <strong style={{ fontWeight: 600, color: '#1a1a1a' }}>{approvedExpenseCount}</strong></span>
              <span>Unapproved: <strong style={{ fontWeight: 600, color: '#e31c79' }}>{expensePendingCount}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 40px' }}>
        <div className="flex" style={{ gap: '24px', borderBottom: '0.5px solid #f0ece7' }}>
          <button
            onClick={() => { setActiveTab('all'); setStatusFilter('all'); }}
            style={{
              padding: '8px 0',
              fontSize: '12px',
              fontWeight: activeTab === 'all' ? 600 : 400,
              color: activeTab === 'all' ? '#1a1a1a' : '#999',
              borderBottom: activeTab === 'all' ? '2px solid #e31c79' : '2px solid transparent',
              background: 'none',
              cursor: 'pointer',
            }}
          >
            All
          </button>
          <button
            onClick={() => { setActiveTab('approved'); setStatusFilter('approved'); }}
            style={{
              padding: '8px 0',
              fontSize: '12px',
              fontWeight: activeTab === 'approved' ? 600 : 400,
              color: activeTab === 'approved' ? '#1a1a1a' : '#999',
              borderBottom: activeTab === 'approved' ? '2px solid #e31c79' : '2px solid transparent',
              background: 'none',
              cursor: 'pointer',
            }}
          >
            Approved
          </button>
          <button
            onClick={() => { setActiveTab('unapproved'); setStatusFilter('submitted'); }}
            style={{
              padding: '8px 0',
              fontSize: '12px',
              fontWeight: activeTab === 'unapproved' ? 600 : 400,
              color: activeTab === 'unapproved' ? '#1a1a1a' : '#999',
              borderBottom: activeTab === 'unapproved' ? '2px solid #e31c79' : '2px solid transparent',
              background: 'none',
              cursor: 'pointer',
            }}
          >
            Unapproved
          </button>
          <button
            onClick={() => { setActiveTab('unsubmitted'); setStatusFilter('draft'); }}
            style={{
              padding: '8px 0',
              fontSize: '12px',
              fontWeight: activeTab === 'unsubmitted' ? 600 : 400,
              color: activeTab === 'unsubmitted' ? '#1a1a1a' : '#999',
              borderBottom: activeTab === 'unsubmitted' ? '2px solid #e31c79' : '2px solid transparent',
              background: 'none',
              cursor: 'pointer',
            }}
          >
            Unsubmitted Timecards
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ padding: '24px 40px 36px 40px' }}>
        <div>

          {/* All Tab Content */}
          {activeTab === 'all' && (
            <div>
              {/* Timecards Section */}
              <div style={{ borderBottom: '0.5px solid #f0ece7' }}>
                <div className="flex justify-between items-center" style={{ padding: '14px 22px', borderBottom: '0.5px solid #f0ece7' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Timecards</h3>
                  <span style={{ fontSize: '11px', color: '#999' }}>
                    1 - {filteredSubmissions.filter(s => s.type === 'timesheet').length} of {filteredSubmissions.filter(s => s.type === 'timesheet').length}
                  </span>
                </div>

                {filteredSubmissions.filter(s => s.type === 'timesheet').length === 0 ? (
                  <div style={{ padding: '32px 22px', textAlign: 'center', fontSize: '12.5px', color: '#999' }}>
                    None
                  </div>
                ) : (
                  <>
                    <div className="flex items-center" style={{ padding: '10px 22px', borderBottom: '0.5px solid #f0ece7' }}>
                      <input type="checkbox" className="mr-4" />
                      <div className="w-8"></div>
                      <div className="flex-1" style={{ fontSize: '9px', fontWeight: 500, color: '#ccc', letterSpacing: '1px', textTransform: 'uppercase' }}>User</div>
                      <div className="w-32 text-center" style={{ fontSize: '9px', fontWeight: 500, color: '#ccc', letterSpacing: '1px', textTransform: 'uppercase' }}>Comments</div>
                      <div className="w-24 text-right" style={{ fontSize: '9px', fontWeight: 500, color: '#ccc', letterSpacing: '1px', textTransform: 'uppercase' }}>Hours</div>
                      <div className="w-32 text-center" style={{ fontSize: '9px', fontWeight: 500, color: '#ccc', letterSpacing: '1px', textTransform: 'uppercase' }}>Approval</div>
                    </div>

                    {filteredSubmissions.filter(s => s.type === 'timesheet').map((submission) => (
                      <div key={submission.id} className="flex items-center" style={{ padding: '10px 22px', borderBottom: '0.5px solid #f5f2ee', background: 'white', cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.background = '#FDFCFB')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                        <input
                          type="checkbox"
                          checked={selectedItems.has(submission.id)}
                          onChange={() => toggleItemSelection(submission.id)}
                          className="mr-4"
                        />
                        <div className="w-8"></div>
                        <div className="flex-1">
                          <div style={{ fontSize: '12.5px', fontWeight: 400, color: '#555' }}>
                            <span style={{ fontWeight: 600 }}>Week: </span>
                            <span>{submission.week_range}</span>
                          </div>
                          <div style={{ fontSize: '12.5px', color: '#999', marginTop: '2px' }}>
                            {submission.employee?.first_name} {submission.employee?.last_name}
                          </div>
                        </div>
                        <div className="w-32 text-center"></div>
                        <div className="w-24 text-right" style={{ fontSize: '12.5px', fontWeight: 600, color: '#1a1a1a' }}>
                          {submission.hours?.toFixed(2) || '0.00'}
                        </div>
                        <div className="w-32 text-center">
                          <span style={{
                            fontSize: '11px',
                            color: submission.status === 'approved' ? '#16a34a' :
                                   submission.status === 'submitted' ? '#999' :
                                   submission.status === 'rejected' ? '#dc2626' : '#999'
                          }}>
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
              <div style={{ marginTop: '24px' }}>
                <div className="flex justify-between items-center" style={{ padding: '14px 22px', borderBottom: '0.5px solid #f0ece7' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Expenses</h3>
                </div>
                <div style={{ padding: '32px 22px', textAlign: 'center', fontSize: '12.5px', color: '#999' }}>
                  None
                </div>
              </div>
            </div>
          )}

          {/* Approved Tab Content */}
          {activeTab === 'approved' && (
            <div>
              {/* Timecards Section */}
              <div style={{ borderBottom: '0.5px solid #f0ece7' }}>
                <div className="flex justify-between items-center" style={{ padding: '14px 22px', borderBottom: '0.5px solid #f0ece7' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Timecards</h3>
                </div>

                {filteredSubmissions.filter(s => s.type === 'timesheet' && s.status === 'approved').length === 0 ? (
                  <div style={{ padding: '32px 22px', textAlign: 'center', fontSize: '12.5px', color: '#999' }}>
                    None
                  </div>
                ) : (
                  <>
                    <div className="flex items-center" style={{ padding: '10px 22px', borderBottom: '0.5px solid #f0ece7' }}>
                      <input type="checkbox" className="mr-4" />
                      <div className="w-8"></div>
                      <div className="flex-1" style={{ fontSize: '9px', fontWeight: 500, color: '#ccc', letterSpacing: '1px', textTransform: 'uppercase' }}>User</div>
                      <div className="w-32 text-center" style={{ fontSize: '9px', fontWeight: 500, color: '#ccc', letterSpacing: '1px', textTransform: 'uppercase' }}>Comments</div>
                      <div className="w-24 text-right" style={{ fontSize: '9px', fontWeight: 500, color: '#ccc', letterSpacing: '1px', textTransform: 'uppercase' }}>Hours</div>
                      <div className="w-32 text-center" style={{ fontSize: '9px', fontWeight: 500, color: '#ccc', letterSpacing: '1px', textTransform: 'uppercase' }}>Approval</div>
                    </div>

                    {filteredSubmissions.filter(s => s.type === 'timesheet' && s.status === 'approved').map((submission) => (
                      <div key={submission.id} className="flex items-center" style={{ padding: '10px 22px', borderBottom: '0.5px solid #f5f2ee', background: 'white', cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.background = '#FDFCFB')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                        <input
                          type="checkbox"
                          className="mr-4"
                        />
                        <div className="w-8"></div>
                        <div className="flex-1">
                          <div style={{ fontSize: '12.5px', fontWeight: 400, color: '#555' }}>
                            <span style={{ fontWeight: 600 }}>Week: </span>
                            <span>{submission.week_range}</span>
                          </div>
                          <div style={{ fontSize: '12.5px', color: '#999', marginTop: '2px' }}>
                            {submission.employee?.first_name} {submission.employee?.last_name}
                          </div>
                        </div>
                        <div className="w-32 text-center"></div>
                        <div className="w-24 text-right" style={{ fontSize: '12.5px', fontWeight: 600, color: '#1a1a1a' }}>
                          {submission.hours?.toFixed(2) || '0.00'}
                        </div>
                        <div className="w-32 text-center">
                          <span style={{ fontSize: '11px', color: '#16a34a' }}>Approved</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Expenses Section */}
              <div style={{ marginTop: '24px' }}>
                <div className="flex justify-between items-center" style={{ padding: '14px 22px', borderBottom: '0.5px solid #f0ece7' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Expenses</h3>
                </div>
                <div style={{ padding: '32px 22px', textAlign: 'center', fontSize: '12.5px', color: '#999' }}>
                  None
                </div>
              </div>

              {/* Bottom Section */}
              <div style={{ padding: '24px 0', marginTop: '32px', borderTop: '0.5px solid #f0ece7' }}>
                <div className="flex justify-between items-center">
                  <div className="flex" style={{ gap: '64px' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>1. Confirm Selection</div>
                      <div style={{ fontSize: '12.5px', color: '#555' }}>
                        <div className="flex" style={{ marginBottom: '4px' }}>
                          <span style={{ width: '160px', color: '#999' }}>Approved Time</span>
                          <span>Selected <strong style={{ fontWeight: 600 }}>0</strong> of <strong style={{ fontWeight: 600 }}>{approvedTimesheetCount}</strong></span>
                        </div>
                        <div className="flex">
                          <span style={{ width: '160px', color: '#999' }}>Unapproved Time</span>
                          <span>Selected <strong style={{ fontWeight: 600 }}>0</strong> of <strong style={{ fontWeight: 600 }}>0</strong></span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>2. Review Selected</div>
                      <div style={{ fontSize: '12.5px', color: '#555' }}>
                        <div className="flex" style={{ marginBottom: '4px' }}>
                          <span style={{ width: '160px', color: '#999' }}>Approved Expense</span>
                          <span>Selected <strong style={{ fontWeight: 600 }}>0</strong> of <strong style={{ fontWeight: 600 }}>{approvedExpenseCount}</strong></span>
                        </div>
                        <div className="flex">
                          <span style={{ width: '160px', color: '#999' }}>Unapproved Expense</span>
                          <span>Selected <strong style={{ fontWeight: 600 }}>0</strong> of <strong style={{ fontWeight: 600 }}>0</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    disabled
                    className="flex items-center"
                    style={{ padding: '8px 20px', borderRadius: '7px', fontSize: '12px', fontWeight: 500, border: '0.5px solid #e0dcd7', background: 'white', color: '#777', cursor: 'not-allowed', opacity: 0.6 }}
                  >
                    Approve for Accounting
                    <span className="ml-2">&#8594;</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Unapproved Tab Content */}
          {activeTab === 'unapproved' && (
            <div>
              {/* Timecards Section */}
              <div style={{ borderBottom: '0.5px solid #f0ece7' }}>
                <div className="flex justify-between items-center" style={{ padding: '14px 22px', borderBottom: '0.5px solid #f0ece7' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Timecards</h3>
                  <span style={{ fontSize: '11px', color: '#999' }}>
                    1 - {timesheetPendingCount} of {timesheetPendingCount}
                  </span>
                </div>

                {timesheetPendingCount === 0 ? (
                  <div style={{ padding: '32px 22px', textAlign: 'center', fontSize: '12.5px', color: '#999' }}>
                    None
                  </div>
                ) : (
                  <>
                    <div className="flex items-center" style={{ padding: '10px 22px', borderBottom: '0.5px solid #f0ece7' }}>
                      <input
                        type="checkbox"
                        className="mr-4"
                        onChange={(e) => e.target.checked ? selectAllVisible() : setSelectedItems(new Set())}
                      />
                      <div className="w-8"></div>
                      <div className="flex-1" style={{ fontSize: '9px', fontWeight: 500, color: '#ccc', letterSpacing: '1px', textTransform: 'uppercase' }}>User</div>
                      <div className="w-32 text-center" style={{ fontSize: '9px', fontWeight: 500, color: '#ccc', letterSpacing: '1px', textTransform: 'uppercase' }}>Comments</div>
                      <div className="w-24 text-right" style={{ fontSize: '9px', fontWeight: 500, color: '#ccc', letterSpacing: '1px', textTransform: 'uppercase' }}>Hours</div>
                      <div className="w-32 text-center" style={{ fontSize: '9px', fontWeight: 500, color: '#ccc', letterSpacing: '1px', textTransform: 'uppercase' }}>Approval</div>
                    </div>

                    {filteredSubmissions.filter(s => s.type === 'timesheet' && s.status === 'submitted').map((submission) => (
                      <div key={submission.id} className="flex items-center" style={{ padding: '10px 22px', borderBottom: '0.5px solid #f5f2ee', background: 'white', cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.background = '#FDFCFB')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                        <input
                          type="checkbox"
                          checked={selectedItems.has(submission.id)}
                          onChange={() => toggleItemSelection(submission.id)}
                          className="mr-4"
                        />
                        <div className="w-8"></div>
                        <div className="flex-1">
                          <div style={{ fontSize: '12.5px', fontWeight: 400, color: '#555' }}>
                            <span style={{ fontWeight: 600 }}>Week: </span>
                            <span>{submission.week_range}</span>
                          </div>
                          <div style={{ fontSize: '12.5px', color: '#999', marginTop: '2px' }}>
                            {submission.employee?.first_name} {submission.employee?.last_name}
                          </div>
                        </div>
                        <div className="w-32 text-center"></div>
                        <div className="w-24 text-right" style={{ fontSize: '12.5px', fontWeight: 600, color: '#1a1a1a' }}>
                          {submission.hours?.toFixed(2) || '0.00'}
                        </div>
                        <div className="w-32 text-center flex items-center justify-center" style={{ gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: '#999' }}>Pending</span>
                          <button className="p-0.5">
                            <Settings className="h-4 w-4" style={{ color: '#ccc' }} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {timesheetPendingCount > 0 && (
                      <div className="flex justify-between items-center" style={{ padding: '10px 22px', borderBottom: '0.5px solid #f0ece7' }}>
                        <label className="flex items-center" style={{ gap: '8px' }}>
                          <input type="checkbox" className="rounded" />
                          <span style={{ fontSize: '12px', fontWeight: 500, color: '#555' }}>Send Approval Reminders</span>
                        </label>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#1a1a1a' }}>
                          Total: {filteredSubmissions.filter(s => s.type === 'timesheet' && s.status === 'submitted')
                            .reduce((sum, s) => sum + (s.hours || 0), 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Expenses Section */}
              <div style={{ marginTop: '24px' }}>
                <div className="flex justify-between items-center" style={{ padding: '14px 22px', borderBottom: '0.5px solid #f0ece7' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Expenses</h3>
                </div>
                <div style={{ padding: '32px 22px', textAlign: 'center', fontSize: '12.5px', color: '#999' }}>
                  None
                </div>
              </div>

              {/* Bottom Action Section */}
              <div style={{ padding: '24px 0', marginTop: '32px', borderTop: '0.5px solid #f0ece7' }}>
                <div className="flex justify-between items-center">
                  <div className="flex" style={{ gap: '64px' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>1. Confirm Selection</div>
                      <div style={{ fontSize: '12.5px', color: '#555' }}>
                        <div className="flex" style={{ marginBottom: '4px' }}>
                          <span style={{ width: '160px', color: '#999' }}>Approved Time</span>
                          <span>Selected <strong style={{ fontWeight: 600 }}>0</strong> of <strong style={{ fontWeight: 600 }}>0</strong></span>
                        </div>
                        <div className="flex">
                          <span style={{ width: '160px', color: '#999' }}>Unapproved Time</span>
                          <span>Selected <strong style={{ fontWeight: 600 }}>{selectedItems.size}</strong> of <strong style={{ fontWeight: 600 }}>{timesheetPendingCount}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>2. Review Selected</div>
                      <div style={{ fontSize: '12.5px', color: '#555' }}>
                        <div className="flex" style={{ marginBottom: '4px' }}>
                          <span style={{ width: '160px', color: '#999' }}>Approved Expense</span>
                          <span>Selected <strong style={{ fontWeight: 600 }}>0</strong> of <strong style={{ fontWeight: 600 }}>0</strong></span>
                        </div>
                        <div className="flex">
                          <span style={{ width: '160px', color: '#999' }}>Unapproved Expense</span>
                          <span>Selected <strong style={{ fontWeight: 600 }}>0</strong> of <strong style={{ fontWeight: 600 }}>0</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleBulkApprove}
                    disabled={selectedItems.size === 0}
                    className="flex items-center"
                    style={{
                      padding: '8px 20px',
                      borderRadius: '7px',
                      fontSize: '12px',
                      fontWeight: 500,
                      border: '0.5px solid #e0dcd7',
                      background: selectedItems.size === 0 ? 'white' : '#16a34a',
                      color: selectedItems.size === 0 ? '#777' : 'white',
                      cursor: selectedItems.size === 0 ? 'not-allowed' : 'pointer',
                      opacity: selectedItems.size === 0 ? 0.6 : 1,
                    }}
                  >
                    Approve for Accounting
                    <span className="ml-2">&#8594;</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Unsubmitted Tab */}
          {activeTab === 'unsubmitted' && (
            <div style={{ padding: '24px 0' }}>
              <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#1a1a1a', marginBottom: '16px' }}>Unsubmitted Timecards</h2>
              <div style={{ textAlign: 'center', padding: '48px 0', fontSize: '12.5px', color: '#999' }}>
                None
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}