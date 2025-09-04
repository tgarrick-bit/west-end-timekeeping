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
  DollarSign,
  Users,
  TrendingUp,
  BarChart3,
  Eye,
  FileSpreadsheet,
  FileSpreadsheet as FileCsv,
  Settings,
  Zap,
  Calendar,
  Activity,
  Target,
  RefreshCw,
  Play,
  Pause
} from 'lucide-react'

interface OperationalMetric {
  category: string
  current: number
  target: number
  status: 'on_track' | 'at_risk' | 'critical'
  trend: 'up' | 'down' | 'stable'
  change: number
  last_updated: string
}

interface SystemAlert {
  id: string
  type: 'info' | 'warning' | 'critical'
  message: string
  timestamp: string
  status: 'active' | 'resolved'
}

export default function OperationalDashboardPage() {
  const router = useRouter()
  const { user: appUser, isLoading } = useAuth()
  const [operationalMetrics, setOperationalMetrics] = useState<OperationalMetric[]>([])
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    if (!isLoading && (!appUser || appUser.role !== 'admin')) {
      router.push('/auth/signin')
    }
  }, [appUser, isLoading, router])

  useEffect(() => {
    // Simulate operational metrics data
    setOperationalMetrics([
      {
        category: 'Hours Logged This Week',
        current: 847,
        target: 1250,
        status: 'on_track',
        trend: 'up',
        change: 12.5,
        last_updated: '2 minutes ago'
      },
      {
        category: 'Approval Rate',
        current: 77,
        target: 90,
        status: 'at_risk',
        trend: 'down',
        change: -8.2,
        last_updated: '5 minutes ago'
      },
      {
        category: 'Active Contractors',
        current: 43,
        target: 47,
        status: 'on_track',
        trend: 'stable',
        change: 0,
        last_updated: '1 minute ago'
      },
      {
        category: 'Revenue Processed',
        current: 52450,
        target: 75000,
        status: 'at_risk',
        trend: 'up',
        change: 5.8,
        last_updated: '3 minutes ago'
      }
    ])

    // Simulate system alerts
    setSystemAlerts([
      {
        id: 'alert1',
        type: 'warning',
        message: 'StartupCo approval times exceeding 48-hour threshold',
        timestamp: '2 hours ago',
        status: 'active'
      },
      {
        id: 'alert2',
        type: 'info',
        message: 'Weekly payroll export completed successfully',
        timestamp: '1 hour ago',
        status: 'resolved'
      },
      {
        id: 'alert3',
        type: 'critical',
        message: '3 overdue timesheet approvals require immediate attention',
        timestamp: '30 minutes ago',
        status: 'active'
      }
    ])
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simulate refresh process
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsRefreshing(false)
    
    alert('Operational data refreshed successfully')
  }

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track':
        return 'bg-green-100 text-green-800'
      case 'at_risk':
        return 'bg-yellow-100 text-yellow-800'
      case 'critical':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on_track':
        return <CheckCircle className="h-4 w-4" />
      case 'at_risk':
        return <AlertCircle className="h-4 w-4" />
      case 'critical':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down':
        return <TrendingUp className="h-4 w-4 text-red-500 transform rotate-180" />
      case 'stable':
        return <TrendingUp className="h-4 w-4 text-gray-500" />
      default:
        return <TrendingUp className="h-4 w-4 text-gray-500" />
    }
  }

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'info':
        return <Activity className="h-4 w-4" />
      case 'warning':
        return <AlertCircle className="h-4 w-4" />
      case 'critical':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e31c79] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading operational dashboard...</p>
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
              <h1 className="text-2xl font-bold text-[#232020]">Operational Dashboard</h1>
              <p className="text-[#465079]">Real-time operational metrics and status overview</p>
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
          {/* Dashboard Controls */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#232020]">Dashboard Controls</h2>
              <div className="flex items-center space-x-4">
                <button
                  onClick={toggleAutoRefresh}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    autoRefresh 
                      ? 'bg-[#e31c79] text-white hover:bg-[#d4156a]' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {autoRefresh ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
                  {autoRefresh ? 'Auto Refresh On' : 'Auto Refresh Off'}
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex items-center px-4 py-2 bg-[#05202E] text-white rounded-lg font-medium hover:bg-[#0a2f3f] transition-colors disabled:opacity-50"
                >
                  {isRefreshing ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {isRefreshing ? 'Refreshing...' : 'Refresh Now'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button className="flex flex-col items-center p-3 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <BarChart3 className="h-6 w-6 text-[#e31c79] mb-2" />
                <span className="text-sm font-medium text-[#232020]">Live Metrics</span>
                <span className="text-xs text-[#465079]">Real-time data</span>
              </button>
              
              <button className="flex flex-col items-center p-3 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <Activity className="h-6 w-6 text-[#05202E] mb-2" />
                <span className="text-sm font-medium text-[#232020]">System Health</span>
                <span className="text-xs text-[#465079]">Performance status</span>
              </button>
              
              <button className="flex flex-col items-center p-3 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <AlertCircle className="h-6 w-6 text-[#E5DDD8] mb-2" />
                <span className="text-sm font-medium text-[#232020]">Alerts</span>
                <span className="text-xs text-[#465079]">Active notifications</span>
              </button>
              
              <button className="flex flex-col items-center p-3 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <TrendingUp className="h-6 w-6 text-[#e31c79] mb-2" />
                <span className="text-sm font-medium text-[#232020]">Trends</span>
                <span className="text-xs text-[#465079]">Performance analysis</span>
              </button>
            </div>
          </div>

          {/* Real-Time Operational Metrics */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-[#232020] mb-4">
              📊 Real-Time Operational Metrics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {operationalMetrics.map((metric, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-[#465079]">{metric.category}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(metric.status)}`}>
                      {getStatusIcon(metric.status)}
                      <span className="ml-1 capitalize">
                        {metric.status.replace('_', ' ')}
                      </span>
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-2xl font-bold text-[#232020]">
                      {metric.category.includes('Revenue') ? `$${metric.current.toLocaleString()}` :
                       metric.category.includes('Rate') ? `${metric.current}%` :
                       metric.current.toLocaleString()}
                    </div>
                    <div className="flex items-center text-sm">
                      {getTrendIcon(metric.trend)}
                      <span className={`ml-1 ${
                        metric.trend === 'up' && metric.category.includes('Rate') ? 'text-red-500' :
                        metric.trend === 'down' && metric.category.includes('Rate') ? 'text-green-500' :
                        metric.trend === 'up' ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {metric.change > 0 ? '+' : ''}{metric.change}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-xs text-[#465079] mb-3">
                    Target: {metric.category.includes('Revenue') ? `$${metric.target.toLocaleString()}` :
                             metric.category.includes('Rate') ? `${metric.target}%` :
                             metric.target.toLocaleString()}
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          metric.status === 'on_track' ? 'bg-green-500' :
                          metric.status === 'at_risk' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ 
                          width: `${Math.min((metric.current / metric.target) * 100, 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="text-xs text-[#465079]">
                    Updated: {metric.last_updated}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Activity Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-[#232020] mb-4">Today's Activity Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-r from-[#e31c79] to-[#d4156a] rounded-lg p-4 text-white">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 mr-3" />
                  <div>
                    <p className="text-sm opacity-90">Timesheets Submitted</p>
                    <p className="text-2xl font-bold">34</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#05202E] to-[#0a2f3f] rounded-lg p-4 text-white">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 mr-3" />
                  <div>
                    <p className="text-sm opacity-90">Approvals Completed</p>
                    <p className="text-2xl font-bold">28</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#E5DDD8] to-[#d5c5c0] rounded-lg p-4 text-[#05202E]">
                <div className="flex items-center">
                  <AlertCircle className="h-8 w-8 mr-3" />
                  <div>
                    <p className="text-sm opacity-90">Overdue Approvals</p>
                    <p className="text-2xl font-bold">2</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#e31c79] to-[#d4156a] rounded-lg p-4 text-white">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 mr-3" />
                  <div>
                    <p className="text-sm opacity-90">Revenue Processed</p>
                    <p className="text-2xl font-bold">$52,450</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* System Alerts and Notifications */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-[#232020] mb-4">System Alerts & Notifications</h2>
            <div className="space-y-3">
              {systemAlerts.map((alert) => (
                <div key={alert.id} className={`border rounded-lg p-4 ${getAlertColor(alert.type)}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getAlertIcon(alert.type)}
                      <div>
                        <p className="font-medium text-sm">{alert.message}</p>
                        <p className="text-xs opacity-75">{alert.timestamp}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        alert.status === 'active' ? 'bg-white bg-opacity-20' : 'bg-green-200 text-green-800'
                      }`}>
                        {alert.status === 'active' ? 'Active' : 'Resolved'}
                      </span>
                      
                      <div className="flex space-x-1">
                        <button className="p-1 text-current hover:bg-white hover:bg-opacity-20 rounded transition-colors">
                          <Eye className="h-4 w-4" />
                        </button>
                        {alert.status === 'active' && (
                          <button className="p-1 text-current hover:bg-white hover:bg-opacity-20 rounded transition-colors">
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Performance Trends */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-[#232020] mb-4">Weekly Performance Trends</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-[#232020] mb-3">Hours Tracking</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#465079]">Monday</span>
                    <span className="font-medium">156 hours</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#465079]">Tuesday</span>
                    <span className="font-medium">142 hours</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#465079]">Wednesday</span>
                    <span className="font-medium">168 hours</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#465079]">Thursday</span>
                    <span className="font-medium">189 hours</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#465079]">Friday</span>
                    <span className="font-medium">192 hours</span>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-[#232020] mb-3">Approval Performance</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#465079]">Submission Rate</span>
                    <span className="font-medium text-green-600">+15%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#465079]">Approval Rate</span>
                    <span className="font-medium text-yellow-600">-3%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#465079]">Avg Response Time</span>
                    <span className="font-medium text-green-600">-12%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#465079]">Overdue Items</span>
                    <span className="font-medium text-red-600">+8%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-[#232020] mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="flex items-center justify-center px-6 py-3 bg-[#e31c79] text-white rounded-lg font-medium hover:bg-[#d4156a] transition-colors">
                <Download className="h-5 w-5 mr-2" />
                Export Daily Report
              </button>
              <button className="flex items-center justify-center px-6 py-3 bg-[#05202E] text-white rounded-lg font-medium hover:bg-[#0a2f3f] transition-colors">
                <AlertCircle className="h-5 w-5 mr-2" />
                Review Alerts
              </button>
              <button className="flex items-center justify-center px-6 py-3 bg-[#E5DDD8] text-[#05202E] rounded-lg font-medium hover:bg-[#d5c5c0] transition-colors">
                <Settings className="h-5 w-5 mr-2" />
                Configure Dashboard
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
