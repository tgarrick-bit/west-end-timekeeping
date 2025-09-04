'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Clock, 
  Receipt, 
  CheckCircle, 
  AlertCircle, 
  Download,
  FileText,
  DollarSign,
  Users,
  TrendingUp,
  Calculator,
  Calendar,
  BarChart3,
  Eye,
  Play,
  Square
} from 'lucide-react'
import { User, TimeEntry, Timesheet, ExpenseItem, Project } from '@/types'
import { LogOut } from 'lucide-react'

interface PayrollDashboardProps {
  user: User
}

interface PayrollItem {
  id: string
  employee: string
  project: string
  week: string
  hours: number
  rate: number
  amount: number
  status: 'pending' | 'approved' | 'processed'
  type: 'timesheet' | 'expense'
}

interface PayrollSummary {
  totalEmployees: number
  totalHours: number
  totalAmount: number
  pendingItems: number
  processedToday: number
}

export default function PayrollDashboard({ user }: PayrollDashboardProps) {
  const { signOut } = useAuth()
  const [payrollItems, setPayrollItems] = useState<PayrollItem[]>([])
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummary>({
    totalEmployees: 0,
    totalHours: 0,
    totalAmount: 0,
    pendingItems: 0,
    processedToday: 0
  })
  const [recentProcessing, setRecentProcessing] = useState<PayrollItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    fetchPayrollData()
  }, [])

  const fetchPayrollData = async () => {
    // Simulate API calls
    setTimeout(() => {
      setPayrollItems([
        {
          id: '1',
          employee: 'Sarah Johnson',
          project: 'Downtown Office Renovation',
          week: 'Week of Jan 15',
          hours: 40,
          rate: 25,
          amount: 1000,
          status: 'pending',
          type: 'timesheet'
        },
        {
          id: '2',
          employee: 'Mike Chen',
          project: 'Tech Infrastructure',
          week: 'Week of Jan 15',
          hours: 38.5,
          rate: 28,
          amount: 1078,
          status: 'pending',
          type: 'timesheet'
        },
        {
          id: '3',
          employee: 'Lisa Rodriguez',
          project: 'Warehouse Expansion',
          week: 'Week of Jan 8',
          hours: 42,
          rate: 22,
          amount: 924,
          status: 'approved',
          type: 'timesheet'
        },
        {
          id: '4',
          employee: 'David Thompson',
          project: 'Marketing Campaign',
          week: 'Week of Jan 8',
          hours: 35,
          rate: 30,
          amount: 1050,
          status: 'approved',
          type: 'timesheet'
        },
        {
          id: '5',
          employee: 'Emily Davis',
          project: 'Tech Infrastructure',
          week: 'Week of Jan 8',
          hours: 40,
          rate: 26,
          amount: 1040,
          status: 'processed',
          type: 'timesheet'
        }
      ])

      setPayrollSummary({
        totalEmployees: 47,
        totalHours: 195.5,
        totalAmount: 5092,
        pendingItems: 2,
        processedToday: 3
      })

      setRecentProcessing([
        {
          id: '6',
          employee: 'John Smith',
          project: 'Warehouse Expansion',
          week: 'Week of Jan 1',
          hours: 40,
          rate: 24,
          amount: 960,
          status: 'processed',
          type: 'timesheet'
        }
      ])
    }, 1000)
  }

  const handleProcessPayroll = async () => {
    setIsProcessing(true)
    
    // Simulate processing time
    setTimeout(() => {
      setPayrollItems(prev => 
        prev.map(item => 
          item.status === 'approved' 
            ? { ...item, status: 'processed' }
            : item
        )
      )
      
      setPayrollSummary(prev => ({
        ...prev,
        pendingItems: 0,
        processedToday: prev.processedToday + 2
      }))
      
      setIsProcessing(false)
    }, 2000)
  }

  const handleExportPayroll = () => {
    // Simulate export functionality
    const csvContent = payrollItems
      .filter(item => item.status === 'processed')
      .map(item => `${item.employee},${item.project},${item.week},${item.hours},${item.rate},${item.amount}`)
      .join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'payroll-export.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      processed: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig]
    const Icon = config.icon
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const pendingItems = payrollItems.filter(item => item.status === 'pending')
  const approvedItems = payrollItems.filter(item => item.status === 'approved')
  const processedItems = payrollItems.filter(item => item.status === 'processed')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-2xl font-bold text-[#232020]">Payroll Dashboard</h1>
              <p className="text-[#465079]">Welcome back, {user.first_name} {user.last_name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleProcessPayroll}
                disabled={isProcessing || approvedItems.length === 0}
                className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center ${
                  isProcessing || approvedItems.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-[#e31c79] hover:bg-[#d4156a] text-white'
                }`}
              >
                {isProcessing ? (
                  <>
                    <Square className="w-4 h-4 mr-2 animate-pulse" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Process Payroll
                  </>
                )}
              </button>
              <button
                onClick={handleExportPayroll}
                disabled={processedItems.length === 0}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center ${
                  processedItems.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-[#465079] hover:bg-[#3a4356] text-white'
                }`}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
              <button
                onClick={signOut}
                className="ml-4 px-4 py-2 text-[#465079] hover:text-[#e31c79] hover:bg-gray-100 rounded-lg transition-colors flex items-center"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Timesheet Management Card */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg shadow-lg p-6 text-white mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-full">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Timesheet Processing</h2>
                <p className="text-green-100 mt-1">Process approved timesheets for payroll</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={() => window.location.href = '/dashboard'}
                className="flex items-center px-6 py-3 bg-white text-green-700 rounded-lg font-semibold hover:bg-green-50 transition-colors shadow-sm"
              >
                <FileText className="h-5 w-5 mr-2" />
                View Timesheets
              </button>
              <button 
                onClick={() => window.location.href = '/dashboard?section=pending'}
                className="flex items-center px-6 py-3 bg-white bg-opacity-20 text-white rounded-lg font-semibold hover:bg-white hover:text-green-700 transition-colors"
              >
                <Calculator className="h-5 w-5 mr-2" />
                Calculate Payroll
              </button>
            </div>
          </div>
        </div>

        {/* Payroll Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-[#e31c79]">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-[#465079]">Total Employees</p>
                <p className="text-2xl font-semibold text-[#232020]">{payrollSummary.totalEmployees}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-[#465079]">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-[#465079]">Total Hours</p>
                <p className="text-2xl font-semibold text-[#232020]">{payrollSummary.totalHours}h</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-[#e31c79]">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-[#465079]">Total Amount</p>
                <p className="text-2xl font-semibold text-[#232020]">${payrollSummary.totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-500">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-[#465079]">Pending</p>
                <p className="text-2xl font-semibold text-[#232020]">{payrollSummary.pendingItems}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-500">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-[#465079]">Processed Today</p>
                <p className="text-2xl font-semibold text-[#232020]">{payrollSummary.processedToday}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Payroll Items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pending Approval Items */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-[#232020]">Pending Approval</h2>
                <p className="text-[#465079] text-sm">Timesheets ready for payroll processing</p>
              </div>
              <div className="p-6">
                {pendingItems.length > 0 ? (
                  <div className="space-y-4">
                    {pendingItems.map((item) => (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <Clock className="w-5 h-5 text-[#465079] mr-2" />
                              <span className="font-medium text-[#232020]">Timesheet</span>
                            </div>
                            <p className="font-semibold text-[#232020]">{item.employee}</p>
                            <p className="text-[#465079]">{item.project}</p>
                            <p className="text-sm text-[#465079]">{item.week}</p>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-lg font-semibold text-[#232020] mb-1">
                              {item.hours}h
                            </div>
                            <div className="text-sm text-[#465079] mb-1">
                              @${item.rate}/hr
                            </div>
                            <div className="text-lg font-bold text-[#e31c79]">
                              ${item.amount}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <button className="flex items-center text-[#465079] hover:text-[#e31c79] transition-colors">
                            <Eye className="w-4 h-4 mr-1" />
                            Review Details
                          </button>
                          {getStatusBadge(item.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[#465079]">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                    <p>No pending items</p>
                    <p className="text-sm">All approved timesheets are ready for processing</p>
                  </div>
                )}
              </div>
            </div>

            {/* Approved Items Ready for Processing */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-[#232020]">Ready for Processing</h2>
                <p className="text-[#465079] text-sm">Approved timesheets ready to be processed</p>
              </div>
              <div className="p-6">
                {approvedItems.length > 0 ? (
                  <div className="space-y-4">
                    {approvedItems.map((item) => (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-green-50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                              <span className="font-medium text-[#232020]">Ready for Processing</span>
                            </div>
                            <p className="font-semibold text-[#232020]">{item.employee}</p>
                            <p className="text-[#465079]">{item.project}</p>
                            <p className="text-sm text-[#465079]">{item.week}</p>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-lg font-semibold text-[#232020] mb-1">
                              {item.hours}h
                            </div>
                            <div className="text-sm text-[#465079] mb-1">
                              @${item.rate}/hr
                            </div>
                            <div className="text-lg font-bold text-[#e31c79]">
                              ${item.amount}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-green-100">
                          <button className="flex items-center text-[#465079] hover:text-[#e31c79] transition-colors">
                            <Eye className="w-4 h-4 mr-1" />
                            Review Details
                          </button>
                          {getStatusBadge(item.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[#465079]">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 text-yellow-500" />
                    <p>No approved items</p>
                    <p className="text-sm">Approved timesheets will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Status & Actions */}
          <div className="space-y-6">
            {/* Processing Status */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-[#232020] mb-4">Processing Status</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-blue-600 mr-3" />
                    <span className="text-[#465079]">Processed Today</span>
                  </div>
                  <span className="font-semibold text-[#232020]">{payrollSummary.processedToday}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                    <span className="text-[#465079]">Ready to Process</span>
                  </div>
                  <span className="font-semibold text-[#232020]">{approvedItems.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mr-3" />
                    <span className="text-[#465079]">Pending Approval</span>
                  </div>
                  <span className="font-semibold text-[#232020]">{pendingItems.length}</span>
                </div>
              </div>
            </div>

            {/* Recent Processing */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-[#232020] mb-4">Recently Processed</h2>
              <div className="space-y-3">
                {recentProcessing.map((item) => (
                  <div key={item.id} className="flex items-center p-3 bg-[#e5ddd8] rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                    <div className="flex-1">
                      <p className="font-medium text-[#232020]">{item.employee}</p>
                      <p className="text-sm text-[#465079]">
                        {item.hours}h • ${item.amount} • {item.week}
                      </p>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-[#232020] mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button className="w-full text-left p-3 bg-[#e5ddd8] hover:bg-[#d4c8c0] rounded-lg transition-colors">
                  <div className="flex items-center">
                    <Calculator className="w-5 h-5 text-[#465079] mr-3" />
                    <span className="font-medium text-[#232020]">Payroll Calculator</span>
                  </div>
                </button>
                <button className="w-full text-left p-3 bg-[#e5ddd8] hover:bg-[#d4c8c0] rounded-lg transition-colors">
                  <div className="flex items-center">
                    <BarChart3 className="w-5 h-5 text-[#465079] mr-3" />
                    <span className="font-medium text-[#232020]">Payroll Reports</span>
                  </div>
                </button>
                <button className="w-full text-left p-3 bg-[#e5ddd8] hover:bg-[#d4c8c0] rounded-lg transition-colors">
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 text-[#465079] mr-3" />
                    <span className="font-medium text-[#232020]">Pay Periods</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
