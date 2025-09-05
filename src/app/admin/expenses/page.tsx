'use client';

// src/app/admin/expenses/page.tsx

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import ExpenseModal from '@/components/ExpenseModal';
import { 
  Receipt,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Calendar,
  Check,
  X,
  AlertCircle,
  Building2,
  DollarSign,
  Download,
  Filter,
  Eye,
  MapPin,
  CreditCard,
  Briefcase,
  Building,
  Image as ImageIcon
} from 'lucide-react';

interface Expense {
  id: string;
  employee_id: string;
  employee?: {
    first_name: string;
    last_name: string;
    email: string;
    department?: string;
    client_id?: string;
  };
  expense_date: string;
  amount: number;
  category: string;
  description?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_at?: string;
  approved_at?: string;
  approved_by?: string;
  receipt_url?: string;
  project_id?: string;
  project?: {
    id: string;
    name: string;
    code: string;
  };
  vendor?: string;
  payment_method?: string;
  comments?: string;
  created_at?: string;
  updated_at?: string;
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

interface ClientGroup {
  client_id: string;
  client_name: string;
  expenses: EmployeeExpenses[];
  totalPending: number;
  totalApproved: number;
  totalAmount: number;
  pendingAmount: number;
  expanded: boolean;
}

interface EmployeeExpenses {
  employee_id: string;
  employee_name: string;
  employee_email: string;
  department?: string;
  expenses: Expense[];
  totalAmount: number;
  pendingCount: number;
}

export default function AdminExpenses() {
  const [clientGroups, setClientGroups] = useState<ClientGroup[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseDetail | null>(null);
  const [processing, setProcessing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    fetchExpenses();
  }, [selectedMonth, filterStatus, categoryFilter]);

  const getMonthDateRange = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    return { startDate, endDate };
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getMonthDateRange(selectedMonth);
      
      // Fetch all clients
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      // Fetch all employees with their client assignments
      const { data: employees } = await supabase
        .from('employees')
        .select(`
          id,
          first_name,
          last_name,
          email,
          department,
          client_id
        `)
        .eq('is_active', true);

      // Build expense query
      let expenseQuery = supabase
        .from('expenses')
        .select(`
          *,
          employee:employees!employee_id (
            first_name,
            last_name,
            email,
            department,
            client_id
          ),
          project:projects!expenses_project_id_fkey (
            id,
            name,
            code
          )
        `)
        .gte('expense_date', startDate.toISOString().split('T')[0])
        .lte('expense_date', endDate.toISOString().split('T')[0])
        .order('expense_date', { ascending: false });

      // Apply status filter
      if (filterStatus !== 'all') {
        expenseQuery = expenseQuery.eq('status', filterStatus === 'pending' ? 'submitted' : 'approved');
      }

      // Apply category filter
      if (categoryFilter !== 'all') {
        expenseQuery = expenseQuery.eq('category', categoryFilter);
      }

      const { data: expenses } = await expenseQuery;

      // Group by client
      const groups: ClientGroup[] = [];
      
      for (const client of clients || []) {
        const clientEmployees = employees?.filter(emp => emp.client_id === client.id) || [];
        const employeeExpenses: EmployeeExpenses[] = [];
        let totalPending = 0;
        let totalApproved = 0;
        let totalAmount = 0;
        let pendingAmount = 0;

        for (const employee of clientEmployees) {
          const empExpenses = expenses?.filter(exp => exp.employee_id === employee.id) || [];
          const empTotalAmount = empExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
          const empPendingCount = empExpenses.filter(exp => exp.status === 'submitted').length;
          const empPendingAmount = empExpenses
            .filter(exp => exp.status === 'submitted')
            .reduce((sum, exp) => sum + (exp.amount || 0), 0);

          if (empExpenses.length > 0) {
            totalPending += empPendingCount;
            totalApproved += empExpenses.filter(exp => exp.status === 'approved').length;
            totalAmount += empTotalAmount;
            pendingAmount += empPendingAmount;

            employeeExpenses.push({
              employee_id: employee.id,
              employee_name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Unknown',
              employee_email: employee.email,
              department: employee.department,
              expenses: empExpenses,
              totalAmount: empTotalAmount,
              pendingCount: empPendingCount
            });
          }
        }

        if (employeeExpenses.length > 0) {
          groups.push({
            client_id: client.id,
            client_name: client.name,
            expenses: employeeExpenses,
            totalPending,
            totalApproved,
            totalAmount,
            pendingAmount,
            expanded: false
          });
        }
      }

      // Add unassigned employees
      const unassignedEmployees = employees?.filter(emp => !emp.client_id) || [];
      if (unassignedEmployees.length > 0) {
        const employeeExpenses: EmployeeExpenses[] = [];
        let totalPending = 0;
        let totalApproved = 0;
        let totalAmount = 0;
        let pendingAmount = 0;

        for (const employee of unassignedEmployees) {
          const empExpenses = expenses?.filter(exp => exp.employee_id === employee.id) || [];
          const empTotalAmount = empExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
          const empPendingCount = empExpenses.filter(exp => exp.status === 'submitted').length;
          const empPendingAmount = empExpenses
            .filter(exp => exp.status === 'submitted')
            .reduce((sum, exp) => sum + (exp.amount || 0), 0);

          if (empExpenses.length > 0) {
            totalPending += empPendingCount;
            totalApproved += empExpenses.filter(exp => exp.status === 'approved').length;
            totalAmount += empTotalAmount;
            pendingAmount += empPendingAmount;

            employeeExpenses.push({
              employee_id: employee.id,
              employee_name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Unknown',
              employee_email: employee.email,
              department: employee.department,
              expenses: empExpenses,
              totalAmount: empTotalAmount,
              pendingCount: empPendingCount
            });
          }
        }

        if (employeeExpenses.length > 0) {
          groups.push({
            client_id: 'unassigned',
            client_name: 'Unassigned Employees',
            expenses: employeeExpenses,
            totalPending,
            totalApproved,
            totalAmount,
            pendingAmount,
            expanded: false
          });
        }
      }

      setClientGroups(groups);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleClientExpanded = (clientId: string) => {
    setClientGroups(groups => 
      groups.map(group => 
        group.client_id === clientId 
          ? { ...group, expanded: !group.expanded }
          : group
      )
    );
  };

  const handleApproveExpense = async () => {
    if (!selectedExpense) return;
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase
        .from('expenses')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        })
        .eq('id', selectedExpense.id);
      
