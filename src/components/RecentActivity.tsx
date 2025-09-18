'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Clock, Receipt, CheckCircle, AlertCircle, User } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

interface ActivityItem {
  id: string
  type: 'time_entry' | 'expense' | 'approval' | 'user'
  title: string
  description: string
  timestamp: string
  status?: string
  icon: React.ComponentType<{ className?: string }>
}

export function RecentActivity() {
  const { user, employee } = useAuth()
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (employee) {
      fetchRecentActivity()
    }
  }, [employee])

  const fetchRecentActivity = async () => {
    if (!employee) return

    try {
      setLoading(true)
      const allActivities: ActivityItem[] = []

      if (employee.role === 'employee') {
        await fetchEmployeeActivity(allActivities)
      } else if (employee.role === 'client_approver') {
        await fetchClientApproverActivity(allActivities)
      } else if (employee.role === 'admin') {
        await fetchAdminActivity(allActivities)
      } else if (employee.role === 'payroll') {
        await fetchPayrollActivity(allActivities)
      }

      // Sort by timestamp and take the most recent 10
      const sortedActivities = allActivities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10)

      setActivities(sortedActivities)
    } catch (error) {
      console.error('Error fetching recent activity:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployeeActivity = async (allActivities: ActivityItem[]) => {
    if (!employee) return
    
    // Fetch recent time entries
    const { data: timeEntries } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', employee.id)
      .order('created_at', { ascending: false })
      .limit(5)

    if (timeEntries) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      timeEntries.forEach((entry: any) => {
        allActivities.push({
          id: entry.id,
          type: 'time_entry',
          title: 'Time Entry Added',
          description: `${(entry.total_hours / 60).toFixed(1)} hours logged`,
          timestamp: entry.created_at,
          status: entry.is_approved ? 'approved' : entry.is_submitted ? 'pending' : 'draft',
          icon: Clock,
        })
      })
    }

    // Fetch recent expenses
    const { data: expenses } = await supabase
      .from('expense_items')
      .select('*')
      .eq('user_id', employee.id)
      .order('created_at', { ascending: false })
      .limit(5)

    if (expenses) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expenses.forEach((expense: any) => {
        allActivities.push({
          id: expense.id,
          type: 'expense',
          title: 'Expense Added',
          description: `$${expense.amount.toFixed(2)} - ${expense.description}`,
          timestamp: expense.created_at,
          status: expense.is_approved ? 'approved' : expense.is_submitted ? 'pending' : 'draft',
          icon: Receipt,
        })
      })
    }
  }

  const fetchClientApproverActivity = async (allActivities: ActivityItem[]) => {
    if (!employee) return
    
    // Fetch recent approvals for client's projects
    const { data: approvals } = await supabase
      .from('approvals')
      .select(`
        *,
        timesheets (user_id, week_start_date),
        expense_reports (user_id, month, year),
        users (first_name, last_name)
      `)
      .eq('approver_id', employee.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (approvals) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      approvals.forEach((approval: any) => {
        const userName = approval.users ? 
          `${approval.users.first_name} ${approval.users.last_name}` : 
          'Unknown User'

        if (approval.timesheet_id) {
          allActivities.push({
            id: approval.id,
            type: 'approval',
            title: 'Timesheet Approval',
            description: `${userName} submitted timesheet for approval`,
            timestamp: approval.created_at,
            status: approval.status,
            icon: CheckCircle,
          })
        } else if (approval.expense_report_id) {
          allActivities.push({
            id: approval.id,
            type: 'approval',
            title: 'Expense Approval',
            description: `${userName} submitted expense report for approval`,
            timestamp: approval.created_at,
            status: approval.status,
            icon: CheckCircle,
          })
        }
      })
    }
  }

  const fetchAdminActivity = async (allActivities: ActivityItem[]) => {
    // Fetch recent user registrations
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (users) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      users.forEach((user: any) => {
        allActivities.push({
          id: user.id,
          type: 'user',
          title: 'User Activity',
          description: `${user.first_name} ${user.last_name} (${user.role})`,
          timestamp: user.created_at,
          status: user.is_active ? 'active' : 'inactive',
          icon: User,
        })
      })
    }

    // Fetch recent project changes
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(5)

    if (projects) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      projects.forEach((project: any) => {
        allActivities.push({
          id: project.id,
          type: 'time_entry',
          title: 'Project Updated',
          description: `Project "${project.name}" was modified`,
          timestamp: project.updated_at,
          status: project.is_active ? 'active' : 'inactive',
          icon: Clock,
        })
      })
    }
  }

  const fetchPayrollActivity = async (allActivities: ActivityItem[]) => {
    // Fetch recent payroll approvals
    const { data: approvals } = await supabase
      .from('approvals')
      .select(`
        *,
        timesheets (user_id, week_start_date),
        expense_reports (user_id, month, year),
        users (first_name, last_name)
      `)
      .eq('approver_type', 'payroll')
      .order('created_at', { ascending: false })
      .limit(10)

    if (approvals) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      approvals.forEach((approval: any) => {
        const userName = approval.users ? 
          `${approval.users.first_name} ${approval.users.last_name}` : 
          'Unknown User'

        if (approval.timesheet_id) {
          allActivities.push({
            id: approval.id,
            type: 'approval',
            title: 'Payroll Review',
            description: `${userName} timesheet ready for payroll processing`,
            timestamp: approval.created_at,
            status: approval.status,
            icon: CheckCircle,
          })
        } else if (approval.expense_report_id) {
          allActivities.push({
            id: approval.id,
            type: 'approval',
            title: 'Payroll Review',
            description: `${userName} expense report ready for payroll processing`,
            timestamp: approval.created_at,
            status: approval.status,
            icon: CheckCircle,
          })
        }
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-600 bg-green-100'
      case 'pending':
        return 'text-yellow-600 bg-yellow-100'
      case 'rejected':
        return 'text-red-600 bg-red-100'
      case 'draft':
        return 'text-gray-600 bg-gray-100'
      case 'active':
        return 'text-green-600 bg-green-100'
      case 'inactive':
        return 'text-gray-600 bg-gray-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-500">No recent activity</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <activity.icon className="h-4 w-4 text-gray-600" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{activity.title}</p>
            <p className="text-sm text-gray-500">{activity.description}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-gray-400">
                {formatDateTime(activity.timestamp)}
              </p>
              {activity.status && (
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(activity.status)}`}>
                  {activity.status}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}




