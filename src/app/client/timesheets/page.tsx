'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import TimesheetModal from '@/components/TimesheetModal';
import {
  Clock,
  Search,
  Download,
  Eye,
  Check,
  X,
} from 'lucide-react';
import { format } from 'date-fns';

interface Timesheet {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  week_ending: string;
  total_hours: number;
  overtime_hours: number;
  status: string;
  submitted_at: string | null;
  approved_at: string | null;
  comments: string | null;
  rejection_reason: string | null;
}

const statusConfig: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  submitted: { dot: '#c4983a', bg: 'rgba(196,152,58,0.08)', text: '#c4983a', label: 'Pending' },
  approved: { dot: '#2d9b6e', bg: 'rgba(45,155,110,0.08)', text: '#2d9b6e', label: 'Approved' },
  client_approved: { dot: '#2d9b6e', bg: 'rgba(45,155,110,0.08)', text: '#2d9b6e', label: 'Client Approved' },
  rejected: { dot: '#b91c1c', bg: 'rgba(185,28,28,0.08)', text: '#b91c1c', label: 'Rejected' },
  draft: { dot: '#c0bab2', bg: 'rgba(192,186,178,0.08)', text: '#999', label: 'Draft' },
  payroll_approved: { dot: '#059669', bg: 'rgba(5,150,105,0.08)', text: '#059669', label: 'Finalized' },
};

type StatusFilter = 'all' | 'submitted' | 'approved' | 'rejected';

