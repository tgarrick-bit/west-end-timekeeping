// src/app/manager/timesheets/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { Clock, CheckCircle, XCircle, Eye, AlertCircle } from 'lucide-react';

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
  const colors: Record<string, string> = {
    submitted: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
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
  const router = useRouter();
  const supabase = createSupabaseClient();

  useEffect(() => {
    loadTimesheets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadTimesheets = async () => {
    try {
      setLoading(true);

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
      alert('Timesheet approved successfully.');
      await loadTimesheets();
    } catch (error: any) {
      console.error('Error approving timesheet:', error);
      alert(error?.message || 'An error occurred while approving the timesheet.');
    }
  };

  const handleRejectTimesheet = async (timesheetId: string) => {
    try {
      const reason = prompt('Please provide a reason for rejection:');

      if (!reason || reason.trim() === '') {
        alert('Rejection reason is required.');
        return;
      }

      await callTimesheetStatus(timesheetId, {
        action: 'reject',
        rejectionReason: reason.trim(),
      });

      alert('Timesheet rejected successfully.');
      await loadTimesheets();
    } catch (error: any) {
      console.error('Error rejecting timesheet:', error);
      alert(error?.message || 'An error occurred while rejecting the timesheet.');
    }
  };

  const handleViewTimesheet = (timesheet: Timesheet) => {
    alert(`
Employee: ${timesheet.employee?.first_name} ${timesheet.employee?.last_name}
Week Ending: ${new Date(timesheet.week_ending).toLocaleDateString()}
Total Hours: ${timesheet.total_hours}
Overtime: ${timesheet.overtime_hours || 0}
Status: ${timesheet.status}
${timesheet.rejection_reason ? `Rejection Reason: ${timesheet.rejection_reason}` : ''}
    `);
  };

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
          Timesheet Management
        </h1>
        <p style={{ fontSize: 13, fontWeight: 400, color: '#bbb', marginTop: 4 }}>
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
            {timesheets.map((timesheet) => (
              <tr
                key={timesheet.id}
                style={{ borderBottom: '0.5px solid #f5f2ee', cursor: 'default' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#FDFCFB')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 400, color: '#555' }}>
                    {timesheet.employee?.first_name} {timesheet.employee?.last_name}
                  </div>
                  <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>
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
                    <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>
                      OT: {timesheet.overtime_hours} hrs
                    </div>
                  )}
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <StatusBadge status={timesheet.status} />
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => handleViewTimesheet(timesheet)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#999',
                        cursor: 'pointer',
                        padding: 4,
                      }}
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {timesheet.status === 'submitted' && (
                      <>
                        <button
                          onClick={() => handleApproveTimesheet(timesheet.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#4aba70',
                            cursor: 'pointer',
                            padding: 4,
                          }}
                          title="Approve"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRejectTimesheet(timesheet.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#e05252',
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
    </div>
  );
}
