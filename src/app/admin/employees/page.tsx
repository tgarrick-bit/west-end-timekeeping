'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { useAdminFilter } from '@/contexts/AdminFilterContext';
import ConfirmModal from '@/components/ui/ConfirmModal';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  X,
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
  { value: 'WY', label: 'Wyoming' },
];

// Consistent name format helper: "Last, First Middle" by default
function formatName(
  first?: string,
  middle?: string,
  last?: string,
  style: 'lastFirst' | 'firstLast' = 'lastFirst'
) {
  const safeFirst = first?.trim() || '';
  const safeMiddle = middle?.trim() || '';
  const safeLast = last?.trim() || '';

  if (style === 'firstLast') {
    // "First Middle Last"
    return [safeFirst, safeMiddle, safeLast].filter(Boolean).join(' ');
  }

  // Default: "Last, First Middle"
  const firstPart = [safeFirst, safeMiddle].filter(Boolean).join(' ');
  if (!safeLast) return firstPart || '';
  if (!firstPart) return safeLast;
  return `${safeLast}, ${firstPart}`;
}

interface Employee {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  phone?: string;
  role: string;
  department?: string;
  department_id?: string;
  hire_date?: string;
  hourly_rate?: number;
  bill_rate?: number | null;
  is_active: boolean;
  is_exempt: boolean;
  state?: string;
  employee_id?: string;
  client_id?: string;
  manager_id?: string;
  mybase_payroll_id?: string;
  employee_type?: string;
}

interface ClientOption {
  id: string;
  name: string;
  code: string;
}

interface DepartmentOption {
  id: string;
  name: string;
  code: string | null;
}

interface Manager {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  department?: string;
}

