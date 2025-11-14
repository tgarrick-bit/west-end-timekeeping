'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { 
  Users, Plus, Search, Edit, Trash2, ChevronLeft, X,
  Mail, Phone, Calendar, DollarSign, UserCheck, Building2
} from 'lucide-react';

const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' }
];

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: string;
  department?: string;
  hire_date?: string;
  hourly_rate?: number;
  is_active: boolean;
  is_exempt: boolean;
  state?: string;
  employee_id?: string;
  client_id?: string;
  manager_id?: string;
  mybase_payroll_id?: string;
}

interface Manager {
  id: string;
  first_name: string;
  last_name: string;
  department?: string;
}

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'employee',
    department: '',
    hire_date: new Date().toISOString().split('T')[0],
    hourly_rate: 0,
    is_active: true,
    is_exempt: false,
    state: 'CA',
    employee_id: '',
    mybase_payroll_id: '',  // Keep as empty string for form
    manager_id: '',         // Added
    password: '' // Only for new employees
  });

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  useEffect(() => {
    filterEmployees();
  }, [employees, searchTerm]);

  const checkAuthAndFetch = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        router.push('/auth/login');
        return;
      }

      const { data: userData } = await supabase
        .from('employees')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userData?.role !== 'admin') {
        router.push('/dashboard');
        return;
      }

      await fetchEmployees();
      await fetchManagers();  // Added
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load data');
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('last_name', { ascending: true });

      if (error) throw error;

      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setError('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  // Added function to fetch managers
  const fetchManagers = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, department')
        .in('role', ['manager', 'admin', 'time_approver'])
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      setManagers(data || []);
    } catch (error) {
      console.error('Error fetching managers:', error);
    }
  };

  const filterEmployees = () => {
    let filtered = [...employees];

    if (searchTerm) {
      filtered = filtered.filter(emp => 
        emp.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employee_id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredEmployees(filtered);
  };

// Instead of creating user directly, call the API
const handleAddEmployee = async () => {  // Remove the parameter
  try {
    console.log('Client sending:', {
      email: formData.email,
      hasEmail: 'email' in formData,
      allKeys: Object.keys(formData),
      formData: formData
    })
    const response = await fetch('/api/admin/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: formData.email,  // Now this uses the state formData
        password: formData.password,
        firstName: formData.first_name,
        lastName: formData.last_name,
        role: formData.role,
        department: formData.department,
        managerId: formData.manager_id,
        hourlyRate: formData.hourly_rate,
        employeeId: formData.employee_id,
        mybasePayrollId: formData.mybase_payroll_id || null,
        hireDate: formData.hire_date,
        state: formData.state,
        isActive: formData.is_active,
        isExempt: formData.is_exempt
      })
    })

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error((data as any).error || 'Failed to create employee')
    }
    
    // Success! 
    alert('Employee created successfully!')
    await fetchEmployees() // Refresh the employee list
    
  } catch (error: any) {
    console.error('Error adding employee:', error)
    alert(error?.message || 'Database error saving new user')
  }
}

  const handleUpdateEmployee = async () => {
    if (!selectedEmployee) return;

    try {
      const updateData = { ...formData };
      delete (updateData as any).password;

      const { error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', selectedEmployee.id);

      if (error) throw error;

      setShowEditModal(false);
      setSelectedEmployee(null);
      resetForm();
      fetchEmployees();
    } catch (error: any) {
      console.error('Error updating employee:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleDeactivateEmployee = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this employee?')) return;

    try {
      const { error } = await supabase
        .from('employees')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      fetchEmployees();
    } catch (error) {
      console.error('Error deactivating employee:', error);
    }
  };

  const openEditModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      first_name: employee.first_name || '',
      last_name: employee.last_name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      role: employee.role || 'employee',
      department: employee.department || '',
      hire_date: employee.hire_date || '',
      hourly_rate: employee.hourly_rate || 0,
      is_active: employee.is_active !== false,
      is_exempt: employee.is_exempt || false,
      state: employee.state || 'CA',
      employee_id: employee.employee_id || '',
      mybase_payroll_id: employee.mybase_payroll_id || '',  // Added
      manager_id: employee.manager_id || '',                // Added
      password: ''
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      role: 'employee',
      department: '',
      hire_date: new Date().toISOString().split('T')[0],
      hourly_rate: 0,
      is_active: true,
      is_exempt: false,
      state: 'CA',
      employee_id: '',
      mybase_payroll_id: '',  // Added
      manager_id: '',         // Added
      password: ''
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e31c79] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading employees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#05202E] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin')}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-200 hover:text-white"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2 rounded-lg">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-white">Employee Management</h1>
                  <span className="text-xs text-gray-300">Manage workforce and permissions</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Actions Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-[#e31c79]"
              />
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-[#e31c79] text-white rounded-lg hover:bg-[#c91865] flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Employee
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {employees.filter(e => e.is_active).length}
                </p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Managers</p>
                <p className="text-2xl font-bold text-blue-600">
                  {employees.filter(e => e.role === 'manager').length}
                </p>
              </div>
              <Building2 className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Admins</p>
                <p className="text-2xl font-bold text-purple-600">
                  {employees.filter(e => e.role === 'admin').length}
                </p>
              </div>
              <UserCheck className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Employee Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-[#05202E] text-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {employee.first_name} {employee.last_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {employee.mybase_payroll_id || employee.employee_id || 'No ID'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{employee.email}</div>
                    <div className="text-sm text-gray-500">{employee.phone || 'No phone'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${employee.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        employee.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                        employee.role === 'time_approver' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'}`}>
                      {employee.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${employee.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {employee.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => openEditModal(employee)}
                      className="text-[#e31c79] hover:text-[#c91865] mr-3"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeactivateEmployee(employee.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {showAddModal ? 'Add New Employee' : 'Edit Employee'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                  <input
                    type="text"
                    value={formData.employee_id}
                    onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79]"
                  />
                </div>

                {/* MyBase Payroll ID - Optional */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    MyBase Payroll ID <span className="text-gray-400">(Optional)</span>
  </label>
  <input
  type="text"
  value={formData.mybase_payroll_id || ''}  // Add || '' to handle null/undefined
  onChange={(e) => setFormData({...formData, mybase_payroll_id: e.target.value})}
  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79]"
  placeholder="Leave blank if not needed"
/>
  <p className="text-xs text-gray-600 mt-1">For payroll exports (can be added later)</p>
</div>

                {/* CRITICAL: Time Approver */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time Approver <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.manager_id}
                    onChange={(e) => setFormData({...formData, manager_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79]"
                    required
                  >
                    <option value="">Select Time Approver</option>
                    {managers.map(manager => (
                      <option key={manager.id} value={manager.id}>
                        {manager.first_name} {manager.last_name} 
                        {manager.department ? ` - ${manager.department}` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Timesheets will appear on this approver's dashboard</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({...formData, hourly_rate: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label>
                  <input
                    type="date"
                    value={formData.hire_date}
                    onChange={(e) => setFormData({...formData, hire_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79]"
                  >
                    <option value="">Select State</option>
                    {US_STATES.map(state => (
                      <option key={state.value} value={state.value}>
                        {state.label}
                      </option>
                    ))}
                  </select>
                </div>

                {showAddModal && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Temporary Password *
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79]"
                      placeholder="Min 8 characters"
                    />
                  </div>
                )}

                <div className="col-span-2 flex items-center gap-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                      className="mr-2 text-[#e31c79]"
                    />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_exempt}
                      onChange={(e) => setFormData({...formData, is_exempt: e.target.checked})}
                      className="mr-2 text-[#e31c79]"
                    />
                    <span className="text-sm text-gray-700">Exempt (Salary)</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={showAddModal ? handleAddEmployee : handleUpdateEmployee}
                  className="px-4 py-2 bg-[#e31c79] text-white rounded-lg hover:bg-[#c91865]"
                >
                  {showAddModal ? 'Add Employee' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}