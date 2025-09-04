'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { 
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Building2,
  Calendar,
  Download
} from 'lucide-react'

interface PerformanceMetrics {
  totalHours: number
  approvalRate: number
  clientSatisfaction: number
  utilization: number
}

interface DepartmentPerformance {
  department: string
  employeeCount: number
  avgUtilization: number
  avgApprovalRate: number
  totalRevenue: number
}

interface UtilizationTrend {
  month: string
  utilization: number
  target: number
}

export default function EmployeeAnalyticsPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    totalHours: 0,
    approvalRate: 0,
    clientSatisfaction: 0,
    utilization: 0
  })
  const [departmentPerformance, setDepartmentPerformance] = useState<DepartmentPerformance[]>([])
  const [utilizationTrends, setUtilizationTrends] = useState<UtilizationTrend[]>([])
  const [selectedTimeframe, setSelectedTimeframe] = useState('month')

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    // Simulate fetching analytics data
    setPerformanceMetrics({
      totalHours: 1247,
      approvalRate: 97.8,
      clientSatisfaction: 94.2,
      utilization: 87.3
    })

    setDepartmentPerformance([
      {
        department: 'Tech Infrastructure',
        employeeCount: 18,
        avgUtilization: 92.1,
        avgApprovalRate: 98.5,
        totalRevenue: 45600
      },
      {
        department: 'Software Development',
        employeeCount: 22,
        avgUtilization: 89.7,
        avgApprovalRate: 97.2,
        totalRevenue: 52300
      },
      {
        department: 'UI/UX Design',
        employeeCount: 7,
        avgUtilization: 85.4,
        avgApprovalRate: 96.8,
        totalRevenue: 18900
      }
    ])

    setUtilizationTrends([
      { month: 'Oct 2024', utilization: 82.1, target: 85 },
      { month: 'Nov 2024', utilization: 84.3, target: 85 },
      { month: 'Dec 2024', utilization: 86.7, target: 85 },
      { month: 'Jan 2025', utilization: 87.3, target: 85 }
    ])
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e31c79] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'text-green-600'
    if (utilization >= 80) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getApprovalRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600'
    if (rate >= 90) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/admin/employees')}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 mr-4"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[#232020]">Employee Analytics</h1>
              <p className="text-[#465079]">Performance and utilization reports</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-[#465079]">Role</p>
              <p className="text-sm font-medium text-[#232020] capitalize">Admin</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-[#465079]">Admin ID</p>
              <p className="text-sm font-medium text-[#232020]">admin-demo</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Timeframe Selector */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#232020]">Performance Overview</h2>
            <div className="flex items-center space-x-4">
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-[#465079] bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e31c79] transition-colors duration-200">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </button>
            </div>
          </div>

          {/* Performance Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Hours */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-[#e31c79]">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#465079]">Total Hours</p>
                  <p className="text-2xl font-semibold text-[#232020]">{performanceMetrics.totalHours.toLocaleString()}</p>
                  <p className="text-sm text-[#465079]">This month</p>
                </div>
              </div>
            </div>

            {/* Approval Rate */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-[#05202E]">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#465079]">Approval Rate</p>
                  <p className={`text-2xl font-semibold ${getApprovalRateColor(performanceMetrics.approvalRate)}`}>
                    {performanceMetrics.approvalRate}%
                  </p>
                  <p className="text-sm text-[#465079]">Timesheet approvals</p>
                </div>
              </div>
            </div>

            {/* Client Satisfaction */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-[#E5DDD8]">
                  <Users className="h-6 w-6 text-[#05202E]" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#465079]">Client Satisfaction</p>
                  <p className="text-2xl font-semibold text-[#232020]">{performanceMetrics.clientSatisfaction}%</p>
                  <p className="text-sm text-[#465079]">Average rating</p>
                </div>
              </div>
            </div>

            {/* Average Utilization */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-[#e31c79]">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#465079]">Average Utilization</p>
                  <p className={`text-2xl font-semibold ${getUtilizationColor(performanceMetrics.utilization)}`}>
                    {performanceMetrics.utilization}%
                  </p>
                  <p className="text-sm text-[#465079]">Workforce efficiency</p>
                </div>
              </div>
            </div>
          </div>

          {/* Department Performance */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-[#232020] flex items-center">
                <Building2 className="h-5 w-5 mr-2 text-[#e31c79]" />
                Department Performance
              </h2>
            </div>

            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#465079] uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#465079] uppercase tracking-wider">
                        Employees
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#465079] uppercase tracking-wider">
                        Avg Utilization
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#465079] uppercase tracking-wider">
                        Approval Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#465079] uppercase tracking-wider">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {departmentPerformance.map((dept, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-[#232020]">{dept.department}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-[#465079]">{dept.employeeCount}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${getUtilizationColor(dept.avgUtilization)}`}>
                            {dept.avgUtilization}%
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${getApprovalRateColor(dept.avgApprovalRate)}`}>
                            {dept.avgApprovalRate}%
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-[#465079]">${dept.totalRevenue.toLocaleString()}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Utilization Trends */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-[#232020] flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-[#e31c79]" />
                Utilization Trends
              </h2>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {utilizationTrends.map((trend, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-[#e31c79] rounded-full flex items-center justify-center text-white font-semibold">
                        {trend.utilization}%
                      </div>
                      <div>
                        <h3 className="font-medium text-[#232020]">{trend.month}</h3>
                        <p className="text-sm text-[#465079]">Target: {trend.target}%</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${
                        trend.utilization >= trend.target ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {trend.utilization >= trend.target ? '✓ Above Target' : '✗ Below Target'}
                      </div>
                      <div className="text-sm text-[#465079]">
                        {Math.abs(trend.utilization - trend.target).toFixed(1)}% {trend.utilization >= trend.target ? 'above' : 'below'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Insights and Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Key Insights */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-[#232020] flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-[#e31c79]" />
                  Key Insights
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[#232020]">High Approval Rate</p>
                      <p className="text-sm text-[#465079]">97.8% approval rate indicates excellent timesheet quality</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[#232020]">Utilization Opportunity</p>
                      <p className="text-sm text-[#465079]">UI/UX team at 85.4% - consider additional project assignments</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[#232020]">Positive Trend</p>
                      <p className="text-sm text-[#465079]">Utilization has improved 5.2% over the last 4 months</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-[#232020] flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2 text-[#e31c79]" />
                  Recommendations
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-800">Optimize UI/UX Team</h4>
                    <p className="text-sm text-blue-700 mt-1">Assign additional projects to increase utilization from 85.4% to target 90%</p>
                  </div>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="text-sm font-medium text-green-800">Maintain Quality</h4>
                    <p className="text-sm text-green-700 mt-1">Continue current approval processes to maintain 97.8% approval rate</p>
                  </div>
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="text-sm font-medium text-yellow-800">Monitor Trends</h4>
                    <p className="text-sm text-yellow-700 mt-1">Track utilization improvements and identify best practices for replication</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}