export default function ClientTimesheets() {
  const { employee } = useAuth();
  const supabase = createClient();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [processing, setProcessing] = useState<string | null>(null);

  // Reject modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);

  // Timesheet detail modal
  const [selectedTimesheet, setSelectedTimesheet] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchTimesheets = useCallback(async () => {
    if (!employee?.client_id) return;

    try {
      setLoading(true);

      // Get the client record
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('id', employee.client_id)
        .single();

      if (!client) return;

      // Get employees assigned to this client directly
      const { data: clientEmployees } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email')
        .eq('client_id', client.id)
        .eq('is_active', true);

      const empMap = new Map<string, { name: string; email: string }>();
      (clientEmployees || []).forEach(e => {
        empMap.set(e.id, { name: `${e.first_name} ${e.last_name}`, email: e.email });
      });

      // Also get employees from project assignments
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('client_id', client.id);

      const projectIds = projects?.map(p => p.id) || [];

      if (projectIds.length > 0) {
        const { data: assignments } = await supabase
          .from('project_employees')
          .select('employee_id, employees!inner(id, first_name, last_name, email)')
          .in('project_id', projectIds);

        if (assignments) {
          for (const a of assignments) {
            const emp = a.employees as any;
            if (emp && !empMap.has(emp.id)) {
              empMap.set(emp.id, { name: `${emp.first_name} ${emp.last_name}`, email: emp.email });
            }
          }
        }
      }

      const allEmpIds = [...empMap.keys()];
      if (allEmpIds.length === 0) {
        setTimesheets([]);
        return;
      }

      // Fetch timesheets
      const { data: tsData } = await supabase
        .from('timesheets')
        .select('id, employee_id, week_ending, total_hours, overtime_hours, status, submitted_at, approved_at, comments, rejection_reason')
        .in('employee_id', allEmpIds)
        .neq('status', 'draft')
        .order('week_ending', { ascending: false });

      setTimesheets(
        (tsData || []).map(t => ({
          ...t,
          employee_name: empMap.get(t.employee_id)?.name || 'Unknown',
          employee_email: empMap.get(t.employee_id)?.email || '',
        }))
      );
    } catch (error) {
      console.error('Error fetching timesheets:', error);
    } finally {
      setLoading(false);
    }
  }, [employee?.client_id, supabase]);

  useEffect(() => {
    fetchTimesheets();
  }, [fetchTimesheets]);

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      const res = await fetch(`/api/timesheets/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'client_approve' }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to approve. The timesheet may need manager approval first.');
      }
      toast('success', 'Timesheet approved.');
      await fetchTimesheets();
    } catch (err: any) {
      toast('error', err?.message || 'Error approving timesheet');
    } finally {
      setProcessing(null);
    }
  };

  const promptReject = (id: string) => {
    setRejectTargetId(id);
    setRejectModalOpen(true);
  };

  const handleReject = async (reason: string) => {
    if (!rejectTargetId) return;
    setProcessing(rejectTargetId);
    try {
      const res = await fetch(`/api/timesheets/${rejectTargetId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', rejectionReason: reason }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to reject');
      }
      toast('success', 'Timesheet rejected.');
      await fetchTimesheets();
    } catch (err: any) {
      toast('error', err?.message || 'Error rejecting timesheet');
    } finally {
      setProcessing(null);
      setRejectModalOpen(false);
      setRejectTargetId(null);
    }
  };

  const openTimecardDetail = async (ts: Timesheet) => {
    const { data: entries } = await supabase
      .from('timesheet_entries')
      .select('*, project:projects(id, name, code)')
      .eq('timesheet_id', ts.id)
      .order('date', { ascending: true });

    const timesheetWithEntries = {
      ...ts,
      employee: { first_name: ts.employee_name.split(' ')[0], last_name: ts.employee_name.split(' ').slice(1).join(' '), email: ts.employee_email },
      entries: entries || [],
    };
    setSelectedTimesheet(timesheetWithEntries);
    setIsModalOpen(true);
  };

  const exportToCSV = () => {
    const filtered = getFilteredTimesheets();
    const headers = ['Employee', 'Week Ending', 'Regular Hours', 'Overtime Hours', 'Total Hours', 'Status'];
    const rows = filtered.map(ts => [
      ts.employee_name,
      ts.week_ending,
      ((ts.total_hours || 0) - (ts.overtime_hours || 0)).toFixed(1),
      (ts.overtime_hours || 0).toFixed(1),
      (ts.total_hours || 0).toFixed(1),
      ts.status,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `client_timesheets_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getFilteredTimesheets = () => {
    let filtered = [...timesheets];
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.employee_name.toLowerCase().includes(term) ||
        t.employee_email.toLowerCase().includes(term)
      );
    }
    return filtered;
  };

  const filtered = getFilteredTimesheets();

  const statusTabs: { value: StatusFilter; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: timesheets.length },
    { value: 'submitted', label: 'Pending', count: timesheets.filter(t => t.status === 'submitted').length },
    { value: 'approved', label: 'Approved', count: timesheets.filter(t => ['approved', 'client_approved', 'payroll_approved'].includes(t.status)).length },
    { value: 'rejected', label: 'Rejected', count: timesheets.filter(t => t.status === 'rejected').length },
  ];

  return (
    <div style={{ padding: '36px 40px' }}>
      {/* Header */}
      <div className="anim-slide-up stagger-1" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em' }}>
            Timesheets
          </h1>
          <p style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
            Review and approve employee timesheets
          </p>
        </div>
        <button
          onClick={exportToCSV}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#fff',
            border: '0.5px solid #e8e4df',
            borderRadius: 6,
            padding: '7px 16px',
            fontSize: 11,
            fontWeight: 500,
            color: '#666',
            cursor: 'pointer',
          }}
        >
          <Download size={12} strokeWidth={1.5} />
          Export CSV
        </button>
      </div>

      {/* Filter tabs + search */}
      <div className="anim-slide-up stagger-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 16 }}>
        <div style={{ display: 'flex', gap: 2, background: '#f5f2ee', borderRadius: 6, padding: 2 }}>
          {statusTabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              style={{
                padding: '6px 14px',
                fontSize: 11,
                fontWeight: statusFilter === tab.value ? 600 : 400,
                color: statusFilter === tab.value ? '#1a1a1a' : '#999',
                background: statusFilter === tab.value ? '#fff' : 'transparent',
                border: statusFilter === tab.value ? '0.5px solid #e8e4df' : '0.5px solid transparent',
                borderRadius: 5,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
              <span style={{ marginLeft: 4, fontSize: 9, color: statusFilter === tab.value ? '#e31c79' : '#c0bab2' }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div style={{ position: 'relative' }}>
          <Search size={13} strokeWidth={1.5} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#c0bab2' }} />
          <input
            type="text"
            placeholder="Search employee..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              padding: '7px 12px 7px 30px',
              fontSize: 11,
              border: '0.5px solid #e8e4df',
              borderRadius: 6,
              background: '#fff',
              outline: 'none',
              width: 200,
              color: '#1a1a1a',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#d3ad6b'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#e8e4df'; }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="anim-slide-up stagger-3">
        {loading ? (
          <SkeletonList rows={6} />
        ) : filtered.length === 0 ? (
          <div style={{
            background: '#fff',
            border: '0.5px solid #e8e4df',
            borderRadius: 10,
            padding: '48px 22px',
            textAlign: 'center',
          }}>
            <Clock size={24} strokeWidth={1} style={{ color: '#e8e4df', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 12, color: '#999' }}>No timesheets found</p>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid #f5f2ee' }}>
                  {['Employee', 'Week Ending', 'Hours', 'OT', 'Status', 'Submitted', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px',
                      fontSize: 9,
                      fontWeight: 500,
                      color: '#c0bab2',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      textAlign: h === 'Actions' ? 'right' : 'left',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((ts) => {
                  const sc = statusConfig[ts.status] || statusConfig.draft;
                  return (
                    <tr
                      key={ts.id}
                      style={{ borderBottom: '0.5px solid #f5f2ee' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FAFAF8'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <p style={{ fontSize: 12, fontWeight: 500, color: '#1a1a1a', margin: 0 }}>{ts.employee_name}</p>
                        <p style={{ fontSize: 10, color: '#bbb', margin: 0 }}>{ts.employee_email}</p>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#666' }}>
                        {format(new Date(ts.week_ending + 'T00:00:00'), 'MMM d, yyyy')}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 500, color: '#1a1a1a' }}>
                        {(ts.total_hours || 0).toFixed(1)}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: (ts.overtime_hours || 0) > 0 ? '#c4983a' : '#999' }}>
                        {(ts.overtime_hours || 0).toFixed(1)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 10,
                          fontWeight: 500,
                          color: sc.text,
                          background: sc.bg,
                          padding: '3px 10px',
                          borderRadius: 3,
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot }} />
                          {sc.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 11, color: '#999' }}>
                        {ts.submitted_at ? format(new Date(ts.submitted_at), 'MMM d') : '--'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            onClick={() => openTimecardDetail(ts)}
                            title="View details"
                            style={{
                              background: 'transparent',
                              border: '0.5px solid #e8e4df',
                              borderRadius: 4,
                              padding: '4px 8px',
                              cursor: 'pointer',
                              color: '#999',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <Eye size={12} strokeWidth={1.5} />
                          </button>
                          {ts.status === 'submitted' && (
                            <>
                              <button
                                onClick={() => handleApprove(ts.id)}
                                disabled={processing === ts.id}
                                style={{
                                  background: '#e31c79',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: 5,
                                  padding: '5px 12px',
                                  fontSize: 10,
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  opacity: processing === ts.id ? 0.6 : 1,
                                }}
                              >
                                <Check size={11} strokeWidth={2} />
                                Approve
                              </button>
                              <button
                                onClick={() => promptReject(ts.id)}
                                disabled={processing === ts.id}
                                style={{
                                  background: 'transparent',
                                  color: '#b91c1c',
                                  border: '0.5px solid rgba(185,28,28,0.3)',
                                  borderRadius: 5,
                                  padding: '5px 12px',
                                  fontSize: 10,
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  opacity: processing === ts.id ? 0.6 : 1,
                                }}
                              >
                                <X size={11} strokeWidth={2} />
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject modal */}
      <ConfirmModal
        open={rejectModalOpen}
        title="Reject Timesheet"
        message="Please provide a reason for rejection:"
        confirmLabel="Reject"
        variant="danger"
        inputLabel="Reason"
        inputPlaceholder="Enter rejection reason..."
        inputRequired
        onConfirm={(val?: string) => { if (val) handleReject(val); }}
        onCancel={() => { setRejectModalOpen(false); setRejectTargetId(null); }}
      />

      {/* Timesheet detail modal */}
      {isModalOpen && selectedTimesheet && (
        <TimesheetModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setSelectedTimesheet(null); }}
          timesheet={selectedTimesheet}
          onApprove={() => handleApprove(selectedTimesheet.id)}
          onReject={() => promptReject(selectedTimesheet.id)}
          processing={processing === selectedTimesheet.id}
        />
      )}
    </div>
  );
}
