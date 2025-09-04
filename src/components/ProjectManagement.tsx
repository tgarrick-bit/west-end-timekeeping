'use client'

import { useState, useEffect } from 'react'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  FolderOpen, 
  Calendar, 
  DollarSign,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Building2,
  X
} from 'lucide-react'
import { Project, Client, ProjectAssignment, User } from '@/types'
import { supabase } from '@/lib/supabase'

interface ProjectFormData {
  name: string
  client_id: string
  description: string
  start_date: string
  end_date: string
  budget: number
  status: 'active' | 'completed' | 'on-hold'
  is_active: boolean
}

interface ProjectWithClient extends Project {
  client: Client
  assignments: ProjectAssignment[]
}

export default function ProjectManagement() {
  const [projects, setProjects] = useState<ProjectWithClient[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [clientFilter, setClientFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'on-hold'>('all')
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    client_id: '',
    description: '',
    start_date: '',
    end_date: '',
    budget: 0,
    status: 'active',
    is_active: true
  })

  // Demo clients for testing when database is empty
  const loadDemoClients = () => {
    const demoClients: Client[] = [
      {
        id: 'demo-1',
        name: 'Metro Hospital',
        contact_person: 'Dr. Sarah Johnson',
        contact_email: 'sarah.johnson@metrohospital.com',
        contact_phone: '(555) 123-4567',
        time_tracking_method: 'detailed' as const,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'demo-2',
        name: 'Downtown Office Complex',
        contact_person: 'Mike Rodriguez',
        contact_email: 'mike.rodriguez@downtownoffice.com',
        contact_phone: '(555) 987-6543',
        time_tracking_method: 'simple' as const,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
    setClients(demoClients)
  }

  // Test database connection
  const testDatabaseConnection = async () => {
    try {
      
      // Test if projects table exists and is accessible
      const { data, error } = await supabase
        .from('projects')
        .select('count')
        .limit(1)
      
      if (error) {
        console.error('❌ Database connection test failed:', error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('❌ Database connection test error:', error)
      return false
    }
  }

  // Test project creation with minimal data
  const testProjectCreation = async () => {
    try {
      
      // Get first available client
      if (clients.length === 0) {
        alert('No clients available. Please create a client first.')
        return
      }
      
      const testClient = clients[0]
      
      const testProject = {
        name: 'Test Project - ' + new Date().toISOString().slice(0, 19),
        client_id: testClient.id,
        description: 'This is a test project to verify database functionality',
        start_date: new Date().toISOString().split('T')[0],
        end_date: null,
        budget: 1000,
        status: 'active' as const,
        is_active: true
      }
      
      
      const { data, error } = await supabase
        .from('projects')
        .insert([testProject])
        .select()
      
      if (error) {
        console.error('❌ Test project creation failed:', error)
        alert(`Test project creation failed: ${error.message}`)
        return
      }
      
      alert('Test project created successfully! Database insert is working.')
      
      // Refresh data to show the new test project
      fetchData()
      
    } catch (error) {
      console.error('💥 Test project creation error:', error)
      alert(`Test project creation error: ${error}`)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Test database connection first
      const dbConnected = await testDatabaseConnection()
      if (!dbConnected) {
        console.warn('⚠️ Database connection failed, loading demo data')
        loadDemoClients()
        setLoading(false)
        return
      }
      
      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('name')
      
      if (clientsError) {
        console.error('❌ Error fetching clients:', clientsError)
        console.warn('⚠️ Database error, loading demo clients')
        loadDemoClients()
        setLoading(false)
        return
      }
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      
      // If no clients found, load demo clients
      if (!clientsData || clientsData.length === 0) {
        loadDemoClients()
        setLoading(false)
        return
      }
      
      setClients(clientsData)

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'employee')
        .eq('is_active', true)
        .order('first_name')
      
      if (usersError) {
        console.error('❌ Error fetching users:', usersError)
        // Continue with empty users list
        setUsers([])
      } else {
        setUsers(usersData || [])
      }

      // Fetch projects with client information
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          client:clients(*)
        `)
        .order('created_at', { ascending: false })

      if (projectsError) {
        console.error('❌ Error fetching projects:', projectsError)
        setProjects([])
      } else {
        setProjects(projectsData || [])
      }

      // Fetch project assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('project_assignments')
        .select('*')
        .eq('is_active', true)

      if (assignmentsError) {
        console.error('❌ Error fetching assignments:', assignmentsError)
      } else {
        
        // Update projects with assignments
        if (projectsData) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const projectsWithAssignments = projectsData.map((project: any) => ({
            ...project,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            assignments: assignmentsData?.filter((a: any) => a.project_id === project.id) || []
          }))
          setProjects(projectsWithAssignments)
        }
      }

    } catch (error) {
      console.error('💥 Error in fetchData:', error)
      // Load demo data on error
      loadDemoClients()
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    alert('Form submitted! Check console for details.')
    
    // Form validation
    if (!formData.name.trim()) {
      alert('Project name is required')
      return
    }
    
    if (!formData.client_id) {
      alert('Please select a client')
      return
    }
    
    if (!formData.start_date) {
      alert('Start date is required')
      return
    }
    
    
    // Validate dates
    if (formData.end_date && formData.start_date > formData.end_date) {
      alert('End date cannot be before start date')
      return
    }
    
    try {
      if (editingProject) {
        // Update existing project
        const { error } = await supabase
          .from('projects')
          .update({
            name: formData.name,
            client_id: formData.client_id,
            description: formData.description,
            start_date: formData.start_date,
            end_date: formData.end_date || null,
            budget: formData.budget || null,
            status: formData.status,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingProject.id)
        
        if (error) {
          console.error('❌ Error updating project:', error)
          throw error
        }
      } else {
        // Create new project
        const { data, error } = await supabase
          .from('projects')
          .insert([{
            name: formData.name,
            client_id: formData.client_id,
            description: formData.description,
            start_date: formData.start_date,
            end_date: formData.end_date || null,
            budget: formData.budget || null,
            status: formData.status,
            is_active: formData.is_active
          }])
          .select()

        if (error) {
          console.error('❌ Error creating project:', error)
          console.error('❌ Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
          
          // Show more detailed error information
          let detailedError = `Database error: ${error.message}`
          if (error.details) detailedError += `\nDetails: ${error.details}`
          if (error.hint) detailedError += `\nHint: ${error.hint}`
          if (error.code) detailedError += `\nCode: ${error.code}`
          
          console.error('❌ Detailed error for user:', detailedError)
          throw new Error(detailedError)
        }
      }

      // Reset form and refresh data
      resetForm()
      fetchData()
      
      // Show success message
      if (editingProject) {
        alert('Project updated successfully!')
      } else {
        alert('Project created successfully!')
      }
    } catch (error: unknown) {
      console.error('💥 Error saving project:', error)
      
      // Show user-friendly error message
      let errorMessage = 'Failed to save project'
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message)
      } else if (error && typeof error === 'object' && 'details' in error) {
        errorMessage = String(error.details)
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      alert(`Error: ${errorMessage}`)
    }
  }

  const handleEdit = (project: Project) => {
    setEditingProject(project)
    setFormData({
      name: project.name,
      client_id: project.client_id,
      description: project.description || '',
      start_date: project.start_date,
      end_date: project.end_date || '',
      budget: project.budget || 0,
      status: project.status,
      is_active: project.is_active
    })
    setShowForm(true)
  }

  const handleDelete = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (error) throw error
      fetchData()
    } catch (error) {
      console.error('Error deleting project:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      client_id: '',
      description: '',
      start_date: '',
      end_date: '',
      budget: 0,
      status: 'active',
      is_active: true
    })
    setEditingProject(null)
    setShowForm(false)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      completed: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      'on-hold': { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle }
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

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesClient = clientFilter === 'all' || project.client_id === clientFilter
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter
    
    return matchesSearch && matchesClient && matchesStatus
  })

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
          <h2 className="text-2xl font-bold text-[#232020]">Project Management</h2>
          <p className="text-[#465079]">Manage your projects and assignments</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={testDatabaseConnection}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Test DB Connection
          </button>
          <button
            onClick={testProjectCreation}
            className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors"
          >
            Test Project Creation
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center px-4 py-2 bg-[#e31c79] text-white rounded-lg hover:bg-[#d4156a] transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Project
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
          />
        </div>
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
        >
          <option value="all">All Clients</option>
          {clients.map(client => (
            <option key={client.id} value={client.id}>{client.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'completed' | 'on-hold')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="on-hold">On Hold</option>
        </select>
      </div>

      {/* Project Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[#232020]">
              {editingProject ? 'Edit Project' : 'Create New Project'}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#232020] mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#232020] mb-2">
                  Client *
                </label>
                {/* Debug info */}
                <div className="text-xs text-gray-500 mb-1">
                  Available clients: {clients.length} | Active clients: {clients.filter(c => c.is_active).length}
                  <button 
                    type="button"
                    onClick={() => fetchData()}
                    className="ml-2 text-blue-500 hover:text-blue-700 underline"
                  >
                    Refresh
                  </button>
                </div>
                <select
                  required
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                >
                  <option value="">Select a client</option>
                  {clients.filter(c => c.is_active).map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
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
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'completed' | 'on-hold' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="on-hold">On Hold</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#232020] mb-2">
                  Budget
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#232020] mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Project description, objectives, and key deliverables..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
              />
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
                Project is active
              </label>
            </div>

            {/* Debug section - remove in production */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Debug Info (Form Data)</h4>
              <pre className="text-xs text-gray-600 overflow-auto">
                {JSON.stringify(formData, null, 2)}
              </pre>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => {
                    // Create a fake event to test the save function
                    const fakeEvent = { preventDefault: () => {} } as React.FormEvent
                    handleSubmit(fakeEvent)
                  }}
                  className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-xs hover:bg-yellow-200"
                >
                  Test Direct Save
                </button>
              </div>
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
                {editingProject ? 'Update Project' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Projects List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-[#232020]">Projects</h3>
              <p className="text-sm text-[#465079]">Manage your project portfolio</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => fetchData()}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="bg-[#e31c79] text-white px-4 py-2 rounded-lg hover:bg-[#c41a6b] transition-colors flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Project
              </button>
            </div>
          </div>

          {/* Demo data indicator */}
          {clients.some(c => c.id.startsWith('demo-')) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Demo Mode:</strong> Showing sample clients and projects. Create real clients in the Clients tab to see them here.
              </p>
            </div>
          )}
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-[#232020]">
              Projects ({filteredProjects.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredProjects.length === 0 ? (
              <div className="px-6 py-8 text-center text-[#465079]">
                {projects.length === 0 ? 'No projects found. Create your first project to get started.' : 'No projects match your search criteria.'}
              </div>
            ) : (
              filteredProjects.map((project) => (
                <div key={project.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-[#e5ddd8] rounded-lg">
                        <FolderOpen className="h-6 w-6 text-[#465079]" />
                      </div>
                      <div>
                        <h4 className="font-medium text-[#232020]">{project.name}</h4>
                        <p className="text-sm text-[#465079] mb-2">{project.description}</p>
                        <div className="flex items-center space-x-4 text-sm text-[#465079]">
                          <span className="flex items-center">
                            <Building2 className="h-4 w-4 mr-1" />
                            {project.client.name}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(project.start_date).toLocaleDateString()}
                            {project.end_date && ` - ${new Date(project.end_date).toLocaleDateString()}`}
                          </span>
                          {project.budget && (
                            <span className="flex items-center">
                              <DollarSign className="h-4 w-4 mr-1" />
                              ${project.budget.toLocaleString()}
                            </span>
                          )}
                          <span className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {project.assignments?.length || 0} assigned
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getStatusBadge(project.status)}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        project.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {project.is_active ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-1" />
                        )}
                        {project.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={() => handleEdit(project)}
                        className="p-2 text-gray-400 hover:text-[#e31c79] hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(project.id)}
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
    </div>
  )
}
