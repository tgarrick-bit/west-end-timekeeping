'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Calendar, Clock, User, Building2, Check, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';

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
  employee_name: string;
  employee_email: string;
  employee_department?: string | null;
  week_ending: string;
  total_hours: number;
  total_overtime?: number;
  overtime_hours?: number;
  total_amount?: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_at?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  approved_by_name?: string | null;
  notes?: string | null;
  entries?: TimesheetEntry[];
  rejection_reason?: string | null;
  rejected_at?: string | null;
  comments?: string | null;
}

interface TimesheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  timesheet: TimesheetDetail | null;
  onApprove?: () => void;
  onReject?: () => void;
  processing?: boolean;
  isEmployeeView?: boolean;
}

export default function TimesheetModal({
  isOpen,
  onClose,
  timesheet,
  onApprove,
  onReject,
  processing = false,
  isEmployeeView = false,
}: TimesheetModalProps) {
  const router = useRouter();
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [approverName, setApproverName] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen && timesheet?.id) {
      loadTimesheetEntries();
      if (timesheet.approved_by) {
        loadApproverName();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, timesheet?.id]);

  const loadTimesheetEntries = async () => {
    if (!timesheet?.id) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('timesheet_entries')
        .select(`
          id,
          timesheet_id,
          date,
          project_id,
          hours,
          description,
          projects:project_id (
            id,
            name,
            code
          )
        `)
        .eq('timesheet_id', timesheet.id)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error loading entries:', error);
      } else {
        const transformedEntries = (data || []).map((entry: any) => ({
          id: entry.id,
          date: entry.date,
          project_id: entry.project_id,
          project_name: (entry.projects as any)?.name || 'General Work',
          project_code: (entry.projects as any)?.code || '',
          hours: entry.hours,
          description: entry.description,
        }));
        setEntries(transformedEntries);
      }
    } catch (error) {
      console.error('Error in loadTimesheetEntries:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadApproverName = async () => {
    if (!timesheet?.approved_by) return;

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('first_name, last_name')
        .eq('id', timesheet.approved_by)
        .single();

      if (!error && data) {
        setApproverName(`${data.first_name} ${data.last_name}`);
      }
    } catch (error) {
      console.error('Error loading approver name:', error);
    }
  };

  if (!isOpen || !timesheet) return null;

  const getStatusColor = () => {
    switch (timesheet.status) {
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const displayEntries = entries.length > 0 ? entries : timesheet.entries || [];

  const sortedEntries = [...displayEntries].sort((a, b) => {
    const dateA = a?.date ? new Date(a.date).getTime() : NaN;
    const dateB = b?.date ? new Date(b.date).getTime() : NaN;
    if (isNaN(dateA) && isNaN(dateB)) return 0;
    if (isNaN(dateA)) return 1;
    if (isNaN(dateB)) return -1;
    return dateA - dateB;
  });

  const calculatedTotalHours = sortedEntries.reduce(
    (sum, e) => sum + (parseFloat(String(e.hours)) || 0),
    0
  );
  const totalHours =
    sortedEntries.length > 0 ? calculatedTotalHours : timesheet.total_hours || 0;
  const totalRegular = Math.min(40, totalHours);
  const totalOvertime =
    timesheet.total_overtime ??
    timesheet.overtime_hours ??
    Math.max(0, totalHours - 40);

  const isValid = (d: Date) => !isNaN(d.getTime());
  const ymd = (d: Date) => (isValid(d) ? format(d, 'yyyy-MM-dd') : '');

  const rejectionReason =
    timesheet.rejection_reason || timesheet.comments || null;

  const rejectedDate =
    timesheet.rejected_at
      ? new Date(timesheet.rejected_at)
      : timesheet.approved_at
      ? new Date(timesheet.approved_at)
      : null;

  const statusStyles: Record<string, { dot: string; bg: string; text: string; label: string }> = {
    draft: { dot: '#c0bab2', bg: 'rgba(192,186,178,0.08)', text: '#999', label: 'Draft' },
    submitted: { dot: '#c4983a', bg: 'rgba(196,152,58,0.08)', text: '#c4983a', label: 'Submitted' },
    approved: { dot: '#2d9b6e', bg: 'rgba(45,155,110,0.08)', text: '#2d9b6e', label: 'Approved' },
    payroll_approved: { dot: '#2d9b6e', bg: 'rgba(45,155,110,0.08)', text: '#2d9b6e', label: 'Finalized' },
    rejected: { dot: '#b91c1c', bg: 'rgba(185,28,28,0.08)', text: '#b91c1c', label: 'Rejected' },
  };
  const st = statusStyles[timesheet.status] || statusStyles.draft;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: '#fff', borderRadius: 12, border: '0.5px solid #e8e4df', width: '100%', maxWidth: 800, maxHeight: '90vh', overflow: 'auto' }}>
        {/* Header */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#1a1a1a', padding: '18px 24px', borderRadius: '12px 12px 0 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Timecard Details</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '3px 10px', borderRadius: 20, background: st.bg }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.dot }} />
                <span style={{ fontSize: 10.5, fontWeight: 600, color: st.text }}>{st.label}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <X style={{ width: 18, height: 18, color: '#999' }} />
            </button>
          </div>

          {/* Employee Info */}
          <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <User style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.5)' }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{timesheet.employee_name}</span>
            </div>
            {timesheet.employee_department && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Building2 style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.5)' }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{timesheet.employee_department}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.5)' }} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                Week ending{' '}
                {timesheet.week_ending && isValid(new Date(timesheet.week_ending))
                  ? format(new Date(timesheet.week_ending), 'EEE, MMM dd, yyyy')
                  : timesheet.week_ending}
              </span>
            </div>
          </div>

          {/* Approval / Rejection info for employees */}
          {isEmployeeView && (
            <div className="mt-3 text-sm text-white/80">
              {timesheet.status === 'approved' && (
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <span>
                    Approved by{' '}
                    {approverName ||
                      timesheet.approved_by_name ||
                      'Manager'}
                    {timesheet.approved_at &&
                      ` on ${format(
                        new Date(timesheet.approved_at),
                        'MMM dd, yyyy'
                      )}`}
                  </span>
                </div>
              )}

              {timesheet.status === 'rejected' && (
                <div className="mt-3 space-y-2">
                  {rejectionReason && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-900 text-sm shadow-sm">
                      <p className="font-semibold">
                        Reason:{' '}
                        <span className="font-normal">{rejectionReason}</span>
                      </p>
                      <p className="mt-1 text-xs opacity-90">
                        Update this week’s hours in the time entry screen, then
                        re-submit for approval.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="p-6 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <p className="text-sm font-medium text-gray-500">Regular Hours</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalRegular.toFixed(1)}h
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <p className="text-sm font-medium text-gray-500">
                Overtime Hours
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {totalOvertime.toFixed(1)}h
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <p className="text-sm font-medium text-gray-500">Total Hours</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalHours.toFixed(1)}h
              </p>
            </div>
          </div>
        </div>

        {/* Daily Time Entries */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Daily Time Entries by Project ({sortedEntries.length}{' '}
            {sortedEntries.length === 1 ? 'entry' : 'entries'})
          </h3>

          {loading ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Loading time entries...</p>
            </div>
          ) : sortedEntries.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">
                No time entries found for this timecard
              </p>
              {timesheet.total_hours > 0 && (
                <p className="text-sm text-gray-400 mt-2">
                  (Timesheet shows {timesheet.total_hours.toFixed(1)} total
                  hours but entries may not be loaded)
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-lg overflow-hidden border">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      DATE
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PROJECT/JOB
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      REGULAR
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      OVERTIME
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      TOTAL
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedEntries.map((entry, index) => {
                    const previousEntries = sortedEntries.slice(0, index);
                    const runningTotal = previousEntries.reduce(
                      (sum, e) =>
                        sum + (parseFloat(String(e.hours)) || 0),
                      0
                    );
                    const entryHours =
                      parseFloat(String(entry.hours)) || 0;
                    const regularHours = Math.max(
                      0,
                      Math.min(entryHours, Math.max(0, 40 - runningTotal))
                    );
                    const overtimeHours = Math.max(
                      0,
                      entryHours - regularHours
                    );

                    const curr = entry?.date
                      ? new Date(entry.date)
                      : new Date('Invalid');
                    const prev =
                      index > 0 && sortedEntries[index - 1]?.date
                        ? new Date(sortedEntries[index - 1].date)
                        : new Date('Invalid');

                    const currentDateStr = isValid(curr)
                      ? format(curr, 'EEE, MMM dd, yyyy')
                      : entry.date || 'Invalid Date';
                    const showDate =
                      index === 0 || ymd(prev) !== ymd(curr);

                    return (
                      <tr
                        key={entry.id || index}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {showDate && (
                            <div className="font-medium text-gray-900">
                              {currentDateStr}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {entry.project_name || 'General Work'}
                          {entry.project_code && (
                            <span className="text-xs text-gray-500 ml-1">
                              ({entry.project_code})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                          {regularHours.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                          {overtimeHours > 0
                            ? overtimeHours.toFixed(1)
                            : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                          {entryHours.toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Total Row */}
                  <tr className="bg-gray-50 font-semibold">
                    <td
                      colSpan={2}
                      className="px-4 py-3 text-right text-gray-900"
                    >
                      Week Total:
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {totalRegular.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {totalOvertime.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {calculatedTotalHours.toFixed(1)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ position: 'sticky', bottom: 0, background: '#FAFAF8', padding: '14px 24px', borderTop: '0.5px solid #e8e4df', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          {/* Edit button for employees with draft or rejected timesheets */}
          {isEmployeeView && (timesheet.status === 'draft' || timesheet.status === 'rejected') && (
            <button
              onClick={() => {
                onClose();
                router.push('/timesheet/entry');
              }}
              style={{ padding: '8px 18px', background: '#e31c79', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#cc1069'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#e31c79'; }}
            >
              <Pencil style={{ width: 13, height: 13 }} />
              {timesheet.status === 'draft' ? 'Continue Editing' : 'Fix & Resubmit'}
            </button>
          )}
          {/* Manager approve/reject buttons */}
          {timesheet.status === 'submitted' &&
            onApprove &&
            onReject &&
            !isEmployeeView && (
              <>
                <button
                  onClick={onReject}
                  disabled={processing}
                  style={{ padding: '8px 18px', background: '#fff', border: '0.5px solid #b91c1c', color: '#b91c1c', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: processing ? 0.5 : 1 }}
                >
                  <X style={{ width: 13, height: 13 }} />
                  Reject
                </button>
                <button
                  onClick={onApprove}
                  disabled={processing}
                  style={{ padding: '8px 18px', background: '#2d9b6e', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: processing ? 0.5 : 1 }}
                >
                  <Check style={{ width: 13, height: 13 }} />
                  Approve
                </button>
              </>
            )}
          <button
            onClick={onClose}
            style={{ padding: '8px 18px', background: '#fff', border: '0.5px solid #e0dcd7', color: '#777', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ccc'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e0dcd7'; }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}