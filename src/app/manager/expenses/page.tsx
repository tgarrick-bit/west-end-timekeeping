'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  DollarSign,
  Calendar,
  Check,
  X,
  Eye,
  ChevronLeft,
  AlertCircle,
  FileText,
  Receipt,
  Clock,
  Download,
  Search
} from 'lucide-react';

interface Expense {
  id: string;
  employee_id: string;
  expense_date: string;
  amount: number;
  category: string;
  vendor: string;
  description: string;
  status: string;
  submitted_at: string;
  approved_at?: string;
  approved_by?: string;
  project_id?: string;
  receipt_url?: string;
  created_at: string;
  project?: {
    name: string;
    code: string;
  };
  employee?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export default function ExpenseApprovalPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'approved' | 'rejected'>('submitted');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  const supabase = createSupabaseClient();
  const router = useRouter();

  useEffect(() => {
    loadExpenses();
  }, [statusFilter]);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('expenses')
        .select(`
          *,
          employee:employee_id (
            id,
            first_name,
            last_name,
            email
          ),
          project:project_id (
            name,
            code
          )
        `)
        .order('submitted_at', { ascending: false });

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading expenses:', error);
      } else if (data) {
        console.log('Loaded expenses:', data);
        setExpenses(data);
      }
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    const filteredExpenses = getFilteredExpenses();
    if (selectedItems.size === filteredExpenses.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredExpenses.map(exp => exp.id)));
    }
  };

  const handleApprove = async (expenseId?: string) => {
    const itemsToApprove = expenseId ? [expenseId] : Array.from(selectedItems);
    
    if (itemsToApprove.length === 0) {
      alert('Please select expenses to approve');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: manager } = await supabase
        .from('employees')
        .select('id')
        .eq('email', user.email)
        .single();

      if (!manager) return;

      const { error } = await supabase
        .from('expenses')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: manager.id
        })
        .in('id', itemsToApprove);

      if (error) throw error;

      alert(`Successfully approved ${itemsToApprove.length} expense(s)`);
      setSelectedItems(new Set());
      setShowDetails(false);
      setSelectedExpense(null);
      loadExpenses();
    } catch (error) {
      console.error('Error approving expenses:', error);
      alert('Error approving expenses');
    }
  };

  const handleReject = async (expenseId?: string) => {
    const itemsToReject = expenseId ? [expenseId] : Array.from(selectedItems);
    
    if (itemsToReject.length === 0) {
      alert('Please select expenses to reject');
      return;
    }

    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: manager } = await supabase
        .from('employees')
        .select('id')
        .eq('email', user.email)
        .single();

      if (!manager) return;

      const { error } = await supabase
        .from('expenses')
        .update({
          status: 'rejected',
          approved_at: new Date().toISOString(),
          approved_by: manager.id,
          rejection_reason: reason
        })
        .in('id', itemsToReject);

      if (error) throw error;

      alert(`Successfully rejected ${itemsToReject.length} expense(s)`);
      setSelectedItems(new Set());
      setShowDetails(false);
      setSelectedExpense(null);
      loadExpenses();
    } catch (error) {
      console.error('Error rejecting expenses:', error);
      alert('Error rejecting expenses');
    }
  };

  const getFilteredExpenses = () => {
    return expenses.filter(expense => {
      const matchesSearch = searchTerm === '' || 
        expense.employee?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.employee?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.employee?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.category?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });
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

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredExpenses = getFilteredExpenses();
  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const pendingCount = expenses.filter(e => e.status === 'submitted').length;
  const approvedCount = expenses.filter(e => e.status === 'approved').length;
  const rejectedCount = expenses.filter(e => e.status === 'rejected').length;

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#05202E] text-white">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/manager')}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">Expense Management</h1>
                <p className="text-sm text-gray-300">Review and approve employee expenses</p>
              </div>
            </div>
            <button 
              onClick={() => router.push('/auth/logout')}
              className="px-4 py-2 hover:bg-white/10 rounded transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-gray-900">{expenses.length}</p>
              </div>
              <Receipt className="h-8 w-8 text-purple-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
              </div>
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-[#e31c79]">
                  {formatCurrency(totalAmount)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-[#e31c79]" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by employee, vendor, category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-[#e31c79] focus:border-[#e31c79]"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-[#e31c79] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('submitted')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    statusFilter === 'submitted'
                      ? 'bg-[#e31c79] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Pending ({pendingCount})
                </button>
                <button
                  onClick={() => setStatusFilter('approved')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    statusFilter === 'approved'
                      ? 'bg-[#e31c79] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Approved
                </button>
                <button
                  onClick={() => setStatusFilter('rejected')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    statusFilter === 'rejected'
                      ? 'bg-[#e31c79] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Rejected
                </button>
              </div>
            </div>
          </div>

          {/* Expense Table */}
          <div className="overflow-x-auto">
            {filteredExpenses.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Receipt className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No expenses found</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.size === filteredExpenses.length && filteredExpenses.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Employee</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Category</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Vendor</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Project</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(expense.id)}
                          onChange={() => handleSelectItem(expense.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {expense.employee?.first_name} {expense.employee?.last_name}
                          </p>
                          <p className="text-sm text-gray-500">{expense.employee?.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">{formatDate(expense.expense_date)}</td>
                      <td className="py-3 px-4 text-sm">{expense.category || '-'}</td>
                      <td className="py-3 px-4 text-sm">{expense.vendor || '-'}</td>
                      <td className="py-3 px-4">
                        {expense.project ? (
                          <div>
                            <p className="text-sm">{expense.project.name}</p>
                            <p className="text-xs text-gray-500">{expense.project.code}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold">{formatCurrency(expense.amount)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(expense.status)}`}>
                          {expense.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {expense.status === 'submitted' && (
                            <>
                              <button
                                onClick={() => handleApprove(expense.id)}
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                title="Approve"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleReject(expense.id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                title="Reject"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              setSelectedExpense(expense);
                              setShowDetails(true);
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Bulk Actions */}
          {selectedItems.size > 0 && statusFilter === 'submitted' && (
            <div className="p-4 bg-gray-50 border-t flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedItems.size} expense(s) selected
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => handleReject()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Reject Selected
                </button>
                <button
                  onClick={() => handleApprove()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  Approve Selected
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Expense Details Modal */}
        {showDetails && selectedExpense && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Expense Details</h2>
                  <button
                    onClick={() => {
                      setShowDetails(false);
                      setSelectedExpense(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-600">Employee</p>
                    <p className="font-medium">
                      {selectedExpense.employee?.first_name} {selectedExpense.employee?.last_name}
                    </p>
                    <p className="text-sm text-gray-500">{selectedExpense.employee?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <span className={`inline-flex px-2 py-1 text-sm font-semibold rounded-full ${getStatusBadgeClass(selectedExpense.status)}`}>
                      {selectedExpense.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-medium">{formatDate(selectedExpense.expense_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Amount</p>
                    <p className="font-medium text-lg">{formatCurrency(selectedExpense.amount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Category</p>
                    <p className="font-medium">{selectedExpense.category || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Vendor</p>
                    <p className="font-medium">{selectedExpense.vendor || '-'}</p>
                  </div>
                  {selectedExpense.project && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600">Project</p>
                      <p className="font-medium">
                        {selectedExpense.project.name} ({selectedExpense.project.code})
                      </p>
                    </div>
                  )}
                  {selectedExpense.description && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600">Description</p>
                      <p className="font-medium">{selectedExpense.description}</p>
                    </div>
                  )}
                </div>

                {selectedExpense.status === 'submitted' && (
                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      onClick={() => handleReject(selectedExpense.id)}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(selectedExpense.id)}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                    >
                      <Check className="h-4 w-4" />
                      Approve
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
