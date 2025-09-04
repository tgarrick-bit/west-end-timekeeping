'use client';

// src/app/manager/page.tsx

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Clock, 
  FileText, 
  Receipt, 
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Calendar,
  Eye,
  Check,
  X,
  Filter,
  Download,
  DollarSign,
  Briefcase,
  LogOut,
  Search,
  ChevronDown,
  Image as ImageIcon,
  Paperclip,
  User,
  MapPin,
  Building,
  CreditCard
} from 'lucide-react';

// Define types inline
interface Employee {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  department?: string;
  role: string;
  hourly_rate?: number;
  is_active: boolean;
  manager_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface TimecardDetail {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  employee_department?: string;
  week_ending: string;
  total_hours: number;
  total_overtime: number;
  total_amount: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_at: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  notes?: string;
  entries?: TimecardEntry[];
}

interface TimecardEntry {
  id: string;
  date: string;
  project_id: string;
  project_name: string;
  project_code: string;
  hours: number;
  overtime_hours: number;
  description: string;
}

interface ExpenseDetail {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  employee_department?: string;
  expense_date: string;
  amount: number;
  category: string;
  description: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_at: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  receipt_urls: string[];
  project_id?: string;
  project_name?: string;
  vendor?: string;
  payment_method?: string;
  notes?: string;
}

interface FilterOptions {
  dateRange: 'all' | 'today' | 'week' | 'month' | 'custom';
  type: 'all' | 'timecards' | 'expenses';
  status: 'all' | 'submitted' | 'approved' | 'rejected';
  employee: string;
  project: string;
  department: string;
  customStartDate?: string;
  customEndDate?: string;
}

interface Project {
  id: string;
  name: string;
  code: string;
  client?: string;
}

export default function ManagerDashboard() {
  const [manager, setManager] = useState<Employee | null>(null);
  const [timecards, setTimecards] = useState<TimecardDetail[]>([]);
  const [expenses, setExpenses] = useState<ExpenseDetail[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedItem, setSelectedItem] = useState<TimecardDetail | ExpenseDetail | null>(null);
  const [itemType, setItemType] = useState<'timecard' | 'expense' | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: 'week',
    type: 'all',
    status: 'submitted',
    employee: 'all',
    project: 'all',
    department: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState({
    pendingTimecards: 0,
    pendingExpenses: 0,
    totalTeamMembers: 0,
    weeklyHours: 0,
    approvedThisWeek: 0,
    rejectedThisWeek: 0,
    totalPendingAmount: 0,
    overtimeAlerts: 0
  });
  const [roleCheckComplete, setRoleCheckComplete] = useState(false);

  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    fetchDashboardData();
  }, [filters]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get current manager
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Get manager data
      const { data: managerData } = await supabase
        .from('employees')
        .select('*')
        .eq('id', user.id)
        .single();

      if (managerData) {
        setManager(managerData);
        
        // Check role
        if (managerData.role !== 'manager' && managerData.role !== 'admin') {
          router.push('/dashboard');
          return;
        }
        setRoleCheckComplete(true);
      }

      // CRITICAL CHANGE: Only fetch employees this manager supervises
      let employeesQuery = supabase
        .from('employees')
        .select('*')
        .eq('is_active', true);
      
      // If manager role, only show their assigned employees
      if (managerData?.role === 'manager') {
        employeesQuery = employeesQuery.eq('manager_id', user.id);
      }
      // If admin, show all employees (no additional filter needed)
      
      const { data: employeesData } = await employeesQuery;
      setEmployees(employeesData || []);
      
      // Get the IDs of employees this manager can see
      const managedEmployeeIds = employeesData?.map(emp => emp.id) || [];

      // Fetch projects (all managers can see all projects)
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .eq('status', 'active');
      
      setProjects(projectsData || []);

