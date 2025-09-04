'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { DashboardStats as Stats } from '@/types'
import { Clock, DollarSign, CheckCircle, AlertCircle } from 'lucide-react'

export function DashboardStats() {
  const { appUser } = useAuth()
  const [stats, setStats] = useState<Stats>({
    totalHoursThisWeek: 0,
    totalExpensesThisMonth: 0,
    pendingApprovals: 0,
    submittedItems: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (appUser) {
      fetchStats()
    }
  }, [appUser])

  const fetchStats = async () => {
    if (!appUser) return

    try {
      setLoading(true)
      
      // Fetch stats based on user role
      if (appUser.role === 'employee') {
        await fetchEmployeeStats()
      } else if (appUser.role === 'client_approver') {
        await fetchClientApproverStats()
      } else if (appUser.role === 'admin') {
        await fetchAdminStats()
      } else if (appUser.role === 'payroll') {
        await fetchPayrollStats()
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployeeStats = async () => {
    if (!appUser) return
    
    const { start: weekStart, end: weekEnd } = getWeekDates()
    const { start: monthStart, end: monthEnd } = getMonthDates()

    // Fetch this week's hours
    const { data: timeEntries } = await supabase
      .from('time_entries')
      .select('total_hours')
      .eq('user_id', appUser.id)
      .gte('date', weekStart.toISOString().split('T')[0])
      .lte('date', weekEnd.toISOString().split('T')[0])

    // Fetch this month's expenses
    const { data: expenses } = await supabase
      .from('expense_items')
      .select('amount')
      .eq('user_id', appUser.id)
      .gte('date', monthStart.toISOString().split('T')[0])
      .lte('date', monthEnd.toISOString().split('T')[0])

    // Fetch pending approvals
    const { data: approvals } = await supabase
      .from('approvals')
      .select('*')
      .or(`timesheet_id.eq.${appUser.id},expense_report_id.eq.${appUser.id}`)
      .eq('status', 'pending')

    setStats({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      totalHoursThisWeek: (timeEntries || []).reduce((sum: number, entry: any) => sum + (entry.total_hours || 0), 0) / 60,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      totalExpensesThisMonth: (expenses || []).reduce((sum: number, expense: any) => sum + (expense.amount || 0), 0),
      pendingApprovals: approvals?.length || 0,
      submittedItems: 0, // Will be calculated separately
    })
  }

  const fetchClientApproverStats = async () => {
    if (!appUser) return
    
    // Fetch pending approvals for client's projects
    const { data: approvals } = await supabase
      .from('approvals')
      .select('*')
      .eq('approver_id', appUser.id)
      .eq('status', 'pending')

    setStats({
      totalHoursThisWeek: 0,
      totalExpensesThisMonth: 0,
      pendingApprovals: approvals?.length || 0,
      submittedItems: 0,
    })
  }

  const fetchAdminStats = async () => {
    // Fetch system-wide stats
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .eq('is_active', true)

    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('is_active', true)

    setStats({
      totalHoursThisWeek: 0,
      totalExpensesThisMonth: 0,
      pendingApprovals: 0,
      submittedItems: users?.length || 0,
    })
  }

  const fetchPayrollStats = async () => {
    // Fetch pending payroll approvals
    const { data: approvals } = await supabase
      .from('approvals')
      .select('*')
      .eq('approver_type', 'payroll')
      .eq('status', 'pending')

    setStats({
      totalHoursThisWeek: 0,
      totalExpensesThisMonth: 0,
      pendingApprovals: approvals?.length || 0,
      submittedItems: 0,
    })
  }

  const getWeekDates = () => {
    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - now.getDay())
    start.setHours(0, 0, 0, 0)
    
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    
    return { start, end }
  }

  const getMonthDates = () => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    
    return { start, end }
  }

  const getStatCards = () => {
    if (appUser?.role === 'employee') {
      return [
        {
          title: 'Hours This Week',
          value: `${stats.totalHoursThisWeek.toFixed(1)}h`,
          icon: Clock,
          color: 'bg-blue-500',
        },
        {
          title: 'Expenses This Month',
          value: `$${stats.totalExpensesThisMonth.toFixed(2)}`,
          icon: DollarSign,
          color: 'bg-green-500',
        },
        {
          title: 'Pending Approvals',
          value: stats.pendingApprovals,
          icon: AlertCircle,
          color: 'bg-yellow-500',
        },
      ]
    } else if (appUser?.role === 'client_approver') {
      return [
        {
          title: 'Pending Approvals',
          value: stats.pendingApprovals,
          icon: AlertCircle,
          color: 'bg-yellow-500',
        },
      ]
    } else if (appUser?.role === 'admin') {
      return [
        {
          title: 'Active Users',
          value: stats.submittedItems,
          icon: CheckCircle,
          color: 'bg-blue-500',
        },
      ]
    } else if (appUser?.role === 'payroll') {
      return [
        {
          title: 'Pending Approvals',
          value: stats.pendingApprovals,
          icon: AlertCircle,
          color: 'bg-yellow-500',
        },
      ]
    }
    
    return []
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  const statCards = getStatCards()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <div key={index} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className={`p-3 rounded-full ${stat.color}`}>
              <stat.icon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{stat.title}</p>
              <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}




