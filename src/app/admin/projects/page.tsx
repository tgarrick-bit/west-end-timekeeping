'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { 
  FolderOpen,
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronLeft,
  X,
  Building2,
  Calendar,
  Users,
  Filter,
  Clock
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  code: string;
  client_id: string;
  client?: {
    name: string;
    code: string;
  };
  description?: string;
  start_date?: string;
  end_date?: string;
  active: boolean;
  visibility?: string; // 'all', 'department', 'specific'
  departments?: string[];
  employee_count?: number;
  total_hours?: number;
  created_at: string;
}

interface ProjectFormData {
  name: string;
  code: string;
  client_id: string;
  description: string;
  start_date: string;
  end_date: string;
  active: boolean;
  visibility: string;
  departments: string[];
}

export default function ProjectManagement() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  const supabase = createClientComponentClient();
  const router = useRouter();

  const initialFormData: ProjectFormData = {
    name: '',
    code: '',
    client_id: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    active: true,
    visibility: 'all',
    departments: []
  };

  const [formData, setFormData] = useState<ProjectFormData>(initialFormData);

  const departments = [
    'IT/Commerce',
    'Healthcare', 
    'Finance',
    'Human Resources',
    'Operations',
    'Marketing'
  ];

  useEffect(() => {
    fetchProjects();
    fetchClients();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [projects, searchTerm, selectedClient]);

  const fetchProjects = async () => {
    try {
      const { data: projectsData, error } = await supabase
        .from('projects')
        .select(`
          *,
          client:client_id (
            name,
            code
          )
        `)
        .order('name', { ascending: true });

      if (error) throw error;

      // Get employee counts and total hours for each project
      const projectsWithStats = await Promise.all(
        (projectsData || []).map(async (project) => {
          // Get unique employees who have logged time to this project
          const { data: timecards } = await supabase
            .from('timecards')
            .select('employee_id, total_hours')
            .eq('project_id', project.id);

          const uniqueEmployees = new Set(timecards?.map(t => t.employee_id) || []);
          const totalHours = timecards?.reduce((sum, t) => sum + (t.total_hours || 0), 0) || 0;

          return {
            ...project,
            employee_count: uniqueEmployees.size,
            total_hours: totalHours
          };
        })
      );

      setProjects(projectsWithStats);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data } = await supabase
        .from('clients')
        .select('id, name, code')
        .eq('active', true)
        .order('name');
      
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const filterProjects = () => {
    let filtered = [...projects];

    if (selectedClient !== 'all') {
      filtered = filtered.filter(project => project.client_id === selectedClient);
    }

    if (searchTerm) {
      filtered = filtered.filter(project => 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.client?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredProjects(filtered);
  };

  const handleAddProject = async () => {
    try {
      const { error } = await supabase
        .from('projects')
        .insert([formData]);

      if (error) throw error;

      setShowAddModal(false);
      setFormData(initialFormData);
      fetchProjects();
    } catch (error) {
      console.error('Error adding project:', error);
      alert('Error adding project');
    }
  };

  const handleUpdateProject = async () => {
    if (!selectedProject) return;

    try {
      const { error } = await supabase
        .from('projects')
        .update(formData)
        .eq('id', selectedProject.id);

      if (error) throw error;

      setShowEditModal(false);
      setSelectedProject(null);
      setFormData(initialFormData);
      fetchProjects();
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Error updating project');
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this project?')) return;

    try {
      const { error } = await supabase
        .from('projects')
        .update({ active: false })
        .eq('id', id);

      if (error) throw error;
      fetchProjects();
    } catch (error) {
      console.error('Error deactivating project:', error);
      alert('Error deactivating project');
    }
  };

  const openEditModal = (project: Project) => {
    setSelectedProject(project);
    setFormData({
      name: project.name,
      code: project.code,
      client_id: project.client_id,
      description: project.description || '',
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      active: project.active,
      visibility: project.visibility || 'all',
      departments: project.departments || []
    });
    setShowEditModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header style={{ backgroundColor: '#05202e' }} className="text-white">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin')}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">Project Management</h1>
                <p className="text-sm text-gray-300">Create and manage projects under client organizations</p>
              </div>
            </div>
            <button 
              onClick={() => router.push('/auth/logout')}
              className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Actions Bar */}
        <div className="bg-white rounded-lg shadow-sm mb-6 p-4" style={{ borderWidth: '1px', borderColor: '#05202e' }}>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink focus:border-transparent"
              />
            </div>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink focus:border-transparent"
            >
              <option value="all">All Clients</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name} ({client.code})
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-pink text-white rounded-lg hover:bg-pink-600 flex items-center gap-2"
              style={{ backgroundColor: '#e31c79' }}
            >
              <Plus className="h-4 w-4" />
              Add Project
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6" style={{ borderWidth: '1px', borderColor: '#05202e' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Projects</p>
                <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
              </div>
              <FolderOpen className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6" style={{ borderWidth: '1px', borderColor: '#05202e' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Projects</p>
                <p className="text-2xl font-bold text-gray-900">
                  {projects.filter(p => p.active).length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6" style={{ borderWidth: '1px', borderColor: '#05202e' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Clients</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(projects.map(p => p.client_id)).size}
                </p>
              </div>
              <Building2 className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6" style={{ borderWidth: '1px', borderColor: '#05202e' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold text-gray-900">
                  {projects.reduce((sum, p) => sum + (p.total_hours || 0), 0).toFixed(0)}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Projects Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden" style={{ borderWidth: '1px', borderColor: '#05202e' }}>
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visibility
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProjects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{project.name}</p>
                      <p className="text-sm text-gray-500">Code: {project.code}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm text-gray-900">{project.client?.name}</p>
                      <p className="text-xs text-gray-500">{project.client?.code}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      project.visibility === 'all' 
                        ? 'bg-green-100 text-green-800'
                        : project.visibility === 'department'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {project.visibility === 'all' ? 'All Employees' : 
                       project.visibility === 'department' ? 'Department Only' : 
                       'Specific Access'}
                    </span>
                    {project.departments && project.departments.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {project.departments.join(', ')}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      project.active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {project.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      <p>{project.employee_count || 0} employees</p>
                      <p className="text-xs text-gray-500">
                        {(project.total_hours || 0).toFixed(1)} hours
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(project)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Edit className="h-4 w-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {showAddModal ? 'Add New Project' : 'Edit Project'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setFormData(initialFormData);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client *
                  </label>
                  <select
                    value={formData.client_id}
                    onChange={(e) => setFormData({...formData, client_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink focus:border-transparent"
                    required
                  >
                    <option value="">Select Client</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name} ({client.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Code *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink focus:border-transparent"
                    placeholder="e.g., PROJ001"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink focus:border-transparent"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visibility *
                  </label>
                  <select
                    value={formData.visibility}
                    onChange={(e) => setFormData({...formData, visibility: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink focus:border-transparent"
                  >
                    <option value="all">All Employees Can See</option>
                    <option value="department">Department Based</option>
                    <option value="specific">Specific Access</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.active ? 'active' : 'inactive'}
                    onChange={(e) => setFormData({...formData, active: e.target.value === 'active'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                {formData.visibility === 'department' && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Departments
                    </label>
                    <div className="space-y-2 border border-gray-300 rounded-lg p-3">
                      {departments.map(dept => (
                        <label key={dept} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.departments.includes(dept)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData, 
                                  departments: [...formData.departments, dept]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  departments: formData.departments.filter(d => d !== dept)
                                });
                              }
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm">{dept}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Note: IT/Commerce sees all projects by default (Chickasaw rule)
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setFormData(initialFormData);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={showAddModal ? handleAddProject : handleUpdateProject}
                  className="px-4 py-2 text-white rounded-lg hover:opacity-90"
                  style={{ backgroundColor: '#e31c79' }}
                >
                  {showAddModal ? 'Add Project' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}