      // Build date filter
      let dateFilter = {};
      const now = new Date();
      switch (filters.dateRange) {
        case 'today':
          dateFilter = { start: now.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateFilter = { start: weekAgo.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          dateFilter = { start: monthAgo.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
          break;
        case 'custom':
          if (filters.customStartDate && filters.customEndDate) {
            dateFilter = { start: filters.customStartDate, end: filters.customEndDate };
          }
          break;
      }

      // Fetch timecards - only for managed employees
      let fetchedTimecards: TimecardDetail[] = [];
      if (filters.type === 'all' || filters.type === 'timecards') {
        let timecardsQuery = supabase
          .from('timesheets')
          .select(`
            *,
            employees!timesheets_employee_id_fkey (
              id,
              first_name,
              last_name,
              email,
              department
            )
          `);

        // CRITICAL: Filter by managed employees
        if (managedEmployeeIds.length > 0) {
          timecardsQuery = timecardsQuery.in('employee_id', managedEmployeeIds);
        } else {
          // If no managed employees, return empty results
          fetchedTimecards = [];
        }

        if (filters.status !== 'all') {
          timecardsQuery = timecardsQuery.eq('status', filters.status);
        }
        if (filters.employee !== 'all' && managedEmployeeIds.includes(filters.employee)) {
          timecardsQuery = timecardsQuery.eq('employee_id', filters.employee);
        }

        const { data: timecardsData, error: timecardsError } = await timecardsQuery;

        if (!timecardsError && timecardsData) {
          fetchedTimecards = timecardsData.map(tc => ({
            id: tc.id,
            employee_id: tc.employee_id,
            employee_name: tc.employees ? `${tc.employees.first_name} ${tc.employees.last_name}` : 'Unknown',
            employee_email: tc.employees?.email || '',
            employee_department: tc.employees?.department,
            week_ending: tc.week_ending,
            total_hours: tc.total_hours || 0,
            total_overtime: 0,
            total_amount: (tc.total_hours || 0) * (tc.employees?.hourly_rate || 25),
            status: tc.status,
            submitted_at: tc.submitted_at,
            approved_at: tc.approved_at,
            approved_by: tc.approved_by,
            notes: tc.comments
          }));
          setTimecards(fetchedTimecards);
        }
      }

      // Fetch expenses - only for managed employees
      let fetchedExpenses: ExpenseDetail[] = [];
      if (filters.type === 'all' || filters.type === 'expenses') {
        let expensesQuery = supabase
          .from('expenses')
          .select(`
            *,
            employees!expenses_employee_id_fkey (
              id,
              first_name,
              last_name,
              email,
              department
            ),
            projects!expenses_project_id_fkey (
              id,
              name,
              code
            )
          `);

        // CRITICAL: Filter by managed employees
        if (managedEmployeeIds.length > 0) {
          expensesQuery = expensesQuery.in('employee_id', managedEmployeeIds);
        } else {
          // If no managed employees, return empty results
          fetchedExpenses = [];
        }

        if (filters.status !== 'all') {
          expensesQuery = expensesQuery.eq('status', filters.status);
        }
        if (filters.employee !== 'all' && managedEmployeeIds.includes(filters.employee)) {
          expensesQuery = expensesQuery.eq('employee_id', filters.employee);
        }
        if (filters.project !== 'all') {
          expensesQuery = expensesQuery.eq('project_id', filters.project);
        }

        const { data: expensesData, error: expensesError } = await expensesQuery;

        if (!expensesError && expensesData) {
          fetchedExpenses = expensesData.map(exp => ({
            id: exp.id,
            employee_id: exp.employee_id,
            employee_name: exp.employees ? `${exp.employees.first_name} ${exp.employees.last_name}` : 'Unknown',
            employee_email: exp.employees?.email || '',
            employee_department: exp.employees?.department,
            expense_date: exp.expense_date,
            amount: exp.amount,
            category: exp.category,
            description: exp.description || '',
            status: exp.status,
            submitted_at: exp.submitted_at,
            approved_at: exp.approved_at,
            approved_by: exp.approved_by,
            receipt_urls: exp.receipt_url ? [exp.receipt_url] : [],
            project_id: exp.project_id,
            project_name: exp.projects?.name,
            notes: exp.comments
          }));
          setExpenses(fetchedExpenses);
        }
      }

      // Calculate stats with fetched data
      const pendingTimecards = fetchedTimecards.filter(t => t.status === 'submitted').length;
      const pendingExpenses = fetchedExpenses.filter(e => e.status === 'submitted').length;
      const weeklyHours = fetchedTimecards.reduce((sum, t) => sum + t.total_hours, 0);
      const totalPendingAmount = 
        fetchedTimecards.filter(t => t.status === 'submitted').reduce((sum, t) => sum + t.total_amount, 0) +
        fetchedExpenses.filter(e => e.status === 'submitted').reduce((sum, e) => sum + e.amount, 0);
      const overtimeAlerts = fetchedTimecards.filter(t => t.total_overtime > 0).length;
      const approvedThisWeek = 
        fetchedTimecards.filter(t => t.status === 'approved').length +
        fetchedExpenses.filter(e => e.status === 'approved').length;
      const rejectedThisWeek = 
        fetchedTimecards.filter(t => t.status === 'rejected').length +
        fetchedExpenses.filter(e => e.status === 'rejected').length;

      setStats({
        pendingTimecards,
        pendingExpenses,
        totalTeamMembers: managedEmployeeIds.length,
        weeklyHours,
        approvedThisWeek,
        rejectedThisWeek,
        totalPendingAmount,
        overtimeAlerts
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string, type: 'timecard' | 'expense') => {
    setProcessing(true);
    try {
      const table = type === 'timecard' ? 'timesheets' : 'expenses';
      const { error } = await supabase
        .from(table)
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: manager?.id
        })
        .eq('id', id);

      if (!error) {
        await fetchDashboardData();
        setSelectedItem(null);
      }
    } catch (error) {
      console.error('Error approving:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (id: string, type: 'timecard' | 'expense', reason?: string) => {
    setProcessing(true);
    try {
      const table = type === 'timecard' ? 'timesheets' : 'expenses';
      const { error } = await supabase
        .from(table)
        .update({ 
          status: 'rejected',
          approved_at: new Date().toISOString(),
          approved_by: manager?.id,
          comments: reason
        })
        .eq('id', id);

      if (!error) {
        await fetchDashboardData();
        setSelectedItem(null);
      }
    } catch (error) {
      console.error('Error rejecting:', error);
    } finally {
      setProcessing(false);
    }
  };

  const openDetailView = async (item: TimecardDetail | ExpenseDetail, type: 'timecard' | 'expense') => {
    setSelectedItem(item);
    setItemType(type);
    
    // Fetch additional details if timecard
    if (type === 'timecard') {
      // Fetch timecard entries
      const { data: entries } = await supabase
        .from('timesheet_entries')
        .select(`
          *,
          projects!timesheet_entries_project_id_fkey (
            id,
            name,
            code
          )
        `)
        .eq('timesheet_id', item.id);

      if (entries) {
        (item as TimecardDetail).entries = entries.map(e => ({
          id: e.id,
          date: e.date,
          project_id: e.project_id,
          project_name: e.projects?.name || 'Unknown Project',
          project_code: e.projects?.code || '',
          hours: e.hours,
          overtime_hours: 0,
          description: e.description || ''
        }));
        setSelectedItem({...item});
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700 border-gray-300',
      submitted: 'bg-amber-50 text-amber-700 border-amber-300',
      approved: 'bg-emerald-50 text-emerald-700 border-emerald-300',
      rejected: 'bg-red-50 text-red-700 border-red-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      travel: MapPin,
      meals: CreditCard,
      supplies: Briefcase,
      equipment: Building,
      other: Receipt
    };
    const Icon = icons[category.toLowerCase()] || Receipt;
    return <Icon className="h-4 w-4" />;
  };

  // Filter combined items
  const filteredItems = [
    ...(filters.type === 'all' || filters.type === 'timecards' ? 
      timecards.map(t => ({...t, itemType: 'timecard' as const})) : []),
    ...(filters.type === 'all' || filters.type === 'expenses' ? 
      expenses.map(e => ({...e, itemType: 'expense' as const})) : [])
  ].filter(item => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return item.employee_name.toLowerCase().includes(search) ||
             item.employee_email.toLowerCase().includes(search) ||
             ('description' in item && item.description?.toLowerCase().includes(search));
    }
    return true;
  }).sort((a, b) => new Date(b.submitted_at || '').getTime() - new Date(a.submitted_at || '').getTime());

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e31c79] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Inline role check
  if (!roleCheckComplete || !manager || (manager.role !== 'manager' && manager.role !== 'admin')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600 mb-4">You do not have permission to access this page.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-[#e31c79] text-white rounded-lg hover:bg-[#c71865]"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="shadow-lg" style={{ backgroundColor: '#33393c' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Image 
                src="/WE-logo-SEPT2024v3-WHT.png" 
                alt="West End Workforce" 
                width={150}
                height={40}
                className="h-10 w-auto"
                priority
              />
              <div className="border-l border-gray-500 pl-3 ml-1">
                <h1 className="text-xl font-semibold text-white">
                  Manager Dashboard
                </h1>
                <span className="text-xs text-gray-300">Review & Approve Team Submissions</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-200">{manager?.email}</span>
              {manager?.role === 'admin' && (
                <button
                  onClick={() => router.push('/admin')}
                  className="text-sm text-gray-200 hover:text-white"
                >
                  Admin View
                </button>
              )}
              <button
                onClick={() => router.push('/dashboard')}
                className="text-sm text-gray-200 hover:text-white"
              >
                Employee View
              </button>
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
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Timecards</p>
                <p className="text-2xl font-bold" style={{ color: '#33393c' }}>{stats.pendingTimecards}</p>
                <p className="text-xs text-gray-500 mt-1">From your team</p>
              </div>
              <Clock className="h-8 w-8" style={{ color: '#e31c79' }} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Expenses</p>
                <p className="text-2xl font-bold" style={{ color: '#33393c' }}>{stats.pendingExpenses}</p>
                <p className="text-xs text-gray-500 mt-1">Awaiting review</p>
              </div>
              <Receipt className="h-8 w-8" style={{ color: '#e31c79' }} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Team Members</p>
                <p className="text-2xl font-bold" style={{ color: '#33393c' }}>
                  {stats.totalTeamMembers}
                </p>
                <p className="text-xs text-gray-500 mt-1">Under your supervision</p>
              </div>
              <Users className="h-8 w-8" style={{ color: '#33393c' }} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Amount</p>
                <p className="text-xl font-bold" style={{ color: '#33393c' }}>
                  {formatCurrency(stats.totalPendingAmount)}
                </p>
                <p className="text-xs text-gray-500 mt-1">To approve</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by employee name, email, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                />
              </div>
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="h-5 w-5" />
              Filters
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-4 pt-4 border-t">
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters({...filters, dateRange: e.target.value as any})}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79]"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="custom">Custom Range</option>
              </select>

              <select
                value={filters.type}
                onChange={(e) => setFilters({...filters, type: e.target.value as any})}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79]"
              >
                <option value="all">All Types</option>
                <option value="timecards">Timecards Only</option>
                <option value="expenses">Expenses Only</option>
              </select>

              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value as any})}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79]"
              >
                <option value="all">All Status</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>

              <select
                value={filters.employee}
                onChange={(e) => setFilters({...filters, employee: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79]"
              >
                <option value="all">All Team Members</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </option>
                ))}
              </select>

              <select
                value={filters.project}
                onChange={(e) => setFilters({...filters, project: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79]"
              >
                <option value="all">All Projects</option>
                {projects.map(proj => (
                  <option key={proj.id} value={proj.id}>
                    {proj.name} ({proj.code})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Items List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold" style={{ color: '#33393c' }}>
              Review Items ({filteredItems.length})
            </h3>
          </div>
          
          <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
                <p className="text-gray-600">No items to review</p>
                <p className="text-sm text-gray-500 mt-2">
                  {employees.length === 0 ? 
                    "No team members assigned to you yet" : 
                    "Adjust your filters to see more items"}
                </p>
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => openDetailView(item, item.itemType)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`p-2 rounded-lg ${
                        item.itemType === 'timecard' ? 'bg-blue-50' : 'bg-pink-50'
                      }`}>
                        {item.itemType === 'timecard' ? 
                          <Clock className={`h-5 w-5 ${
                            item.itemType === 'timecard' ? 'text-blue-600' : 'text-[#e31c79]'
                          }`} /> :
                          getCategoryIcon((item as ExpenseDetail).category)
                        }
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-medium" style={{ color: '#33393c' }}>
                            {item.employee_name}
                          </p>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(item.status)}`}>
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {item.itemType === 'timecard' ? 'Timecard' : 'Expense'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          {item.itemType === 'timecard' ? (
                            <>
                              <span>Week ending: {formatDate((item as TimecardDetail).week_ending)}</span>
                              <span>•</span>
                              <span>{(item as TimecardDetail).total_hours} hours</span>
                              <span>•</span>
                              <span>{formatCurrency((item as TimecardDetail).total_amount)}</span>
                            </>
                          ) : (
                            <>
                              <span>{formatDate((item as ExpenseDetail).expense_date)}</span>
                              <span>•</span>
                              <span>{(item as ExpenseDetail).category}</span>
                              <span>•</span>
                              <span>{formatCurrency((item as ExpenseDetail).amount)}</span>
                              <span>•</span>
                              <span>{(item as ExpenseDetail).description}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.status === 'submitted' && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApprove(item.id, item.itemType);
                            }}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            <Check className="h-5 w-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReject(item.id, item.itemType);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetailView(item, item.itemType);
                        }}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal - Keep existing modal code */}
      {selectedItem && itemType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          {/* ... existing modal code ... */}
        </div>
      )}
    </div>
  );
}