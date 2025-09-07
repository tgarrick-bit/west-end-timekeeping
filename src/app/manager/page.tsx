'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import TimesheetModal from '@/components/TimesheetModal'
import { 
  Clock, 
  User, 
  Calendar,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Eye,
  Download,
  LogOut
} from 'lucide-react'

interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
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

interface TimecardDetail {
  id: string
  employee_id: string
  employee_name: string
  employee_email: string
  employee_department?: string | null
  week_ending: string
  total_hours: number
  total_overtime?: number
  overtime_hours?: number
  total_amount?: number
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  submitted_at?: string | null
  approved_at?: string | null
  approved_by?: string | null
  approved_by_name?: string | null
  notes?: string | null
  entries?: Array<{
    id: string
    date: string
    project_id?: string
    project_name?: string
    project_code?: string
    hours: number
    description?: string
  }>
}

interface TimesheetStats {
  totalSubmissions: number
  pendingApprovals: number
  approvedThisWeek: number
  totalHours: number
  totalValue: number
}

export default function TimesheetsPage() {
  const router = useRouter()
  const { appUser } = useAuth()
  const supabase = createClientComponentClient()
  
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedTimecard, setSelectedTimecard] = useState<TimecardDetail | null>(null)
  const [processingModal, setProcessingModal] = useState(false)
  const [stats, setStats] = useState<TimesheetStats>({
    totalSubmissions: 0,
    pendingApprovals: 0,
    approvedThisWeek: 0,
    totalHours: 0,
    totalValue: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [weekFilter, setWeekFilter] = useState<string>('all')
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([])
  const [managerId, setManagerId] = useState<string | null>(null)

  useEffect(() => {
    fetchManagerId()
  }, [])

  useEffect(() => {
    if (managerId) {
      loadTimesheetData()
    }
  }, [managerId, statusFilter, weekFilter])

  const fetchManagerId = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setManagerId(user.id)
    }
  }

  const loadTimesheetData = async () => {
    if (!managerId) return
    
    setIsLoading(true)
    
    // Fetch team employees
    const { data: teamEmployees } = await supabase
      .from('employees')
      .select('*')
      .eq('manager_id', managerId)

    if (!teamEmployees || teamEmployees.length === 0) {
      setTimesheets([])
      setEmployees([])
      setIsLoading(false)
      return
    }

    setEmployees(teamEmployees)
    const employeeIds = teamEmployees.map(e => e.id)
    
    // Build query for timesheets
    let query = supabase
      .from('timesheets')
      .select('*')
      .in('employee_id', employeeIds)
      .order('week_ending', { ascending: false })

    // Apply status filter
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    // Apply week filter if not 'all'
    if (weekFilter !== 'all' && weekFilter !== 'current' && weekFilter !== 'previous') {
      query = query.eq('week_ending', weekFilter)
    }

    const { data: timesheetsData, error } = await query

    if (error) {
      console.error('Error fetching timesheets:', error)
    } else {
      let filteredTimesheets = timesheetsData || []
      
      // Handle current/previous week filters
      if (weekFilter === 'current') {
        const currentWeek = getMostRecentWeek(filteredTimesheets)
        filteredTimesheets = filteredTimesheets.filter(t => t.week_ending === currentWeek)
      } else if (weekFilter === 'previous') {
        const weeks = getUniqueWeeks(filteredTimesheets)
        if (weeks.length > 1) {
          filteredTimesheets = filteredTimesheets.filter(t => t.week_ending === weeks[1])
        }
      }
      
      setTimesheets(filteredTimesheets)
      
      // Extract unique weeks for filter dropdown
      const weeks = getUniqueWeeks(timesheetsData || [])
      setAvailableWeeks(weeks)
      
      // Calculate stats
      const stats: TimesheetStats = {
        totalSubmissions: filteredTimesheets.length,
        pendingApprovals: filteredTimesheets.filter(t => t.status === 'submitted').length,
        approvedThisWeek: filteredTimesheets.filter(t => t.status === 'approved').length,
        totalHours: filteredTimesheets.reduce((sum, t) => sum + (t.total_hours || 0), 0),
        totalValue: filteredTimesheets.reduce((sum, t) => {
          const employee = teamEmployees.find(e => e.id === t.employee_id)
          const regularHours = Math.min(t.total_hours || 0, 40)
          const overtimeHours = Math.max(0, (t.total_hours || 0) - 40)
          const regularPay = regularHours * (employee?.hourly_rate || 75)
          const overtimePay = overtimeHours * (employee?.hourly_rate || 75) * 1.5
          return sum + regularPay + overtimePay
        }, 0)
      }
      
      setStats(stats)
    }
    
    setIsLoading(false)
  }

  const getMostRecentWeek = (timesheets: Timesheet[]): string => {
    if (timesheets.length === 0) return ''
    const weeks = [...new Set(timesheets.map(t => t.week_ending))].sort().reverse()
    return weeks[0] || ''
  }

  const getUniqueWeeks = (timesheets: Timesheet[]): string[] => {
    return [...new Set(timesheets.map(t => t.week_ending))].sort().reverse()
  }

  const openTimecardDetail = async (timesheet: Timesheet) => {
    const employee = employees.find(e => e.id === timesheet.employee_id)
    
    console.log('Opening timecard for timesheet:', timesheet.id)
    
    // Fetch entries with project details
    const { data: entries, error } = await supabase
      .from('timesheet_entries')
      .select(`
        *,
        projects (
          id,
          name,
          code
        )
      `)
      .eq('timesheet_id', timesheet.id)
      .order('date', { ascending: true })

    if (error) {
      console.error('Error fetching entries:', error)
    }
    
    console.log('Fetched entries:', entries?.length || 0, 'entries')

    // Calculate totals
    const totalHours = parseFloat(String(timesheet.total_hours)) || 0
    const calculatedOvertime = Math.max(0, totalHours - 40)
    const regularRate = employee?.hourly_rate || 75
    const overtimeRate = regularRate * 1.5
    const regularHours = Math.min(totalHours, 40)
    const totalAmount = (regularHours * regularRate) + (calculatedOvertime * overtimeRate)

    const timecardDetail: TimecardDetail = {
      id: timesheet.id,
      employee_id: timesheet.employee_id,
      employee_name: employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown',
      employee_email: employee?.email || '',
      employee_department: employee?.department || null,
      week_ending: timesheet.week_ending,
      total_hours: totalHours,
      total_overtime: calculatedOvertime,
      overtime_hours: calculatedOvertime,
      total_amount: totalAmount,
      status: timesheet.status,
      submitted_at: timesheet.submitted_at || null,
      approved_at: timesheet.approved_at,
      approved_by: timesheet.approved_by,
      notes: timesheet.comments || null,
      entries: entries?.map(e => ({
        id: e.id,
        date: e.date,
        project_id: e.project_id || undefined,
        project_name: e.projects?.name || 'General Work',
        project_code: e.projects?.code || undefined,
        hours: parseFloat(String(e.hours)) || 0,
        description: e.description || undefined
      })) || []
    }
    
    setSelectedTimecard(timecardDetail)
  }

  const handleModalApprove = async () => {
    if (!selectedTimecard) return
    
    setProcessingModal(true)
    try {
      const { error } = await supabase
        .from('timesheets')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: managerId
        })
        .eq('id', selectedTimecard.id)

      if (!error) {
        setTimesheets(prev => prev.map(t => 
          t.id === selectedTimecard.id 
            ? { ...t, status: 'approved' as const, approved_at: new Date().toISOString(), approved_by: managerId }
            : t
        ))
        setSelectedTimecard(null)
        loadTimesheetData()
      }
    } finally {
      setProcessingModal(false)
    }
  }

  const handleModalReject = async () => {
    if (!selectedTimecard) return
    
    const reason = prompt('Please provide a reason for rejection:')
    if (!reason) return
    
    setProcessingModal(true)
    try {
      const { error } = await supabase
        .from('timesheets')
        .update({
          status: 'rejected',
          approved_at: new Date().toISOString(),
          approved_by: managerId,
          comments: reason
        })
        .eq('id', selectedTimecard.id)

      if (!error) {
        setTimesheets(prev => prev.map(t => 
          t.id === selectedTimecard.id 
            ? { ...t, status: 'rejected' as const, approved_at: new Date().toISOString(), approved_by: managerId }
            : t
        ))
        setSelectedTimecard(null)
        loadTimesheetData()
      }
    } finally {
      setProcessingModal(false)
    }
  }

  const handleTimesheetAction = async (timesheet: Timesheet, action: string) => {
    if (action === 'review') {
      await openTimecardDetail(timesheet)
    } else if (action === 'approve') {
      const { error } = await supabase
        .from('timesheets')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: managerId
        })
        .eq('id', timesheet.id)

      if (!error) {
        loadTimesheetData()
      }
    } else if (action === 'reject') {
      const reason = prompt('Please provide a reason for rejection:')
      if (!reason) return
      
      const { error } = await supabase
        .from('timesheets')
        .update({
          status: 'rejected',
          approved_at: new Date().toISOString(),
          approved_by: managerId,
          comments: reason
        })
        .eq('id', timesheet.id)

      if (!error) {
        loadTimesheetData()
      }
    }
  }

  const exportToCSV = () => {
    const csvData = timesheets.map(t => {
      const employee = employees.find(e => e.id === t.employee_id)
      return {
        'Employee': employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown',
        'Week Ending': t.week_ending,
        'Regular Hours': Math.min(t.total_hours, 40),
        'Overtime Hours': Math.max(0, t.total_hours - 40),
        'Total Hours': t.total_hours,
        'Status': t.status.charAt(0).toUpperCase() + t.status.slice(1),
        'Submitted': t.submitted_at ? new Date(t.submitted_at).toLocaleDateString() : 'N/A',
        'Approved': t.approved_at ? new Date(t.approved_at).toLocaleDateString() : 'N/A'
      }
    })

    const headers = Object.keys(csvData[0] || {})
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(h => `"${row[h as keyof typeof row]}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `team-timesheets-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Clock className="w-4 h-4 text-orange-500" />
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-orange-100 text-orange-800'
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'Pending Approval'
      case 'approved':
        return 'Approved'
      case 'rejected':
        return 'Rejected'
      case 'draft':
        return 'Draft'
      default:
        return 'Unknown'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatWeek = (weekEnding: string) => {
    const end = new Date(weekEnding)
    const start = new Date(end)
    start.setDate(start.getDate() - 6)
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }

  const filteredTimesheets = timesheets.filter(timesheet => {
    const employee = employees.find(e => e.id === timesheet.employee_id)
    const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : ''
    const matchesSearch = employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (employee?.department || '').toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e31c79] mx-auto"></div>
          <p className="mt-3 text-gray-600">Loading Timesheets...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dark Blue Header */}
      <header className="bg-gray-900 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-lg">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">West End Workforce</h1>
                <span className="text-xs text-gray-300">Timesheet Management</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-200">{appUser?.email}</span>
              <button
                onClick={() => router.push('/manager')}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-200 hover:text-white"
              >
                Back to Dashboard
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

      {/* Welcome strip */}
      <div className="bg-gray-900 text-white pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <h2 className="text-2xl font-bold">Team Timesheets</h2>
          <p className="text-gray-300 mt-1">
            Review and approve weekly timesheet submissions for your team
          </p>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 pb-10">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total Submissions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSubmissions}</p>
                <p className="text-xs text-gray-500 mt-1">This period</p>
              </div>
              <Clock className="h-8 w-8 text-gray-300" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingApprovals}</p>
                <p className="text-xs text-gray-500 mt-1">Awaiting review</p>
              </div>
              <Clock className="h-8 w-8 text-gray-300" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Approved This Week</p>
                <p className="text-2xl font-bold text-gray-900">{stats.approvedThisWeek}</p>
                <p className="text-xs text-gray-500 mt-1">Completed</p>
              </div>
              <CheckCircle className="h-8 w-8 text-gray-300" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalHours.toFixed(1)}</p>
                <p className="text-xs text-gray-500 mt-1">All projects</p>
              </div>
              <Clock className="h-8 w-8 text-gray-300" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total Value</p>
                <p className="text-xl font-bold text-green-600">${stats.totalValue.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">Billable amount</p>
              </div>
              <Clock className="h-8 w-8 text-gray-300" />
            </div>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search timesheets by employee name or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="submitted">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <select
                  value={weekFilter}
                  onChange={(e) => setWeekFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                >
                  <option value="all">All Weeks</option>
                  {availableWeeks.map(week => (
                    <option key={week} value={week}>
                      Week ending {formatDate(week)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Timesheet List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-[#e31c79]" />
              Timesheet Submissions
            </h2>
            <button 
              onClick={exportToCSV}
              className="bg-[#05202E] text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-[#0a2f3f] transition-colors flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Export All
            </button>
          </div>

          {filteredTimesheets.length > 0 ? (
            <div className="space-y-4">
              {filteredTimesheets.map((timesheet) => {
                const employee = employees.find(e => e.id === timesheet.employee_id)
                const overtimeHours = Math.max(0, (timesheet.total_hours || 0) - 40)
                const regularHours = Math.min(timesheet.total_hours || 0, 40)
                const totalValue = (regularHours * (employee?.hourly_rate || 75)) + (overtimeHours * (employee?.hourly_rate || 75) * 1.5)
                
                return (
                  <div key={timesheet.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-[#e31c79] bg-opacity-10 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-[#e31c79]" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown'}
                          </h3>
                          <p className="text-sm text-gray-600">Employee ID: {timesheet.employee_id.slice(0, 8)}...</p>
                          <p className="text-sm text-gray-600">{employee?.department || 'No Department'}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Submitted: {timesheet.submitted_at ? formatDate(timesheet.submitted_at) : 'Not submitted'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <div className="flex items-center space-x-2 mb-2">
                            {getStatusIcon(timesheet.status)}
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(timesheet.status)}`}>
                              {getStatusText(timesheet.status)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            Week: {formatWeek(timesheet.week_ending)}
                          </p>
                          <p className="text-sm text-gray-600">
                            Total: {timesheet.total_hours?.toFixed(1) || '0.0'} hrs
                          </p>
                          {overtimeHours > 0 && (
                            <p className="text-sm text-orange-600 font-medium">
                              Overtime: {overtimeHours.toFixed(1)} hrs
                            </p>
                          )}
                        </div>
                        
                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-900">
                            ${totalValue.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-500">Billable Value</p>
                          <p className="text-sm text-gray-500">${employee?.hourly_rate || 75}/hr</p>
                        </div>
                        
                        <div className="flex flex-col space-y-2">
                          {timesheet.status === 'submitted' ? (
                            <>
                              <button 
                                onClick={() => handleTimesheetAction(timesheet, 'approve')}
                                className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors flex items-center"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Approve
                              </button>
                              <button 
                                onClick={() => handleTimesheetAction(timesheet, 'reject')}
                                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors flex items-center"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Reject
                              </button>
                            </>
                          ) : null}
                          
                          <button 
                            onClick={() => handleTimesheetAction(timesheet, 'review')}
                            className="bg-[#e31c79] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#c41a6b] transition-colors flex items-center"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Review Details
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats Row */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <p className="text-sm text-gray-500">Hourly Rate</p>
                          <p className="font-semibold text-gray-900">${employee?.hourly_rate || 75}/hr</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Regular Hours</p>
                          <p className="font-semibold text-[#e31c79]">{regularHours.toFixed(1)} hrs</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Overtime Hours</p>
                          <p className="font-semibold text-orange-600">{overtimeHours.toFixed(1)} hrs</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Total Value</p>
                          <p className="font-semibold text-green-600">${totalValue.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No timesheets found</p>
              <p className="text-sm">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>
      </main>

      {/* Timesheet Modal */}
      <TimesheetModal
        isOpen={!!selectedTimecard}
        onClose={() => setSelectedTimecard(null)}
        timesheet={selectedTimecard}
        onApprove={handleModalApprove}
        onReject={handleModalReject}
        processing={processingModal}
      />
    </div>
  )
}