'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Clock, 
  User, 
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Eye,
  ArrowRight,
  Download,
  TrendingUp,
  Clock3
} from 'lucide-react'

interface TimesheetSubmission {
  id: string
  employeeId: string
  employeeName: string
  role: string
  weekStart: string
  weekEnd: string
  totalHours: number
  yourHours: number
  otherHours: number
  status: 'pending' | 'approved' | 'rejected'
  submissionDate: string
  hourlyRate: number
  projects: Array<{
    name: string
    hours: number
    isYourProject: boolean
  }>
  comments?: string
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
  const [timesheets, setTimesheets] = useState<TimesheetSubmission[]>([])
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
  const [weekFilter, setWeekFilter] = useState<string>('current')

  useEffect(() => {
    loadTimesheetData()
  }, [])

  const loadTimesheetData = async () => {
    // Simulate loading timesheet data
    setTimeout(() => {
      const mockTimesheets: TimesheetSubmission[] = [
        {
          id: '1',
          employeeId: 'emp1',
          employeeName: 'Mike Chen',
          role: 'Tech Infrastructure',
          weekStart: '2025-01-13',
          weekEnd: '2025-01-19',
          totalHours: 40.0,
          yourHours: 26.0,
          otherHours: 14.0,
          status: 'pending',
          submissionDate: '2025-01-17',
          hourlyRate: 95,
          projects: [
            { name: 'ABC Corp - Tech Infrastructure', hours: 26, isYourProject: true },
            { name: 'Client XYZ - Development', hours: 14, isYourProject: false }
          ]
        },
        {
          id: '2',
          employeeId: 'emp2',
          employeeName: 'Sarah Johnson',
          role: 'Software Development',
          weekStart: '2025-01-13',
          weekEnd: '2025-01-19',
          totalHours: 37.5,
          yourHours: 37.5,
          otherHours: 0.0,
          status: 'pending',
          submissionDate: '2025-01-17',
          hourlyRate: 110,
          projects: [
            { name: 'ABC Corp - Software Development', hours: 37.5, isYourProject: true }
          ]
        },
        {
          id: '3',
          employeeId: 'emp3',
          employeeName: 'David Kim',
          role: 'Data Analysis',
          weekStart: '2025-01-13',
          weekEnd: '2025-01-19',
          totalHours: 35.0,
          yourHours: 22.0,
          otherHours: 13.0,
          status: 'pending',
          submissionDate: '2025-01-16',
          hourlyRate: 85,
          projects: [
            { name: 'ABC Corp - Data Analysis', hours: 22, isYourProject: true },
            { name: 'Client XYZ - Development', hours: 13, isYourProject: false }
          ]
        },
        {
          id: '4',
          employeeId: 'emp4',
          employeeName: 'Lisa Wang',
          role: 'Project Management',
          weekStart: '2025-01-13',
          weekEnd: '2025-01-19',
          totalHours: 40.0,
          yourHours: 40.0,
          otherHours: 0.0,
          status: 'approved',
          submissionDate: '2025-01-15',
          hourlyRate: 120,
          projects: [
            { name: 'ABC Corp - Project Management', hours: 40, isYourProject: true }
          ]
        },
        {
          id: '5',
          employeeId: 'emp5',
          employeeName: 'Alex Rodriguez',
          role: 'UX Design',
          weekStart: '2025-01-13',
          weekEnd: '2025-01-19',
          totalHours: 38.0,
          yourHours: 38.0,
          otherHours: 0.0,
          status: 'pending',
          submissionDate: '2025-01-17',
          hourlyRate: 90,
          projects: [
            { name: 'ABC Corp - UX Design', hours: 38, isYourProject: true }
          ]
        },
        {
          id: '6',
          employeeId: 'emp6',
          employeeName: 'Emily Chen',
          role: 'Quality Assurance',
          weekStart: '2025-01-13',
          weekEnd: '2025-01-19',
          totalHours: 36.5,
          yourHours: 36.5,
          otherHours: 0.0,
          status: 'pending',
          submissionDate: '2025-01-17',
          hourlyRate: 75,
          projects: [
            { name: 'ABC Corp - Quality Assurance', hours: 36.5, isYourProject: true }
          ]
        }
      ]

      const mockStats: TimesheetStats = {
        totalSubmissions: mockTimesheets.length,
        pendingApprovals: mockTimesheets.filter(t => t.status === 'pending').length,
        approvedThisWeek: mockTimesheets.filter(t => t.status === 'approved').length,
        totalHours: mockTimesheets.reduce((sum, t) => sum + t.yourHours, 0),
        totalValue: mockTimesheets.reduce((sum, t) => sum + (t.yourHours * t.hourlyRate), 0)
      }

      setTimesheets(mockTimesheets)
      setStats(mockStats)
      setIsLoading(false)
    }, 1000)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
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
      case 'pending':
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
      case 'pending':
        return 'Pending Approval'
      case 'approved':
        return 'Approved'
      case 'rejected':
        return 'Rejected'
      default:
        return 'Unknown'
    }
  }

  const handleTimesheetAction = (timesheet: TimesheetSubmission, action: string) => {
    if (action === 'review') {
      router.push(`/manager/approvals?employee=${timesheet.employeeId}&type=timesheet`)
    } else if (action === 'approve') {
      // In real app, this would make API call
    } else if (action === 'reject') {
      // In real app, this would make API call
    }
  }

  const filteredTimesheets = timesheets.filter(timesheet => {
    const matchesSearch = timesheet.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         timesheet.role.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || timesheet.status === statusFilter
    const matchesWeek = weekFilter === 'all' || 
                       (weekFilter === 'current' && timesheet.weekStart === '2025-01-13') ||
                       (weekFilter === 'previous' && timesheet.weekStart === '2025-01-06')
    return matchesSearch && matchesStatus && matchesWeek
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatWeek = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e31c79] mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading Timesheets...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header - EXACTLY matching Admin Dashboard */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Timesheet Management
            </h1>
            <p className="text-gray-600 mt-1">
              ABC Corporation - External Approver
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Review and approve weekly timesheet submissions
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Manager ID</p>
            <p className="font-mono text-gray-900">{appUser?.id}</p>
          </div>
        </div>
      </div>

      {/* Statistics Cards - EXACTLY matching Admin Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="p-6 rounded-lg border bg-pink-50 text-pink-700 border-pink-200">
          <h3 className="text-sm font-medium opacity-75">Total Submissions</h3>
          <p className="text-2xl font-bold mt-1">{stats.totalSubmissions}</p>
          <p className="text-sm opacity-75 mt-1">This period</p>
        </div>

        <div className="p-6 rounded-lg border bg-[#05202E]/10 text-[#05202E] border-[#05202E]/20">
          <h3 className="text-sm font-medium opacity-75">Pending Approval</h3>
          <p className="text-2xl font-bold mt-1">{stats.pendingApprovals}</p>
          <p className="text-sm opacity-75 mt-1">Awaiting review</p>
        </div>

        <div className="p-6 rounded-lg border bg-[#E5DDD8]/50 text-[#05202E] border-[#E5DDD8]">
          <h3 className="text-sm font-medium opacity-75">Approved This Week</h3>
          <p className="text-2xl font-bold mt-1">{stats.approvedThisWeek}</p>
          <p className="text-sm opacity-75 mt-1">Completed</p>
        </div>

        <div className="p-6 rounded-lg border bg-blue-50 text-blue-700 border-blue-200">
          <h3 className="text-sm font-medium opacity-75">Total Hours</h3>
          <p className="text-2xl font-bold mt-1">{stats.totalHours}</p>
          <p className="text-sm opacity-75 mt-1">Your projects</p>
        </div>

        <div className="p-6 rounded-lg border bg-green-50 text-green-700 border-green-200">
          <h3 className="text-sm font-medium opacity-75">Total Value</h3>
          <p className="text-2xl font-bold mt-1">${stats.totalValue.toLocaleString()}</p>
          <p className="text-sm opacity-75 mt-1">Billable amount</p>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search timesheets by employee name or role..."
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
                <option value="pending">Pending</option>
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
                <option value="current">Current Week</option>
                <option value="previous">Previous Week</option>
                <option value="all">All Weeks</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Timesheet List - EXACTLY matching Admin Dashboard style */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-[#e31c79]" />
            Timesheet Submissions
          </h2>
          <div className="flex space-x-2">
            <button 
              className="bg-[#05202E] text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-[#0a2f3f] transition-colors flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Export All
            </button>
          </div>
        </div>

        {filteredTimesheets.length > 0 ? (
          <div className="space-y-4">
            {filteredTimesheets.map((timesheet) => (
              <div key={timesheet.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-[#e31c79] bg-opacity-10 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-[#e31c79]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{timesheet.employeeName}</h3>
                      <p className="text-sm text-gray-600">Employee ID: {timesheet.employeeId}</p>
                      <p className="text-sm text-gray-600">{timesheet.role}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Submitted: {formatDate(timesheet.submissionDate)}
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
                        Week: {formatWeek(timesheet.weekStart, timesheet.weekEnd)}
                      </p>
                      <p className="text-sm text-gray-600">
                        Total: {timesheet.totalHours} hrs
                      </p>
                      <p className="text-sm text-[#e31c79] font-medium">
                        Your Projects: {timesheet.yourHours} hrs
                      </p>
                      {timesheet.otherHours > 0 && (
                        <p className="text-sm text-gray-500">
                          Other: {timesheet.otherHours} hrs
                        </p>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        ${(timesheet.yourHours * timesheet.hourlyRate).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">Billable Value</p>
                      <p className="text-sm text-gray-500">${timesheet.hourlyRate}/hr</p>
                    </div>
                    
                    <div className="flex flex-col space-y-2">
                      {timesheet.status === 'pending' ? (
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

                {/* Project Breakdown */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h4 className="font-medium text-gray-900 mb-3">Project Breakdown</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {timesheet.projects.map((project, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${project.isYourProject ? 'bg-[#e31c79]' : 'bg-gray-400'}`}></div>
                          <div>
                            <p className="font-medium text-gray-900">{project.name.split(' - ')[1]}</p>
                            <p className="text-sm text-gray-500">{project.name.split(' - ')[0]}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{project.hours} hrs</p>
                          <p className={`text-xs ${project.isYourProject ? 'text-[#e31c79]' : 'text-gray-500'}`}>
                            {project.isYourProject ? 'Your Project' : 'Other Client'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Stats Row */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-500">Hourly Rate</p>
                      <p className="font-semibold text-gray-900">${timesheet.hourlyRate}/hr</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Your Hours</p>
                      <p className="font-semibold text-[#e31c79]">{timesheet.yourHours} hrs</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Other Hours</p>
                      <p className="font-semibold text-gray-600">{timesheet.otherHours} hrs</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Value</p>
                      <p className="font-semibold text-green-600">${(timesheet.yourHours * timesheet.hourlyRate).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No timesheets found</p>
            <p className="text-sm">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>
    </div>
  )
}
