'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { ProjectSummary, Project, ProjectOverviewItem } from '@/types'
import { Building, Clock, DollarSign, TrendingUp } from 'lucide-react'

export function ProjectOverview() {
  const { appUser } = useAuth()
  const [projects, setProjects] = useState<ProjectOverviewItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (appUser) {
      fetchProjectOverview()
    }
  }, [appUser])

  const fetchProjectOverview = async () => {
    if (!appUser) return

    try {
      setLoading(true)

      if (appUser.role === 'employee') {
        await fetchEmployeeProjects()
      } else if (appUser.role === 'client_approver') {
        await fetchClientProjects()
      } else if (appUser.role === 'admin') {
        await fetchAllProjects()
      }
    } catch (error) {
      console.error('Error fetching project overview:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployeeProjects = async () => {
    if (!appUser) return
    
    const { data, error } = await supabase
      .from('project_assignments')
      .select(`
        project_id,
        projects (
          id,
          name,
          description,
          is_active
        )
      `)
      .eq('user_id', appUser.id)
      .eq('is_active', true)

    if (error) throw error

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const projectData = data?.flatMap((item: any) => item.projects).filter(Boolean) as Array<{
      id: string
      name: string
      description: string
      is_active: boolean
    }>
    
    // Fetch project stats
    const projectSummaries = await Promise.all(
      projectData.map(async (project) => {
        const { start: weekStart, end: weekEnd } = getWeekDates()
        const { start: monthStart, end: monthEnd } = getMonthDates()

        // Get this week's hours
        const { data: timeEntries } = await supabase
          .from('time_entries')
          .select('total_hours')
          .eq('project_id', project.id)
          .eq('user_id', appUser.id)
          .gte('date', weekStart.toISOString().split('T')[0])
          .lte('date', weekEnd.toISOString().split('T')[0])

        // Get this month's expenses
        const { data: expenses } = await supabase
          .from('expense_items')
          .select('amount')
          .eq('project_id', project.id)
          .eq('user_id', appUser.id)
          .gte('date', monthStart.toISOString().split('T')[0])
          .lte('date', monthEnd.toISOString().split('T')[0])

        return {
          project,
          totalHours: (timeEntries || []).reduce((sum: number, entry: any) => sum + (entry.total_hours || 0), 0) / 60,
          totalExpenses: (expenses || []).reduce((sum: number, expense: any) => sum + (expense.amount || 0), 0),
          isActive: project.is_active,
        }
      })
    )

    setProjects(projectSummaries)
  }

  const fetchClientProjects = async () => {
    if (!appUser) return
    
    // For client approvers, show projects they can approve
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('client_id', appUser.client_id)
      .eq('is_active', true)

    if (error) throw error

    const projectSummaries = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data.map(async (project: any) => {
        const { start: weekStart, end: weekEnd } = getWeekDates()
        const { start: monthStart, end: monthEnd } = getMonthDates()

        // Get this week's hours across all users
        const { data: timeEntries } = await supabase
          .from('time_entries')
          .select('total_hours')
          .eq('project_id', project.id)
          .gte('date', weekStart.toISOString().split('T')[0])
          .lte('date', weekEnd.toISOString().split('T')[0])

        // Get this month's expenses across all users
        const { data: expenses } = await supabase
          .from('expense_items')
          .select('amount')
          .eq('project_id', project.id)
          .gte('date', monthStart.toISOString().split('T')[0])
          .lte('date', monthEnd.toISOString().split('T')[0])

        return {
          project,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          totalHours: (timeEntries || []).reduce((sum: number, entry: any) => sum + (entry.total_hours || 0), 0) / 60,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          totalExpenses: (expenses || []).reduce((sum: number, expense: any) => sum + (expense.amount || 0), 0),
          isActive: project.is_active,
        }
      })
    )

    setProjects(projectSummaries)
  }

  const fetchAllProjects = async () => {
    // For admins, show all active projects
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) throw error

    const projectSummaries = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data.map(async (project: any) => {
        const { start: weekStart, end: weekEnd } = getWeekDates()
        const { start: monthStart, end: monthEnd } = getMonthDates()

        // Get this week's hours across all users
        const { data: timeEntries } = await supabase
          .from('time_entries')
          .select('total_hours')
          .eq('project_id', project.id)
          .gte('date', weekStart.toISOString().split('T')[0])
          .lte('date', weekEnd.toISOString().split('T')[0])

        // Get this month's expenses across all users
        const { data: expenses } = await supabase
          .from('expense_items')
          .select('amount')
          .eq('project_id', project.id)
          .gte('date', monthStart.toISOString().split('T')[0])
          .lte('date', monthEnd.toISOString().split('T')[0])

        return {
          project,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          totalHours: (timeEntries || []).reduce((sum: number, entry: any) => sum + (entry.total_hours || 0), 0) / 60,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          totalExpenses: (expenses || []).reduce((sum: number, expense: any) => sum + (expense.amount || 0), 0),
          isActive: project.is_active,
        }
      })
    )

    setProjects(projectSummaries)
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

  if (projects.length === 0) {
    return (
      <div className="text-center py-8">
        <Building className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-500">No projects found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {projects.map((projectSummary) => (
        <div
          key={projectSummary.project.id}
          className="border border-gray-200 rounded-lg p-4 hover:border-primary/30 transition-colors"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-medium text-gray-900">
                {projectSummary.project.name}
              </h3>
              {projectSummary.project.description && (
                <p className="text-sm text-gray-500 mt-1">
                  {projectSummary.project.description}
                </p>
              )}
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              projectSummary.isActive 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {projectSummary.isActive ? 'Active' : 'Inactive'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-gray-600">
                {projectSummary.totalHours.toFixed(1)}h this week
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-600">
                ${projectSummary.totalExpenses.toFixed(2)} this month
              </span>
            </div>
          </div>

          {projectSummary.totalHours > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm text-gray-600">
                  Project is active with recent activity
                </span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}




