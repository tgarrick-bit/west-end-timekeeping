'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Users, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  AlertCircle,
  User,
  Eye,
  FileText,
  Receipt,
  ArrowRight,
  Search,
  Filter,
  Calendar,
  TrendingUp
} from 'lucide-react'

interface ContractorData {
  id: string
  name: string
  role: string
  status: 'timesheet_pending' | 'expense_pending' | 'both_pending' | 'up_to_date'
  totalHours: number
  yourHours: number
  otherHours: number
  pendingExpenses: number
  employeeId: string
  hourlyRate: number
  lastSubmission: string
  weekStart: string
  weekEnd: string
  timesheetCount: number
  expenseCount: number
}

interface ContractorStats {
  totalContractors: number
  pendingTimesheets: number
  pendingExpenses: number
  totalAmount: number
  totalHours: number
}

export default function ContractorsPage() {
  const router = useRouter()
  const { appUser } = useAuth()
  const [contractors, setContractors] = useState<ContractorData[]>([])
  const [stats, setStats] = useState<ContractorStats>({
    totalContractors: 0,
    pendingTimesheets: 0,
    pendingExpenses: 0,
    totalAmount: 0,
    totalHours: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    loadContractorData()
  }, [])

  const loadContractorData = async () => {
    // Simulate loading contractor data
    setTimeout(() => {
      const mockContractors: ContractorData[] = [
        {
          id: '1',
          name: 'Mike Chen',
          role: 'Tech Infrastructure',
          status: 'timesheet_pending',
          totalHours: 40.0,
          yourHours: 26.0,
          otherHours: 14.0,
          pendingExpenses: 0,
          employeeId: 'emp1',
          hourlyRate: 95,
          lastSubmission: '2025-01-17',
          weekStart: '2025-01-13',
          weekEnd: '2025-01-19',
          timesheetCount: 1,
          expenseCount: 0
        },
        {
          id: '2',
          name: 'Sarah Johnson',
          role: 'Software Development',
          status: 'both_pending',
          totalHours: 37.5,
          yourHours: 37.5,
          otherHours: 0.0,
          pendingExpenses: 245.80,
          employeeId: 'emp2',
          hourlyRate: 110,
          lastSubmission: '2025-01-17',
          weekStart: '2025-01-13',
          weekEnd: '2025-01-19',
          timesheetCount: 1,
          expenseCount: 2
        },
        {
          id: '3',
          name: 'David Kim',
          role: 'Data Analysis',
          status: 'expense_pending',
          totalHours: 35.0,
          yourHours: 22.0,
          otherHours: 13.0,
          pendingExpenses: 156.30,
          employeeId: 'emp3',
          hourlyRate: 85,
          lastSubmission: '2025-01-16',
          weekStart: '2025-01-13',
          weekEnd: '2025-01-19',
          timesheetCount: 0,
          expenseCount: 1
        },
        {
          id: '4',
          name: 'Lisa Wang',
          role: 'Project Management',
          status: 'up_to_date',
          totalHours: 40.0,
          yourHours: 40.0,
          otherHours: 0.0,
          pendingExpenses: 0,
          employeeId: 'emp4',
          hourlyRate: 120,
          lastSubmission: '2025-01-15',
          weekStart: '2025-01-13',
          weekEnd: '2025-01-19',
          timesheetCount: 0,
          expenseCount: 0
        },
        {
          id: '5',
          name: 'Alex Rodriguez',
          role: 'UX Design',
          status: 'timesheet_pending',
          totalHours: 38.0,
          yourHours: 38.0,
          otherHours: 0.0,
          pendingExpenses: 0,
          employeeId: 'emp5',
          hourlyRate: 90,
          lastSubmission: '2025-01-17',
          weekStart: '2025-01-13',
          weekEnd: '2025-01-19',
          timesheetCount: 1,
          expenseCount: 0
        },
        {
          id: '6',
          name: 'Emily Chen',
          role: 'Quality Assurance',
          status: 'both_pending',
          totalHours: 36.5,
          yourHours: 36.5,
          otherHours: 0.0,
          pendingExpenses: 89.99,
          employeeId: 'emp6',
          hourlyRate: 75,
          lastSubmission: '2025-01-17',
          weekStart: '2025-01-13',
          weekEnd: '2025-01-19',
          timesheetCount: 1,
          expenseCount: 1
        }
      ]

      const mockStats: ContractorStats = {
        totalContractors: mockContractors.length,
        pendingTimesheets: mockContractors.filter(c => c.status === 'timesheet_pending' || c.status === 'both_pending').length,
        pendingExpenses: mockContractors.filter(c => c.status === 'expense_pending' || c.status === 'both_pending').length,
        totalAmount: mockContractors.reduce((sum, c) => sum + c.pendingExpenses, 0),
        totalHours: mockContractors.reduce((sum, c) => sum + c.yourHours, 0)
      }

      setContractors(mockContractors)
      setStats(mockStats)
      setIsLoading(false)
    }, 1000)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'timesheet_pending':
        return <Clock className="w-4 h-4 text-orange-500" />
      case 'expense_pending':
        return <DollarSign className="w-4 h-4 text-blue-500" />
      case 'both_pending':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'up_to_date':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'timesheet_pending':
        return 'Timesheet Pending'
      case 'expense_pending':
        return 'Expense Pending'
      case 'both_pending':
        return 'Both Pending'
      case 'up_to_date':
        return 'Up to Date'
      default:
        return 'Unknown'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'timesheet_pending':
        return 'bg-orange-100 text-orange-800'
      case 'expense_pending':
        return 'bg-blue-100 text-blue-800'
      case 'both_pending':
        return 'bg-red-100 text-red-800'
      case 'up_to_date':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleContractorAction = (contractor: ContractorData, action: string) => {
    if (action === 'timesheet' || action === 'both') {
      router.push(`/manager/approvals?employee=${contractor.employeeId}&type=timesheet`)
    } else if (action === 'expense') {
      router.push(`/manager/approvals?employee=${contractor.employeeId}&type=expense`)
    } else if (action === 'details') {
      router.push(`/manager/contractors/${contractor.employeeId}`)
    }
  }

  const filteredContractors = contractors.filter(contractor => {
    const matchesSearch = contractor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contractor.role.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || contractor.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e31c79] mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading Contractor List...</p>
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
              Your Contractor Team
            </h1>
            <p className="text-gray-600 mt-1">
              ABC Corporation - External Approver
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Manage and approve your assigned contractors
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
          <h3 className="text-sm font-medium opacity-75">Total Contractors</h3>
          <p className="text-2xl font-bold mt-1">{stats.totalContractors}</p>
          <p className="text-sm opacity-75 mt-1">Assigned to you</p>
        </div>

        <div className="p-6 rounded-lg border bg-[#05202E]/10 text-[#05202E] border-[#05202E]/20">
          <h3 className="text-sm font-medium opacity-75">Pending Timesheets</h3>
          <p className="text-2xl font-bold mt-1">{stats.pendingTimesheets}</p>
          <p className="text-sm opacity-75 mt-1">Awaiting review</p>
        </div>

        <div className="p-6 rounded-lg border bg-[#E5DDD8]/50 text-[#05202E] border-[#E5DDD8]">
          <h3 className="text-sm font-medium opacity-75">Pending Expenses</h3>
          <p className="text-2xl font-bold mt-1">{stats.pendingExpenses}</p>
          <p className="text-sm opacity-75 mt-1">Awaiting approval</p>
        </div>

        <div className="p-6 rounded-lg border bg-blue-50 text-blue-700 border-blue-200">
          <h3 className="text-sm font-medium opacity-75">Total Amount</h3>
          <p className="text-2xl font-bold mt-1">${stats.totalAmount.toLocaleString()}</p>
          <p className="text-sm opacity-75 mt-1">Pending approval</p>
        </div>

        <div className="p-6 rounded-lg border bg-green-50 text-green-700 border-green-200">
          <h3 className="text-sm font-medium opacity-75">Total Hours</h3>
          <p className="text-2xl font-bold mt-1">{stats.totalHours}</p>
          <p className="text-sm opacity-75 mt-1">This week</p>
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
                placeholder="Search contractors by name or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="timesheet_pending">Timesheet Pending</option>
              <option value="expense_pending">Expense Pending</option>
              <option value="both_pending">Both Pending</option>
              <option value="up_to_date">Up to Date</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contractor List - EXACTLY matching Admin Dashboard style */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Users className="w-5 h-5 mr-2 text-[#e31c79]" />
            Contractor Overview
          </h2>
          <div className="text-sm text-gray-500">
            Week of {formatDate(contractors[0]?.weekStart)} - {formatDate(contractors[0]?.weekEnd)}
          </div>
        </div>

        {filteredContractors.length > 0 ? (
          <div className="space-y-4">
            {filteredContractors.map((contractor) => (
              <div key={contractor.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-[#e31c79] bg-opacity-10 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-[#e31c79]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{contractor.name}</h3>
                      <p className="text-sm text-gray-600">Employee ID: {contractor.employeeId}</p>
                      <p className="text-sm text-gray-600">{contractor.role}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Last submission: {formatDate(contractor.lastSubmission)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <div className="flex items-center space-x-2 mb-2">
                        {getStatusIcon(contractor.status)}
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(contractor.status)}`}>
                          {getStatusText(contractor.status)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {contractor.totalHours} hrs this week
                      </p>
                      <p className="text-sm text-gray-600">
                        Your Hours: {contractor.yourHours} hrs | Other: {contractor.otherHours} hrs
                      </p>
                      {contractor.pendingExpenses > 0 && (
                        <p className="text-sm text-blue-600 font-medium">
                          Expenses: ${contractor.pendingExpenses.toFixed(2)}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-col space-y-2">
                      {contractor.status === 'timesheet_pending' || contractor.status === 'both_pending' ? (
                        <button 
                          onClick={() => handleContractorAction(contractor, 'timesheet')}
                          className="bg-[#e31c79] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#c41a6b] transition-colors flex items-center"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Review Timesheet
                        </button>
                      ) : null}
                      {contractor.status === 'expense_pending' || contractor.status === 'both_pending' ? (
                        <button 
                          onClick={() => handleContractorAction(contractor, 'expense')}
                          className="bg-[#05202E] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#0a2f3f] transition-colors flex items-center"
                        >
                          <Receipt className="w-4 h-4 mr-2" />
                          Review Expenses
                        </button>
                      ) : null}
                      {contractor.status === 'both_pending' && (
                        <button 
                          onClick={() => handleContractorAction(contractor, 'both')}
                          className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors flex items-center"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Review All
                        </button>
                      )}
                      <button 
                        onClick={() => handleContractorAction(contractor, 'details')}
                        className="bg-[#E5DDD8] text-[#05202E] px-4 py-2 rounded-md text-sm font-medium hover:bg-[#d4cac3] transition-colors flex items-center"
                      >
                        <ArrowRight className="w-4 h-4 mr-2" />
                        View Details
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Stats Row */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-500">Hourly Rate</p>
                      <p className="font-semibold text-gray-900">${contractor.hourlyRate}/hr</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Pending Timesheets</p>
                      <p className="font-semibold text-orange-600">{contractor.timesheetCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Pending Expenses</p>
                      <p className="font-semibold text-blue-600">{contractor.expenseCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Weekly Value</p>
                      <p className="font-semibold text-green-600">${(contractor.yourHours * contractor.hourlyRate).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No contractors found</p>
            <p className="text-sm">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>
    </div>
  )
}