      fetchExpenses();
      setSelectedExpense(null);
    } catch (error) {
      console.error('Error approving expense:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectExpense = async () => {
    if (!selectedExpense) return;
    setProcessing(true);
    try {
      await supabase
        .from('expenses')
        .update({ 
          status: 'rejected',
          comments: 'Please review and resubmit with proper documentation'
        })
        .eq('id', selectedExpense.id);
      
      fetchExpenses();
      setSelectedExpense(null);
    } catch (error) {
      console.error('Error rejecting expense:', error);
    } finally {
      setProcessing(false);
    }
  };

  const openExpenseDetail = (expense: Expense, employee: EmployeeExpenses) => {
    const expenseDetail: ExpenseDetail = {
      id: expense.id,
      employee_id: expense.employee_id,
      employee_name: employee.employee_name,
      employee_email: employee.employee_email,
      employee_department: employee.department,
      expense_date: expense.expense_date,
      amount: expense.amount,
      category: expense.category,
      description: expense.description || '',
      status: expense.status,
      submitted_at: expense.submitted_at || null,
      approved_at: expense.approved_at,
      approved_by: expense.approved_by,
      receipt_urls: expense.receipt_url ? [expense.receipt_url] : [],
      project_id: expense.project_id,
      project_name: expense.project?.name,
      vendor: expense.vendor,
      payment_method: expense.payment_method,
      notes: expense.comments
    };
    
    setSelectedExpense(expenseDetail);
  };

  const handleBulkApprove = async (clientId: string) => {
    if (!confirm('Approve all pending expenses for this client?')) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const client = clientGroups.find(g => g.client_id === clientId);
      if (!client) return;

      const pendingExpenses = client.expenses
        .flatMap(emp => emp.expenses)
        .filter(exp => exp.status === 'submitted');

      await Promise.all(
        pendingExpenses.map(exp =>
          supabase
            .from('expenses')
            .update({ 
              status: 'approved',
              approved_at: new Date().toISOString(),
              approved_by: user?.id
            })
            .eq('id', exp.id)
        )
      );

      fetchExpenses();
    } catch (error) {
      console.error('Error bulk approving:', error);
    }
  };

  const exportToCSV = () => {
    const headers = ['Client', 'Employee', 'Department', 'Date', 'Category', 'Amount', 'Status', 'Description'];
    const rows: string[][] = [];

    clientGroups.forEach(group => {
      group.expenses.forEach(emp => {
        emp.expenses.forEach(exp => {
          rows.push([
            group.client_name,
            emp.employee_name,
            emp.department || '',
            exp.expense_date,
            exp.category,
            exp.amount.toString(),
            exp.status,
            exp.description || ''
          ]);
        });
      });
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${selectedMonth.toISOString().slice(0, 7)}.csv`;
    a.click();
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    setSelectedMonth(newDate);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get unique categories from all expenses
  const categories = Array.from(new Set(
    clientGroups.flatMap(g => g.expenses.flatMap(e => e.expenses.map(exp => exp.category)))
  ));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e31c79] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading expenses...</p>
        </div>
      </div>
    );
  }

  const totalPendingCount = clientGroups.reduce((sum, g) => sum + g.totalPending, 0);
  const totalPendingAmount = clientGroups.reduce((sum, g) => sum + g.pendingAmount, 0);
  const totalApprovedCount = clientGroups.reduce((sum, g) => sum + g.totalApproved, 0);
  const totalAmount = clientGroups.reduce((sum, g) => sum + g.totalAmount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-900 text-white">
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
                <h1 className="text-2xl font-bold">Expense Overview</h1>
                <p className="text-sm text-gray-300">Review all expense reports across clients</p>
              </div>
            </div>
            <button 
              onClick={async () => {
                await supabase.auth.signOut();
                router.push('/auth/login');
              }}
              className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls Bar */}
        <div className="bg-white rounded-lg shadow-sm mb-6 p-4 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => changeMonth('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="text-center">
                <p className="text-sm text-gray-600">Month</p>
                <p className="font-semibold">
                  {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </div>
              <button
                onClick={() => changeMonth('next')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
              >
                <option value="all">All Expenses</option>
                <option value="pending">Pending Only</option>
                <option value="approved">Approved Only</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                ))}
              </select>
              <button
                onClick={exportToCSV}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(totalAmount)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border border-yellow-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-yellow-600">{totalPendingCount}</p>
                <p className="text-xs text-gray-500">{formatCurrency(totalPendingAmount)}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border border-green-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">{totalApprovedCount}</p>
              </div>
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Clients</p>
                <p className="text-2xl font-bold text-gray-900">{clientGroups.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Client Groups */}
        <div className="space-y-4">
          {clientGroups.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <p className="text-gray-500">No expenses found for this month.</p>
            </div>
          ) : (
            clientGroups.map((group) => (
              <div 
                key={group.client_id} 
                className="bg-white rounded-lg shadow-sm overflow-hidden border"
                style={{ borderColor: group.totalPending > 0 ? '#facc15' : '#e5e7eb' }}
              >
                {/* Client Header */}
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleClientExpanded(group.client_id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {group.expanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                      <Building2 className="h-5 w-5 text-[#e31c79]" />
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {group.client_name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {formatCurrency(group.totalAmount)} total
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {group.totalPending > 0 && (
                        <>
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                            {group.totalPending} pending ({formatCurrency(group.pendingAmount)})
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBulkApprove(group.client_id);
                            }}
                            className="px-3 py-1 text-xs text-white bg-[#e31c79] rounded hover:bg-[#c71865]"
                          >
                            Approve All
                          </button>
                        </>
                      )}
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                        {group.totalApproved} approved
                      </span>
                    </div>
                  </div>
                </div>

                {/* Employee Expenses */}
                {group.expanded && (
                  <div className="border-t">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Employee
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Department
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Expenses
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {group.expenses.map((employee) => (
                          <tr key={employee.employee_id}>
                            <td className="px-6 py-4">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {employee.employee_name}
                                </p>
                                <p className="text-xs text-gray-500">{employee.employee_email}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {employee.department || '-'}
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-1">
                                {employee.expenses.slice(0, 3).map((exp) => (
                                  <div key={exp.id} className="flex items-center gap-2">
                                    {getCategoryIcon(exp.category)}
                                    <span className="text-xs text-gray-600">
                                      {formatDate(exp.expense_date)} - {formatCurrency(exp.amount)}
                                    </span>
                                    <span className={`px-1.5 py-0.5 text-xs font-semibold rounded ${getStatusColor(exp.status)}`}>
                                      {exp.status}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openExpenseDetail(exp, employee);
                                      }}
                                      className="ml-auto p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    >
                                      <Eye className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))}
                                {employee.expenses.length > 3 && (
                                  <p className="text-xs text-gray-500">
                                    +{employee.expenses.length - 3} more
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {formatCurrency(employee.totalAmount)}
                              {employee.pendingCount > 0 && (
                                <span className="block text-xs text-yellow-600">
                                  {employee.pendingCount} pending
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Open first expense for simplicity
                                  if (employee.expenses.length > 0) {
                                    openExpenseDetail(employee.expenses[0], employee);
                                  }
                                }}
                                className="text-sm text-blue-600 hover:text-blue-800"
                              >
                                View All
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Expense Modal */}
      {selectedExpense && (
        <ExpenseModal
          isOpen={true}
          onClose={() => setSelectedExpense(null)}
          expense={selectedExpense}
          onApprove={handleApproveExpense}
          onReject={handleRejectExpense}
          processing={processing}
        />
      )}
    </div>
  );
}