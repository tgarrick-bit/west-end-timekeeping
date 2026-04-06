'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/Toast';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Building2,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface TimesheetEntry {
  id: string;
  date: string;
  project_id?: string;
  project_name?: string;
  project_code?: string;
  hours: number;
  description?: string;
}

interface TimesheetDetail {
  id: string;
  employee_id: string;
  week_ending: string;
  total_hours: number;
  overtime_hours: number;
  status: string;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejection_reason: string | null;
  rejected_at: string | null;
  notes: string | null;
}

const StatusBadge = ({ status }: { status: string }) => {
  const colorMap: Record<string, { bg: string; color: string; border: string }> = {
    submitted: { bg: '#FFF8E1', color: '#c4983a', border: '#c4983a' },
    approved: { bg: '#ecfdf5', color: '#2d9b6e', border: '#2d9b6e' },
    rejected: { bg: '#fef2f2', color: '#b91c1c', border: '#b91c1c' },
    draft: { bg: '#FAFAF8', color: '#777', border: '#e8e4df' },
    payroll_approved: { bg: '#ecfdf5', color: '#2d9b6e', border: '#2d9b6e' },
    client_approved: { bg: '#ecfdf5', color: '#2d9b6e', border: '#2d9b6e' },
  };
  const label: Record<string, string> = {
    submitted: 'Submitted',
    approved: 'Approved',
    rejected: 'Rejected',
    draft: 'Draft',
    payroll_approved: 'Finalized',
    client_approved: 'Client Approved',
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
      {label[status] || status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export default function ManagerTimesheetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  const [timesheet, setTimesheet] = useState<TimesheetDetail | null>(null);
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [employeeName, setEmployeeName] = useState<string | null>(null);
  const [employeeDepartment, setEmployeeDepartment] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const [rejectModal, setRejectModal] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: (_reason: string) => {},
  });

  const timesheetId = params?.id as string | undefined;

  useEffect(() => {
    loadTimesheet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTimesheet = async () => {
    try {
      setIsLoading(true);
      setLoadError('');
      setActionMessage(null);
      setActionError(null);

      if (!timesheetId) {
        setLoadError('No timesheet id was provided.');
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setLoadError('You must be signed in as a manager.');
        return;
      }

      const { data: tsData, error: tsError } = await supabase
        .from('timesheets')
        .select(
          `*, employees!timesheets_employee_id_fkey (
            id, first_name, middle_name, last_name, email, department, manager_id
          )`
        )
        .eq('id', timesheetId)
        .single();

      if (tsError || !tsData) {
        console.error('Error loading timesheet:', tsError);
        setLoadError('Timesheet not found.');
        return;
      }

      const emp = (tsData as any).employees;
      if (emp) {
        const name = [emp.first_name, emp.middle_name, emp.last_name]
          .filter(Boolean)
          .join(' ');
        setEmployeeName(name || null);
        setEmployeeDepartment(emp.department || null);
      }

      setTimesheet({
        id: tsData.id,
        employee_id: tsData.employee_id,
        week_ending: tsData.week_ending,
        total_hours: tsData.total_hours || 0,
        overtime_hours: tsData.overtime_hours ?? Math.max(0, (tsData.total_hours || 0) - 40),
        status: tsData.status,
        submitted_at: tsData.submitted_at,
        approved_at: tsData.approved_at,
        approved_by: tsData.approved_by,
        rejection_reason: tsData.rejection_reason,
        rejected_at: tsData.rejected_at,
        notes: tsData.notes,
      });

      // Load entries
      const { data: entryData, error: entryError } = await supabase
        .from('timesheet_entries')
        .select(
          `*, projects:project_id (id, name, code)`
        )
        .eq('timesheet_id', timesheetId)
        .order('date', { ascending: true });

      if (entryError) {
        console.error('Error loading entries:', entryError);
      } else {
        const mapped = (entryData || []).map((e: any) => ({
          id: e.id,
          date: e.date,
          project_id: e.project_id,
          project_name: e.projects?.name || 'General Work',
          project_code: e.projects?.code || '',
          hours: e.hours,
          description: e.description,
        }));
        setEntries(mapped);
      }
    } catch (err) {
      console.error('Unexpected error loading timesheet:', err);
      setLoadError('Something went wrong loading this timesheet.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!timesheet) return;
    try {
      setIsWorking(true);
      setActionError(null);
      setActionMessage(null);

      const res = await fetch(`/api/timesheets/${timesheet.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to approve timesheet.');
      }

      setActionMessage('Timesheet approved.');
      await loadTimesheet();
    } catch (err: any) {
      console.error('Approve error:', err);
      setActionError(err?.message || 'Error approving timesheet.');
    } finally {
      setIsWorking(false);
    }
  };

  const handleReject = () => {
    if (!timesheet) return;
    setRejectModal({
      open: true,
      title: 'Reject Timesheet',
      message: 'Please provide a reason for rejection. This will be visible to the employee.',
      onConfirm: async (reason: string) => {
        setRejectModal((prev) => ({ ...prev, open: false }));
        if (!reason || !reason.trim()) {
          toast('warning', 'A rejection reason is required.');
          return;
        }
        try {
          setIsWorking(true);
          setActionError(null);
          setActionMessage(null);

          const res = await fetch(`/api/timesheets/${timesheet.id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reject', rejectionReason: reason.trim() }),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || 'Failed to reject timesheet.');
          }

          setActionMessage('Timesheet rejected.');
          await loadTimesheet();
        } catch (err: any) {
          console.error('Reject error:', err);
          setActionError(err?.message || 'Error rejecting timesheet.');
        } finally {
          setIsWorking(false);
        }
      },
    });
  };

  // Compute display values
  const totalHours = entries.length > 0
    ? entries.reduce((sum, e) => sum + (parseFloat(String(e.hours)) || 0), 0)
    : timesheet?.total_hours || 0;
  const totalRegular = Math.min(40, totalHours);
  const totalOvertime = Math.max(0, totalHours - 40);

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    border: '0.5px solid #e8e4df',
    borderRadius: 10,
    padding: 20,
  };

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 1,
    color: '#c0bab2',
    textTransform: 'uppercase',
    marginBottom: 12,
  };

  const isValid = (d: Date) => !isNaN(d.getTime());
  const ymd = (d: Date) => (isValid(d) ? format(d, 'yyyy-MM-dd') : '');

  // Loading skeleton
  if (isLoading) {
    const shimmer: React.CSSProperties = {
      background: 'linear-gradient(90deg, #f5f2ee 25%, #ece8e3 50%, #f5f2ee 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      borderRadius: 4,
    };
    return (
      <div style={{ padding: '36px 40px' }}>
        <style dangerouslySetInnerHTML={{ __html: '@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }' }} />
        <div style={{ ...shimmer, width: 120, height: 14, marginBottom: 24 }} />
        <div style={{ ...shimmer, width: 280, height: 24 }} />
        <div style={{ ...shimmer, width: 320, height: 13, marginTop: 8 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 20 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ ...cardStyle }}>
              <div style={{ ...shimmer, width: '60%', height: 12, marginBottom: 8 }} />
              <div style={{ ...shimmer, width: '40%', height: 24, animationDelay: `${i * 0.15}s` }} />
            </div>
          ))}
        </div>
        <div style={{ ...cardStyle, marginTop: 16 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ ...shimmer, width: '100%', height: 36, borderRadius: 7, marginTop: i > 0 ? 8 : 0, animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      </div>
    );
  }

  if (loadError && !timesheet) {
    return (
      <div style={{ padding: '36px 40px', maxWidth: 800 }}>
        <div style={{ ...cardStyle, display: 'flex', gap: 10, alignItems: 'flex-start', borderColor: '#b91c1c' }}>
          <AlertCircle className="h-5 w-5" style={{ color: '#b91c1c', flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12.5, color: '#b91c1c' }}>{loadError}</span>
        </div>
      </div>
    );
  }

  if (!timesheet) return null;

  const weekEndingFormatted = timesheet.week_ending && isValid(new Date(timesheet.week_ending))
    ? format(new Date(timesheet.week_ending), 'EEE, MMM dd, yyyy')
    : timesheet.week_ending;

  return (
    <div style={{ padding: '36px 40px' }}>
      {/* Back link */}
      <button
        onClick={() => router.push('/manager')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: 'none',
          color: '#e31c79',
          fontSize: 12,
          cursor: 'pointer',
          padding: 0,
          marginBottom: 24,
        }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Dashboard
      </button>

      {/* Page title */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
            Timecard Details
          </h1>
          <StatusBadge status={timesheet.status} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#999', flexWrap: 'wrap' }}>
          {employeeName && (
            <>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <User className="h-3 w-3" style={{ color: '#ccc' }} />
                {employeeName}
              </span>
              <span style={{ opacity: 0.4 }}>&bull;</span>
            </>
          )}
          {employeeDepartment && (
            <>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Building2 className="h-3 w-3" style={{ color: '#ccc' }} />
                {employeeDepartment}
              </span>
              <span style={{ opacity: 0.4 }}>&bull;</span>
            </>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar className="h-3 w-3" style={{ color: '#ccc' }} />
            Week ending {weekEndingFormatted}
          </span>
        </div>
      </div>

      {/* Rejection alert */}
      {timesheet.status === 'rejected' && timesheet.rejection_reason && (
        <div
          style={{
            ...cardStyle,
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            borderColor: '#b91c1c',
            marginBottom: 16,
            background: '#fef2f2',
          }}
        >
          <AlertCircle className="h-4 w-4" style={{ color: '#b91c1c', flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12, color: '#b91c1c' }}>
            <p style={{ fontWeight: 600, margin: 0 }}>This timesheet was rejected.</p>
            <p style={{ marginTop: 4, margin: '4px 0 0' }}>
              <strong>Reason:</strong> {timesheet.rejection_reason}
            </p>
          </div>
        </div>
      )}

      {/* Action alerts */}
      {actionError && (
        <div
          style={{
            ...cardStyle,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            borderColor: '#b91c1c',
            marginBottom: 16,
            background: '#fef2f2',
            padding: 12,
          }}
        >
          <AlertCircle className="h-3.5 w-3.5" style={{ color: '#b91c1c' }} />
          <span style={{ fontSize: 12, color: '#b91c1c' }}>{actionError}</span>
        </div>
      )}
      {actionMessage && (
        <div
          style={{
            ...cardStyle,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            borderColor: '#c3e6cb',
            marginBottom: 16,
            background: '#ecfdf5',
            padding: 12,
          }}
        >
          <CheckCircle2 className="h-3.5 w-3.5" style={{ color: '#2d9b6e' }} />
          <span style={{ fontSize: 12, color: '#2d9b6e' }}>{actionMessage}</span>
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
        <div style={cardStyle}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#c0bab2', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Regular Hours</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', marginTop: 4 }}>{totalRegular.toFixed(1)}</p>
        </div>
        <div style={cardStyle}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#c0bab2', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Overtime Hours</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: totalOvertime > 0 ? '#c4983a' : '#1a1a1a', marginTop: 4 }}>{totalOvertime.toFixed(1)}</p>
        </div>
        <div style={cardStyle}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#c0bab2', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Total Hours</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#e31c79', marginTop: 4 }}>{totalHours.toFixed(1)}</p>
        </div>
      </div>

      {/* Time entries table */}
      <div style={{ ...cardStyle, padding: 0, marginBottom: 16 }}>
        <div
          style={{
            padding: '10px 20px',
            borderBottom: '0.5px solid #f5f2ee',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Clock className="h-3.5 w-3.5" style={{ color: '#ccc' }} />
          <span style={sectionHeaderStyle as any}>
            Daily Time Entries ({entries.length} {entries.length === 1 ? 'entry' : 'entries'})
          </span>
        </div>

        <div style={{ padding: 0 }}>
          {entries.length === 0 ? (
            <p style={{ fontSize: 12.5, color: '#999', textAlign: 'center', padding: '32px 20px' }}>
              No time entries found for this timecard.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid #f0ece7' }}>
                  <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 9, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' }}>Date</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 9, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' }}>Project / Job</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 9, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' }}>Regular</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 9, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' }}>Overtime</th>
                  <th style={{ padding: '10px 20px', textAlign: 'right', fontSize: 9, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => {
                  const previousEntries = entries.slice(0, index);
                  const runningTotal = previousEntries.reduce(
                    (sum, e) => sum + (parseFloat(String(e.hours)) || 0),
                    0
                  );
                  const entryHours = parseFloat(String(entry.hours)) || 0;
                  const regularHours = Math.max(0, Math.min(entryHours, Math.max(0, 40 - runningTotal)));
                  const overtimeHours = Math.max(0, entryHours - regularHours);

                  const curr = entry.date ? new Date(entry.date) : new Date('Invalid');
                  const prev = index > 0 && entries[index - 1]?.date ? new Date(entries[index - 1].date) : new Date('Invalid');
                  const currentDateStr = isValid(curr) ? format(curr, 'EEE, MMM dd') : entry.date || 'Invalid Date';
                  const showDate = index === 0 || ymd(prev) !== ymd(curr);

                  return (
                    <tr
                      key={entry.id || index}
                      style={{ borderBottom: '0.5px solid #f5f2ee' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#FDFCFB'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
                    >
                      <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a', fontWeight: showDate ? 500 : 400 }}>
                        {showDate ? currentDateStr : ''}
                      </td>
                      <td style={{ padding: '12px 12px', fontSize: 12.5, color: '#555' }}>
                        {entry.project_name || 'General Work'}
                        {entry.project_code && (
                          <span style={{ fontSize: 10, color: '#999', marginLeft: 6 }}>({entry.project_code})</span>
                        )}
                        {entry.description && (
                          <p style={{ fontSize: 10.5, color: '#999', margin: '2px 0 0' }}>{entry.description}</p>
                        )}
                      </td>
                      <td style={{ padding: '12px 12px', fontSize: 12.5, textAlign: 'right', color: '#555' }}>
                        {regularHours.toFixed(1)}
                      </td>
                      <td style={{ padding: '12px 12px', fontSize: 12.5, textAlign: 'right', color: overtimeHours > 0 ? '#c4983a' : '#555' }}>
                        {overtimeHours > 0 ? overtimeHours.toFixed(1) : '-'}
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: 12.5, textAlign: 'right', fontWeight: 600, color: '#1a1a1a' }}>
                        {entryHours.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}

                {/* Total row */}
                <tr style={{ background: '#FAFAF8' }}>
                  <td colSpan={2} style={{ padding: '12px 20px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>
                    Week Total
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>
                    {totalRegular.toFixed(1)}
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: totalOvertime > 0 ? '#c4983a' : '#1a1a1a' }}>
                    {totalOvertime.toFixed(1)}
                  </td>
                  <td style={{ padding: '12px 20px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#e31c79' }}>
                    {totalHours.toFixed(1)}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* Footer with actions */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '0.5px solid #f5f2ee',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', gap: 24 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#c0bab2', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
                Total Hours
              </p>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#e31c79', marginTop: 2 }}>
                {totalHours.toFixed(1)}h
              </p>
            </div>
            {timesheet.submitted_at && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#c0bab2', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
                  Submitted
                </p>
                <p style={{ fontSize: 13, color: '#555', marginTop: 2 }}>
                  {format(new Date(timesheet.submitted_at), 'MMM dd, yyyy h:mm a')}
                </p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {timesheet.status === 'submitted' && (
              <>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={isWorking}
                  style={{
                    padding: '8px 20px',
                    fontSize: 12,
                    fontWeight: 500,
                    borderRadius: 6,
                    border: '0.5px solid #b91c1c',
                    background: '#fff',
                    color: '#b91c1c',
                    cursor: 'pointer',
                    opacity: isWorking ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Reject
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isWorking}
                  style={{
                    padding: '8px 20px',
                    fontSize: 12,
                    fontWeight: 500,
                    borderRadius: 6,
                    border: 'none',
                    background: '#e31c79',
                    color: '#fff',
                    cursor: 'pointer',
                    opacity: isWorking ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approve
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => router.push('/manager')}
              style={{
                padding: '8px 20px',
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 6,
                background: 'white',
                border: '0.5px solid #e0dcd7',
                color: '#777',
                cursor: 'pointer',
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Reject reason modal */}
      <ConfirmModal
        open={rejectModal.open}
        title={rejectModal.title}
        message={rejectModal.message}
        confirmLabel="Reject"
        variant="danger"
        inputLabel="Rejection Reason"
        inputPlaceholder="Enter the reason for rejection..."
        inputRequired
        onConfirm={(reason) => rejectModal.onConfirm(reason || '')}
        onCancel={() => setRejectModal((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
