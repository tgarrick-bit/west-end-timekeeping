'use client';

// src/app/admin/expenses/page.tsx

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAdminFilter } from '@/contexts/AdminFilterContext';
import { useRouter } from 'next/navigation';
import ExpenseModal from '@/components/ExpenseModal';
import { useToast } from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import {
  Receipt,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Check,
  AlertCircle,
  Building2,
  DollarSign,
  Download,
  Eye,
  MapPin,
  CreditCard,
  Briefcase,
  Building,
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
    department_id?: string;
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

const statusConfig: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  submitted: { dot: '#c4983a', bg: 'rgba(196,152,58,0.08)', text: '#c4983a', label: 'Pending' },
  approved: { dot: '#2d9b6e', bg: 'rgba(45,155,110,0.08)', text: '#2d9b6e', label: 'Approved' },
  rejected: { dot: '#b91c1c', bg: 'rgba(185,28,28,0.08)', text: '#b91c1c', label: 'Rejected' },
  draft: { dot: '#c0bab2', bg: 'rgba(192,186,178,0.08)', text: '#999', label: 'Draft' },
};

export default function AdminExpenses() {
  const [clientGroups, setClientGroups] = useState<ClientGroup[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseDetail | null>(
    null
  );
  const [processing, setProcessing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Reject modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  // Bulk approve modal state
  const [bulkApproveModalOpen, setBulkApproveModalOpen] = useState(false);
  const [bulkApproveClientId, setBulkApproveClientId] = useState<string | null>(null);
  // Bulk progress
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);

  const { toast } = useToast();
  const supabase = createClient();
  const router = useRouter();
  const { selectedClientId, selectedDepartmentId } = useAdminFilter();

  useEffect(() => {
    fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, filterStatus, categoryFilter, selectedClientId, selectedDepartmentId]);

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
        .select(
          `
          id,
          first_name,
          last_name,
          email,
          department,
          client_id,
          department_id
        `
        )
        .eq('is_active', true);

      // Build expense query
      let expenseQuery = supabase
        .from('expenses')
        .select(
          `
          *,
          employee:employees!employee_id (
            first_name,
            last_name,
            email,
            department,
            client_id,
            department_id
          ),
          project:projects!expenses_project_id_fkey (
            id,
            name,
            code
          )
        `
        )
        .gte('expense_date', startDate.toISOString().split('T')[0])
        .lte('expense_date', endDate.toISOString().split('T')[0])
        .order('expense_date', { ascending: false });

      // Apply status filter
      if (filterStatus !== 'all') {
        expenseQuery = expenseQuery.eq(
          'status',
          filterStatus === 'pending' ? 'submitted' : 'approved'
        );
      }

      // Apply category filter
      if (categoryFilter !== 'all') {
        expenseQuery = expenseQuery.eq('category', categoryFilter);
      }

      const { data: expenses } = await expenseQuery;

      // Group by client
      const groups: ClientGroup[] = [];

      for (const client of clients || []) {
        const clientEmployees =
          employees?.filter((emp) => emp.client_id === client.id) || [];
        const employeeExpenses: EmployeeExpenses[] = [];
        let totalPending = 0;
        let totalApproved = 0;
        let totalAmount = 0;
        let pendingAmount = 0;

        for (const employee of clientEmployees) {
          const empExpenses =
            expenses?.filter((exp) => exp.employee_id === employee.id) || [];
          const empTotalAmount = empExpenses.reduce(
            (sum, exp) => sum + (exp.amount || 0),
            0
          );
          const empPendingCount = empExpenses.filter(
            (exp) => exp.status === 'submitted'
          ).length;
          const empPendingAmount = empExpenses
            .filter((exp) => exp.status === 'submitted')
            .reduce((sum, exp) => sum + (exp.amount || 0), 0);

          if (empExpenses.length > 0) {
            totalPending += empPendingCount;
            totalApproved += empExpenses.filter(
              (exp) => exp.status === 'approved'
            ).length;
            totalAmount += empTotalAmount;
            pendingAmount += empPendingAmount;

            employeeExpenses.push({
              employee_id: employee.id,
              employee_name:
                `${employee.first_name || ''} ${
                  employee.last_name || ''
                }`.trim() || 'Unknown',
              employee_email: employee.email,
              department: employee.department,
              expenses: empExpenses,
              totalAmount: empTotalAmount,
              pendingCount: empPendingCount,
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
            expanded: false,
          });
        }
      }

      // Add unassigned employees
      const unassignedEmployees =
        employees?.filter((emp) => !emp.client_id) || [];
      if (unassignedEmployees.length > 0) {
        const employeeExpenses: EmployeeExpenses[] = [];
        let totalPending = 0;
        let totalApproved = 0;
        let totalAmount = 0;
        let pendingAmount = 0;

        for (const employee of unassignedEmployees) {
          const empExpenses =
            expenses?.filter((exp) => exp.employee_id === employee.id) || [];
          const empTotalAmount = empExpenses.reduce(
            (sum, exp) => sum + (exp.amount || 0),
            0
          );
          const empPendingCount = empExpenses.filter(
            (exp) => exp.status === 'submitted'
          ).length;
          const empPendingAmount = empExpenses
            .filter((exp) => exp.status === 'submitted')
            .reduce((sum, exp) => sum + (exp.amount || 0), 0);

          if (empExpenses.length > 0) {
            totalPending += empPendingCount;
            totalApproved += empExpenses.filter(
              (exp) => exp.status === 'approved'
            ).length;
            totalAmount += empTotalAmount;
            pendingAmount += empPendingAmount;

            employeeExpenses.push({
              employee_id: employee.id,
              employee_name:
                `${employee.first_name || ''} ${
                  employee.last_name || ''
                }`.trim() || 'Unknown',
              employee_email: employee.email,
              department: employee.department,
              expenses: empExpenses,
              totalAmount: empTotalAmount,
              pendingCount: empPendingCount,
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
            expanded: false,
          });
        }
      }

      // Apply admin context filters
      let filteredGroups = groups;
      if (selectedClientId) {
        filteredGroups = filteredGroups.filter(g => g.client_id === selectedClientId);
      }
      if (selectedDepartmentId) {
        filteredGroups = filteredGroups.map(g => {
          const filteredEmployees = g.expenses.filter(ee => {
            const emp = employees?.find(e => e.id === ee.employee_id);
            return (emp as any)?.department_id === selectedDepartmentId;
          });
          const totalAmount = filteredEmployees.reduce((s, ee) => s + ee.totalAmount, 0);
          const totalPending = filteredEmployees.reduce((s, ee) => s + ee.pendingCount, 0);
          const totalApproved = filteredEmployees.reduce((s, ee) => s + ee.expenses.filter(exp => exp.status === 'approved').length, 0);
          const pendingAmount = filteredEmployees.reduce((s, ee) => s + ee.expenses.filter(exp => exp.status === 'submitted').reduce((sum, exp) => sum + (exp.amount || 0), 0), 0);
          return { ...g, expenses: filteredEmployees, totalAmount, totalPending, totalApproved, pendingAmount };
        }).filter(g => g.expenses.length > 0);
      }

      setClientGroups(filteredGroups);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleClientExpanded = (clientId: string) => {
    setClientGroups((groups) =>
      groups.map((group) =>
        group.client_id === clientId
          ? { ...group, expanded: !group.expanded }
          : group
      )
    );
  };

  // APPROVE via /api/expenses/[id]/status so emails fire
  const handleApproveExpense = async () => {
    if (!selectedExpense) return;
    setProcessing(true);

    try {
      const res = await fetch(`/api/expenses/${selectedExpense.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error('Error approving expense:', body);
        toast('error', body.error || 'Failed to approve expense.');
        return;
      }

      toast('success', 'Expense approved successfully.');
      await fetchExpenses();
      setSelectedExpense(null);
    } catch (error) {
      console.error('Error approving expense:', error);
      toast('error', 'Network error approving expense.');
    } finally {
      setProcessing(false);
    }
  };

  // REJECT via modal
  const promptRejectExpense = () => {
    if (!selectedExpense) return;
    setRejectModalOpen(true);
  };

  const handleRejectExpenseWithReason = async (reason: string) => {
    if (!selectedExpense) return;
    setProcessing(true);

    try {
      const res = await fetch(`/api/expenses/${selectedExpense.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          rejectionReason: reason,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error('Error rejecting expense report:', body);
        toast('error', body.error || 'Failed to reject expense report.');
        return;
      }

      toast('success', 'Expense rejected.');
      await fetchExpenses();
      setSelectedExpense(null);
    } catch (err) {
      console.error('Error rejecting expense report:', err);
      toast('error', 'Network error rejecting expense report.');
    } finally {
      setProcessing(false);
      setRejectModalOpen(false);
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
      notes: expense.comments,
    };

    setSelectedExpense(expenseDetail);
  };

  const promptBulkApprove = (clientId: string) => {
    setBulkApproveClientId(clientId);
    setBulkApproveModalOpen(true);
  };

  const handleBulkApprove = async () => {
    if (!bulkApproveClientId) return;

    try {
      const client = clientGroups.find((g) => g.client_id === bulkApproveClientId);
      if (!client) return;

      const pendingExpenses = client.expenses
        .flatMap((emp) => emp.expenses)
        .filter((exp) => exp.status === 'submitted');

      if (pendingExpenses.length === 0) {
        toast('info', 'No pending expenses to approve.');
        setBulkApproveModalOpen(false);
        setBulkApproveClientId(null);
        return;
      }

      setProcessing(true);
      let succeeded = 0;
      let failed = 0;

      for (let i = 0; i < pendingExpenses.length; i++) {
        setBulkProgress({ current: i + 1, total: pendingExpenses.length });
        try {
          const res = await fetch(`/api/expenses/${pendingExpenses[i].id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'approve' }),
          });
          if (res.ok) succeeded++;
          else failed++;
        } catch {
          failed++;
        }
      }

      if (failed === 0) {
        toast('success', `All ${succeeded} expenses approved.`);
      } else {
        toast('warning', `Approved ${succeeded}, failed ${failed}.`);
      }

      await fetchExpenses();
    } catch (error) {
      console.error('Error bulk approving:', error);
      toast('error', 'Error during bulk approve.');
    } finally {
      setProcessing(false);
      setBulkProgress(null);
      setBulkApproveModalOpen(false);
      setBulkApproveClientId(null);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Client',
      'Employee',
      'Department',
      'Date',
      'Category',
      'Amount',
      'Status',
      'Description',
    ];
    const rows: string[][] = [];

    clientGroups.forEach((group) => {
      group.expenses.forEach((emp) => {
        emp.expenses.forEach((exp) => {
          rows.push([
            group.client_name,
            emp.employee_name,
            emp.department || '',
            exp.expense_date,
            exp.category,
            exp.amount.toString(),
            exp.status,
            exp.description || '',
          ]);
        });
      });
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
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
    newDate.setMonth(
      newDate.getMonth() + (direction === 'next' ? 1 : -1)
    );
    setSelectedMonth(newDate);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      travel: MapPin,
      meals: CreditCard,
      supplies: Briefcase,
      equipment: Building,
      other: Receipt,
    };
    const Icon = icons[category.toLowerCase()] || Receipt;
    return <Icon className="h-4 w-4" style={{ color: '#c0bab2' }} />;
  };

  // Get unique categories from all expenses
  const categories = Array.from(
    new Set(
      clientGroups.flatMap((g) =>
        g.expenses.flatMap((e) => e.expenses.map((exp) => exp.category))
      )
    )
  );

  // Skeleton loading
  if (loading) {
    return (
      <div style={{ padding: '36px 40px' }}>
        <div className="mb-6">
          <div className="anim-shimmer" style={{ width: 120, height: 24, borderRadius: 6, marginBottom: 8 }} />
          <div className="anim-shimmer" style={{ width: 300, height: 14, borderRadius: 4 }} />
        </div>

        {/* Tab skeleton */}
        <div className="flex items-center gap-6 mb-6" style={{ borderBottom: '0.5px solid #f0ece7', paddingBottom: 10 }}>
          {[30, 60, 70].map((w, i) => (
            <div key={i} className="anim-shimmer" style={{ width: w, height: 12, borderRadius: 3 }} />
          ))}
        </div>

        {/* Controls skeleton */}
        <div className="anim-slide-up stagger-1" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '16px 22px', marginBottom: 24 }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="anim-shimmer" style={{ width: 24, height: 24, borderRadius: 4 }} />
              <div className="anim-shimmer" style={{ width: 140, height: 18, borderRadius: 4 }} />
              <div className="anim-shimmer" style={{ width: 24, height: 24, borderRadius: 4 }} />
            </div>
            <div className="flex items-center gap-3">
              <div className="anim-shimmer" style={{ width: 120, height: 28, borderRadius: 7 }} />
              <div className="anim-shimmer" style={{ width: 80, height: 28, borderRadius: 7 }} />
            </div>
          </div>
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className={`anim-slide-up stagger-${n}`} style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '22px 24px' }}>
              <div className="anim-shimmer" style={{ width: 80, height: 8, borderRadius: 3, marginBottom: 12 }} />
              <div className="anim-shimmer" style={{ width: 60, height: 28, borderRadius: 4 }} />
            </div>
          ))}
        </div>

        {/* Client group skeletons */}
        {[1, 2].map(n => (
          <div key={n} className={`anim-slide-up stagger-${n + 4}`} style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '16px 22px', marginBottom: 16 }}>
            <div className="flex items-center gap-3">
              <div className="anim-shimmer" style={{ width: 20, height: 20, borderRadius: 4 }} />
              <div className="anim-shimmer" style={{ width: 20, height: 20, borderRadius: 4 }} />
              <div>
                <div className="anim-shimmer" style={{ width: 140, height: 14, borderRadius: 4, marginBottom: 4 }} />
                <div className="anim-shimmer" style={{ width: 80, height: 10, borderRadius: 3 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const totalPendingCount = clientGroups.reduce(
    (sum, g) => sum + g.totalPending,
    0
  );
  const totalPendingAmount = clientGroups.reduce(
    (sum, g) => sum + g.pendingAmount,
    0
  );
  const totalApprovedCount = clientGroups.reduce(
    (sum, g) => sum + g.totalApproved,
    0
  );
  const totalAmount = clientGroups.reduce(
    (sum, g) => sum + g.totalAmount,
    0
  );

  return (
    <>
      {/* Main Content */}
      <div style={{ padding: '36px 40px' }}>
        {/* Page Header */}
        <div className="mb-6 anim-slide-up stagger-1">
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', letterSpacing: -0.3 }}>Expenses</h1>
          <p style={{ fontSize: 13, fontWeight: 400, color: '#999' }}>Review and approve employee expense reports</p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-6 mb-6 anim-slide-up stagger-1" style={{ borderBottom: '0.5px solid #f0ece7' }}>
          {([
            { key: 'all', label: 'All' },
            { key: 'pending', label: 'Pending' },
            { key: 'approved', label: 'Approved' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key as any)}
              style={{
                fontSize: 12,
                fontWeight: filterStatus === tab.key ? 600 : 400,
                color: filterStatus === tab.key ? '#1a1a1a' : '#999',
                borderBottom: filterStatus === tab.key ? '2px solid #e31c79' : '2px solid transparent',
                paddingBottom: 10,
                transition: 'color 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Controls Bar */}
        <div className="anim-slide-up stagger-2" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '16px 22px', marginBottom: 24 }}>
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => changeMonth('prev')}
                className="p-2 hover:bg-[#FDFCFB] rounded-lg transition-colors"
              >
                <ChevronLeft className="h-4 w-4" style={{ color: '#777' }} />
              </button>
              <div className="text-center">
                <p style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1.2, color: '#c0bab2' }}>Month</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                  {selectedMonth.toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <button
                onClick={() => changeMonth('next')}
                className="p-2 hover:bg-[#FDFCFB] rounded-lg transition-colors"
              >
                <ChevronRight className="h-4 w-4" style={{ color: '#777' }} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12, padding: '6px 10px' }}
                className="focus:outline-none focus:border-[#d3ad6b] focus:shadow-[0_0_0_3px_rgba(211,173,107,0.08)]"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 transition-colors"
                style={{ padding: '8px 18px', background: '#fff', border: '0.5px solid #e0dcd7', color: '#777', borderRadius: 7, fontSize: 12, fontWeight: 600 }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d3ad6b'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e0dcd7'; }}
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Expenses', value: formatCurrency(totalAmount), accent: true },
            { label: 'Pending Approval', value: totalPendingCount, sub: formatCurrency(totalPendingAmount), pink: true },
            { label: 'Approved', value: totalApprovedCount },
            { label: 'Clients', value: clientGroups.length },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={`anim-slide-up stagger-${i + 1}`}
              style={{
                background: '#fff',
                border: '0.5px solid #e8e4df',
                borderRadius: 10,
                padding: '22px 24px',
                transition: 'border-color 0.15s ease',
                cursor: 'default',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = i === 0 ? '#e31c79' : '#d3ad6b' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e8e4df' }}
            >
              <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1.2, color: '#c0bab2' }}>{stat.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: stat.pink ? '#e31c79' : '#1a1a1a' }}>
                {stat.value}
              </div>
              {stat.sub && (
                <div style={{ fontSize: 11, color: '#999' }}>
                  {stat.sub}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Client Groups */}
        <div className="space-y-4">
          {clientGroups.length === 0 ? (
            <div className="anim-slide-up stagger-5" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: 32, textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#999' }}>No expenses found for this month.</p>
            </div>
          ) : (
            clientGroups.map((group, groupIdx) => (
              <div
                key={group.client_id}
                className={`overflow-hidden anim-slide-up stagger-${Math.min(groupIdx + 5, 6)}`}
                style={{
                  background: '#fff',
                  border: '0.5px solid #e8e4df',
                  borderRadius: 10,
                }}
              >
                {/* Client Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-[#FDFCFB] transition-colors"
                  onClick={() => toggleClientExpanded(group.client_id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {group.expanded ? (
                        <ChevronDown className="h-5 w-5" style={{ color: '#c0bab2' }} />
                      ) : (
                        <ChevronRight className="h-5 w-5" style={{ color: '#c0bab2' }} />
                      )}
                      <Building2 className="h-5 w-5" style={{ color: '#e31c79' }} />
                      <div>
                        <h3 style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                          {group.client_name}
                        </h3>
                        <p style={{ fontSize: 10.5, color: '#c0bab2' }}>
                          {formatCurrency(group.totalAmount)} total
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {group.totalPending > 0 && (
                        <>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 9,
                            fontWeight: 500,
                            borderRadius: 3,
                            padding: '2px 8px',
                            background: 'rgba(196,152,58,0.08)',
                            color: '#c4983a',
                          }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#c4983a' }} />
                            {group.totalPending} pending ({formatCurrency(group.pendingAmount)})
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              promptBulkApprove(group.client_id);
                            }}
                            style={{ padding: '4px 12px', fontSize: 10, fontWeight: 600, background: '#e31c79', color: '#fff', borderRadius: 5 }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#cc1069'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#e31c79'; }}
                          >
                            Approve All
                          </button>
                        </>
                      )}
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 9,
                        fontWeight: 500,
                        borderRadius: 3,
                        padding: '2px 8px',
                        background: 'rgba(45,155,110,0.08)',
                        color: '#2d9b6e',
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#2d9b6e' }} />
                        {group.totalApproved} approved
                      </span>
                    </div>
                  </div>
                </div>

                {/* Employee Expenses */}
                {group.expanded && (
                  <div style={{ borderTop: '0.5px solid #f0ece7' }}>
                    <table className="w-full">
                      <thead>
                        <tr>
                          {['Employee', 'Department', 'Expenses', 'Total Amount', 'Actions'].map(h => (
                            <th
                              key={h}
                              className="text-left"
                              style={{ padding: '11px 20px', fontSize: 9, fontWeight: 500, letterSpacing: 1.2, color: '#c0bab2', textTransform: 'uppercase', borderBottom: '0.5px solid #f0ece7' }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {group.expenses.map((employee) => (
                          <tr key={employee.employee_id} className="hover:bg-[#FDFCFB]" style={{ borderBottom: '0.5px solid #f5f2ee', transition: 'background 0.15s ease' }}>
                            <td style={{ padding: '12px 20px' }}>
                              <div>
                                <p style={{ fontSize: 12.5, fontWeight: 500, color: '#1a1a1a' }}>
                                  {employee.employee_name}
                                </p>
                                <p style={{ fontSize: 10.5, color: '#c0bab2' }}>
                                  {employee.employee_email}
                                </p>
                              </div>
                            </td>
                            <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#555' }}>
                              {employee.department || '-'}
                            </td>
                            <td style={{ padding: '12px 20px' }}>
                              <div className="space-y-1">
                                {employee.expenses.slice(0, 3).map((exp) => {
                                  const badge = statusConfig[exp.status] || statusConfig.draft;
                                  return (
                                    <div
                                      key={exp.id}
                                      className="flex items-center gap-2"
                                    >
                                      {getCategoryIcon(exp.category)}
                                      <span style={{ fontSize: 11, color: '#777' }}>
                                        {formatDate(exp.expense_date)} -{' '}
                                        {formatCurrency(exp.amount)}
                                      </span>
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 4,
                                          fontSize: 9,
                                          fontWeight: 500,
                                          borderRadius: 3,
                                          padding: '2px 8px',
                                          background: badge.bg,
                                          color: badge.text,
                                        }}
                                      >
                                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: badge.dot }} />
                                        {badge.label}
                                      </span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openExpenseDetail(exp, employee);
                                        }}
                                        className="ml-auto p-1 rounded transition-colors"
                                        style={{ color: '#777' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = '#FDFCFB'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                      >
                                        <Eye className="h-3 w-3" />
                                      </button>
                                    </div>
                                  );
                                })}
                                {employee.expenses.length > 3 && (
                                  <p style={{ fontSize: 10.5, color: '#c0bab2' }}>
                                    +{employee.expenses.length - 3} more
                                  </p>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '12px 20px', fontSize: 12.5, fontWeight: 500, color: '#1a1a1a' }}>
                              {formatCurrency(employee.totalAmount)}
                              {employee.pendingCount > 0 && (
                                <span style={{ display: 'block', fontSize: 10.5, color: '#c4983a' }}>
                                  {employee.pendingCount} pending
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '12px 20px' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (employee.expenses.length > 0) {
                                    openExpenseDetail(
                                      employee.expenses[0],
                                      employee
                                    );
                                  }
                                }}
                                style={{ fontSize: 12, fontWeight: 500, color: '#e31c79' }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = '#cc1069'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = '#e31c79'; }}
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
          onReject={promptRejectExpense}
          processing={processing}
        />
      )}

      {/* Reject reason modal */}
      <ConfirmModal
        open={rejectModalOpen}
        title="Reject Expense"
        message={`Enter a reason for rejecting "${selectedExpense?.description || selectedExpense?.category || 'this expense'}":`}
        confirmLabel="Reject"
        variant="danger"
        inputLabel="Rejection Reason"
        inputPlaceholder="Enter the reason for rejection..."
        inputRequired
        onConfirm={(reason) => handleRejectExpenseWithReason(reason || '')}
        onCancel={() => setRejectModalOpen(false)}
      />

      {/* Bulk approve confirm */}
      <ConfirmModal
        open={bulkApproveModalOpen}
        title="Bulk Approve Expenses"
        message="Approve all pending expenses for this client? This action cannot be undone."
        confirmLabel={bulkProgress ? `Approving ${bulkProgress.current} of ${bulkProgress.total}...` : 'Approve All'}
        onConfirm={handleBulkApprove}
        onCancel={() => { setBulkApproveModalOpen(false); setBulkApproveClientId(null); }}
      />
    </>
  );
}
