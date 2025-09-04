'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Project, Task, TimeEntryForm } from '@/types'
import { toast } from 'sonner'
import { Clock, MapPin, FileText, Plus, Loader2 } from 'lucide-react'
import { hoursToMinutes, calculateHours } from '@/lib/utils'
import { useNotificationIntegration } from '@/hooks/useNotificationIntegration'

const timeEntrySchema = z.object({
  project_id: z.string().min(1, 'Project is required'),
  task_id: z.string().min(1, 'Task is required'),
  date: z.string().min(1, 'Date is required'),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  total_hours: z.number().min(0.1, 'Hours must be at least 0.1').max(24, 'Hours cannot exceed 24'),
  notes: z.string().optional(),
  location: z.string().optional(),
})

type TimeEntryFormData = z.infer<typeof timeEntrySchema>

export function QuickTimeEntry() {
  const { appUser } = useAuth()
  const { notifyTimesheetSubmitted } = useNotificationIntegration()
  const [projects, setProjects] = useState<Array<{
    id: string
    name: string
    description: string
  }>>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [useTimeRange, setUseTimeRange] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TimeEntryFormData>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      total_hours: 8,
    },
  })

  const watchStartTime = watch('start_time')
  const watchEndTime = watch('end_time')

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    if (selectedProjectId) {
      fetchTasks(selectedProjectId)
    }
  }, [selectedProjectId])

  useEffect(() => {
    if (useTimeRange && watchStartTime && watchEndTime) {
      const hours = calculateHours(watchStartTime, watchEndTime)
      setValue('total_hours', hours)
    }
  }, [watchStartTime, watchEndTime, useTimeRange, setValue])

  const fetchProjects = async () => {
    if (!appUser) return

    try {
      const { data, error } = await supabase
        .from('project_assignments')
        .select(`
          project_id,
          projects (
            id,
            name,
            description
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
      }>
      setProjects(projectData)
    } catch (error) {
      console.error('Error fetching projects:', error)
      toast.error('Failed to load projects')
    }
  }

  const fetchTasks = async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)

      if (error) throw error

      setTasks(data || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
      toast.error('Failed to load tasks')
    }
  }

  const onSubmit = async (data: TimeEntryFormData) => {
    if (!appUser) return

    setIsLoading(true)
    try {
      // Convert hours to minutes for storage
      const totalMinutes = hoursToMinutes(data.total_hours)

      const { error } = await supabase
        .from('time_entries')
        .insert([{
          user_id: appUser.id,
          project_id: data.project_id,
          task_id: data.task_id,
          date: data.date,
          start_time: data.start_time || null,
          end_time: data.end_time || null,
          total_hours: totalMinutes,
          notes: data.notes || null,
          location: data.location || null,
          is_submitted: false,
          is_approved: false,
        }])

      if (error) throw error

      // Notify manager about timesheet submission
      if (appUser.manager_id) {
        notifyTimesheetSubmitted(
          appUser.manager_id,
          `${appUser.first_name} ${appUser.last_name}` || 'Employee',
          data.date,
          data.total_hours
        )
      }

      toast.success('Time entry added successfully')
      reset()
      setSelectedProjectId('')
    } catch (error) {
      console.error('Error adding time entry:', error)
      toast.error('Failed to add time entry')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Project Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project *
          </label>
          <select
            {...register('project_id')}
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
          >
            <option value="">Select a project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          {errors.project_id && (
            <p className="mt-1 text-sm text-red-600">{errors.project_id.message}</p>
          )}
        </div>

        {/* Task Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Task *
          </label>
          <select
            {...register('task_id')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
            disabled={!selectedProjectId}
          >
            <option value="">Select a task</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.code} - {task.name}
              </option>
            ))}
          </select>
          {errors.task_id && (
            <p className="mt-1 text-sm text-red-600">{errors.task_id.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date *
          </label>
          <input
            {...register('date')}
            type="date"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
          />
          {errors.date && (
            <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
          )}
        </div>

        {/* Time Entry Method */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Entry Method
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                checked={!useTimeRange}
                onChange={() => setUseTimeRange(false)}
                className="mr-2"
              />
              <span className="text-sm">Total Hours</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                checked={useTimeRange}
                onChange={() => setUseTimeRange(true)}
                className="mr-2"
              />
              <span className="text-sm">Time Range</span>
            </label>
          </div>
        </div>
      </div>

      {useTimeRange ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Time
            </label>
            <input
              {...register('start_time')}
              type="time"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
            />
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Time
            </label>
            <input
              {...register('end_time')}
              type="time"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Total Hours *
          </label>
          <input
            {...register('total_hours', { valueAsNumber: true })}
            type="number"
            step="0.25"
            min="0.1"
            max="24"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
            placeholder="8.0"
          />
          {errors.total_hours && (
            <p className="mt-1 text-sm text-red-600">{errors.total_hours.message}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <div className="relative">
            <FileText className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              {...register('notes')}
              type="text"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              placeholder="What did you work on?"
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              {...register('location')}
              type="text"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              placeholder="Where were you working?"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Add Time Entry
        </button>
      </div>
    </form>
  )
}




