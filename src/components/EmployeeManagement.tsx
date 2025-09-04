'use client'

import { useState, useEffect } from 'react'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  User, 
  Mail, 
  Phone, 
  CheckCircle,
  XCircle,
  Shield,
  UserCheck,
  Building2,
  X
} from 'lucide-react'
import { User as UserType, UserRole } from '@/types'
import { supabase } from '@/lib/supabase'
import { useNotifications } from '@/hooks/useNotifications'

interface EmployeeFormData {
  email: string
  first_name: string
  last_name: string
  role: 'employee' | 'client_approver' | 'admin' | 'payroll' | 'manager'
  client_id?: string
  is_active: boolean
}

export default function EmployeeManagement() {
  const { notifyNewEmployeeAdded } = useNotifications()
  const [employees, setEmployees] = useState<UserType[]>([])
  const [clients, setClients] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<UserType | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'employee' | 'client_approver' | 'admin' | 'payroll' | 'manager'>('all')
  const [formData, setFormData] = useState<EmployeeFormData>({
    email: '',
    first_name: '',
    last_name: '',
    role: 'employee',
    client_id: '',
    is_active: true
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('users')
        .select('*')
        .order('first_name')
      
      if (employeesError) throw employeesError
      setEmployees(employeesData || [])

      // Fetch clients for client_approver role
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, name')
        .eq('is_active', true)
        .order('name')
      
      if (clientsError) throw clientsError
      setClients(clientsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingEmployee) {
        // Update existing employee
        const { error } = await supabase
          .from('users')
          .update({
            email: formData.email,
            first_name: formData.first_name,
            last_name: formData.last_name,
            role: formData.role,
            client_id: formData.client_id || null,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingEmployee.id)

        if (error) throw error
      } else {
        // Create new employee (password will be set by admin)
        const { error } = await supabase
          .from('users')
          .insert([{
            email: formData.email,
            first_name: formData.first_name,
            last_name: formData.last_name,
            role: formData.role,
            client_id: formData.client_id || null,
            is_active: formData.is_active
          }])

        if (error) throw error
        
        // Notify manager about new employee
        if (formData.role === 'employee' && formData.client_id) {
          // Find the client to get the manager
          const client = clients.find(c => c.id === formData.client_id)
          if (client) {
            // In a real implementation, you'd get the manager ID from the client
            // For now, we'll use a default manager
            notifyNewEmployeeAdded('manager-demo', `${formData.first_name} ${formData.last_name}`)
          }
        }
      }

      // Reset form and refresh data
      resetForm()
      fetchData()
    } catch (error) {
      console.error('Error saving employee:', error)
    }
  }

  const handleEdit = (employee: UserType) => {
    setEditingEmployee(employee)
    setFormData({
      email: employee.email,
      first_name: employee.first_name,
      last_name: employee.last_name,
      role: employee.role,
      client_id: employee.client_id || '',
      is_active: employee.is_active
    })
    setShowForm(true)
  }

  const handleDelete = async (employeeId: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', employeeId)

      if (error) throw error
      fetchData()
    } catch (error) {
      console.error('Error deleting employee:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      email: '',
      first_name: '',
      last_name: '',
      role: 'employee',
      client_id: '',
      is_active: true
    })
    setEditingEmployee(null)
    setShowForm(false)
  }

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      employee: { color: 'bg-blue-100 text-blue-800', icon: User },
      client_approver: { color: 'bg-green-100 text-green-800', icon: UserCheck },
      admin: { color: 'bg-purple-100 text-purple-800', icon: Shield },
      payroll: { color: 'bg-orange-100 text-orange-800', icon: Shield },
      manager: { color: 'bg-[#e31c79] bg-opacity-10 text-[#e31c79]', icon: Shield }
    }
    
    const config = roleConfig[role as keyof typeof roleConfig]
    const Icon = config.icon
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {role.replace('_', ' ').charAt(0).toUpperCase() + role.replace('_', ' ').slice(1)}
      </span>
    )
  }

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || employee.role === roleFilter
    
    return matchesSearch && matchesRole
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
          <h2 className="text-2xl font-bold text-[#232020]">Employee Management</h2>
          <p className="text-[#465079]">Manage your workforce and user accounts</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 bg-[#e31c79] text-white rounded-lg hover:bg-[#d4156a] transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Employee
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as 'all' | 'employee' | 'client_approver' | 'admin' | 'payroll' | 'manager')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
        >
          <option value="all">All Roles</option>
          <option value="employee">Employees</option>
          <option value="client_approver">Client Approvers</option>
          <option value="admin">Administrators</option>
          <option value="payroll">Payroll</option>
          <option value="manager">Managers</option>
        </select>
      </div>

      {/* Employee Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[#232020]">
              {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
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
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#232020] mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#232020] mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#232020] mb-2">
                  Role *
                </label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole, client_id: '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                >
                  <option value="employee">Employee</option>
                  <option value="client_approver">Client Approver</option>
                  <option value="admin">Administrator</option>
                  <option value="payroll">Payroll</option>
                  <option value="manager">Manager</option>
                </select>
              </div>

              {formData.role === 'client_approver' && (
                <div>
                  <label className="block text-sm font-medium text-[#232020] mb-2">
                    Client *
                  </label>
                  <select
                    required
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                  >
                    <option value="">Select a client</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </div>
              )}
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
                Account is active
              </label>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> New employees will need to set their password on first login. 
                You can send them a password reset email from their profile.
              </p>
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
                {editingEmployee ? 'Update Employee' : 'Create Employee'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Employees List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-[#232020]">
            Employees ({filteredEmployees.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredEmployees.length === 0 ? (
            <div className="px-6 py-8 text-center text-[#465079]">
              {employees.length === 0 ? 'No employees found. Add your first employee to get started.' : 'No employees match your search criteria.'}
            </div>
          ) : (
            filteredEmployees.map((employee) => (
              <div key={employee.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-[#e5ddd8] rounded-lg">
                      <User className="h-6 w-6 text-[#465079]" />
                    </div>
                    <div>
                      <h4 className="font-medium text-[#232020]">
                        {employee.first_name} {employee.last_name}
                      </h4>
                      <div className="flex items-center space-x-4 text-sm text-[#465079]">
                        <span className="flex items-center">
                          <Mail className="h-4 w-4 mr-1" />
                          {employee.email}
                        </span>
                        {employee.client_id && (
                          <span className="flex items-center">
                            <Building2 className="h-4 w-4 mr-1" />
                            {clients.find(c => c.id === employee.client_id)?.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getRoleBadge(employee.role)}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      employee.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {employee.is_active ? (
                        <CheckCircle className="w-3 h-3 mr-1" />
                      ) : (
                        <XCircle className="w-3 h-3 mr-1" />
                      )}
                      {employee.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => handleEdit(employee)}
                      className="p-2 text-gray-400 hover:text-[#e31c79] hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(employee.id)}
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
