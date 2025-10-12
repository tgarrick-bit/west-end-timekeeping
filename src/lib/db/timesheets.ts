// /lib/db/timesheets.ts

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { 
  Timesheet, 
  TimesheetWithEmployee, 
  TimesheetWithDetails, 
  TimesheetEntry,
  TimesheetFilters,
  QueryResponse 
} from '@/lib/types/database'

export const timesheetQueries = {
  /**
   * Get all timesheets with optional filters
   */
  async getAll(filters?: TimesheetFilters): Promise<QueryResponse<TimesheetWithEmployee[]>> {
    try {
      const supabase = createClientComponentClient()
      
      let query = supabase
        .from('timesheets')
        .select(`
          *,
          employee:employees!timesheets_employee_id_fkey (
            id,
            email,
            first_name,
            last_name,
            department,
            hourly_rate,
            role,
            manager_id
          )
        `)
        .order('week_ending', { ascending: false })
      
      // Apply filters
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }
      if (filters?.employee_id) {
        query = query.eq('employee_id', filters.employee_id)
      }
      if (filters?.week_ending) {
        query = query.eq('week_ending', filters.week_ending)
      }
      if (filters?.date_from) {
        query = query.gte('week_ending', filters.date_from)
      }
      if (filters?.date_to) {
        query = query.lte('week_ending', filters.date_to)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return { data: data || [] }
    } catch (error) {
      console.error('Error fetching timesheets:', error)
      return { error }
    }
  },

  /**
   * Get a single timesheet with all details (employee + entries + projects)
   */
  async getWithDetails(timesheetId: string): Promise<QueryResponse<TimesheetWithDetails>> {
    try {
      const supabase = createClientComponentClient()
      
      // Fetch timesheet with employee
      const { data: timesheet, error: timesheetError } = await supabase
        .from('timesheets')
        .select(`
          *,
          employee:employees!timesheets_employee_id_fkey (
            id,
            email,
            first_name,
            last_name,
            department,
            hourly_rate,
            role
          )
        `)
        .eq('id', timesheetId)
        .single()
      
      if (timesheetError) throw timesheetError
      
      // Fetch entries with projects
      const { data: entries, error: entriesError } = await supabase
        .from('timesheet_entries')
        .select(`
          *,
          project:projects!timesheet_entries_project_id_fkey (
            id,
            name,
            code
          )
        `)
        .eq('timesheet_id', timesheetId)
        .order('date', { ascending: true })
      
      if (entriesError) throw entriesError
      
      // Calculate overtime if not set
      const totalHours = timesheet.total_hours || 0
      const overtimeHours = timesheet.overtime_hours ?? Math.max(0, totalHours - 40)
      
      return { 
        data: {
          ...timesheet,
          total_hours: totalHours,
          overtime_hours: overtimeHours,
          entries: entries || []
        }
      }
    } catch (error) {
      console.error('Error fetching timesheet details:', error)
      return { error }
    }
  },

  /**
   * Get timesheets for a specific employee
   */
  async getByEmployee(employeeId: string): Promise<QueryResponse<Timesheet[]>> {
    try {
      const supabase = createClientComponentClient()
      
      const { data, error } = await supabase
        .from('timesheets')
        .select('*')
        .eq('employee_id', employeeId)
        .order('week_ending', { ascending: false })
      
      if (error) throw error
      return { data: data || [] }
    } catch (error) {
      console.error('Error fetching employee timesheets:', error)
      return { error }
    }
  },

  /**
   * Get timesheets pending approval for a manager
   */
  async getPendingForManager(managerId: string): Promise<QueryResponse<TimesheetWithEmployee[]>> {
    try {
      const supabase = createClientComponentClient()
      
      // First get employees under this manager
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id')
        .eq('manager_id', managerId)
      
      if (empError) throw empError
      
      const employeeIds = employees?.map(e => e.id) || []
      
      // Then get their pending timesheets
      const { data, error } = await supabase
        .from('timesheets')
        .select(`
          *,
          employee:employees!timesheets_employee_id_fkey (
            id,
            email,
            first_name,
            last_name,
            department,
            hourly_rate,
            role
          )
        `)
        .in('employee_id', employeeIds)
        .eq('status', 'submitted')
        .order('week_ending', { ascending: false })
      
      if (error) throw error
      return { data: data || [] }
    } catch (error) {
      console.error('Error fetching pending timesheets:', error)
      return { error }
    }
  },

  /**
   * Create a new timesheet with entries
   */
  async create(
    timesheet: Partial<Timesheet>, 
    entries: Partial<TimesheetEntry>[]
  ): Promise<QueryResponse<Timesheet>> {
    try {
      const supabase = createClientComponentClient()
      
      // Create timesheet
      const { data: newTimesheet, error: timesheetError } = await supabase
        .from('timesheets')
        .insert(timesheet)
        .select()
        .single()
      
      if (timesheetError) throw timesheetError
      
      // Create entries
      const entriesWithTimesheetId = entries.map(entry => ({
        ...entry,
        timesheet_id: newTimesheet.id
      }))
      
      const { error: entriesError } = await supabase
        .from('timesheet_entries')
        .insert(entriesWithTimesheetId)
      
      if (entriesError) {
        // Rollback timesheet if entries fail
        await supabase
          .from('timesheets')
          .delete()
          .eq('id', newTimesheet.id)
        throw entriesError
      }
      
      return { data: newTimesheet }
    } catch (error) {
      console.error('Error creating timesheet:', error)
      return { error }
    }
  },

  /**
   * Update timesheet status
   */
  async updateStatus(
    timesheetId: string, 
    status: 'draft' | 'submitted' | 'approved' | 'rejected',
    additionalData?: {
      approved_by?: string
      comments?: string
    }
  ): Promise<QueryResponse<Timesheet>> {
    try {
      const supabase = createClientComponentClient()
      
      const updateData: any = { 
        status,
        updated_at: new Date().toISOString()
      }
      
      if (status === 'approved' || status === 'rejected') {
        updateData.approved_at = new Date().toISOString()
        if (additionalData?.approved_by) {
          updateData.approved_by = additionalData.approved_by
        }
      }
      
      if (additionalData?.comments) {
        updateData.comments = additionalData.comments
      }
      
      const { data, error } = await supabase
        .from('timesheets')
        .update(updateData)
        .eq('id', timesheetId)
        .select()
        .single()
      
      if (error) throw error
      return { data }
    } catch (error) {
      console.error('Error updating timesheet status:', error)
      return { error }
    }
  },

  /**
   * Approve a timesheet
   */
  async approve(timesheetId: string, approverId: string): Promise<QueryResponse<Timesheet>> {
    return this.updateStatus(timesheetId, 'approved', { approved_by: approverId })
  },

  /**
   * Reject a timesheet
   */
  async reject(
    timesheetId: string, 
    approverId: string, 
    reason: string
  ): Promise<QueryResponse<Timesheet>> {
    return this.updateStatus(timesheetId, 'rejected', { 
      approved_by: approverId, 
      comments: reason 
    })
  },

  /**
   * Submit a timesheet for approval
   */
  async submit(timesheetId: string): Promise<QueryResponse<Timesheet>> {
    try {
      const supabase = createClientComponentClient()
      
      const { data, error } = await supabase
        .from('timesheets')
        .update({ 
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', timesheetId)
        .select()
        .single()
      
      if (error) throw error
      return { data }
    } catch (error) {
      console.error('Error submitting timesheet:', error)
      return { error }
    }
  },

  /**
   * Delete a timesheet (only if draft status)
   */
  async delete(timesheetId: string): Promise<QueryResponse<void>> {
    try {
      const supabase = createClientComponentClient()
      
      // Check if timesheet is draft
      const { data: timesheet, error: checkError } = await supabase
        .from('timesheets')
        .select('status')
        .eq('id', timesheetId)
        .single()
      
      if (checkError) throw checkError
      
      if (timesheet.status !== 'draft') {
        throw new Error('Can only delete draft timesheets')
      }
      
      // Delete entries first (cascade might handle this)
      await supabase
        .from('timesheet_entries')
        .delete()
        .eq('timesheet_id', timesheetId)
      
      // Delete timesheet
      const { error } = await supabase
        .from('timesheets')
        .delete()
        .eq('id', timesheetId)
      
      if (error) throw error
      return { data: undefined }
    } catch (error) {
      console.error('Error deleting timesheet:', error)
      return { error }
    }
  }
}