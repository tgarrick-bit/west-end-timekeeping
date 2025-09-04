'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { 
  ArrowLeft,
  Download,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Users,
  TrendingUp,
  BarChart3,
  Eye,
  FileSpreadsheet,
  FileSpreadsheet as FileCsv,
  Settings,
  Zap,
  Calendar,
  Target,
  Activity
} from 'lucide-react'

interface ApprovalMetric {
  approver_id: string
  approver_name: string
  client: string
  total_approvals: number
  avg_approval_time: number
  approval_rate: number
  pending_count: number
  overdue_count: number
  last_activity: string
}

interface ApprovalTrend {
  date: string
  submitted: number
  approved: number
  rejected: number
  avg_time: number
}

export default function ApprovalAnalyticsPage() {
  const router = useRouter()
  const { user: appUser, isLoading } = useAuth()
  const [approvalMetrics, setApprovalMetrics] = useState<ApprovalMetric[]>([])
  const [approvalTrends, setApprovalTrends] = useState<ApprovalTrend[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState('week')
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    if (!isLoading && (!appUser || appUser.role !== 'admin')) {
      router.push('/auth/signin')
    }
  }, [appUser, isLoading, router])

  useEffect(() => {
    // Simulate approval metrics data
    setApprovalMetrics([
      {
        approver_id: 'approver1',
        approver_name: 'Jane Smith',
        client: 'ABC Corporation',
        total_approvals: 156,
        avg_approval_time: 4.2,
        approval_rate: 97.8,
        pending_count: 8,
        overdue_count: 1,
        last_activity: '2 hours ago'
      },
      {
        approver_id: 'approver2',
        approver_name: 'David Wilson',
        client: 'XYZ Technologies',
        total_approvals: 89,
        avg_approval_time: 6.8,
        approval_rate: 94.2,
        pending_count: 12,
        overdue_count: 3,
        last_activity: '1 hour ago'
      },
      {
        approver_id: 'approver3',
        approver_name: 'Sarah Johnson',
        client: 'StartupCo',
        total_approvals: 67,
        avg_approval_time: 12.5,
        approval_rate: 89.5,
        pending_count: 15,
        overdue_count: 5,
        last_activity: '4 hours ago'
      }
    ])

    // Simulate approval trends data
    setApprovalTrends([
      { date: '2025-01-13', submitted: 45, approved: 42, rejected: 2, avg_time: 3.8 },
      { date: '2025-01-14', submitted: 38, approved: 36, rejected: 1, avg_time: 4.1 },
      { date: '2025-01-15', submitted: 52, approved: 49, rejected: 3, avg_time: 4.5 },
      { date: '2025-01-16', submitted: 41, approved: 39, rejected: 2, avg_time: 4.2 },
      { date: '2025-01-17', submitted: 47, approved: 44, rejected: 2, avg_time: 3.9 },
      { date: '2025-01-18', submitted: 35, approved: 33, rejected: 1, avg_time: 4.3 },
      { date: '2025-01-19', submitted: 28, approved: 26, rejected: 1, avg_time: 4.0 }
    ])
  }, [])

  const periodOptions = [
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' }
  ]

  const totalApprovals = approvalMetrics.reduce((sum, metric) => sum + metric.total_approvals, 0)
  const totalPending = approvalMetrics.reduce((sum, metric) => sum + metric.pending_count, 0)
  const totalOverdue = approvalMetrics.reduce((sum, metric) => sum + metric.overdue_count, 0)
  const avgApprovalTime = approvalMetrics.reduce((sum, metric) => sum + metric.avg_approval_time, 0) / approvalMetrics.length

  const handleGenerateReport = async () => {
    setIsGenerating(true)
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 3000))
    setIsGenerating(false)
    
    alert('Approval analytics report generated successfully')
  }

  const getPerformanceColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600'
    if (rate >= 85) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getPerformanceIcon = (rate: number) => {
    if (rate >= 95) return <CheckCircle className="h-4 w-4" />
    if (rate >= 85) return <AlertCircle className="h-4 w-4" />
    return <AlertCircle className="h-4 w-4" />
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e31c79] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading approval analytics...</p>
        </div>
      </div>
    )
  }

  if (!appUser || appUser.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Match Admin Dashboard exactly */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/admin/reports')}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 mr-4"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[#232020]">Approval Analytics</h1>
              <p className="text-[#465079]">Workflow monitoring and approval performance tracking</p>
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
        <div className="space-y-8">
          {/* Period Selection and Report Generation */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#232020]">Generate Approval Analytics</h2>
              <div className="flex items-center space-x-4">
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                >
                  {periodOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleGenerateReport}
                  disabled={isGenerating}
                  className="flex items-center px-4 py-2 bg-[#e31c79] text-white rounded-lg font-medium hover:bg-[#d4156a] transition-colors disabled:opacity-50"
                >
                  {isGenerating ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <BarChart3 className="h-4 w-4 mr-2" />
                  )}
                  Generate Report
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button className="flex flex-col items-center p-3 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <FileSpreadsheet className="h-6 w-6 text-[#e31c79] mb-2" />
                <span className="text-sm font-medium text-[#232020]">Excel Report</span>
                <span className="text-xs text-[#465079]">Detailed analysis</span>
              </button>
              
              <button className="flex flex-col items-center p-3 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <FileCsv className="h-6 w-6 text-[#05202E] mb-2" />
                <span className="text-sm font-medium text-[#232020]">CSV Export</span>
                <span className="text-xs text-[#465079]">Data processing</span>
              </button>
              
              <button className="flex flex-col items-center p-3 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <BarChart3 className="h-6 w-6 text-[#E5DDD8] mb-2" />
                <span className="text-sm font-medium text-[#232020]">Dashboard</span>
                <span className="text-xs text-[#465079]">Visual summary</span>
              </button>
              
              <button className="flex flex-col items-center p-3 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <Activity className="h-6 w-6 text-[#e31c79] mb-2" />
                <span className="text-sm font-medium text-[#232020]">Real-time</span>
                <span className="text-xs text-[#465079]">Live metrics</span>
              </button>
            </div>
          </div>

          {/* Approval Performance Overview */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-[#232020] mb-4">
              ⏱️ Approval Performance This Week
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-r from-[#e31c79] to-[#d4156a] rounded-lg p-4 text-white">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 mr-3" />
                  <div>
                    <p className="text-sm opacity-90">Average Approval Time</p>
                    <p className="text-2xl font-bold">{avgApprovalTime.toFixed(1)} hours</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#05202E] to-[#0a2f3f] rounded-lg p-4 text-white">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 mr-3" />
                  <div>
                    <p className="text-sm opacity-90">Overall Approval Rate</p>
                    <p className="text-2xl font-bold">94.2%</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#E5DDD8] to-[#d5c5c0] rounded-lg p-4 text-[#05202E]">
                <div className="flex items-center">
                  <AlertCircle className="h-8 w-8 mr-3" />
                  <div>
                    <p className="text-sm opacity-90">Pending Approvals</p>
                    <p className="text-2xl font-bold">{totalPending}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#e31c79] to-[#d4156a] rounded-lg p-4 text-white">
                <div className="flex items-center">
                  <Target className="h-8 w-8 mr-3" />
                  <div>
                    <p className="text-sm opacity-90">Overdue Items</p>
                    <p className="text-2xl font-bold">{totalOverdue}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Approver Performance Metrics */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-[#232020] mb-4">Approver Performance Metrics</h2>
            <div className="space-y-4">
              {approvalMetrics.map((metric) => (
                <div key={metric.approver_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-[#232020]">
                        👤 {metric.approver_name}
                      </h3>
                      <p className="text-[#465079]">Client: {metric.client}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-[#465079]">Performance</p>
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        metric.approval_rate >= 95 ? 'bg-green-100 text-green-800' :
                        metric.approval_rate >= 85 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {getPerformanceIcon(metric.approval_rate)}
                        <span className="ml-1">{metric.approval_rate}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-[#465079]">Total Approvals</p>
                      <p className="font-semibold text-[#232020]">{metric.total_approvals}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-[#465079]">Avg Approval Time</p>
                      <p className="font-semibold text-[#232020]">{metric.avg_approval_time.toFixed(1)} hours</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-[#465079]">Pending Items</p>
                      <p className="font-semibold text-[#232020]">{metric.pending_count}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-[#465079]">Overdue Items</p>
                      <p className="font-semibold text-[#232020]">{metric.overdue_count}</p>
                    </div>
                  </div>

                  {/* Performance Indicators */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-[#465079] mb-2">
                      <span>Approval Rate</span>
                      <span className={getPerformanceColor(metric.approval_rate)}>
                        {metric.approval_rate}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          metric.approval_rate >= 95 ? 'bg-green-500' :
                          metric.approval_rate >= 85 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${metric.approval_rate}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Approver Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="text-sm text-[#465079]">
                      Last activity: {metric.last_activity}
                    </div>
                    <div className="flex space-x-3">
                      <button className="flex items-center px-3 py-2 bg-[#e31c79] text-white rounded-lg text-sm font-medium hover:bg-[#d4156a] transition-colors">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </button>
                      <button className="flex items-center px-3 py-2 bg-[#05202E] text-white rounded-lg text-sm font-medium hover:bg-[#0a2f3f] transition-colors">
                        <Download className="h-4 w-4 mr-2" />
                        Export Data
                      </button>
                      <button className="flex items-center px-3 py-2 bg-[#E5DDD8] text-[#05202E] rounded-lg text-sm font-medium hover:bg-[#d5c5c0] transition-colors">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Performance
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Approval Trends */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-[#232020] mb-4">Weekly Approval Trends</h2>
            <div className="space-y-4">
              {approvalTrends.map((trend, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Calendar className="h-5 w-5 text-[#e31c79]" />
                      <div>
                        <h4 className="font-medium text-[#232020]">
                          {new Date(trend.date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </h4>
                        <p className="text-sm text-[#465079]">
                          {trend.submitted} submitted • {trend.approved} approved • {trend.rejected} rejected
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm text-[#465079]">Avg Time</div>
                      <div className="font-semibold text-[#232020]">{trend.avg_time.toFixed(1)} hours</div>
                    </div>
                  </div>

                  {/* Trend Progress Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-[#465079] mb-1">
                      <span>Approval Rate: {((trend.approved / trend.submitted) * 100).toFixed(1)}%</span>
                      <span>{trend.approved}/{trend.submitted}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-[#e31c79] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(trend.approved / trend.submitted) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Workflow Optimization Insights */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-[#232020] mb-4">Workflow Optimization Insights</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-[#232020] mb-3">Bottleneck Identification</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                    <span className="text-sm">StartupCo has slow approval times (12.5h avg)</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                    <span className="text-sm">XYZ Tech has 3 overdue approvals</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm">ABC Corp performing well (4.2h avg)</span>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-[#232020] mb-3">Process Improvement</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Zap className="h-5 w-5 text-[#e31c79]" />
                    <span className="text-sm">Automate routine approvals under threshold</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Zap className="h-5 w-5 text-[#e31c79]" />
                    <span className="text-sm">Implement approval reminders for slow approvers</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Zap className="h-5 w-5 text-[#e31c79]" />
                    <span className="text-sm">Standardize approval workflows</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex space-x-4">
              <button className="flex items-center px-6 py-3 bg-[#e31c79] text-white rounded-lg font-medium hover:bg-[#d4156a] transition-colors">
                <TrendingUp className="h-5 w-5 mr-2" />
                Generate Optimization Report
              </button>
              <button className="flex items-center px-6 py-3 bg-[#05202E] text-white rounded-lg font-medium hover:bg-[#0a2f3f] transition-colors">
                <Settings className="h-5 w-5 mr-2" />
                Configure Workflows
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
