'use client'

import { useState, useEffect } from 'react'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  FolderOpen, 
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  X
} from 'lucide-react'
import { ProjectAssignment, User, Project } from '@/types'

interface AssignmentWithJoins extends ProjectAssignment {
  user: Pick<User, 'first_name' | 'last_name' | 'email'>
  project: Pick<Project, 'name' | 'client_id'>
}
import { supabase } from '@/lib/supabase'

interface AssignmentFormData {
  user_id: string
  project_id: string
  start_date: string
  end_date: string
  hourly_rate: number
  is_active: boolean
}

export default function ProjectAssignments() {
  const [assignments, setAssignments] = useState<AssignmentWithJoins[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<AssignmentWithJoins | null>(null)
  const [formData, setFormData] = useState<AssignmentFormData>({
    user_id: '',
    project_id: '',
    start_date: '',
    end_date: '',
    hourly_rate: 0,
    is_active: true
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch assignments with user and project info
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('project_assignments')
        .select(`
          *,
          user:users(first_name, last_name, email),
          project:projects(name, client_id)
        `)
        .order('start_date', { ascending: false })
      
      if (assignmentsError) throw assignmentsError
      setAssignments(assignmentsData || [])

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'employee')
        .eq('is_active', true)
        .order('first_name')
      
      if (usersError) throw usersError
      setUsers(usersData || [])

      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('is_active', true)
        .order('name')
      
      if (projectsError) throw projectsError
      setProjects(projectsData || [])

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingAssignment) {
        // Update existing assignment
        const { error } = await supabase
          .from('project_assignments')
          .update({
            user_id: formData.user_id,
            project_id: formData.project_id,
            start_date: formData.start_date,
            end_date: formData.end_date || null,
            hourly_rate: formData.hourly_rate,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingAssignment.id)

        if (error) throw error
      } else {
        // Create new assignment
        const { error } = await supabase
          .from('project_assignments')
          .insert([{
            user_id: formData.user_id,
            project_id: formData.project_id,
            start_date: formData.start_date,
            end_date: formData.end_date || null,
            hourly_rate: formData.hourly_rate,
            is_active: formData.is_active
          }])

        if (error) throw error
      }

      // Reset form and refresh data
      resetForm()
      fetchData()
    } catch (error) {
      console.error('Error saving assignment:', error)
    }
  }

  const handleEdit = (assignment: AssignmentWithJoins) => {
    setEditingAssignment(assignment)
    setFormData({
      user_id: assignment.user_id,
      project_id: assignment.project_id,
      start_date: assignment.start_date,
      end_date: assignment.end_date || '',
      hourly_rate: assignment.hourly_rate,
      is_active: assignment.is_active
    })
    setShowForm(true)
  }

  const handleDelete = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return

    try {
      const { error } = await supabase
        .from('project_assignments')
        .delete()
        .eq('id', assignmentId)

      if (error) throw error
      fetchData()
    } catch (error) {
      console.error('Error deleting assignment:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      user_id: '',
      project_id: '',
      start_date: '',
      end_date: '',
      hourly_rate: 0,
      is_active: true
    })
    setEditingAssignment(null)
    setShowForm(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e31c79]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#232020]">Project Assignments</h2>
          <p className="text-[#465079]">Manage employee assignments to projects</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 bg-[#e31c79] text-white rounded-lg hover:bg-[#d4156a] transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Assign Employee
        </button>
      </div>

      {/* Assignment Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[#232020]">
              {editingAssignment ? 'Edit Assignment' : 'New Assignment'}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#232020] mb-2">
                  Employee *
                </label>
                <select
                  required
                  value={formData.user_id}
                  onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                >
                  <option value="">Select an employee</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#232020] mb-2">
                  Project *
                </label>
                <select
                  required
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                >
                  <option value="">Select a project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#232020] mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#232020] mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#232020] mb-2">
                  Hourly Rate *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-[#e31c79] focus:ring-[#e31c79] border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 text-sm text-[#232020]">
                Assignment is active
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-[#465079] border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-[#e31c79] text-white rounded-lg hover:bg-[#d4156a] transition-colors"
              >
                {editingAssignment ? 'Update Assignment' : 'Create Assignment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Assignments List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-[#232020]">
            Current Assignments ({assignments.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {assignments.length === 0 ? (
            <div className="px-6 py-8 text-center text-[#465079]">
              No assignments found. Create your first assignment to get started.
            </div>
          ) : (
            assignments.map((assignment) => (
              <div key={assignment.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-[#e5ddd8] rounded-lg">
                      <Users className="h-6 w-6 text-[#465079]" />
                    </div>
                    <div>
                      <h4 className="font-medium text-[#232020]">
                        {assignment.user?.first_name} {assignment.user?.last_name}
                      </h4>
                      <div className="flex items-center space-x-4 text-sm text-[#465079] mt-1">
                        <span className="flex items-center">
                          <FolderOpen className="h-4 w-4 mr-1" />
                          {assignment.project?.name}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(assignment.start_date).toLocaleDateString()}
                          {assignment.end_date && ` - ${new Date(assignment.end_date).toLocaleDateString()}`}
                        </span>
                        <span className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-1" />
                          ${assignment.hourly_rate}/hr
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      assignment.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {assignment.is_active ? (
                        <CheckCircle className="w-3 h-3 mr-1" />
                      ) : (
                        <XCircle className="w-3 h-3 mr-1" />
                      )}
                      {assignment.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => handleEdit(assignment)}
                      className="p-2 text-gray-400 hover:text-[#e31c79] hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(assignment.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
