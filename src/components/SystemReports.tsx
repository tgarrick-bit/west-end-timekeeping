'use client'

import { useState, useEffect } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Building2, 
  Clock, 
  DollarSign,
  Download,
  Calendar,
  Filter,
  Receipt,
  AlertCircle,
  X
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ReportData {
  totalUsers: number
  activeUsers: number
  totalClients: number
  activeClients: number
  totalProjects: number
  activeProjects: number
  totalHours: number
  totalExpenses: number
  monthlyRevenue: number
  pendingApprovals: number
}

interface TimeEntry {
  date: string
  hours: number
  project: string
  user: string
}

interface ExpenseEntry {
  date: string
  amount: number
  project: string
  user: string
}

export default function SystemReports() {
  const [reportData, setReportData] = useState<ReportData>({
    totalUsers: 0,
    activeUsers: 0,
    totalClients: 0,
    activeClients: 0,
    totalProjects: 0,
    activeProjects: 0,
    totalHours: 0,
    totalExpenses: 0,
    monthlyRevenue: 0,
    pendingApprovals: 0
  })
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [expenseEntries, setExpenseEntries] = useState<ExpenseEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30') // days
  const [selectedReport, setSelectedReport] = useState<'overview' | 'time' | 'expenses' | 'revenue'>('overview')

  useEffect(() => {
    fetchReportData()
  }, [dateRange])

  const fetchReportData = async () => {
    try {
      setLoading(true)
      
      const days = parseInt(dateRange)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      const startDateStr = startDate.toISOString().split('T')[0]

      // Fetch users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
      
      if (usersError) throw usersError

      // Fetch clients
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
      
      if (clientsError) throw clientsError

      // Fetch projects
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
      
      if (projectsError) throw projectsError

      // Fetch time entries
      const { data: timeData, error: timeError } = await supabase
        .from('time_entries')
        .select(`
          *,
          project:projects(name),
          user:users(first_name, last_name)
        `)
        .gte('date', startDateStr)
        .eq('is_approved', true)
      
      if (timeError) throw timeError

      // Fetch expense items
      const { data: expenseData, error: expenseError } = await supabase
        .from('expense_items')
        .select(`
          *,
          project:projects(name),
          user:users(first_name, last_name)
        `)
        .gte('date', startDateStr)
        .eq('is_approved', true)
      
      if (expenseError) throw expenseError

      // Fetch pending approvals
      const { data: pendingTimesheets, error: pendingTimesheetError } = await supabase
        .from('timesheets')
        .select('*')
        .in('status', ['submitted', 'client_approved'])
      
      if (pendingTimesheetError) throw pendingTimesheetError

      const { data: pendingExpenses, error: pendingExpenseError } = await supabase
        .from('expense_reports')
        .select('*')
        .in('status', ['submitted', 'client_approved'])
      
      if (pendingExpenseError) throw pendingExpenseError

      // Calculate totals
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalHours = (timeData || []).reduce((sum: number, entry: any) => sum + (entry.total_hours || 0), 0) / 60
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalExpenses = (expenseData || []).reduce((sum: number, entry: any) => sum + (entry.amount || 0), 0)
      const monthlyRevenue = totalHours * 75 // Assuming average rate of $75/hour

      setReportData({
        totalUsers: users?.length || 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        activeUsers: users?.filter((u: any) => u.is_active).length || 0,
        totalClients: clients?.length || 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        activeClients: clients?.filter((c: any) => c.is_active).length || 0,
        totalProjects: projects?.length || 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        activeProjects: projects?.filter((p: any) => p.is_active).length || 0,
        totalHours: totalHours,
        totalExpenses: totalExpenses,
        monthlyRevenue: monthlyRevenue,
        pendingApprovals: (pendingTimesheets?.length || 0) + (pendingExpenses?.length || 0)
      })

      // Format time entries for charts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formattedTimeEntries: TimeEntry[] = (timeData || []).map((entry: any) => ({
        date: entry.date,
        hours: (entry.total_hours || 0) / 60,
        project: entry.project?.name || 'Unknown',
        user: `${entry.user?.first_name} ${entry.user?.last_name}` || 'Unknown'
      }))

      // Format expense entries for charts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formattedExpenseEntries: ExpenseEntry[] = (expenseData || []).map((entry: any) => ({
        date: entry.date,
        amount: entry.amount || 0,
        project: entry.project?.name || 'Unknown',
        user: `${entry.user?.first_name} ${entry.user?.last_name}` || 'Unknown'
      }))

      setTimeEntries(formattedTimeEntries)
      setExpenseEntries(formattedExpenseEntries)

    } catch (error) {
      console.error('Error fetching report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportReport = (type: string) => {
    // This would typically generate and download a CSV or PDF
    alert(`Exporting ${type} report...`)
  }

  const getDateRangeLabel = () => {
    switch (dateRange) {
      case '7': return 'Last 7 days'
      case '30': return 'Last 30 days'
      case '90': return 'Last 90 days'
      case '365': return 'Last year'
      default: return 'Last 30 days'
    }
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
          <h2 className="text-2xl font-bold text-[#232020]">System Reports</h2>
          <p className="text-[#465079]">Comprehensive analytics and insights</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <button
            onClick={() => exportReport('comprehensive')}
            className="flex items-center px-4 py-2 bg-[#e31c79] text-white rounded-lg hover:bg-[#d4156a] transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="flex space-x-2 border-b border-gray-200">
        <button
          onClick={() => setSelectedReport('overview')}
          className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
            selectedReport === 'overview'
              ? 'bg-[#e31c79] text-white'
              : 'text-[#465079] hover:text-[#232020]'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setSelectedReport('time')}
          className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
            selectedReport === 'time'
              ? 'bg-[#e31c79] text-white'
              : 'text-[#465079] hover:text-[#232020]'
          }`}
        >
          Time Tracking
        </button>
        <button
          onClick={() => setSelectedReport('expenses')}
          className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
            selectedReport === 'expenses'
              ? 'bg-[#e31c79] text-white'
              : 'text-[#465079] hover:text-[#232020]'
          }`}
        >
          Expenses
        </button>
        <button
          onClick={() => setSelectedReport('revenue')}
          className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
            selectedReport === 'revenue'
              ? 'bg-[#e31c79] text-white'
              : 'text-[#465079] hover:text-[#232020]'
          }`}
        >
          Revenue
        </button>
      </div>

      {/* Overview Report */}
      {selectedReport === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#465079]">Total Users</p>
                  <p className="text-2xl font-semibold text-[#232020]">{reportData.totalUsers}</p>
                  <p className="text-xs text-[#465079]">{reportData.activeUsers} active</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100">
                  <Building2 className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#465079]">Total Clients</p>
                  <p className="text-2xl font-semibold text-[#232020]">{reportData.totalClients}</p>
                  <p className="text-xs text-[#465079]">{reportData.activeClients} active</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#465079]">Total Hours</p>
                  <p className="text-2xl font-semibold text-[#232020]">{reportData.totalHours.toFixed(1)}h</p>
                  <p className="text-xs text-[#465079]">{getDateRangeLabel()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-[#e31c79]">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#465079]">Monthly Revenue</p>
                  <p className="text-2xl font-semibold text-[#232020]">${reportData.monthlyRevenue.toLocaleString()}</p>
                  <p className="text-xs text-[#465079]">Estimated</p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-orange-100">
                  <Building2 className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#465079]">Active Projects</p>
                  <p className="text-2xl font-semibold text-[#232020]">{reportData.activeProjects}</p>
                  <p className="text-xs text-[#465079]">of {reportData.totalProjects} total</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-red-100">
                  <Receipt className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#465079]">Total Expenses</p>
                  <p className="text-2xl font-semibold text-[#232020]">${reportData.totalExpenses.toLocaleString()}</p>
                  <p className="text-xs text-[#465079]">{getDateRangeLabel()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100">
                  <AlertCircle className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#465079]">Pending Approvals</p>
                  <p className="text-2xl font-semibold text-[#232020]">{reportData.pendingApprovals}</p>
                  <p className="text-xs text-[#465079]">Require attention</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Time Tracking Report */}
      {selectedReport === 'time' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-[#232020]">Time Tracking Summary</h3>
              <button
                onClick={() => exportReport('time')}
                className="flex items-center px-3 py-1 text-sm bg-gray-100 text-[#465079] rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{reportData.totalHours.toFixed(1)}h</p>
                  <p className="text-sm text-[#465079]">Total Hours</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {timeEntries.length > 0 ? (reportData.totalHours / timeEntries.length).toFixed(1) : 0}h
                  </p>
                  <p className="text-sm text-[#465079]">Avg per Entry</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{timeEntries.length}</p>
                  <p className="text-sm text-[#465079]">Total Entries</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-[#232020] mb-3">Recent Time Entries</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {timeEntries.slice(0, 10).map((entry, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm text-[#465079]">{entry.user}</span>
                      <span className="text-sm text-[#465079]">{entry.project}</span>
                      <span className="text-sm font-medium text-[#232020]">{entry.hours.toFixed(1)}h</span>
                      <span className="text-sm text-[#465079]">{entry.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expenses Report */}
      {selectedReport === 'expenses' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-[#232020]">Expense Summary</h3>
              <button
                onClick={() => exportReport('expenses')}
                className="flex items-center px-3 py-1 text-sm bg-gray-100 text-[#465079] rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">${reportData.totalExpenses.toLocaleString()}</p>
                  <p className="text-sm text-[#465079]">Total Expenses</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {expenseEntries.length > 0 ? (reportData.totalExpenses / expenseEntries.length).toFixed(2) : 0}
                  </p>
                  <p className="text-sm text-[#465079]">Avg per Entry</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{expenseEntries.length}</p>
                  <p className="text-sm text-[#465079]">Total Entries</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-[#232020] mb-3">Recent Expense Entries</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {expenseEntries.slice(0, 10).map((entry, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm text-[#465079]">{entry.user}</span>
                      <span className="text-sm text-[#465079]">{entry.project}</span>
                      <span className="text-sm font-medium text-[#232020]">${entry.amount.toFixed(2)}</span>
                      <span className="text-sm text-[#465079]">{entry.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Report */}
      {selectedReport === 'revenue' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-[#232020]">Revenue Analysis</h3>
              <button
                onClick={() => exportReport('revenue')}
                className="flex items-center px-3 py-1 text-sm bg-gray-100 text-[#465079] rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-gradient-to-r from-[#e31c79] to-[#d4156a] rounded-lg text-white">
                  <h4 className="text-lg font-semibold mb-2">Estimated Revenue</h4>
                  <p className="text-3xl font-bold">${reportData.monthlyRevenue.toLocaleString()}</p>
                  <p className="text-sm opacity-90">Based on {reportData.totalHours.toFixed(1)} hours</p>
                </div>
                
                <div className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg text-white">
                  <h4 className="text-lg font-semibold mb-2">Hourly Rate Average</h4>
                  <p className="text-3xl font-bold">$75.00</p>
                  <p className="text-sm opacity-90">Standard project rate</p>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium text-[#232020] mb-4">Revenue Breakdown</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="text-[#465079]">Hours Billed</span>
                    <span className="font-medium text-[#232020]">{reportData.totalHours.toFixed(1)} hours</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="text-[#465079]">Average Rate</span>
                    <span className="font-medium text-[#232020]">$75.00/hour</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="text-[#465079]">Gross Revenue</span>
                    <span className="font-medium text-[#232020]">${(reportData.totalHours * 75).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="text-[#465079]">Expenses</span>
                    <span className="font-medium text-[#232020]">-${reportData.totalExpenses.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#e31c79] text-white rounded">
                    <span className="font-medium">Net Revenue</span>
                    <span className="font-bold">${(reportData.monthlyRevenue - reportData.totalExpenses).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
