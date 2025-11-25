'use client'

import { useState, useEffect } from 'react'
import { User } from '@/types'
import { useNotifications } from '@/hooks/useNotifications'
import { 
  Users, 
  FileText, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Eye,
  Download,
  MessageSquare,
  BarChart3
} from 'lucide-react'

interface ManagerDashboardProps {
  user: User
}

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
}

interface ManagerStats {
  pendingTimesheets: number
  pendingExpenses: number
  totalAmount: number
  totalContractors: number
}

export default function ManagerDashboard({ user }: ManagerDashboardProps) {
  const { notifyManagerPendingReminder } = useNotifications();
  const [contractors, setContractors] = useState<ContractorData[]>([])
  const [stats, setStats] = useState<ManagerStats>({
    pendingTimesheets: 0,
    pendingExpenses: 0,
    totalAmount: 0,
    totalContractors: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading manager data
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
          employeeId: 'emp1'
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
          employeeId: 'emp2'
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
          employeeId: 'emp3'
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
          employeeId: 'emp4'
        }
      ]

      const mockStats: ManagerStats = {
        pendingTimesheets: 3,
        pendingExpenses: 2,
        totalAmount: 2847.50,
        totalContractors: 4
      }

      setContractors(mockContractors)
      setStats(mockStats)
      setIsLoading(false)
      
      // Send notification if there are pending items
      if (mockStats.pendingTimesheets > 0 || mockStats.pendingExpenses > 0) {
        notifyManagerPendingReminder(user.id, mockStats.pendingTimesheets + mockStats.pendingExpenses);
      }
    }, 1000)
  }, [user.id, notifyManagerPendingReminder])

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e31c79] mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading Manager Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#33393c]">
                West End Workforce - Manager Portal
              </h1>
              <p className="text-lg text-gray-600 mt-1">
                Welcome back, {user.first_name} {user.last_name}!
              </p>
              <p className="text-sm text-gray-500 mt-1">
                ABC Corporation - External Approver | Manager ID: {user.id}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Current Week</div>
              <div className="text-lg font-semibold text-[#33393c]">January 13-19, 2025</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Timesheets</p>
                <p className="text-2xl font-bold text-[#33393c]">{stats.pendingTimesheets}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Expenses</p>
                <p className="text-2xl font-bold text-[#33393c]">{stats.pendingExpenses}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-[#33393c]">${stats.totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-[#e31c79] bg-opacity-10 rounded-lg">
                <Users className="w-6 h-6 text-[#e31c79]" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Your Contractors</p>
                <p className="text-2xl font-bold text-[#33393c]">{stats.totalContractors}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <button className="bg-[#e31c79] text-white px-4 py-3 rounded-lg font-medium hover:bg-[#c41a6b] transition-colors flex items-center justify-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Review Timesheets</span>
          </button>
          <button className="bg-[#33393c] text-white px-4 py-3 rounded-lg font-medium hover:bg-[#0a2f3f] transition-colors flex items-center justify-center space-x-2">
            <DollarSign className="w-5 h-5" />
            <span>Review Expenses</span>
          </button>
          <button className="bg-[#E5DDD8] text-[#33393c] px-4 py-3 rounded-lg font-medium hover:bg-[#d4cac3] transition-colors flex items-center justify-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Generate Reports</span>
          </button>
          <button className="bg-[#E5DDD8] text-[#33393c] px-4 py-3 rounded-lg font-medium hover:bg-[#d4cac3] transition-colors flex items-center justify-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Contractor List</span>
          </button>
        </div>

        {/* Contractor List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-[#33393c]">Your Contractors - Pending Approvals</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {contractors.map((contractor) => (
              <div key={contractor.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-[#e31c79] bg-opacity-10 rounded-full flex items-center justify-center">
                        <span className="text-[#e31c79] font-semibold text-sm">
                          {contractor.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-[#33393c]">{contractor.name}</h3>
                        <p className="text-sm text-gray-600">Employee ID: {contractor.employeeId}</p>
                        <p className="text-sm text-gray-600">{contractor.role}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="flex items-center space-x-2 mb-1">
                        {getStatusIcon(contractor.status)}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(contractor.status)}`}>
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
                          Expenses: ${contractor.pendingExpenses}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      {contractor.status === 'timesheet_pending' || contractor.status === 'both_pending' ? (
                        <button className="bg-[#e31c79] text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-[#c41a6b] transition-colors">
                          Review Timesheet
                        </button>
                      ) : null}
                      {contractor.status === 'expense_pending' || contractor.status === 'both_pending' ? (
                        <button className="bg-[#33393c] text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-[#0a2f3f] transition-colors">
                          Review Expenses
                        </button>
                      ) : null}
                      {contractor.status === 'both_pending' && (
                        <button className="bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors">
                          Review All
                        </button>
                      )}
                      <button className="bg-[#E5DDD8] text-[#33393c] px-3 py-2 rounded-md text-sm font-medium hover:bg-[#d4cac3] transition-colors">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
