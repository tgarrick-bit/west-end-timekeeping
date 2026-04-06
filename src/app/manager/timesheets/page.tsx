// src/app/manager/timesheets/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface Employee {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  department?: string;
  hourly_rate?: number;
}

interface Timesheet {
  id: string;
  employee_id: string;
  week_ending: string;
  total_hours: number;
  overtime_hours?: number;
  status: string;
  submitted_at?: string;
  approved_at?: string;
  approved_by?: string;
  rejection_reason?: string;
  employee?: Employee;
}

const StatusBadge = ({ status }: { status: string }) => {
  const colorMap: Record<string, { bg: string; color: string; border: string }> = {
    submitted: { bg: '#FFF8E1', color: '#c4983a', border: '#c4983a' },
    approved: { bg: '#ecfdf5', color: '#2d9b6e', border: '#2d9b6e' },
    rejected: { bg: '#fef2f2', color: '#b91c1c', border: '#b91c1c' },
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
    <AlertCircle className="mx-auto h-8 w-8" style={{ color: '#ccc' }} />
    <p className="mt-3" style={{ fontSize: 13, color: '#999' }}>
      {message}
    </p>
  </div>
);

export default function ManagerTimesheets() {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createSupabaseClient();

  useEffect(() => {
    loadTimesheets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadTimesheets = async () => {
    try {
      setLoading(true);

      // Get current user for manager scoping
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get employees managed by this user
      const { data: myEmployees } = await supabase
        .from('employees')
        .select('id')
        .eq('manager_id', user.id);
      const employeeIds = myEmployees?.map(e => e.id) || [];
      if (employeeIds.length === 0) {
        setTimesheets([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('timesheets')
        .select(
          `
          *,
          employee:employees(
            id,
            email,
            first_name,
            last_name,
            department,
            hourly_rate
          )
        `
        )
        .in('employee_id', employeeIds)
        .order('week_ending', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading timesheets:', error);
      } else {
        setTimesheets((data || []) as Timesheet[]);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const callTimesheetStatus = async (
    timesheetId: string,
    body: { action: 'approve' | 'reject'; rejectionReason?: string }
  ) => {
    const res = await fetch(`/api/timesheets/${timesheetId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let message = 'Failed to update timesheet.';
      try {
        const data = await res.json();
        if (data?.error) {
          message = data.error;
        }
      } catch {
        // ignore JSON parse errors
      }
      throw new Error(message);
    }

    return res.json();
  };

  const handleApproveTimesheet = async (timesheetId: string) => {
    try {
      await callTimesheetStatus(timesheetId, { action: 'approve' });
      toast('success', 'Timesheet approved successfully.');
      await loadTimesheets();
    } catch (error: any) {
      console.error('Error approving timesheet:', error);
      toast('error', error?.message || 'An error occurred while approving the timesheet.');
    }
  };

  const promptRejectTimesheet = (timesheetId: string) => {
    setRejectTargetId(timesheetId);
    setRejectModalOpen(true);
  };

  const handleRejectTimesheet = async (timesheetId: string, reason: string) => {
    try {
      await callTimesheetStatus(timesheetId, {
        action: 'reject',
        rejectionReason: reason,
      });
      toast('success', 'Timesheet rejected successfully.');
      await loadTimesheets();
    } catch (error: any) {
      console.error('Error rejecting timesheet:', error);
      toast('error', error?.message || 'An error occurred while rejecting the timesheet.');
    } finally {
      setRejectModalOpen(false);
      setRejectTargetId(null);
    }
  };

  const handleViewTimesheet = (timesheet: Timesheet) => {
    toast('info', `${timesheet.employee?.first_name} ${timesheet.employee?.last_name} - ${timesheet.total_hours}h - ${timesheet.status}`);
  };

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
        <div style={{ ...shimmer, width: 260, height: 24 }} />
        <div style={{ ...shimmer, width: 200, height: 13, marginTop: 8 }} />
        <div style={{ ...shimmer, width: '100%', height: 36, marginTop: 28, borderRadius: 0 }} />
        <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, marginTop: 20, overflow: 'hidden' }}>
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
          Timesheet Management
        </h1>
        <p style={{ fontSize: 13, fontWeight: 400, color: '#999', marginTop: 4 }}>
          Review and approve employee timesheets
        </p>
      </div>

      {/* Underline filter tabs */}
      <div style={{ display: 'flex', gap: 20, borderBottom: '1px solid #f0ede8', marginBottom: 20 }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              fontSize: 12,
              fontWeight: filter === tab.key ? 600 : 400,
              color: filter === tab.key ? '#1a1a1a' : '#999',
              background: 'none',
              border: 'none',
              borderBottom: filter === tab.key ? '2px solid #e31c79' : '2px solid transparent',
              paddingBottom: 10,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
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
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Employee', 'Week Ending', 'Hours', 'Status', 'Actions'].map((h) => (
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
            {timesheets.map((timesheet) => (
              <tr
                key={timesheet.id}
                style={{ borderBottom: '0.5px solid #f5f2ee', cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#FDFCFB')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                onClick={() => router.push(`/manager/timesheet/${timesheet.id}`)}
              >
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 400, color: '#555' }}>
                    {timesheet.employee?.first_name} {timesheet.employee?.last_name}
                  </div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                    {timesheet.employee?.email}
                  </div>
                </td>
                <td style={{ padding: '14px 20px', fontSize: 12.5, fontWeight: 400, color: '#555' }}>
                  {new Date(timesheet.week_ending).toLocaleDateString()}
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 400, color: '#555' }}>
                    {timesheet.total_hours} hrs
                  </div>
                  {timesheet.overtime_hours && timesheet.overtime_hours > 0 && (
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                      OT: {timesheet.overtime_hours} hrs
                    </div>
                  )}
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <StatusBadge status={timesheet.status} />
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {timesheet.status === 'submitted' && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleApproveTimesheet(timesheet.id); }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#2d9b6e',
                            cursor: 'pointer',
                            padding: 4,
                          }}
                          title="Approve"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); promptRejectTimesheet(timesheet.id); }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#b91c1c',
                            cursor: 'pointer',
                            padding: 4,
                          }}
                          title="Reject"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {timesheets.length === 0 && <EmptyState message="No timesheets found" />}
      </div>

      {/* Reject reason modal */}
      <ConfirmModal
        open={rejectModalOpen}
        title="Reject Timesheet"
        message="Please provide a reason for rejection. This will be visible to the employee."
        confirmLabel="Reject"
        variant="danger"
        inputLabel="Rejection Reason"
        inputPlaceholder="Enter the reason for rejection..."
        inputRequired
        onConfirm={(reason) => { if (rejectTargetId) handleRejectTimesheet(rejectTargetId, reason || ''); }}
        onCancel={() => { setRejectModalOpen(false); setRejectTargetId(null); }}
      />
    </div>
  );
}
