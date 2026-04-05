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
  const colorMap: Record<string, { bg: string; color: string; border: string }> = {
    submitted: { bg: '#FFF8E1', color: '#c4983a', border: '#c4983a' },
    approved: { bg: '#ecfdf5', color: '#2d9b6e', border: '#2d9b6e' },
    rejected: { bg: '#fef2f2', color: '#b91c1c', border: '#b91c1c' },
    draft: { bg: '#FAFAF8', color: '#777', border: '#e8e4df' },
  };
  const c = colorMap[status] || { bg: '#FAFAF8', color: '#777', border: '#e8e4df' };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        fontSize: 9,
        fontWeight: 500,
        borderRadius: 3,
        background: c.bg,
        color: c.color,
        border: `0.5px solid ${c.border}`,
      }}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="text-center py-16">
    <Receipt className="mx-auto h-8 w-8" style={{ color: '#c0bab2' }} />
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
    const shimmer: React.CSSProperties = {
      background: 'linear-gradient(90deg, #f5f2ee 25%, #ece8e3 50%, #f5f2ee 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      borderRadius: 4,
    };
    return (
      <div style={{ padding: '36px 40px' }}>
        <style dangerouslySetInnerHTML={{ __html: '@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }' }} />
        <div style={{ ...shimmer, width: 220, height: 24 }} />
        <div style={{ ...shimmer, width: 260, height: 13, marginTop: 8 }} />
        <div style={{ ...shimmer, width: '100%', height: 36, marginTop: 28, borderRadius: 0 }} />
        <div style={{ ...shimmer, width: 360, height: 36, marginTop: 16, borderRadius: 7 }} />
        <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, marginTop: 16, overflow: 'hidden' }}>
          <div style={{ ...shimmer, width: '100%', height: 36, borderRadius: 0 }} />
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{ ...shimmer, width: '100%', height: 52, borderRadius: 0, marginTop: 1, animationDelay: `${i * 0.1}s` }} />
          ))}
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
        <p style={{ fontSize: 13, fontWeight: 400, color: '#999', marginTop: 4 }}>
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
            style={{ left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#999' }}
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
                      color: '#c0bab2',
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
                      <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
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
