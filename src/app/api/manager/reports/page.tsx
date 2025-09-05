'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  Calendar,
  DollarSign,
  Clock,
  Users,
  FileText,
  Receipt,
  PieChart,
  Activity,
  ArrowRight,
  Filter,
  Search
} from 'lucide-react'

interface ReportData {
  weeklySummary: {
    totalHours: number
    totalExpenses: number
    approvedHours: number
    pendingHours: number
    approvedExpenses: number
    pendingExpenses: number
    employeeCount: number
  }
  projectBreakdown: Array<{
    name: string
    hours: number
    expenses: number
    totalCost: number
    status: 'active' | 'completed' | 'on-hold'
  }>
  employeePerformance: Array<{
    name: string
    employeeId: string
    hours: number
    expenses: number
    efficiency: number
    status: 'approved' | 'pending' | 'rejected'
  }>
  expenseCategories: Array<{
    category: string
    amount: number
    count: number
    percentage: number
  }>
  timeTrends: Array<{
    week: string
    hours: number
    expenses: number
    employees: number
  }>
}

export default function ReportsPage() {
  const router = useRouter()
  const { appUser } = useAuth()
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<string>('overview')
  const [dateRange, setDateRange] = useState('current-week')
  const [exportFormat, setExportFormat] = useState('pdf')

  useEffect(() => {
    loadReportData()
  }, [])

  const loadReportData = async () => {
    // Simulate loading report data
    setTimeout(() => {
      const mockData: ReportData = {
        weeklySummary: {
          totalHours: 156.5,
          totalExpenses: 1247.30,
          approvedHours: 89.0,
          pendingHours: 67.5,
          approvedExpenses: 456.80,
          pendingExpenses: 790.50,
          employeeCount: 6
        },
        projectBreakdown: [
          {
            name: 'ABC Corp - Software Development',
            hours: 75.5,
            expenses: 456.80,
            totalCost: 8750.30,
            status: 'active'
          },
          {
            name: 'ABC Corp - Tech Infrastructure',
            hours: 45.0,
            expenses: 234.50,
            totalCost: 4509.50,
            status: 'active'
          },
          {
            name: 'ABC Corp - Data Analysis',
            hours: 22.0,
            expenses: 156.30,
            totalCost: 2026.30,
            status: 'active'
          },
          {
            name: 'ABC Corp - Project Management',
            hours: 14.0,
            expenses: 400.70,
            totalCost: 2080.70,
            status: 'completed'
          }
        ],
        employeePerformance: [
          {
            name: 'Mike Chen',
            employeeId: 'emp1',
            hours: 26.0,
            expenses: 0,
            efficiency: 95,
            status: 'pending'
          },
          {
            name: 'Sarah Johnson',
            employeeId: 'emp2',
            hours: 37.5,
            expenses: 245.80,
            efficiency: 98,
            status: 'pending'
          },
          {
            name: 'David Kim',
            employeeId: 'emp3',
            hours: 22.0,
            expenses: 156.30,
            efficiency: 92,
            status: 'pending'
          },
          {
            name: 'Lisa Wang',
            employeeId: 'emp4',
            hours: 40.0,
            expenses: 0,
            efficiency: 96,
            status: 'approved'
          },
          {
            name: 'Alex Rodriguez',
            employeeId: 'emp5',
            hours: 38.0,
            expenses: 0,
            efficiency: 89,
            status: 'pending'
          },
          {
            name: 'Emily Chen',
            employeeId: 'emp6',
            hours: 36.5,
            expenses: 89.99,
            efficiency: 94,
            status: 'pending'
          }
        ],
        expenseCategories: [
          {
            category: 'Software & Tools',
            amount: 456.80,
            count: 3,
            percentage: 36.6
          },
          {
            category: 'Meals & Entertainment',
            amount: 245.80,
            count: 2,
            percentage: 19.7
          },
          {
            category: 'Travel & Transportation',
            amount: 234.50,
            count: 2,
            percentage: 18.8
          },
          {
            category: 'Office Supplies',
            amount: 156.30,
            count: 1,
            percentage: 12.5
          },
          {
            category: 'Other',
            amount: 153.90,
            count: 2,
            percentage: 12.4
          }
        ],
        timeTrends: [
          {
            week: 'Jan 6-12',
            hours: 142.0,
            expenses: 890.50,
            employees: 5
          },
          {
            week: 'Jan 13-19',
            hours: 156.5,
            expenses: 1247.30,
            employees: 6
          }
        ]
      }

      setReportData(mockData)
      setIsLoading(false)
    }, 1000)
  }

  const handleExport = (reportType: string) => {
    // In real app, this would generate and download the report
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'on-hold':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 95) return 'text-green-600'
    if (efficiency >= 90) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e31c79] mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading Reports...</p>
        </div>
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No report data available</p>
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
              Manager Reports & Analytics
            </h1>
            <p className="text-gray-600 mt-1">
              ABC Corporation - External Approver
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Comprehensive insights and export capabilities
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Manager ID</p>
            <p className="font-mono text-gray-900">{appUser?.id}</p>
          </div>
        </div>
      </div>

      {/* Report Controls */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
              >
                <option value="current-week">Current Week</option>
                <option value="last-week">Last Week</option>
                <option value="current-month">Current Month</option>
                <option value="last-month">Last Month</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Download className="w-4 h-4 text-gray-400" />
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
              >
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
                <option value="csv">CSV</option>
              </select>
            </div>
          </div>

          <div className="flex space-x-2">
            <button 
              onClick={() => handleExport('weekly-summary')}
              className="bg-[#e31c79] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#c41a6b] transition-colors flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Weekly Summary
            </button>
            <button 
              onClick={() => handleExport('full-report')}
              className="bg-[#05202E] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#0a2f3f] transition-colors flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Full Report
            </button>
          </div>
        </div>
      </div>

      {/* Weekly Summary Cards - EXACTLY matching Admin Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-lg border bg-pink-50 text-pink-700 border-pink-200">
          <h3 className="text-sm font-medium opacity-75">Total Hours</h3>
          <p className="text-2xl font-bold mt-1">{reportData.weeklySummary.totalHours}</p>
          <p className="text-sm opacity-75 mt-1">This week</p>
        </div>

        <div className="p-6 rounded-lg border bg-[#05202E]/10 text-[#05202E] border-[#05202E]/20">
          <h3 className="text-sm font-medium opacity-75">Total Expenses</h3>
          <p className="text-2xl font-bold mt-1">${reportData.weeklySummary.totalExpenses.toLocaleString()}</p>
          <p className="text-sm opacity-75 mt-1">This week</p>
        </div>

        <div className="p-6 rounded-lg border bg-[#E5DDD8]/50 text-[#05202E] border-[#E5DDD8]">
          <h3 className="text-sm font-medium opacity-75">Pending Items</h3>
          <p className="text-2xl font-bold mt-1">{reportData.weeklySummary.pendingHours + reportData.weeklySummary.pendingExpenses}</p>
          <p className="text-sm opacity-75 mt-1">Awaiting approval</p>
        </div>

        <div className="p-6 rounded-lg border bg-green-50 text-green-700 border-green-200">
          <h3 className="text-sm font-medium opacity-75">Active Employees</h3>
          <p className="text-2xl font-bold mt-1">{reportData.weeklySummary.employeeCount}</p>
          <p className="text-sm opacity-75 mt-1">This week</p>
        </div>
      </div>

      {/* Project Breakdown */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-[#e31c79]" />
            Project Breakdown
          </h2>
          <button 
            onClick={() => handleExport('project-breakdown')}
            className="bg-[#e31c79] text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-[#c41a6b] transition-colors flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Project</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Hours</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Expenses</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Total Cost</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {reportData.projectBreakdown.map((project, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-gray-900">{project.name.split(' - ')[1]}</p>
                      <p className="text-sm text-gray-500">{project.name.split(' - ')[0]}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="font-medium text-[#e31c79]">{project.hours} hrs</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="font-medium text-blue-600">${project.expenses.toFixed(2)}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="font-semibold text-gray-900">${project.totalCost.toFixed(2)}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                      {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee Performance */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Users className="w-5 h-5 mr-2 text-[#05202E]" />
            Employee Performance
          </h2>
          <button 
            onClick={() => handleExport('employee-performance')}
            className="bg-[#05202E] text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-[#0a2f3f] transition-colors flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Employee</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Hours</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Expenses</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Efficiency</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Status</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reportData.employeePerformance.map((employee, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-gray-900">{employee.name}</p>
                      <p className="text-sm text-gray-500">ID: {employee.employeeId}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="font-medium text-[#e31c79]">{employee.hours} hrs</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="font-medium text-blue-600">${employee.expenses.toFixed(2)}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`font-semibold ${getEfficiencyColor(employee.efficiency)}`}>
                      {employee.efficiency}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      employee.status === 'approved' ? 'bg-green-100 text-green-800' :
                      employee.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button 
                      onClick={() => router.push(`/manager/approvals?employee=${employee.employeeId}&type=both`)}
                      className="text-[#e31c79] hover:text-[#c41a6b] transition-colors"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expense Categories */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Receipt className="w-5 h-5 mr-2 text-blue-600" />
            Expense Categories
          </h2>
          <button 
            onClick={() => handleExport('expense-categories')}
            className="bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="space-y-3">
              {reportData.expenseCategories.map((category, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full" style={{
                      backgroundColor: `hsl(${index * 60}, 70%, 60%)`
                    }}></div>
                    <div>
                      <p className="font-medium text-gray-900">{category.category}</p>
                      <p className="text-sm text-gray-500">{category.count} items</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">${category.amount.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">{category.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-center">
            <div className="w-48 h-48 bg-gray-100 rounded-full flex items-center justify-center">
              <PieChart className="w-16 h-16 text-gray-400" />
              <p className="text-gray-500 ml-2">Chart</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Export Options */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Export Options</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => handleExport('timesheet-summary')}
            className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-pink-100 rounded-lg">
                <Clock className="w-5 h-5 text-[#e31c79]" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Timesheet Summary</h3>
                <p className="text-sm text-gray-500">All approved hours</p>
              </div>
            </div>
          </button>

          <button 
            onClick={() => handleExport('expense-summary')}
            className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Receipt className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Expense Summary</h3>
                <p className="text-sm text-gray-500">All approved expenses</p>
              </div>
            </div>
          </button>

          <button 
            onClick={() => handleExport('billing-report')}
            className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Billing Report</h3>
                <p className="text-sm text-gray-500">Ready for invoicing</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
