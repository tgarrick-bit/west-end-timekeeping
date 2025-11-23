'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  DollarSign,
  Eye,
  ChevronLeft,
  Receipt,
  Clock,
  Search,
  Check,
} from 'lucide-react';

interface ExpenseReportRow {
  id: string;
  employee_id: string;
  title: string;
  period_month: string | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  total_amount: number;
  submitted_at: string | null;
  created_at: string;
  employees:
    | {
        first_name: string | null;
        last_name: string | null;
        email: string | null;
      }[]
    | null;
}

export default function ExpenseApprovalPage() {
  const [reports, setReports] = useState<ExpenseReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'submitted' | 'approved' | 'rejected'
  >('submitted');
  const [searchTerm, setSearchTerm] = useState('');

  const supabase = createSupabaseClient();
  const router = useRouter();

  // ---------------------------------------------------------
  // LOAD EXPENSE REPORTS
  // ---------------------------------------------------------
  const loadReports = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('expense_reports')
        .select(
          `
          id,
          employee_id,
          title,
          period_month,
          status,
          total_amount,
          submitted_at,
          created_at,
          employees:employee_id (
            first_name,
            last_name,
            email
          )
        `
        )
        .order('submitted_at', { ascending: false })
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading expense reports:', error);
      } else if (data) {
        setReports(data as ExpenseReportRow[]);
      }
    } catch (error) {
      console.error('Error loading expense reports:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // ---------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------
  const handleViewExpenseReport = (reportId: string) => {
    router.push(`/manager/expense/${reportId}`);
  };

  const getFilteredReports = () => {
    return reports.filter((report) => {
      const emp = report.employees?.[0] || null;
      const fullName =
        (emp?.first_name || '') + ' ' + (emp?.last_name || '');
      const email = emp?.email || '';

      const matchesSearch =
        searchTerm === '' ||
        fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.title.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatPeriod = (period_month: string | null, created_at: string) => {
    return period_month ? formatDate(period_month) : formatDate(created_at);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusBadgeClass = (status: ExpenseReportRow['status']): string => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // ---------------------------------------------------------
  // SUMMARY COUNTS
  // ---------------------------------------------------------
  const filteredReports = getFilteredReports();
  const totalAmount = filteredReports.reduce(
    (sum, r) => sum + (r.total_amount || 0),
    0
  );

  const pendingCount = reports.filter((r) => r.status === 'submitted').length;
  const approvedCount = reports.filter((r) => r.status === 'approved').length;
  const rejectedCount = reports.filter((r) => r.status === 'rejected').length;

  // ---------------------------------------------------------
  // LOADING STATE
  // ---------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e31c79] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading expense reports...</p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // PAGE LAYOUT
  // ---------------------------------------------------------
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
                <h1 className="text-2xl font-bold">Expense Reports</h1>
                <p className="text-sm text-gray-300">
                  Review and approve employee expense reports
                </p>
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

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Total Reports */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Reports</p>
                <p className="text-2xl font-bold text-gray-900">
                  {reports.length}
                </p>
              </div>
              <Receipt className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          {/* Pending */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {pendingCount}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          {/* Approved */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">
                  {approvedCount}
                </p>
              </div>
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </div>

          {/* Total Amount */}
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

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by employee or report title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-[#e31c79] focus:border-[#e31c79]"
                  />
                </div>
              </div>

              {/* Status Filters */}
              <div className="flex gap-2">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'submitted', label: `Pending (${pendingCount})` },
                  { key: 'approved', label: 'Approved' },
                  { key: 'rejected', label: 'Rejected' },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() =>
                      setStatusFilter(item.key as any)
                    }
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      statusFilter === item.key
                        ? 'bg-[#e31c79] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Reports Table */}
          <div className="overflow-x-auto">
            {filteredReports.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Receipt className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No expense reports found</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                      Employee
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                      Title
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                      Period / Created
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                      Total
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {filteredReports.map((report) => {
                    const emp = report.employees?.[0] || null;
                    const name =
                      (emp?.first_name || '') +
                      ' ' +
                      (emp?.last_name || '');

                    return (
                      <tr key={report.id} className="hover:bg-gray-50">
                        {/* EMPLOYEE */}
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900">
                              {name.trim() || '—'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {emp?.email || ''}
                            </p>
                          </div>
                        </td>

                        {/* TITLE */}
                        <td className="py-3 px-4 text-sm">
                          {report.title}
                        </td>

                        {/* PERIOD */}
                        <td className="py-3 px-4 text-sm">
                          {formatPeriod(
                            report.period_month,
                            report.created_at
                          )}
                        </td>

                        {/* STATUS */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(
                              report.status
                            )}`}
                          >
                            {report.status.charAt(0).toUpperCase() +
                              report.status.slice(1)}
                          </span>
                        </td>

                        {/* TOTAL */}
                        <td className="py-3 px-4 font-semibold">
                          {formatCurrency(report.total_amount || 0)}
                        </td>

                        {/* ACTIONS */}
                        <td className="py-3 px-4">
                          <button
                            onClick={() =>
                              handleViewExpenseReport(report.id)
                            }
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="View Report"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
