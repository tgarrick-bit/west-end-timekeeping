'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { 
  Clock, 
  Receipt, 
  Users,
  AlertCircle,
  CheckCircle,
  Eye,
  Check,
  X,
  Filter,
  DollarSign,
  Briefcase,
  LogOut,
  Search,
  ChevronDown,
  ArrowUpDown,
  Loader2,
  Calendar,
  UserCheck
} from 'lucide-react';

// Type definitions
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
  employee_code?: string;
}

interface CombinedItem {
  id: string;
  type: 'timesheet' | 'expense';
  employee_id: string;
  employee_name: string;
  employee_email: string;
  employee_department?: string;
  date: string;
  amount: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_at: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  
  // Timesheet specific
  week_ending?: string;
  total_hours?: number;
  total_overtime?: number;
  regular_hours?: number;
  
  // Expense specific
  category?: string;
  description?: string;
  vendor?: string;
  receipt_url?: string;
}

const ManagerDashboard: React.FC = () => {
  const [manager, setManager] = useState<Employee | null>(null);
  const [combinedItems, setCombinedItems] = useState<CombinedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'employee' | 'amount' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState({
    type: 'all' as 'all' | 'timesheets' | 'expenses',
    status: 'all' as 'all' | 'submitted' | 'approved' | 'rejected' | 'draft',
    employee: 'all',
    dateRange: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    fetchDashboardData();
  }, [filters]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Get manager data - check by both ID and email
      const { data: managerData } = await supabase
        .from('employees')
        .select('*')
        .or(`id.eq.${user.id},email.eq.${user.email}`)
        .single();

      if (!managerData) {
        console.log('No employee record found for user');
        router.push('/dashboard');
        return;
      }

      // Check if user is a manager or admin
      if (managerData.role !== 'manager' && managerData.role !== 'admin') {
        console.log('User role is:', managerData.role, '- not authorized');
        router.push('/dashboard');
        return;
      }

      setManager(managerData);
      console.log('Manager:', managerData.first_name, managerData.last_name, '- Role:', managerData.role);

      // Get ALL test employees for the dropdown filter
      const { data: allTestEmployees } = await supabase
        .from('employees')
        .select('*')
        .like('email', '%@testcompany.com')
        .order('first_name');
      
      setAllEmployees(allTestEmployees || []);

      // Get employees this manager can see
      let employeeIdsToFetch: string[] = [];
      let managedEmployees: Employee[] = [];

      if (managerData.role === 'admin') {
        // Admin sees all employees
        managedEmployees = allTestEmployees || [];
        employeeIdsToFetch = managedEmployees.map(e => e.id);
      } else {
        // Manager sees only their direct reports
        const { data: directReports } = await supabase
          .from('employees')
          .select('*')
          .eq('manager_id', managerData.id)
          .eq('is_active', true);
        
        managedEmployees = directReports || [];
        employeeIdsToFetch = managedEmployees.map(e => e.id);
      }

      setEmployees(managedEmployees);
      console.log(`Found ${managedEmployees.length} employees for this manager`);

      const items: CombinedItem[] = [];

      // Fetch timesheets
      if (filters.type === 'all' || filters.type === 'timesheets') {
        let timesheetsQuery = supabase
          .from('timesheets')
          .select('*');

        // Apply employee filter for non-admins
        if (managerData.role !== 'admin' && employeeIdsToFetch.length > 0) {
          timesheetsQuery = timesheetsQuery.in('employee_id', employeeIdsToFetch);
        }

        // Apply status filter
        if (filters.status !== 'all') {
          timesheetsQuery = timesheetsQuery.eq('status', filters.status);
        }

        // Apply specific employee filter
        if (filters.employee !== 'all') {
          timesheetsQuery = timesheetsQuery.eq('employee_id', filters.employee);
        }

        // Apply date range filter
        if (filters.dateRange !== 'all') {
          const now = new Date();
          let startDate = new Date();
          
          switch (filters.dateRange) {
            case 'week':
              startDate.setDate(now.getDate() - 7);
              break;
            case 'month':
              startDate.setMonth(now.getMonth() - 1);
              break;
            case 'quarter':
              startDate.setMonth(now.getMonth() - 3);
              break;
          }
          
          timesheetsQuery = timesheetsQuery.gte('week_ending', startDate.toISOString().split('T')[0]);
        }

        const { data: timesheetsData, error: timesheetsError } = await timesheetsQuery;

        if (timesheetsError) {
          console.error('Error fetching timesheets:', timesheetsError);
        } else if (timesheetsData) {
          console.log(`Fetched ${timesheetsData.length} timesheets`);
          
          // Map timesheets to combined items
          for (const timesheet of timesheetsData) {
            // Find employee data
            let employeeData = allTestEmployees?.find(e => e.id === timesheet.employee_id);
            
            // If not found in test employees, try to fetch
            if (!employeeData) {
              const { data: empData } = await supabase
                .from('employees')
                .select('*')
                .eq('id', timesheet.employee_id)
                .single();
              employeeData = empData;
            }

            if (employeeData) {
              const hourlyRate = employeeData.hourly_rate || 25;
              const regularHours = timesheet.regular_hours || timesheet.total_hours || 0;
              const overtimeHours = timesheet.overtime_hours || timesheet.total_overtime || 0;
              const totalHours = regularHours + overtimeHours;
              
              // Calculate amount (regular + 1.5x overtime)
              const amount = (regularHours * hourlyRate) + (overtimeHours * hourlyRate * 1.5);

              items.push({
                id: timesheet.id,
                type: 'timesheet',
                employee_id: timesheet.employee_id,
                employee_name: `${employeeData.first_name} ${employeeData.last_name}`,
                employee_email: employeeData.email,
                employee_department: employeeData.department,
                date: timesheet.week_ending,
                week_ending: timesheet.week_ending,
                amount: amount,
                total_hours: regularHours,
                regular_hours: regularHours,
                total_overtime: overtimeHours,
                status: timesheet.status || 'draft',
                submitted_at: timesheet.submitted_at,
                approved_at: timesheet.approved_at,
                approved_by: timesheet.approved_by
              });
            }
          }
        }
      }

      // Fetch expenses (if table exists)
      if (filters.type === 'all' || filters.type === 'expenses') {
        // Check if expenses table exists by trying to query it
        const { data: expensesData, error: expensesError } = await supabase
          .from('expenses')
          .select('*')
          .limit(100);

        if (!expensesError && expensesData) {
          console.log(`Fetched ${expensesData.length} expenses`);
          
          for (const expense of expensesData) {
            let employeeData = allTestEmployees?.find(e => e.id === expense.employee_id);
            
            if (!employeeData) {
              const { data: empData } = await supabase
                .from('employees')
                .select('*')
                .eq('id', expense.employee_id)
                .single();
              employeeData = empData;
            }

            if (employeeData) {
              // Only add if employee is in managed list (for non-admins)
              if (managerData.role === 'admin' || employeeIdsToFetch.includes(expense.employee_id)) {
                items.push({
                  id: expense.id,
                  type: 'expense',
                  employee_id: expense.employee_id,
                  employee_name: `${employeeData.first_name} ${employeeData.last_name}`,
                  employee_email: employeeData.email,
                  employee_department: employeeData.department,
                  date: expense.expense_date,
                  amount: expense.amount,
                  category: expense.category,
                  description: expense.description,
                  vendor: expense.vendor,
                  receipt_url: expense.receipt_url,
                  status: expense.status || 'draft',
                  submitted_at: expense.submitted_at,
                  approved_at: expense.approved_at,
                  approved_by: expense.approved_by
                });
              }
            }
          }
        }
      }

      setCombinedItems(items);
      console.log(`Total items loaded: ${items.length} (${items.filter(i => i.type === 'timesheet').length} timesheets, ${items.filter(i => i.type === 'expense').length} expenses)`);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveItem = async (item: CombinedItem) => {
    setProcessing(true);
    try {
      const table = item.type === 'timesheet' ? 'timesheets' : 'expenses';
      const { error } = await supabase
        .from(table)
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: manager?.id
        })
        .eq('id', item.id);

      if (!error) {
        await fetchDashboardData();
      }
    } catch (error) {
      console.error('Error approving item:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectItem = async (item: CombinedItem) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;
    
    setProcessing(true);
    try {
      const table = item.type === 'timesheet' ? 'timesheets' : 'expenses';
      const { error } = await supabase
        .from(table)
        .update({ 
          status: 'rejected',
          approved_at: new Date().toISOString(),
          approved_by: manager?.id,
          comments: reason
        })
        .eq('id', item.id);

      if (!error) {
        await fetchDashboardData();
      }
    } catch (error) {
      console.error('Error rejecting item:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkApprove = async () => {
    const itemsToApprove = selectedItems.size > 0 
      ? combinedItems.filter(item => selectedItems.has(item.id) && item.status === 'submitted')
      : combinedItems.filter(item => item.status === 'submitted');

    if (itemsToApprove.length === 0) {
      alert('No pending items to approve');
      return;
    }

    if (!confirm(`Are you sure you want to approve ${itemsToApprove.length} items?`)) {
      return;
    }

    setProcessing(true);
    try {
      const timesheetsToApprove = itemsToApprove.filter(i => i.type === 'timesheet');
      const expensesToApprove = itemsToApprove.filter(i => i.type === 'expense');

      if (timesheetsToApprove.length > 0) {
        await supabase
          .from('timesheets')
          .update({ 
            status: 'approved',
            approved_at: new Date().toISOString(),
            approved_by: manager?.id
          })
          .in('id', timesheetsToApprove.map(t => t.id));
      }

      if (expensesToApprove.length > 0) {
        await supabase
          .from('expenses')
          .update({ 
            status: 'approved',
            approved_at: new Date().toISOString(),
            approved_by: manager?.id
          })
          .in('id', expensesToApprove.map(e => e.id));
      }

      setSelectedItems(new Set());
      await fetchDashboardData();
      alert(`Successfully approved ${itemsToApprove.length} items`);
    } catch (error) {
      console.error('Error bulk approving:', error);
      alert('Error approving items. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Filter and sort logic
  const filteredAndSortedItems = combinedItems
    .filter(item => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return item.employee_name.toLowerCase().includes(search) ||
               item.employee_email.toLowerCase().includes(search) ||
               (item.description && item.description.toLowerCase().includes(search)) ||
               (item.employee_department && item.employee_department.toLowerCase().includes(search));
      }
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'employee':
          comparison = a.employee_name.localeCompare(b.employee_name);
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Calculate stats
  const pendingItems = combinedItems.filter(i => i.status === 'submitted');
  const pendingTimesheets = pendingItems.filter(i => i.type === 'timesheet');
  const pendingExpenses = pendingItems.filter(i => i.type === 'expense');
  const totalPendingAmount = pendingItems.reduce((sum, i) => sum + i.amount, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const selectAllVisible = () => {
    if (selectedItems.size === filteredAndSortedItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredAndSortedItems.map(i => i.id)));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-900 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-white">
                Manager Dashboard
              </h1>
              <span className="ml-4 text-sm text-gray-300">
                {manager?.role === 'admin' ? '(Admin View)' : '(Manager View)'}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-200">
                {manager?.first_name} {manager?.last_name}
              </span>
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Pending Timesheets</p>
                <p className="text-2xl font-bold text-gray-900">{pendingTimesheets.length}</p>
              </div>
              <Clock className="h-8 w-8 text-gray-300" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Pending Expenses</p>
                <p className="text-2xl font-bold text-gray-900">{pendingExpenses.length}</p>
              </div>
              <Receipt className="h-8 w-8 text-gray-300" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Team Members</p>
                <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {manager?.role === 'admin' ? 'All employees' : 'Direct reports'}
                </p>
              </div>
              <Users className="h-8 w-8 text-gray-300" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Pending Amount</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(totalPendingAmount)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-gray-300" />
            </div>
          </div>
        </div>

        {/* Action Required */}
        {pendingItems.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <div>
                  <h3 className="text-base font-semibold text-orange-900">
                    {selectedItems.size > 0 
                      ? `${selectedItems.size} Items Selected`
                      : `${pendingItems.length} Items Pending Approval`
                    }
                  </h3>
                  <p className="text-sm text-orange-700">
                    {pendingTimesheets.length} timesheets, {pendingExpenses.length} expenses need review
                  </p>
                </div>
              </div>
              <button
                onClick={handleBulkApprove}
                disabled={processing}
                className="px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {selectedItems.size > 0 
                  ? `Approve Selected (${selectedItems.size})`
                  : 'Approve All Pending'
                }
              </button>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by employee name, email, department, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="w-5 h-5" />
              Filters
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
              <select
                value={filters.type}
                onChange={(e) => setFilters({...filters, type: e.target.value as any})}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="timesheets">Timesheets Only</option>
                <option value="expenses">Expenses Only</option>
              </select>

              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value as any})}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>

              <select
                value={filters.employee}
                onChange={(e) => setFilters({...filters, employee: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Employees</option>
                {allEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.department})
                  </option>
                ))}
              </select>

              <select
                value={filters.dateRange}
                onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
              </select>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-blue-600 font-medium">Total Items:</span>
              <span className="ml-2 text-gray-900">{filteredAndSortedItems.length}</span>
            </div>
            <div>
              <span className="text-blue-600 font-medium">Timesheets:</span>
              <span className="ml-2 text-gray-900">
                {filteredAndSortedItems.filter(i => i.type === 'timesheet').length}
              </span>
            </div>
            <div>
              <span className="text-blue-600 font-medium">Expenses:</span>
              <span className="ml-2 text-gray-900">
                {filteredAndSortedItems.filter(i => i.type === 'expense').length}
              </span>
            </div>
            <div>
              <span className="text-blue-600 font-medium">Total Value:</span>
              <span className="ml-2 text-gray-900">
                {formatCurrency(filteredAndSortedItems.reduce((sum, i) => sum + i.amount, 0))}
              </span>
            </div>
          </div>
        </div>

        {/* Combined List Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedItems.size === filteredAndSortedItems.length && filteredAndSortedItems.length > 0}
                      onChange={selectAllVisible}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('employee')}
                      className="flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900"
                    >
                      Employee
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('date')}
                      className="flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900"
                    >
                      Date
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">Details</th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('amount')}
                      className="flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900"
                    >
                      Amount
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('status')}
                      className="flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900"
                    >
                      Status
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAndSortedItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      No items found
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedItems.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => toggleItemSelection(item.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-gray-900">{item.employee_name}</div>
                          <div className="text-xs text-gray-500">{item.employee_department}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {item.type === 'timesheet' ? (
                            <>
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span className="text-sm">Timesheet</span>
                            </>
                          ) : (
                            <>
                              <Receipt className="w-4 h-4 text-gray-400" />
                              <span className="text-sm">Expense</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {item.type === 'timesheet' ? (
                          <div>
                            <div>Week ending</div>
                            <div className="font-medium">{formatDate(item.week_ending!)}</div>
                          </div>
                        ) : (
                          formatDate(item.date)
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {item.type === 'timesheet' ? (
                          <div>
                            <span>{item.total_hours}h regular</span>
                            {item.total_overtime! > 0 && (
                              <span className="text-orange-600 ml-1">
                                +{item.total_overtime}h OT
                              </span>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div className="font-medium capitalize">{item.category}</div>
                            <div className="text-xs text-gray-500">{item.description}</div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{formatCurrency(item.amount)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          item.status === 'submitted' ? 'bg-orange-100 text-orange-700' :
                          item.status === 'approved' ? 'bg-green-100 text-green-700' :
                          item.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {item.status === 'submitted' && (
                            <>
                              <button
                                onClick={() => handleRejectItem(item)}
                                disabled={processing}
                                className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                                title="Reject"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleApproveItem(item)}
                                disabled={processing}
                                className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                                title="Approve"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ManagerDashboard;