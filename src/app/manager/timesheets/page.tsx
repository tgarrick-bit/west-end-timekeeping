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

interface Employee {
  id: string
  email: string
  first_name: string
  last_name: string
  department?: string
  hourly_rate?: number
  role?: string
}

interface Timesheet {
  id: string
  employee_id: string
  week_ending: string
  total_hours: number
  overtime_hours: number
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  submitted_at?: string
  approved_at?: string
  approved_by?: string
  comments?: string
  created_at?: string
  updated_at?: string
  employee?: Employee
  entries?: TimesheetEntry[]
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
  const { user, employee } = useAuth()
  const supabase = createClientComponentClient()
  
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [selectedTimesheet, setSelectedTimesheet] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [stats, setStats] = useState<TimesheetStats>({
    totalSubmissions: 0,
    pendingApprovals: 0,
    approvedThisWeek: 0,
    totalHours: 0,
    totalValue: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [weekFilter, setWeekFilter] = useState<string>('current')

  useEffect(() => {
    loadTimesheetData()
  }, [])

  const loadTimesheetData = async () => {
    try {
      setIsLoading(true)
      
      // Fetch all timesheets with employee details
      const { data: timesheetsData, error: timesheetsError } = await supabase
        .from('timesheets')
        .select(`
          *,
          employee:employees (
            id,
            email,
            first_name,
            last_name,
            department,
            hourly_rate,
            role
          )
        `)
        .order('week_ending', { ascending: false })

      if (timesheetsError) {
        console.error('Error fetching timesheets:', timesheetsError)
        throw timesheetsError
      }

      setTimesheets(timesheetsData || [])

      // Calculate stats
      if (timesheetsData) {
        const calculatedStats: TimesheetStats = {
          totalSubmissions: timesheetsData.length,
          pendingApprovals: timesheetsData.filter(t => t.status === 'submitted').length,
          approvedThisWeek: timesheetsData.filter(t => t.status === 'approved').length,
          totalHours: timesheetsData.reduce((sum, t) => sum + (t.total_hours || 0), 0),
          totalValue: timesheetsData.reduce((sum, t) => {
            const rate = t.employee?.hourly_rate || 75
            return sum + ((t.total_hours || 0) * rate)
          }, 0)
        }
        setStats(calculatedStats)
      }
    } catch (error) {
      console.error('Error loading timesheet data:', error)
      // You can add your own notification method here
      // For example: alert('Failed to load timesheets')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTimesheetDetails = async (timesheet: Timesheet) => {
    try {
      // Fetch timesheet entries with project information
      const { data: entriesData, error: entriesError } = await supabase
        .from('timesheet_entries')
        .select(`
          *,
          project:projects (
            id,
            name,
            code
          )
        `)
        .eq('timesheet_id', timesheet.id)
        .order('date', { ascending: true })

      if (entriesError) throw entriesError

      // Calculate overtime if not already set
      const totalHours = timesheet.total_hours || 0
      const overtimeHours = timesheet.overtime_hours ?? Math.max(0, totalHours - 40)

      // Create the complete timesheet object with entries
      const timesheetWithEntries = {
        ...timesheet,
        total_hours: totalHours,
        overtime_hours: overtimeHours,
        entries: entriesData || []
      }

      return timesheetWithEntries
    } catch (error) {
      console.error('Error fetching timesheet entries:', error)
      // You can add your own notification method here
      return null
    }
  }

  const handleViewTimesheet = async (timesheet: Timesheet) => {
    const detailedTimesheet = await fetchTimesheetDetails(timesheet)
    if (detailedTimesheet) {
      setSelectedTimesheet(detailedTimesheet)
      setIsModalOpen(true)
    }
  }

  const handleApproveTimesheet = async (timesheetId: string) => {
    try {
      setProcessing(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase
        .from('timesheets')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        })
        .eq('id', timesheetId)

      if (error) throw error

      // Success - you can add your own notification here
      console.log('Timesheet approved successfully')

      // Refresh the data
      await loadTimesheetData()
      
      // Close modal if open
      if (selectedTimesheet?.id === timesheetId) {
        setIsModalOpen(false)
        setSelectedTimesheet(null)
      }
    } catch (error) {
      console.error('Error approving timesheet:', error)
      // You can add your own notification method here
      // For example: alert('Failed to approve timesheet')
    } finally {
      setProcessing(false)
    }
  }

  const handleRejectTimesheet = async (timesheetId: string) => {
    try {
      setProcessing(true)
      
      const { error } = await supabase
        .from('timesheets')
        .update({ 
          status: 'rejected',
          comments: 'Please review and resubmit'
        })
        .eq('id', timesheetId)

      if (error) throw error

      // Success - you can add your own notification here
      console.log('Timesheet rejected')

      // Refresh the data
      await loadTimesheetData()
      
      // Close modal if open
      if (selectedTimesheet?.id === timesheetId) {
        setIsModalOpen(false)
        setSelectedTimesheet(null)
      }
    } catch (error) {
      console.error('Error rejecting timesheet:', error)
      // You can add your own notification method here
      // For example: alert('Failed to reject timesheet')
    } finally {
      setProcessing(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Clock className="w-4 h-4 text-orange-500" />
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'draft':
        return <Clock3 className="w-4 h-4 text-gray-500" />
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
      case 'draft':
        return 'bg-gray-100 text-gray-800'
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
    start.setDate(end.getDate() - 6)
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }

  const filteredTimesheets = timesheets.filter(timesheet => {
    const employeeName = `${timesheet.employee?.first_name || ''} ${timesheet.employee?.last_name || ''}`.toLowerCase()
    const matchesSearch = employeeName.includes(searchTerm.toLowerCase()) ||
                         timesheet.employee?.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         timesheet.employee?.department?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || timesheet.status === statusFilter
    
    // For week filter, you might want to adjust this based on your actual week logic
    const matchesWeek = weekFilter === 'all' || true // Simplified for now
    
    return matchesSearch && matchesStatus && matchesWeek
  })

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
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Timesheet Management
            </h1>
            <p className="text-gray-600 mt-1">
              Review and approve weekly timesheet submissions
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Manager ID</p>
            <p className="font-mono text-gray-900">{employee?.id || user?.id}</p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
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
          <p className="text-2xl font-bold mt-1">{stats.totalHours.toFixed(1)}</p>
          <p className="text-sm opacity-75 mt-1">All projects</p>
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
                placeholder="Search timesheets by employee name, role, or department..."
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
                <option value="submitted">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="draft">Draft</option>
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
        </div>

        {filteredTimesheets.length > 0 ? (
          <div className="space-y-4">
            {filteredTimesheets.map((timesheet) => {
              const employeeName = `${timesheet.employee?.first_name || 'Unknown'} ${timesheet.employee?.last_name || ''}`
              const hourlyRate = timesheet.employee?.hourly_rate || 75
              const regularHours = (timesheet.total_hours || 0) - (timesheet.overtime_hours || 0)
              const totalValue = (regularHours * hourlyRate) + ((timesheet.overtime_hours || 0) * hourlyRate * 1.5)

              return (
                <div key={timesheet.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-[#e31c79] bg-opacity-10 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-[#e31c79]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{employeeName}</h3>
                        <p className="text-sm text-gray-600">{timesheet.employee?.email || 'No email'}</p>
                        <p className="text-sm text-gray-600">{timesheet.employee?.department || 'No department'}</p>
                        {timesheet.submitted_at && (
                          <p className="text-xs text-gray-500 mt-1">
                            Submitted: {formatDate(timesheet.submitted_at)}
                          </p>
                        )}
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
                          Total: {timesheet.total_hours || 0} hrs
                        </p>
                        {timesheet.overtime_hours && timesheet.overtime_hours > 0 && (
                          <p className="text-sm text-orange-600 font-medium">
                            Overtime: {timesheet.overtime_hours} hrs
                          </p>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">
                          ${totalValue.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500">Total Value</p>
                        <p className="text-sm text-gray-500">${hourlyRate}/hr</p>
                      </div>
                      
                      <div className="flex flex-col space-y-2">
                        <button 
                          onClick={() => handleViewTimesheet(timesheet)}
                          className="bg-[#e31c79] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#c41a6b] transition-colors flex items-center"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Review Details
                        </button>
                        
                        {timesheet.status === 'submitted' && (
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => handleApproveTimesheet(timesheet.id)}
                              disabled={processing}
                              className="bg-green-600 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-green-700 transition-colors flex items-center disabled:opacity-50"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Approve
                            </button>
                            <button 
                              onClick={() => handleRejectTimesheet(timesheet.id)}
                              disabled={processing}
                              className="bg-red-600 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-red-700 transition-colors flex items-center disabled:opacity-50"
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
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

      {/* Timesheet Modal */}
      {selectedTimesheet && (
        <TimesheetModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedTimesheet(null)
          }}
          timesheet={selectedTimesheet}
          onApprove={() => handleApproveTimesheet(selectedTimesheet.id)}
          onReject={() => handleRejectTimesheet(selectedTimesheet.id)}
        />
      )}
    </div>
  )
}
