'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { Wallet, Download, CalendarDays, Clock, TrendingUp, Filter } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonStats, SkeletonList } from '@/components/ui/Skeleton';

interface PayRecord {
  id: string;
  week_ending: string;
  total_hours: number;
  overtime_hours: number | null;
  status: string;
  approved_at: string | null;
  submitted_at: string | null;
}

export default function PayHistoryPage() {
  const [records, setRecords] = useState<PayRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const mounted = useRef(true);

  const supabase = createSupabaseClient();

  // Default date range: Jan 1 of current year to today
  useEffect(() => {
    const now = new Date();
    const yearStart = `${now.getFullYear()}-01-01`;
    const today = now.toISOString().split('T')[0];
    setDateFrom(yearStart);
    setDateTo(today);
  }, []);

  useEffect(() => {
    mounted.current = true;
    if (dateFrom && dateTo) loadPayHistory();
    return () => { mounted.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  const loadPayHistory = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('timesheets')
        .select('id, week_ending, total_hours, overtime_hours, status, approved_at, submitted_at')
        .eq('employee_id', user.id)
        .in('status', ['approved', 'payroll_approved', 'submitted', 'draft', 'rejected'])
        .gte('week_ending', dateFrom)
        .lte('week_ending', dateTo)
        .order('week_ending', { ascending: false });

      if (error) {
        console.error('Error loading pay history:', error);
        return;
      }

      if (mounted.current) setRecords(data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      if (mounted.current) setIsLoading(false);
    }
  };

  // Filter finalized records for stats
  const finalizedRecords = useMemo(
    () => records.filter(r => r.status === 'approved' || r.status === 'payroll_approved'),
    [records],
  );

  const stats = useMemo(() => {
    const totalHours = finalizedRecords.reduce((s, r) => s + (r.total_hours || 0), 0);
    const totalWeeks = finalizedRecords.length;
    const avgHours = totalWeeks > 0 ? totalHours / totalWeeks : 0;
    return { totalHours, totalWeeks, avgHours };
  }, [finalizedRecords]);

  const exportToExcel = () => {
    if (records.length === 0) return;

    const headers = ['Week Ending', 'Total Hours', 'Overtime Hours', 'Status', 'Submitted', 'Approved'];
    const csvRows = [headers.join(',')];

    for (const r of records) {
      csvRows.push([
        r.week_ending,
        r.total_hours?.toFixed(1) || '0',
        r.overtime_hours?.toFixed(1) || '0',
        r.status,
        r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : '',
        r.approved_at ? new Date(r.approved_at).toLocaleDateString() : '',
      ].join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pay-history-${dateFrom}-to-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatWeekEnding = (d: string) => {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatApproved = (d: string | null) => {
    if (!d) return '--';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{ padding: '36px 40px' }}>
      {/* Header */}
      <div className="anim-fade-in stagger-1" style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', letterSpacing: -0.3 }}>Pay History</h1>
          <p style={{ fontSize: 13, fontWeight: 400, color: '#999', marginTop: 2 }}>Review your submitted timesheets and hours</p>
        </div>
        <button
          onClick={exportToExcel}
          disabled={records.length === 0}
          className="flex items-center gap-1.5 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ padding: '8px 16px', fontSize: 11, fontWeight: 600, color: '#fff', background: '#e31c79', borderRadius: 6, border: 'none' }}
          onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = '#cc1069'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#e31c79'; }}
        >
          <Download size={13} strokeWidth={1.5} />
          Export CSV
        </button>
      </div>

      {/* Date Filter */}
      <div className="anim-fade-in stagger-2" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '14px 22px', marginBottom: 16 }}>
        <div className="flex items-center gap-4 flex-wrap">
          <Filter size={13} strokeWidth={1.5} style={{ color: '#c0bab2' }} />
          <div className="flex items-center gap-2">
            <label style={{ fontSize: 10, fontWeight: 500, color: '#c0bab2', textTransform: 'uppercase' as const, letterSpacing: 1 }}>From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 border border-[#e8e4df] rounded-md text-sm focus:ring-2 focus:ring-[#d3ad6b] focus:border-[#d3ad6b] focus:outline-none"
              style={{ fontSize: 12, color: '#1a1a1a' }}
            />
          </div>
          <div className="flex items-center gap-2">
            <label style={{ fontSize: 10, fontWeight: 500, color: '#c0bab2', textTransform: 'uppercase' as const, letterSpacing: 1 }}>To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 border border-[#e8e4df] rounded-md text-sm focus:ring-2 focus:ring-[#d3ad6b] focus:border-[#d3ad6b] focus:outline-none"
              style={{ fontSize: 12, color: '#1a1a1a' }}
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="mb-4"><SkeletonStats count={3} /></div>
      ) : (
        <div className="anim-fade-in stagger-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 16 }}>
          <StatCard label="Total Hours YTD" value={stats.totalHours.toFixed(1)} desc="Approved hours" color="pink" />
          <StatCard label="Weeks Submitted" value={stats.totalWeeks} desc="Finalized timesheets" color="gold" />
          <StatCard label="Avg Hours / Week" value={stats.avgHours.toFixed(1)} desc="Based on finalized" color="green" />
        </div>
      )}

      {/* Records Table */}
      {isLoading ? (
        <SkeletonList rows={6} />
      ) : records.length === 0 ? (
        <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10 }}>
          <EmptyState icon={Wallet} title="No timesheets found" description="No timesheets in the selected date range." />
        </div>
      ) : (
        <div className="anim-fade-in stagger-4" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['Week Ending', 'Total Hours', 'Overtime', 'Status', 'Submitted', 'Approved'].map((h) => (
                    <th key={h} className="text-left px-5 py-3" style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: i < records.length - 1 ? '0.5px solid #f5f2ee' : 'none' }}>
                    <td className="px-5 py-3" style={{ fontSize: 12.5, fontWeight: 500, color: '#1a1a1a' }}>
                      <div className="flex items-center gap-2">
                        <CalendarDays size={13} strokeWidth={1.5} style={{ color: '#c0bab2' }} />
                        {formatWeekEnding(r.week_ending)}
                      </div>
                    </td>
                    <td className="px-5 py-3" style={{ fontSize: 12.5, fontWeight: 600, color: '#1a1a1a' }}>
                      {r.total_hours?.toFixed(1) || '0.0'}
                    </td>
                    <td className="px-5 py-3" style={{ fontSize: 12.5, fontWeight: 500, color: (r.overtime_hours || 0) > 0 ? '#c4983a' : '#c0bab2' }}>
                      {r.overtime_hours?.toFixed(1) || '0.0'}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-5 py-3" style={{ fontSize: 11, color: '#999' }}>
                      {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '--'}
                    </td>
                    <td className="px-5 py-3" style={{ fontSize: 11, color: '#999' }}>
                      {formatApproved(r.approved_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <div className="md:hidden">
            {records.map((r, i) => (
              <div key={r.id} style={{ padding: '14px 18px', borderBottom: i < records.length - 1 ? '0.5px solid #f5f2ee' : 'none' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1a1a1a' }}>
                    {formatWeekEnding(r.week_ending)}
                  </span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ fontSize: 11, color: '#999' }}>
                    <Clock size={11} strokeWidth={1.5} style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }} />
                    {r.total_hours?.toFixed(1)} hrs
                  </span>
                  {(r.overtime_hours || 0) > 0 && (
                    <span style={{ fontSize: 11, color: '#c4983a' }}>
                      OT: {r.overtime_hours?.toFixed(1)}
                    </span>
                  )}
                  <span style={{ fontSize: 10, color: '#c0bab2', marginLeft: 'auto' }}>
                    {formatApproved(r.approved_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
