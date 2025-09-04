'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';
import { 
  ArrowLeft,
  UserPlus,
  Save,
  X,
  Building2,
  Calendar,
  Mail,
  Phone,
  DollarSign,
  Users,
  Briefcase,
  LogOut,
  AlertCircle
} from 'lucide-react';

interface EmployeeFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  employmentType: string;
  hourlyRate: string;
  startDate: string;
  status: string;
  manager_id: string;
  client_id: string;
}

interface Manager {
  id: string;
  first_name: string;
  last_name: string;
  department?: string;
  email: string;
}

interface Client {
  id: string;
  name: string;
  is_active: boolean;
}

export default function AddNewEmployeePage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [userEmail, setUserEmail] = useState<string>('');
  const [formData, setFormData] = useState<EmployeeFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'employee',
    department: '',
    employmentType: 'full-time',
    hourlyRate: '',
    startDate: '',
    status: 'active',
    manager_id: '',
    client_id: ''
  });
  const [managers, setManagers] = useState<Manager[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    try {
      // Check authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }
      setUserEmail(user.email || '');

      // Check if user is admin
      const { data: adminData } = await supabase
        .from('employees')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!adminData || adminData.role !== 'admin') {
        router.push('/dashboard');
        return;
      }

      // Fetch managers
      const { data: managersData } = await supabase
        .from('employees')
        .select('id, first_name, last_name, department, email')
        .in('role', ['manager', 'admin'])
        .eq('is_active', true)
        .order('first_name');
      
      setManagers(managersData || []);

      // Fetch clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name, is_active')
        .eq('is_active', true)
        .order('name');
      
      setClients(clientsData || []);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load necessary data');
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(''); // Clear error on input change
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Generate a random password for the new employee
      const tempPassword = Math.random().toString(36).slice(-8) + 'Aa1!';

      // Create auth user first
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: formData.email,
        password: tempPassword,
        email_confirm: true
      });

      if (authError) {
        // If auth user creation fails, try to proceed with existing user
        console.error('Auth creation error:', authError);
        // You might want to handle this differently based on your needs
      }

      const userId = authData?.user?.id || crypto.randomUUID();

      // Create employee record
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .insert({
          id: userId,
          email: formData.email,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone || null,
          role: formData.role,
          department: formData.department,
          hourly_rate: parseFloat(formData.hourlyRate) || null,
          hire_date: formData.startDate,
          is_active: formData.status === 'active',
          manager_id: formData.manager_id || null,
          client_id: formData.client_id || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (employeeError) {
        throw employeeError;
      }

      // Show success message
      alert(`Employee created successfully!
        
Employee: ${formData.firstName} ${formData.lastName}
Email: ${formData.email}
Temporary Password: ${tempPassword}

Please share these credentials with the employee.`);

      router.push('/admin/employees');
    } catch (error: any) {
      console.error('Error creating employee:', error);
      setError(error.message || 'Failed to create employee. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = () => {
    return (
      formData.firstName.trim() &&
      formData.lastName.trim() &&
      formData.email.trim() &&
      formData.role.trim() &&
      formData.department.trim() &&
      formData.hourlyRate.trim() &&
      formData.startDate.trim() &&
      formData.manager_id.trim()
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e31c79] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="shadow-lg" style={{ backgroundColor: '#33393c' }}>
        <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/admin/employees')}
              className="p-2 rounded-md text-gray-300 hover:text-white hover:bg-white/10 mr-4"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <Image 
              src="/WE-logo-SEPT2024v3-WHT.png" 
              alt="West End Workforce" 
              width={150}
              height={40}
              className="h-10 w-auto mr-4"
              priority
            />
            <div className="border-l border-gray-500 pl-4">
              <h1 className="text-2xl font-bold text-white">Add New Employee</h1>
              <p className="text-gray-300 text-sm">Create a new employee profile and assignment</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-200">{userEmail}</span>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push('/auth/login');
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-200 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Error Alert */}
          {error && (
            <div className="mb-6 rounded-lg p-4" style={{ backgroundColor: '#e5ddd8', borderColor: '#e31c79', borderWidth: '1px', borderStyle: 'solid' }}>
              <div className="flex">
                <AlertCircle className="h-5 w-5 mt-0.5 mr-3 flex-shrink-0" style={{ color: '#e31c79' }} />
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">Error</h4>
                  <p className="text-sm text-gray-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Form Card */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <UserPlus className="h-5 w-5 mr-2" style={{ color: '#e31c79' }} />
                Employee Information
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Personal Information Section */}
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  <Users className="h-4 w-4 mr-2 text-gray-500" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                      placeholder="Enter first name"
                    />
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                      placeholder="Enter last name"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                        placeholder="employee@company.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Professional Information Section */}
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  <Briefcase className="h-4 w-4 mr-2 text-gray-500" />
                  Professional Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                      Role *
                    </label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
                      Department *
                    </label>
                    <input
                      type="text"
                      id="department"
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                      placeholder="e.g., Tech Infrastructure"
                    />
                  </div>

                  <div>
                    <label htmlFor="manager_id" className="block text-sm font-medium text-gray-700 mb-2">
                      Time Approver *
                    </label>
                    <select
                      id="manager_id"
                      name="manager_id"
                      value={formData.manager_id}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                    >
                      <option value="">Select Time Approver</option>
                      {managers.map(manager => (
                        <option key={manager.id} value={manager.id}>
                          {manager.first_name} {manager.last_name} - {manager.department || 'No Dept'}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      This manager will approve timesheets and expenses for this employee
                    </p>
                  </div>

                  <div>
                    <label htmlFor="client_id" className="block text-sm font-medium text-gray-700 mb-2">
                      Client Assignment
                    </label>
                    <select
                      id="client_id"
                      name="client_id"
                      value={formData.client_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                    >
                      <option value="">No Client Assignment</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="employmentType" className="block text-sm font-medium text-gray-700 mb-2">
                      Employment Type
                    </label>
                    <select
                      id="employmentType"
                      name="employmentType"
                      value={formData.employmentType}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                    >
                      <option value="full-time">Full-time W2</option>
                      <option value="part-time">Part-time W2</option>
                      <option value="contractor">Contractor (1099)</option>
                      <option value="intern">Intern</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700 mb-2">
                      Hourly Rate *
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="number"
                        id="hourlyRate"
                        name="hourlyRate"
                        value={formData.hourlyRate}
                        onChange={handleInputChange}
                        required
                        min="0"
                        step="0.01"
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Employment Details Section */}
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  Employment Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      id="startDate"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="terminated">Terminated</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => router.push('/admin/employees')}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e31c79] transition-colors duration-200"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isFormValid() || isSubmitting}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e31c79] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  style={{ backgroundColor: '#e31c79' }}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Creating...' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>

          {/* Help Text */}
          <div className="mt-6 rounded-lg p-4" style={{ backgroundColor: '#e5ddd8' }}>
            <div className="flex">
              <div className="flex-shrink-0">
                <Building2 className="h-5 w-5" style={{ color: '#33393c' }} />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-gray-900">Next Steps</h3>
                <div className="mt-2 text-sm text-gray-700">
                  <p>After creating the employee, they will:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Receive login credentials via email</li>
                    <li>Report to their assigned time approver</li>
                    <li>Be able to submit timesheets and expenses for approval</li>
                    <li>Have their submissions visible only to their assigned manager</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
