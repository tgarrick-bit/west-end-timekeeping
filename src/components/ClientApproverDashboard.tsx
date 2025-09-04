'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Clock, 
  Receipt, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Building2,
  Users,
  TrendingUp,
  FileText,
  DollarSign,
  Calendar
} from 'lucide-react'
import { User, TimeEntry, Timesheet, ExpenseItem, Project } from '@/types'
import { LogOut } from 'lucide-react'

interface ClientApproverDashboardProps {
  user: User
}

interface PendingApproval {
  id: string
  type: 'timesheet' | 'expense'
  employee: string
  project: string
  date: string
  hours?: number
  amount?: number
  description?: string
  status: 'pending' | 'approved' | 'rejected'
}

interface ProjectStats {
  project: Project
  totalHours: number
  totalExpenses: number
  employeeCount: number
  completionPercentage: number
}

export default function ClientApproverDashboard({ user }: ClientApproverDashboardProps) {
  const { signOut } = useAuth()
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([])
  const [projectStats, setProjectStats] = useState<ProjectStats[]>([])
  const [recentApprovals, setRecentApprovals] = useState<PendingApproval[]>([])
  const [totalPending, setTotalPending] = useState(0)

  useEffect(() => {
    fetchClientApproverData()
  }, [])

  const fetchClientApproverData = async () => {
    // Simulate API calls
    setTimeout(() => {
      setPendingApprovals([
        {
          id: '1',
          type: 'timesheet',
          employee: 'Sarah Johnson',
          project: 'Downtown Office Renovation',
          date: 'Week of Jan 15',
          hours: 40,
          status: 'pending'
        },
        {
          id: '2',
          type: 'expense',
          employee: 'Mike Chen',
          project: 'Tech Infrastructure',
          date: 'Jan 14',
          amount: 245.50,
          description: 'Software licenses',
          status: 'pending'
        },
        {
          id: '3',
          type: 'timesheet',
          employee: 'Lisa Rodriguez',
          project: 'Warehouse Expansion',
          date: 'Week of Jan 8',
          hours: 38.5,
          status: 'pending'
        },
        {
          id: '4',
          type: 'expense',
          employee: 'David Thompson',
          project: 'Marketing Campaign',
          date: 'Jan 12',
          amount: 89.99,
          description: 'Print materials',
          status: 'pending'
        }
      ])

      setProjectStats([
        {
          project: {
            id: '1',
            name: 'Downtown Office Renovation',
            client_id: '1',
            description: 'Complete office renovation project',
            start_date: '2024-01-01',
            end_date: '2024-06-30',
            is_active: true,
            status: 'active',
            created_at: '2024-01-01',
            updated_at: '2024-01-01'
          },
          totalHours: 320,
          totalExpenses: 1250.75,
          employeeCount: 8,
          completionPercentage: 65
        },
        {
          project: {
            id: '2',
            name: 'Tech Infrastructure',
            client_id: '1',
            description: 'IT infrastructure upgrade',
            start_date: '2024-01-15',
            end_date: '2024-03-31',
            is_active: true,
            status: 'active',
            created_at: '2024-01-15',
            updated_at: '2024-01-15'
          },
          totalHours: 180,
          totalExpenses: 890.50,
          employeeCount: 4,
          completionPercentage: 45
        }
      ])

      setRecentApprovals([
        {
          id: '5',
          type: 'timesheet',
          employee: 'John Smith',
          project: 'Warehouse Expansion',
          date: 'Week of Jan 1',
          hours: 42,
          status: 'approved'
        },
        {
          id: '6',
          type: 'expense',
          employee: 'Emily Davis',
          project: 'Marketing Campaign',
          date: 'Jan 10',
          amount: 156.25,
          status: 'rejected'
        }
      ])

      setTotalPending(4)
    }, 1000)
  }

  const handleApproval = (id: string, action: 'approve' | 'reject') => {
    setPendingApprovals(prev => 
      prev.map(item => 
        item.id === id 
          ? { ...item, status: action === 'approve' ? 'approved' : 'rejected' }
          : item
      )
    )
    
    // Move to recent approvals
    const item = pendingApprovals.find(p => p.id === id)
    if (item) {
      setRecentApprovals(prev => [item, ...prev])
      setTotalPending(prev => prev - 1)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle }
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-2xl font-bold text-[#232020]">Approval Dashboard</h1>
              <p className="text-[#465079]">Welcome back, {user.first_name} {user.last_name}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-[#e31c79]">{totalPending}</div>
              <div className="text-sm text-[#465079]">Pending Approvals</div>
            </div>
            <button
              onClick={signOut}
              className="ml-4 px-4 py-2 text-[#465079] hover:text-[#e31c79] hover:bg-gray-100 rounded-lg transition-colors flex items-center"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Timesheet Management Card */}
        <div className="bg-gradient-to-r from-[#465079] to-[#232020] rounded-lg shadow-lg p-6 text-white mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-full">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Timesheet Approvals</h2>
                <p className="text-gray-200 mt-1">Review and approve employee timesheets and expenses</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={() => window.location.href = '/dashboard'}
                className="flex items-center px-6 py-3 bg-white text-[#232020] rounded-lg font-semibold hover:bg-gray-50 transition-colors shadow-sm"
              >
                <FileText className="h-5 w-5 mr-2" />
                View All Timesheets
              </button>
              <button 
                onClick={() => window.location.href = '/dashboard?section=pending'}
                className="flex items-center px-6 py-3 bg-white bg-opacity-20 text-white rounded-lg font-semibold hover:bg-white hover:text-[#232020] transition-colors"
              >
                <AlertCircle className="h-5 w-5 mr-2" />
                Pending Items
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Pending Approvals */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pending Approvals */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-[#232020]">Pending Approvals</h2>
                <p className="text-[#465079] text-sm">Review and approve timesheets and expenses</p>
              </div>
              <div className="p-6">
                {pendingApprovals.length > 0 ? (
                  <div className="space-y-4">
                    {pendingApprovals.map((approval) => (
                      <div key={approval.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              {approval.type === 'timesheet' ? (
                                <Clock className="w-5 h-5 text-[#465079] mr-2" />
                              ) : (
                                <Receipt className="w-5 h-5 text-[#465079] mr-2" />
                              )}
                              <span className="font-medium text-[#232020]">
                                {approval.type === 'timesheet' ? 'Timesheet' : 'Expense'}
                              </span>
                            </div>
                            <p className="font-semibold text-[#232020]">{approval.employee}</p>
                            <p className="text-[#465079]">{approval.project}</p>
                            <p className="text-sm text-[#465079]">{approval.date}</p>
                            {approval.description && (
                              <p className="text-sm text-[#465079] mt-1">{approval.description}</p>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-lg font-semibold text-[#232020] mb-2">
                              {approval.type === 'timesheet' 
                                ? `${approval.hours}h` 
                                : `$${approval.amount}`
                              }
                            </div>
                            {getStatusBadge(approval.status)}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <button className="flex items-center text-[#465079] hover:text-[#e31c79] transition-colors">
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </button>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleApproval(approval.id, 'reject')}
                              className="px-3 py-1.5 text-red-600 hover:bg-red-50 border border-red-200 rounded-md transition-colors flex items-center"
                            >
                              <ThumbsDown className="w-4 h-4 mr-1" />
                              Reject
                            </button>
                            <button
                              onClick={() => handleApproval(approval.id, 'approve')}
                              className="px-3 py-1.5 bg-[#e31c79] text-white hover:bg-[#d4156a] rounded-md transition-colors flex items-center"
                            >
                              <ThumbsUp className="w-4 h-4 mr-1" />
                              Approve
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-[#465079]">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                    <p className="text-lg font-medium text-[#232020]">All caught up!</p>
                    <p className="text-sm">No pending approvals at this time.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Project Statistics */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-[#232020] mb-6">My Project Statistics</h2>
              <div className="space-y-4">
                {projectStats.map((stat) => (
                  <div key={stat.project.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-[#232020]">{stat.project.name}</h3>
                      <span className="text-sm text-[#465079]">
                        {stat.completionPercentage}% Complete
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-[#e31c79]">{stat.totalHours}h</div>
                        <div className="text-xs text-[#465079]">Total Hours</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-[#465079]">${stat.totalExpenses}</div>
                        <div className="text-xs text-[#465079]">Total Expenses</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-[#232020]">{stat.employeeCount}</div>
                        <div className="text-xs text-[#465079]">Employees</div>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-[#e31c79] h-2 rounded-full transition-all duration-300"
                          style={{ width: `${stat.completionPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Status & Actions */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-[#232020] mb-4">Approval Overview</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mr-3" />
                    <span className="text-[#465079]">Pending</span>
                  </div>
                  <span className="font-semibold text-[#232020]">{totalPending}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                    <span className="text-[#465079]">Approved Today</span>
                  </div>
                  <span className="font-semibold text-[#232020]">3</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <XCircle className="w-5 h-5 text-red-600 mr-3" />
                    <span className="text-[#465079]">Rejected Today</span>
                  </div>
                  <span className="font-semibold text-[#232020]">1</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-[#232020] mb-4">Recent Activity</h2>
              <div className="space-y-3">
                {recentApprovals.map((approval) => (
                  <div key={approval.id} className="flex items-center p-3 bg-[#e5ddd8] rounded-lg">
                    {approval.type === 'timesheet' ? (
                      <FileText className="w-5 h-5 text-[#465079] mr-3" />
                    ) : (
                      <DollarSign className="w-5 h-5 text-[#465079] mr-3" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-[#232020]">{approval.employee}</p>
                      <p className="text-sm text-[#465079]">
                        {approval.type === 'timesheet' 
                          ? `${approval.hours}h` 
                          : `$${approval.amount}`
                        } • {approval.date}
                      </p>
                    </div>
                    {getStatusBadge(approval.status)}
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
                    <Eye className="w-5 h-5 text-[#465079] mr-3" />
                    <span className="font-medium text-[#232020]">View All Pending</span>
                  </div>
                </button>
                <button className="w-full text-left p-3 bg-[#e5ddd8] hover:bg-[#d4c8c0] rounded-lg transition-colors">
                  <div className="flex items-center">
                    <Building2 className="w-5 h-5 text-[#465079] mr-3" />
                    <span className="font-medium text-[#232020]">Project Reports</span>
                  </div>
                </button>
                <button className="w-full text-left p-3 bg-[#e5ddd8] hover:bg-[#d4c8c0] rounded-lg transition-colors">
                  <div className="flex items-center">
                    <TrendingUp className="w-5 h-5 text-[#465079] mr-3" />
                    <span className="font-medium text-[#232020]">Analytics</span>
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