type RoleFilter = 'all' | 'employee' | 'manager' | 'admin';

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [formDepartments, setFormDepartments] = useState<DepartmentOption[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [managerFilter, setManagerFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<'active' | 'inactive' | 'all'>('active');

  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [deactivateTargetId, setDeactivateTargetId] = useState<string | null>(null);
  const [deactivateAction, setDeactivateAction] = useState<'deactivate' | 'reactivate'>('deactivate');

  const { toast } = useToast();
  const supabase = createClient();
  const router = useRouter();
  const { selectedClientId, selectedDepartmentId } = useAdminFilter();

  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'employee', // 'employee' | 'manager' | 'admin'
    department: '',
    department_id: '',
    hire_date: new Date().toISOString().split('T')[0],
    hourly_rate: 0,
    bill_rate: 0,
    is_active: true,
    is_exempt: false,
    state: 'CA',
    employee_id: '',
    mybase_payroll_id: '',
    manager_id: '',
    client_id: '',
    password: '',
    employee_type: '',
  });

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  useEffect(() => {
    filterEmployees();
  }, [employees, searchTerm, roleFilter, managerFilter, activeFilter, selectedClientId, selectedDepartmentId]);

  const checkAuthAndFetch = async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

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
        router.push('/employee');
        return;
      }

      await fetchEmployees();
      await fetchManagers();
      await fetchClients();
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

  const fetchManagers = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, middle_name, last_name, department')
        .in('role', ['manager', 'admin', 'time_approver'])
        .eq('is_active', true)
        .order('last_name');

      if (error) throw error;
      setManagers(data || []);
    } catch (error) {
      console.error('Error fetching managers:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchFormDepartments = async (clientId: string) => {
    const { data, error } = await supabase
      .from('departments')
      .select('id, name, code')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .order('name');
    if (!error && data) setFormDepartments(data);
    else setFormDepartments([]);
  };

  const filterEmployees = () => {
    let filtered = [...employees];

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (emp) =>
          emp.first_name?.toLowerCase().includes(term) ||
          emp.middle_name?.toLowerCase().includes(term) ||
          emp.last_name?.toLowerCase().includes(term) ||
          emp.email?.toLowerCase().includes(term) ||
          emp.employee_id?.toLowerCase().includes(term)
      );
    }

    // Active filter
    if (activeFilter === 'active') {
      filtered = filtered.filter((emp) => emp.is_active !== false);
    } else if (activeFilter === 'inactive') {
      filtered = filtered.filter((emp) => emp.is_active === false);
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter((emp) => emp.role === roleFilter);
    }

    // Manager filter – when a manager is selected, show only employees reporting to them
    if (managerFilter !== 'all') {
      filtered = filtered.filter(
        (emp) =>
          emp.role === 'employee' && emp.manager_id === managerFilter
      );
    }

    // Admin nav client filter
    if (selectedClientId) {
      filtered = filtered.filter((emp) => emp.client_id === selectedClientId);
    }

    // Admin nav department filter
    if (selectedDepartmentId) {
      filtered = filtered.filter((emp) => emp.department_id === selectedDepartmentId);
    }

    // Always sort alphabetically by last, then first, then middle
    filtered.sort((a, b) => {
      const aLast = a.last_name || '';
      const bLast = b.last_name || '';
      const lastCmp = aLast.localeCompare(bLast);
      if (lastCmp !== 0) return lastCmp;

      const aFirst = a.first_name || '';
      const bFirst = b.first_name || '';
      const firstCmp = aFirst.localeCompare(bFirst);
      if (firstCmp !== 0) return firstCmp;

      const aMiddle = a.middle_name || '';
      const bMiddle = b.middle_name || '';
      return aMiddle.localeCompare(bMiddle);
    });

    setFilteredEmployees(filtered);
  };

  // Create employee via API
  const handleAddEmployee = async () => {
    setIsCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const isEmployee = formData.role === 'employee';

      // Basic required fields
      if (
        !formData.email ||
        !formData.first_name ||
        !formData.last_name ||
        !formData.password ||
        (isEmployee && !formData.manager_id)
      ) {
        let message = 'Please fill in all required fields.';

        if (isEmployee && !formData.manager_id) {
          message =
            'Please fill in all required fields, including Time Approver, for employees.';
        }

        setError(message);
        setIsCreating(false);
        return;
      }

      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        setIsCreating(false);
        return;
      }

      const response = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.first_name,
          middleName: formData.middle_name || null,
          lastName: formData.last_name,
          role: formData.role || 'employee',
          department: formData.department || null,
          managerId: isEmployee ? formData.manager_id : null,
          clientId: formData.role !== 'admin' ? formData.client_id || null : null,
          departmentId: formData.role !== 'admin' ? formData.department_id || null : null,
          hourlyRate: isEmployee ? formData.hourly_rate || null : null,
          billRate: isEmployee ? formData.bill_rate || null : null,
          employeeId: formData.employee_id || null,
          mybasePayrollId: formData.mybase_payroll_id,
          hireDate: formData.hire_date || null,
          state: formData.state || null,
          isActive: formData.is_active,
          isExempt: formData.is_exempt,
          employeeType: formData.employee_type || null,
        }),
      });

      const data = await response.json();
      console.log('API Response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create employee');
      }

      setSuccess(
        `Employee "${formatName(
          formData.first_name,
          formData.middle_name,
          formData.last_name
        )}" created successfully!`
      );

      await fetchEmployees();

      setTimeout(() => {
        setShowAddModal(false);
        resetForm();
        setSuccess(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error adding employee:', error);
      setError(error?.message || 'Failed to create employee');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateEmployee = async () => {
    if (!selectedEmployee) return;

    try {
      const updateData: any = { ...formData };
      delete updateData.password;

      // Convert empty strings to null for UUID fields
      const uuidFields = ['manager_id', 'client_id', 'department_id'];
      for (const field of uuidFields) {
        if (updateData[field] === '') updateData[field] = null;
      }

      // Admins don't get client/department/manager/rates
      if (formData.role === 'admin') {
        updateData.hourly_rate = null;
        updateData.bill_rate = null;
        updateData.manager_id = null;
        updateData.client_id = null;
        updateData.department_id = null;
      }
      // Managers get client + department but not manager_id or rates
      if (formData.role === 'manager' || formData.role === 'time_approver') {
        updateData.hourly_rate = null;
        updateData.bill_rate = null;
        updateData.manager_id = null;
      }

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
      toast('error', `Error: ${error.message}`);
    }
  };

  const promptDeactivateEmployee = (id: string) => {
    setDeactivateTargetId(id);
    setDeactivateAction('deactivate');
    setDeactivateModalOpen(true);
  };

  const handleDeactivateEmployee = async () => {
    if (!deactivateTargetId) return;
    try {
      const { error } = await supabase
        .from('employees')
        .update({ is_active: false })
        .eq('id', deactivateTargetId);

      if (error) throw error;
      toast('success', 'Employee deactivated.');
      fetchEmployees();
    } catch (error) {
      console.error('Error deactivating employee:', error);
      toast('error', 'Error deactivating employee.');
    } finally {
      setDeactivateModalOpen(false);
      setDeactivateTargetId(null);
    }
  };

  const promptReactivateEmployee = (id: string) => {
    setDeactivateTargetId(id);
    setDeactivateAction('reactivate');
    setDeactivateModalOpen(true);
  };

  const handleReactivateEmployee = async () => {
    if (!deactivateTargetId) return;
    try {
      const { error } = await supabase
        .from('employees')
        .update({ is_active: true })
        .eq('id', deactivateTargetId);

      if (error) throw error;
      toast('success', 'Employee reactivated.');
      fetchEmployees();
    } catch (error) {
      console.error('Error reactivating employee:', error);
      toast('error', 'Error reactivating employee.');
    } finally {
      setDeactivateModalOpen(false);
      setDeactivateTargetId(null);
    }
  };

  const openEditModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      first_name: employee.first_name || '',
      middle_name: employee.middle_name || '',
      last_name: employee.last_name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      role: employee.role || 'employee',
      department: employee.department || '',
      department_id: employee.department_id || '',
      hire_date: employee.hire_date || '',
      hourly_rate: employee.hourly_rate || 0,
      bill_rate: employee.bill_rate || 0,
      is_active: employee.is_active !== false,
      is_exempt: employee.is_exempt || false,
      state: employee.state || 'CA',
      employee_id: employee.employee_id || '',
      mybase_payroll_id: employee.mybase_payroll_id || '',
      manager_id: employee.manager_id || '',
      client_id: employee.client_id || '',
      password: '',
      employee_type: employee.employee_type || '',
    });
    if (employee.client_id) fetchFormDepartments(employee.client_id);
    else setFormDepartments([]);
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      middle_name: '',
      last_name: '',
      email: '',
      phone: '',
      role: 'employee',
      department: '',
      department_id: '',
      hire_date: new Date().toISOString().split('T')[0],
      hourly_rate: 0,
      bill_rate: 0,
      is_active: true,
      is_exempt: false,
      state: 'CA',
      employee_id: '',
      mybase_payroll_id: '',
      manager_id: '',
      client_id: '',
      password: '',
      employee_type: '',
    });
  };

  const getManagerName = (employee: Employee) => {
    if (!employee.manager_id) return '—';
    const manager = managers.find((m) => m.id === employee.manager_id);
    if (!manager) return '—';
    return formatName(manager.first_name, manager.middle_name, manager.last_name);
  };

  // Skeleton loading state — premium shimmer instead of spinner
  if (loading) {
    return (
      <div style={{ padding: '36px 40px' }}>
        {/* Title skeleton */}
        <div style={{ marginBottom: 28 }}>
          <div className="anim-shimmer" style={{ width: 140, height: 20, borderRadius: 4, marginBottom: 8 }} />
          <div className="anim-shimmer" style={{ width: 260, height: 12, borderRadius: 3 }} />
        </div>
        {/* Stat cards skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
          {[0,1,2,3].map((i) => (
            <div key={i} className={`anim-slide-up stagger-${i+1}`} style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '22px 24px' }}>
              <div className="anim-shimmer" style={{ width: 60, height: 8, borderRadius: 3, marginBottom: 14 }} />
              <div className="anim-shimmer" style={{ width: 48, height: 24, borderRadius: 4 }} />
            </div>
          ))}
        </div>
        {/* Search bar skeleton */}
        <div style={{ marginBottom: 16 }}>
          <div className="anim-shimmer" style={{ width: 120, height: 8, borderRadius: 3, marginBottom: 14 }} />
          <div className="anim-shimmer" style={{ width: '100%', height: 36, borderRadius: 7 }} />
        </div>
        {/* Table skeleton */}
        <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
          {[0,1,2,3,4,5].map((i) => (
            <div key={i} className="flex items-center gap-4" style={{ padding: '14px 20px', borderBottom: i < 5 ? '0.5px solid #f5f2ee' : 'none' }}>
              <div className="flex-1">
                <div className="anim-shimmer" style={{ width: '30%', height: 10, borderRadius: 3, marginBottom: 6 }} />
                <div className="anim-shimmer" style={{ width: '50%', height: 8, borderRadius: 3 }} />
              </div>
              <div className="anim-shimmer" style={{ width: 50, height: 18, borderRadius: 3 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Total Employees', value: employees.length, accent: true },
    { label: 'Active', value: employees.filter((e) => e.is_active).length },
    { label: 'Managers', value: employees.filter((e) => e.role === 'manager').length },
    { label: 'Admins', value: employees.filter((e) => e.role === 'admin').length },
  ];

  return (
    <>
      {/* Page content */}
      <div style={{ padding: '36px 40px' }}>
        {/* Page title */}
        <div className="anim-slide-up stagger-1" style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: 0, letterSpacing: -0.3 }}>
            Employees
          </h1>
          <p style={{ fontSize: 13, fontWeight: 400, color: '#999', margin: '4px 0 0' }}>
            Manage employee accounts, roles, and pay rates.
          </p>
        </div>

        {/* Stats — staggered entrance */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`anim-slide-up stagger-${i + 1}`}
              style={{
                background: '#fff',
                border: '0.5px solid #e8e4df',
                borderRadius: 10,
                padding: '22px 24px',
                transition: 'border-color 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = stat.accent ? '#e31c79' : '#d3ad6b')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e8e4df')}
            >
              <p style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1.2, color: '#c0bab2', margin: 0 }}>
                {stat.label}
              </p>
              <p style={{ fontSize: 28, fontWeight: 700, color: stat.accent ? '#e31c79' : '#1a1a1a', margin: '6px 0 0', lineHeight: 1, letterSpacing: -0.5 }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Section header + search/actions */}
        <div className="anim-slide-up stagger-3" style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase', margin: '0 0 12px' }}>
            Employee Directory
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <div className="relative" style={{ flex: 1, maxWidth: 320 }}>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: '#c0bab2' }} />
                <input
                  type="text"
                  placeholder="Search by name, email, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px 8px 36px', fontSize: 12,
                    border: '0.5px solid #e8e4df', borderRadius: 7, outline: 'none',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#d3ad6b'; e.target.style.boxShadow = '0 0 0 3px rgba(211,173,107,0.08)'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#e8e4df'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
                style={{ fontSize: 12, padding: '8px 10px', border: '0.5px solid #e8e4df', borderRadius: 7, background: '#fff', color: '#777', outline: 'none', cursor: 'pointer' }}
              >
                <option value="all">All roles</option>
                <option value="employee">Employees</option>
                <option value="manager">Managers</option>
                <option value="admin">Admins</option>
              </select>
              <select
                value={managerFilter}
                onChange={(e) => setManagerFilter(e.target.value)}
                style={{ fontSize: 12, padding: '8px 10px', border: '0.5px solid #e8e4df', borderRadius: 7, background: '#fff', color: '#777', outline: 'none', cursor: 'pointer' }}
              >
                <option value="all">All managers</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {formatName(m.first_name, m.middle_name, m.last_name)}
                  </option>
                ))}
              </select>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as 'active' | 'inactive' | 'all')}
                style={{ fontSize: 12, padding: '8px 10px', border: '0.5px solid #e8e4df', borderRadius: 7, background: '#fff', color: '#777', outline: 'none', cursor: 'pointer' }}
              >
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
                <option value="all">All statuses</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, color: '#c0bab2', fontWeight: 500 }}>
                {filteredEmployees.length} of {employees.length}
              </span>
              <button
                onClick={() => { fetchManagers(); fetchClients(); setShowAddModal(true); }}
                className="transition-all duration-150"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 18px', fontSize: 12, fontWeight: 600,
                  background: '#e31c79', color: '#fff',
                  border: 'none', borderRadius: 7, cursor: 'pointer',
                  letterSpacing: 0.2,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#cc1069'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#e31c79'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Employee
              </button>
            </div>
          </div>
        </div>

        {/* Employee Table */}
        <div className="anim-slide-up stagger-4" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Employee', 'Contact', 'Role', 'Manager', 'Status', ''].map((h, i) => (
                  <th key={h || 'actions'} style={{
                    padding: '11px 20px', textAlign: i === 5 ? 'right' as const : 'left' as const,
                    fontSize: 9, fontWeight: 500, letterSpacing: 1.2, color: '#c0bab2',
                    textTransform: 'uppercase', borderBottom: '0.5px solid #f0ece7',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredEmployees.map((employee) => (
                <tr
                  key={employee.id}
                  className="group"
                  style={{
                    borderBottom: '0.5px solid #f5f2ee', cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#FDFCFB')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => openEditModal(employee)}
                >
                  {/* Employee name */}
                  <td style={{ padding: '12px 20px' }}>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: '#1a1a1a' }}>
                        {formatName(employee.first_name, employee.middle_name, employee.last_name)}
                      </div>
                      <div style={{ fontSize: 10.5, color: '#c0bab2', marginTop: 1 }}>
                        {employee.mybase_payroll_id || employee.employee_id || 'No ID'}
                      </div>
                    </div>
                  </td>
                  {/* Contact */}
                  <td style={{ padding: '12px 20px' }}>
                    <div style={{ fontSize: 12.5, color: '#555' }}>{employee.email}</div>
                    <div style={{ fontSize: 10.5, color: '#c0bab2', marginTop: 1 }}>
                      {employee.phone || '—'}
                    </div>
                  </td>
                  {/* Role badge */}
                  <td style={{ padding: '12px 20px' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', fontSize: 9, fontWeight: 500, borderRadius: 3,
                      ...(employee.role === 'admin'
                        ? { background: '#f3f0ff', color: '#7c5cbf' }
                        : employee.role === 'manager'
                        ? { background: '#eef6ff', color: '#4a8fd4' }
                        : employee.role === 'time_approver'
                        ? { background: '#fff8ee', color: '#c08830' }
                        : { background: '#f5f5f3', color: '#999' }),
                    }}>
                      {employee.role === 'time_approver' ? 'approver' : employee.role}
                    </span>
                  </td>
                  {/* Manager */}
                  <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#777' }}>
                    {getManagerName(employee)}
                  </td>
                  {/* Status */}
                  <td style={{ padding: '12px 20px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 8px', fontSize: 9, fontWeight: 500, borderRadius: 3,
                      ...(employee.is_active
                        ? { background: '#ecfdf5', color: '#2d9b6e' }
                        : { background: '#fef2f2', color: '#b91c1c' }),
                    }}>
                      <span style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: employee.is_active ? '#2d9b6e' : '#b91c1c',
                      }} />
                      {employee.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {/* Actions */}
                  <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditModal(employee); }}
                        className="transition-colors duration-150"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: 6, borderRadius: 4 }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#e31c79'; e.currentTarget.style.background = '#fdf2f8'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#ccc'; e.currentTarget.style.background = 'none'; }}
                      >
                        <Edit size={13} strokeWidth={1.5} />
                      </button>
                      {employee.is_active ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); promptDeactivateEmployee(employee.id); }}
                          className="transition-colors duration-150"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: 6, borderRadius: 4 }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#b91c1c'; e.currentTarget.style.background = '#fef2f2'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = '#ccc'; e.currentTarget.style.background = 'none'; }}
                        >
                          <Trash2 size={13} strokeWidth={1.5} />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); promptReactivateEmployee(employee.id); }}
                          className="transition-colors duration-150"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: '4px 10px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#2d9b6e'; e.currentTarget.style.background = '#ecfdf5'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = '#ccc'; e.currentTarget.style.background = 'none'; }}
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {/* Empty state */}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div style={{ width: 44, height: 44, borderRadius: '50%', border: '0.5px solid #e8e4df', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                        <Search size={18} strokeWidth={1.5} style={{ color: '#d0cbc4' }} />
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#999', margin: 0 }}>No employees found</p>
                      <p style={{ fontSize: 11, color: '#ccc', margin: '4px 0 0' }}>Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal — with backdrop blur + scale entrance */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}>
          <div className="anim-scale-in" style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #e8e4df', maxWidth: 640, width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: '14px 22px', borderBottom: '0.5px solid #f0ece7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
                {showAddModal ? 'Add New Employee' : 'Edit Employee'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#999' }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6">
              {(error || success) && (
                <div style={{ marginBottom: 16 }}>
                  {error && (
                    <div style={{ background: '#fef2f2', border: '0.5px solid #e8e4df', borderRadius: 7, padding: '8px 16px', fontSize: 12, color: '#b91c1c' }}>
                      {error}
                    </div>
                  )}
                  {success && (
                    <div style={{ background: '#ecfdf5', border: '0.5px solid #e8e4df', borderRadius: 7, padding: '8px 16px', fontSize: 12, color: '#2d9b6e' }}>
                      {success}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* First / Middle / Last Name */}
                <div className="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* First Name */}
                  <div>
                    <label className="block text-sm font-medium text-[#555] mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          first_name: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-[#e8e4df] rounded-md focus:outline-none focus:ring-1 focus:ring-[#d3ad6b] focus:border-[#d3ad6b]"
                    />
                  </div>

                  {/* Middle Name */}
                  <div>
                    <label className="block text-sm font-medium text-[#555] mb-1">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      value={formData.middle_name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          middle_name: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-[#e8e4df] rounded-md focus:outline-none focus:ring-1 focus:ring-[#d3ad6b] focus:border-[#d3ad6b]"
                    />
                  </div>

                  {/* Last Name */}
                  <div>
                    <label className="block text-sm font-medium text-[#555] mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          last_name: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-[#e8e4df] rounded-md focus:outline-none focus:ring-1 focus:ring-[#d3ad6b] focus:border-[#d3ad6b]"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-[#555] mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        email: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-[#e8e4df] rounded-md focus:outline-none focus:ring-1 focus:ring-[#d3ad6b] focus:border-[#d3ad6b]"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-[#555] mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        phone: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-[#e8e4df] rounded-md focus:outline-none focus:ring-1 focus:ring-[#d3ad6b] focus:border-[#d3ad6b]"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-[#555] mb-1">
                    Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        role: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-[#e8e4df] rounded-md focus:outline-none focus:ring-1 focus:ring-[#d3ad6b] focus:border-[#d3ad6b]"
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager / Time Approver</option>
                    <option value="admin">Admin</option>
                  </select>
                  <p className="text-xs text-[#999] mt-1">
                    Managers and admins do not require pay rates or IDs.
                  </p>
                </div>

                {/* --- ORGANIZATIONAL --- */}

                {/* Client – for employees and managers */}
                {formData.role !== 'admin' && (
                  <div>
                    <label className="block text-sm font-medium text-[#555] mb-1">
                      Client
                    </label>
                    <select
                      value={formData.client_id}
                      onChange={(e) => {
                        const newClientId = e.target.value;
                        setFormData({
                          ...formData,
                          client_id: newClientId,
                          department_id: '', // Reset department when client changes
                        });
                        if (newClientId) fetchFormDepartments(newClientId);
                        else setFormDepartments([]);
                      }}
                      className="w-full px-3 py-2 border border-[#e8e4df] rounded-md focus:outline-none focus:ring-1 focus:ring-[#d3ad6b] focus:border-[#d3ad6b]"
                    >
                      <option value="">No Client Assigned</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name} ({client.code})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-[#999] mt-1">
                      Which client company this employee works for
                    </p>
                  </div>
                )}

                {/* Department – for employees and managers with a client that has departments */}
                {formData.role !== 'admin' && formData.client_id && formDepartments.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-[#555] mb-1">
                      Department
                    </label>
                    <select
                      value={formData.department_id}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          department_id: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-[#e8e4df] rounded-md focus:outline-none focus:ring-1 focus:ring-[#d3ad6b] focus:border-[#d3ad6b]"
                    >
                      <option value="">No Department</option>
                      {formDepartments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}{dept.code ? ` (${dept.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* --- REPORTING --- */}

                {/* Time Approver – employees only */}
                {formData.role === 'employee' && (
                  <div>
                    <label className="block text-sm font-medium text-[#555] mb-1">
                      Time Approver <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.manager_id}
                      onChange={(e) =>
                        setFormData({ ...formData, manager_id: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-[#e8e4df] rounded-md focus:outline-none focus:ring-1 focus:ring-[#d3ad6b] focus:border-[#d3ad6b]"
                      required
                    >
                      <option value="">Select Time Approver</option>
                      {managers.map((manager) => (
                        <option key={manager.id} value={manager.id}>
                          {formatName(manager.first_name, manager.middle_name, manager.last_name)}
                          {manager.department ? ` - ${manager.department}` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-[#999] mt-1">
                      Timesheets will appear on this approver&apos;s dashboard
                    </p>
                  </div>
                )}

                {/* --- EMPLOYMENT DETAILS --- */}

                {/* Employee Type – employees and managers */}
                {formData.role !== 'admin' && (
                  <div>
                    <label className="block text-sm font-medium text-[#555] mb-1">
                      Employee Type
                    </label>
                    <select
                      value={formData.employee_type}
                      onChange={(e) =>
                        setFormData({ ...formData, employee_type: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-[#e8e4df] rounded-md focus:outline-none focus:ring-1 focus:ring-[#d3ad6b] focus:border-[#d3ad6b]"
                    >
                      <option value="">Select type...</option>
                      <option value="WE">WE (West End)</option>
                      <option value="MBP">MBP</option>
                      <option value="CNDH">CNDH</option>
                      <option value="CNDC">CNDC</option>
                    </select>
                    <p className="text-xs text-[#999] mt-1">
                      Used for reporting and consultant stratification
                    </p>
                  </div>
                )}

                {/* Employee ID – employees only */}
                {formData.role === 'employee' && (
                  <div>
                    <label className="block text-sm font-medium text-[#555] mb-1">
                      Employee ID
                    </label>
                    <input
                      type="text"
                      value={formData.employee_id}
                      onChange={(e) =>
                        setFormData({ ...formData, employee_id: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-[#e8e4df] rounded-md focus:outline-none focus:ring-1 focus:ring-[#d3ad6b] focus:border-[#d3ad6b]"
                      placeholder="Badge or ID number"
                    />
                  </div>
                )}

                {/* Hire Date – employees and managers */}
                {formData.role !== 'admin' && (
                  <div>
                    <label className="block text-sm font-medium text-[#555] mb-1">
                      Hire Date
                    </label>
                    <input
                      type="date"
                      value={formData.hire_date}
                      onChange={(e) =>
                        setFormData({ ...formData, hire_date: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-[#e8e4df] rounded-md focus:outline-none focus:ring-1 focus:ring-[#d3ad6b] focus:border-[#d3ad6b]"
                    />
                  </div>
                )}

                {/* --- COMPENSATION (employees only) --- */}
                {formData.role === 'employee' && (
                  <>
                    {/* State – for OT rules */}
                    <div>
                      <label className="block text-sm font-medium text-[#555] mb-1">
                        State
                      </label>
                      <select
                        value={formData.state}
                        onChange={(e) =>
                          setFormData({ ...formData, state: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-[#e8e4df] rounded-md focus:outline-none focus:ring-1 focus:ring-[#d3ad6b] focus:border-[#d3ad6b]"
                      >
                        <option value="">Select State</option>
                        {US_STATES.map((state) => (
                          <option key={state.value} value={state.value}>
                            {state.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-[#999] mt-1">
                        Used for overtime calculation rules
                      </p>
                    </div>

                    {/* Hourly Rate */}
                    <div>
                      <label className="block text-sm font-medium text-[#555] mb-1">
                        Hourly Rate
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.hourly_rate}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData({
                            ...formData,
                            hourly_rate: value === '' ? 0 : parseFloat(value),
                          });
                        }}
                        className="w-full px-3 py-2 border border-[#e8e4df] rounded-md focus:outline-none focus:ring-1 focus:ring-[#d3ad6b] focus:border-[#d3ad6b]"
                      />
                    </div>

                    {/* Bill Rate */}
                    <div>
                      <label className="block text-sm font-medium text-[#555] mb-1">
                        Bill Rate
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.bill_rate}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData({
                            ...formData,
                            bill_rate: value === '' ? 0 : parseFloat(value),
                          });
                        }}
                        className="w-full px-3 py-2 border border-[#e8e4df] rounded-md focus:outline-none focus:ring-1 focus:ring-[#d3ad6b] focus:border-[#d3ad6b]"
                      />
                      <p className="text-xs text-[#777] mt-1">
                        Rate charged to client for this employee
                      </p>
                    </div>

                    {/* MyBase Payroll ID */}
                    <div>
                      <label className="block text-sm font-medium text-[#555] mb-1">
                        MyBase Payroll ID <span className="text-[#bbb]">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.mybase_payroll_id || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, mybase_payroll_id: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-[#e8e4df] rounded-md focus:outline-none focus:ring-1 focus:ring-[#d3ad6b] focus:border-[#d3ad6b]"
                        placeholder="For payroll exports"
                      />
                    </div>
                  </>
                )}

                {/* Temp Password (add mode only) */}
                {showAddModal && (
                  <div>
                    <label className="block text-sm font-medium text-[#555] mb-1">
                      Temporary Password *
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          password: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-[#e8e4df] rounded-md focus:outline-none focus:ring-1 focus:ring-[#d3ad6b] focus:border-[#d3ad6b]"
                      placeholder="Min 6 characters"
                    />
                  </div>
                )}

                {/* Status + Exempt */}
                <div className="col-span-2 flex items-center gap-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_active: e.target.checked,
                        })
                      }
                      className="mr-2 text-[#e31c79]"
                    />
                    <span className="text-sm text-[#555]">
                      Active
                    </span>
                  </label>
                  {formData.role === 'employee' && (
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_exempt}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            is_exempt: e.target.checked,
                          })
                        }
                        className="mr-2 text-[#e31c79]"
                      />
                      <span className="text-sm text-[#555]">
                        Exempt (Salary — no overtime)
                      </span>
                    </label>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  style={{ padding: '7px 16px', fontSize: 12, fontWeight: 500, background: '#fff', border: '0.5px solid #e0dcd7', borderRadius: 7, color: '#777', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={
                    showAddModal
                      ? handleAddEmployee
                      : handleUpdateEmployee
                  }
                  disabled={isCreating}
                  style={{ padding: '7px 16px', fontSize: 12, fontWeight: 500, background: '#e31c79', border: 'none', borderRadius: 7, color: '#fff', cursor: 'pointer', opacity: isCreating ? 0.6 : 1 }}
                  onMouseEnter={(e) => { if (!isCreating) e.currentTarget.style.background = '#cc1069'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#e31c79'; }}
                >
                  {showAddModal
                    ? isCreating
                      ? 'Adding...'
                      : 'Add Employee'
                    : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate/Reactivate confirm modal */}
      <ConfirmModal
        open={deactivateModalOpen}
        title={deactivateAction === 'deactivate' ? 'Deactivate Employee' : 'Reactivate Employee'}
        message={deactivateAction === 'deactivate'
          ? 'Are you sure you want to deactivate this employee? They will no longer be able to log in.'
          : 'Are you sure you want to reactivate this employee?'}
        confirmLabel={deactivateAction === 'deactivate' ? 'Deactivate' : 'Reactivate'}
        variant={deactivateAction === 'deactivate' ? 'danger' : 'primary'}
        onConfirm={deactivateAction === 'deactivate' ? handleDeactivateEmployee : handleReactivateEmployee}
        onCancel={() => { setDeactivateModalOpen(false); setDeactivateTargetId(null); }}
      />
    </>
  );
}
