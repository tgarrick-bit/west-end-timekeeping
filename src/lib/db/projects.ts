import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Project, QueryResponse } from '../types/database'

export const projectQueries = {
  async getAll(): Promise<QueryResponse<Project[]>> {
    try {
      const supabase = createClientComponentClient()
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('name', { ascending: true })
      
      if (error) throw error
      return { data: data || [] }
    } catch (error) {
      console.error('Error fetching projects:', error)
      return { error }
    }
  },

  async getActive(): Promise<QueryResponse<Project[]>> {
    try {
      const supabase = createClientComponentClient()
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })
      
      if (error) throw error
      return { data: data || [] }
    } catch (error) {
      console.error('Error fetching active projects:', error)
      return { error }
    }
  },

  async getById(projectId: string): Promise<QueryResponse<Project>> {
    try {
      const supabase = createClientComponentClient()
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()
      
      if (error) throw error
      return { data }
    } catch (error) {
      console.error('Error fetching project:', error)
      return { error }
    }
  }
}