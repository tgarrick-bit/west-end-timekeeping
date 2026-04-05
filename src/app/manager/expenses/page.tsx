'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  Eye,
  Receipt,
  Search,
  AlertCircle,
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

const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    submitted: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    draft: 'bg-gray-50 text-gray-600 border-gray-200',
  };
  const cls = colors[status] || 'bg-gray-50 text-gray-600 border-gray-200';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 border font-medium ${cls}`}
      style={{ fontSize: 9, borderRadius: 3 }}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="text-center py-16">
    <Receipt className="mx-auto h-8 w-8" style={{ color: '#ccc' }} />
    <p className="mt-3" style={{ fontSize: 13, color: '#999' }}>
      {message}
    </p>
  </div>
);

export default function ExpenseApprovalPage() {
  const [reports, setReports] = useState<ExpenseReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'submitted' | 'approved' | 'rejected'
  >('all');
  const [searchTerm, setSearchTerm] = useState('');

  const supabase = createSupabaseClient();
  const router = useRouter();

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

  const filteredReports = getFilteredReports();

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'submitted', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin" width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="8" stroke="rgba(227, 28, 121, 0.15)" strokeWidth="2" />
            <path d="M19 11a8 8 0 00-8-8" stroke="#e31c79" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p className="text-[13px]" style={{ color: '#bbb' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '36px 40px' }}>
      {/* Page title */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
          Expense Reports
        </h1>
        <p style={{ fontSize: 13, fontWeight: 400, color: '#bbb', marginTop: 4 }}>
          Review and approve employee expense reports
        </p>
      </div>

      {/* Underline filter tabs */}
      <div style={{ display: 'flex', gap: 20, borderBottom: '1px solid #f0ede8', marginBottom: 20 }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key as any)}
            style={{
              fontSize: 12,
              fontWeight: statusFilter === tab.key ? 600 : 400,
              color: statusFilter === tab.key ? '#1a1a1a' : '#999',
              background: 'none',
              border: 'none',
              borderBottom: statusFilter === tab.key ? '2px solid #e31c79' : '2px solid transparent',
              paddingBottom: 10,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative', maxWidth: 360 }}>
          <Search
            className="absolute"
            style={{ left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#bbb' }}
          />
          <input
            type="text"
            placeholder="Search by employee or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: 32,
              paddingRight: 12,
              paddingTop: 8,
              paddingBottom: 8,
              border: '0.5px solid #e8e4df',
              borderRadius: 7,
              fontSize: 12,
              color: '#555',
              outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#d3ad6b')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#e8e4df')}
          />
        </div>
      </div>

      {/* Data card */}
      <div
        style={{
          background: '#fff',
          border: '0.5px solid #e8e4df',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        {filteredReports.length === 0 ? (
          <EmptyState message="No expense reports found" />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Employee', 'Title', 'Period', 'Status', 'Total', 'Actions'].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '12px 20px',
                      fontSize: 9,
                      fontWeight: 500,
                      letterSpacing: 1,
                      color: '#ccc',
                      textTransform: 'uppercase',
                      borderBottom: '0.5px solid #f5f2ee',
                      background: 'transparent',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => {
                const emp = report.employees?.[0] || null;
                const name =
                  (emp?.first_name || '') +
                  ' ' +
                  (emp?.last_name || '');

                return (
                  <tr
                    key={report.id}
                    style={{ borderBottom: '0.5px solid #f5f2ee', cursor: 'default' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#FDFCFB')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontSize: 12.5, fontWeight: 400, color: '#555' }}>
                        {name.trim() || '\u2014'}
                      </div>
                      <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>
                        {emp?.email || ''}
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: 12.5, fontWeight: 400, color: '#555' }}>
                      {report.title}
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: 12.5, fontWeight: 400, color: '#555' }}>
                      {formatPeriod(report.period_month, report.created_at)}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <StatusBadge status={report.status} />
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: 12.5, fontWeight: 500, color: '#555' }}>
                      {formatCurrency(report.total_amount || 0)}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <button
                        onClick={() => handleViewExpenseReport(report.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#999',
                          cursor: 'pointer',
                          padding: 4,
                        }}
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
  );
}
