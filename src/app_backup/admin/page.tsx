'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import TopNavigation from '@/components/navigation/TopNavigation'
import { 
  Users, 
  Building2, 
  Clock, 
  Receipt, 
  BarChart3, 
  Settings, 
  CheckCircle,
  AlertCircle,
  TrendingUp,
  DollarSign,
  UserPlus,
  FolderPlus,
  FileText,
  ArrowRight,
  ChevronRight,
  Bell
} from 'lucide-react'

interface AdminStats {
  totalUsers: number
  activeProjects: number
  pendingTimesheets: number
  pendingExpenses: number
  totalRevenue: number
  activeClients: number
  missingTimesheets: number
  overdueApprovals: number
}

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [adminStats, setAdminStats] = useState<AdminStats>({
    totalUsers: 0,
    activeProjects: 0,
    pendingTimesheets: 0,
    pendingExpenses: 0,
    totalRevenue: 0,
    activeClients: 0,
    missingTimesheets: 0,
    overdueApprovals: 0
  })

  useEffect(() => {
    // Simulate loading admin data
    setTimeout(() => {
      setAdminStats({
        totalUsers: 47,
        activeProjects: 12,
        pendingTimesheets: 8,
        pendingExpenses: 15,
        totalRevenue: 125000,
        activeClients: 8,
        missingTimesheets: 23,
        overdueApprovals: 5
      })
      setIsLoading(false)
    }, 1000)
  }, [])

  const handleCardClick = (route: string) => {
    router.push(route)
  }

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'employees':
        router.push('/admin/employees')
        break
      case 'clients':
        router.push('/admin/clients')
        break
      case 'timesheets':
        router.push('/admin/timesheets')
        break
      case 'expenses':
        router.push('/admin/expenses')
        break
      case 'reports':
        router.push('/admin/reports')
        break
      case 'settings':
        router.push('/admin/settings')
        break
      default:
        break
    }
  }

  const handleNotificationTest = async (type: string) => {
    try {
      let message = ''
      
      switch (type) {
        case 'timesheet':
          // Create test timesheet notification
          const timesheetResponse = await fetch('/api/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'timesheet_submitted',
              userId: user?.id || 'admin-test',
              relatedId: 'test-timesheet-123',
              relatedType: 'timesheet',
              metadata: {
                employeeName: 'Test Employee',
                managerName: user ? `${user.first_name} ${user.last_name}` : 'Admin',
                period: 'Test Week',
                totalHours: '40',
                approvalUrl: '/admin/timesheets'
              }
            }),
          });
          
          if (timesheetResponse.ok) {
            message = 'Test timesheet notification created successfully!'
          } else {
            throw new Error('Failed to create timesheet notification')
          }
          break
          
        case 'expense':
          // Create test expense notification
          const expenseResponse = await fetch('/api/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'expense_submitted',
              userId: user?.id || 'admin-test',
              relatedId: 'test-expense-456',
              relatedType: 'expense',
              metadata: {
                employeeName: 'Test Employee',
                managerName: user ? `${user.first_name} ${user.last_name}` : 'Admin',
                amount: 150.00,
                description: 'Test expense for office supplies',
                approvalUrl: '/admin/expenses'
              }
            }),
          });
          
          if (expenseResponse.ok) {
            message = 'Test expense notification created successfully!'
          } else {
            throw new Error('Failed to create expense notification')
          }
          break
          
        case 'overdue':
          // Create test overdue notification
          const overdueResponse = await fetch('/api/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'timesheet_overdue',
              userId: user?.id || 'admin-test',
              relatedId: 'test-overdue-789',
              relatedType: 'timesheet',
              metadata: {
                employeeName: 'Test Employee',
                period: 'Overdue Week',
                daysOverdue: 3,
                dueDate: new Date().toISOString().split('T')[0],
                submitUrl: '/admin/timesheets'
              }
            }),
          });
          
          if (overdueResponse.ok) {
            message = 'Test overdue alert created successfully!'
          } else {
            throw new Error('Failed to create overdue notification')
          }
          break
          
        case 'email':
          // Test email configuration
          const emailResponse = await fetch('/api/notifications/test-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              toEmail: 'tgarrick@westendworkforce.com',
              testType: 'configuration'
            }),
          });
          
          if (emailResponse.ok) {
            const result = await emailResponse.json()
            message = result.message || 'Email configuration test completed!'
          } else {
            throw new Error('Failed to test email configuration')
          }
          break
          
        default:
          message = 'Test notification sent successfully!'
          break
      }
      
      // Show success message
      alert(message)
    } catch (error) {
      console.error('Notification test failed:', error)
      alert('Test failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e31c79] mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading Admin Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header - EXACTLY matching Manager Dashboard */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="/WE logo FC Mar2024.png" 
                alt="West End Workforce Logo" 
                className="w-10 h-10 object-contain"
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900">West End Workforce</h1>
                <p className="text-sm text-gray-600">Timesheet & Expense Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                {user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}` : 'A'}
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">{user ? `${user.first_name} ${user.last_name}` : 'Admin'}</div>
                <div className="text-xs text-gray-500">Admin</div>
              </div>
            </div>
          </div>
        </div>

        {/* Welcome Section */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user ? `${user.first_name} ${user.last_name}` : 'Admin'}!</h1>
            <p className="text-gray-600">West End Workforce • System Administrator</p>
          </div>
        </div>

        {/* Stats Cards - EXACTLY matching Manager Dashboard */}
        <div className="px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div 
              onClick={() => handleCardClick('/admin/employees')}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{adminStats.totalUsers}</p>
                </div>
                <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-pink-600" />
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-pink-600 transition-colors mt-2" />
            </div>

            <div 
              onClick={() => handleCardClick('/admin/clients')}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Clients</p>
                  <p className="text-2xl font-bold text-gray-900">{adminStats.activeClients}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors mt-2" />
            </div>

            <div 
              onClick={() => handleCardClick('/admin/timesheets')}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Timesheets</p>
                  <p className="text-2xl font-bold text-gray-900">{adminStats.pendingTimesheets}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-green-600 transition-colors mt-2" />
            </div>

            <div 
              onClick={() => handleCardClick('/admin/expenses')}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Expenses</p>
                  <p className="text-2xl font-bold text-gray-900">{adminStats.pendingExpenses}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors mt-2" />
            </div>
          </div>
        </div>

        {/* Quick Actions - EXACTLY matching Employee Dashboard */}
        <div className="px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div 
              className="block p-6 rounded-lg border bg-pink-50 border-pink-200 hover:bg-pink-100 text-pink-700 transition-all hover:shadow-md cursor-pointer"
              onClick={() => handleQuickAction('employees')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-lg bg-white">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Employee Management</h3>
                    <p className="text-sm opacity-75">Manage team members</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 opacity-75" />
              </div>
            </div>

            <div 
              className="block p-6 rounded-lg border bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700 transition-all hover:shadow-md cursor-pointer"
              onClick={() => handleQuickAction('clients')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-lg bg-white">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Client Management</h3>
                    <p className="text-sm opacity-75">Manage client accounts</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 opacity-75" />
              </div>
            </div>

            <div 
              className="block p-6 rounded-lg border bg-green-50 border-green-200 hover:bg-green-100 text-green-700 transition-all hover:shadow-md cursor-pointer"
              onClick={() => handleQuickAction('reports')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-lg bg-white">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">System Reports</h3>
                    <p className="text-sm opacity-75">Generate system reports</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 opacity-75" />
              </div>
            </div>

            <div 
              className="block p-6 rounded-lg border bg-purple-50 border-purple-200 hover:bg-purple-100 text-purple-700 transition-all hover:shadow-md cursor-pointer"
              onClick={() => handleQuickAction('settings')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-lg bg-white">
                    <Settings className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">System Settings</h3>
                    <p className="text-sm opacity-75">Configure system options</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 opacity-75" />
              </div>
            </div>
          </div>
        </div>

        {/* Notification Testing Section */}
        <div className="px-6 py-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-orange-600" />
              Notification Testing
            </h3>
            <p className="text-gray-600 mb-4">Test notification system safely</p>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => handleNotificationTest('timesheet')}
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
              >
                Test Timesheet Notification
              </button>
              <button 
                onClick={() => handleNotificationTest('expense')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Test Expense Notification
              </button>
              <button 
                onClick={() => handleNotificationTest('overdue')}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Test Overdue Alert
              </button>
              <button 
                onClick={() => handleNotificationTest('email')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Test Email Config
              </button>
            </div>
          </div>
        </div>

        {/* System Overview - EXACTLY matching Employee Dashboard style */}
        <div className="px-6 py-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">System Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Total Revenue</p>
                    <p className="text-lg font-bold text-green-600">${adminStats.totalRevenue.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Missing Timesheets</p>
                    <p className="text-lg font-bold text-orange-600">{adminStats.missingTimesheets}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Overdue Approvals</p>
                    <p className="text-lg font-bold text-blue-600">{adminStats.overdueApprovals}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FolderPlus className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Active Projects</p>
                    <p className="text-lg font-bold text-purple-600">{adminStats.activeProjects}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
