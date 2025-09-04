'use client'

import { useState, useEffect } from 'react'
import { 
  Clock, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Calendar,
  User,
  Building2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface TimesheetEntry {
  id: string
  user_id: string
  user_name: string
  project_name: string
  client_name: string
  week_start_date: string
  week_end_date: string
  total_hours: number
  status: 'draft' | 'submitted' | 'client_approved' | 'payroll_approved' | 'rejected'
  submitted_at: string
  rejection_reason?: string
}

export default function AdminTimesheetManagement() {
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'submitted' | 'client_approved' | 'payroll_approved' | 'rejected'>('all')
  const [selectedTimesheet, setSelectedTimesheet] = useState<TimesheetEntry | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  useEffect(() => {
    fetchTimesheets()
  }, [])

  const fetchTimesheets = async () => {
    try {
      setLoading(true)
      
      // For now, we'll use mock data since the database might not be fully set up
      // In production, this would fetch from the timesheets table with joins
      const mockTimesheets: TimesheetEntry[] = [
        {
          id: '1',
          user_id: 'user1',
          user_name: 'John Smith',
          project_name: 'Metro Hospital - Nursing Staff',
          client_name: 'Metro Hospital',
          week_start_date: '2025-01-13',
          week_end_date: '2025-01-19',
          total_hours: 40,
          status: 'submitted',
          submitted_at: '2025-01-20T10:00:00Z'
        },
        {
          id: '2',
          user_id: 'user2',
          user_name: 'Sarah Johnson',
          project_name: 'Downtown Office - Security',
          client_name: 'Downtown Office',
          week_start_date: '2025-01-13',
          week_end_date: '2025-01-19',
          total_hours: 38.5,
          status: 'client_approved',
          submitted_at: '2025-01-19T16:30:00Z'
        },
        {
          id: '3',
          user_id: 'user3',
          user_name: 'Mike Chen',
          project_name: 'City Schools - Substitute Teachers',
          client_name: 'City Schools',
          week_start_date: '2025-01-13',
          week_end_date: '2025-01-19',
          total_hours: 35,
          status: 'draft',
          submitted_at: ''
        },
        {
          id: '4',
          user_id: 'user4',
          user_name: 'Lisa Rodriguez',
          project_name: 'Riverside Manufacturing - Assembly Line',
          client_name: 'Riverside Manufacturing',
          week_start_date: '2025-01-13',
          week_end_date: '2025-01-19',
          total_hours: 42,
          status: 'rejected',
          submitted_at: '2025-01-18T14:15:00Z',
          rejection_reason: 'Hours exceed project budget'
        }
      ]
      
      setTimesheets(mockTimesheets)
    } catch (error) {
      console.error('❌ Error fetching timesheets:', error)
      setTimesheets([])
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (timesheetId: string) => {
    try {
      // In production, this would update the database
      setTimesheets(prev => prev.map(ts => 
        ts.id === timesheetId 
          ? { ...ts, status: 'payroll_approved' as const }
          : ts
      ))
    } catch (error) {
      console.error('Error approving timesheet:', error)
    }
  }

  const handleReject = async (timesheetId: string, reason: string) => {
    try {
      // In production, this would update the database
      setTimesheets(prev => prev.map(ts => 
        ts.id === timesheetId 
          ? { ...ts, status: 'rejected' as const, rejection_reason: reason }
          : ts
      ))
    } catch (error) {
      console.error('Error rejecting timesheet:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', icon: Clock },
      submitted: { color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
      client_approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      payroll_approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig]
    const Icon = config.icon
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
      </span>
    )
  }

  const filteredTimesheets = timesheets.filter(timesheet => {
    const matchesSearch = timesheet.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         timesheet.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         timesheet.client_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || timesheet.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const exportTimesheets = () => {
    // In production, this would generate and download a CSV/Excel file
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e31c79]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#232020]">Timesheet Management</h2>
          <p className="text-[#465079]">Review and approve employee timesheets</p>
        </div>
        <button
          onClick={exportTimesheets}
          className="flex items-center px-4 py-2 bg-[#465079] text-white rounded-lg hover:bg-[#3a425f] transition-colors"
        >
          <Download className="h-5 w-5 mr-2" />
          Export Data
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search by employee, project, or client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'draft' | 'submitted' | 'client_approved' | 'payroll_approved' | 'rejected')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="client_approved">Client Approved</option>
          <option value="payroll_approved">Payroll Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Timesheets List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-[#232020]">
            Timesheets ({filteredTimesheets.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredTimesheets.length === 0 ? (
            <div className="px-6 py-8 text-center text-[#465079]">
              No timesheets found matching your criteria.
            </div>
          ) : (
            filteredTimesheets.map((timesheet) => (
              <div key={timesheet.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-[#e5ddd8] rounded-lg">
                      <Clock className="h-6 w-6 text-[#465079]" />
                    </div>
                    <div>
                      <h4 className="font-medium text-[#232020]">{timesheet.user_name}</h4>
                      <div className="flex items-center space-x-4 text-sm text-[#465079]">
                        <span className="flex items-center">
                          <Building2 className="h-4 w-4 mr-1" />
                          {timesheet.client_name}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(timesheet.week_start_date).toLocaleDateString()} - {new Date(timesheet.week_end_date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {timesheet.total_hours}h
                        </span>
                      </div>
                      <p className="text-sm text-[#465079] mt-1">{timesheet.project_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(timesheet.status)}
                    <button
                      onClick={() => {
                        setSelectedTimesheet(timesheet)
                        setShowDetailModal(true)
                      }}
                      className="p-2 text-gray-400 hover:text-[#e31c79] hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {timesheet.status === 'submitted' && (
                      <>
                        <button
                          onClick={() => handleApprove(timesheet.id)}
                          className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleReject(timesheet.id, 'Rejected by admin')}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedTimesheet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <h2 className="text-xl font-bold mb-4">Timesheet Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                <p className="text-gray-900">{selectedTimesheet.user_name}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                <p className="text-gray-900">{selectedTimesheet.client_name}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                <p className="text-gray-900">{selectedTimesheet.project_name}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Week</label>
                <p className="text-gray-900">
                  {new Date(selectedTimesheet.week_start_date).toLocaleDateString()} - {new Date(selectedTimesheet.week_end_date).toLocaleDateString()}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Hours</label>
                <p className="text-gray-900">{selectedTimesheet.total_hours}h</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                {getStatusBadge(selectedTimesheet.status)}
              </div>
              
              {selectedTimesheet.rejection_reason && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason</label>
                  <p className="text-gray-900">{selectedTimesheet.rejection_reason}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-[#e31c79] text-white rounded-md hover:bg-pink-700"
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

