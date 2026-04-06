// src/app/manager/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { SkeletonStats, SkeletonList } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';

import {
  CheckCircle,
  XCircle,
  ChevronDown,
  RefreshCw,
  Search,
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';

function formatName(
  first?: string,
  middle?: string | null,
  last?: string,
  style: 'lastFirst' | 'firstLast' = 'lastFirst'
) {
  const safeFirst = first?.trim() || '';
  const safeMiddle = middle?.trim() || '';
  const safeLast = last?.trim() || '';

  if (style === 'firstLast') {
    return [safeFirst, safeMiddle, safeLast].filter(Boolean).join(' ');
  }

  const firstPart = [safeFirst, safeMiddle].filter(Boolean).join(' ');
  if (!safeLast) return firstPart || '';
  if (!firstPart) return safeLast;
  return `${safeLast}, ${firstPart}`;
}

type LineStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

function deriveReportStatusFromLines(
  statuses: LineStatus[]
): ManagerExpenseReport['status'] {
  if (!statuses.length) return 'draft';

  const allDraft = statuses.every((s) => s === 'draft');
  const allApproved = statuses.every((s) => s === 'approved');
  const hasSubmitted = statuses.some((s) => s === 'submitted');
  const hasRejected = statuses.some((s) => s === 'rejected');

  if (allDraft) return 'draft';
  if (allApproved) return 'approved';
  if (hasSubmitted) return 'submitted';
  if (hasRejected) return 'rejected';
  return 'draft';
}

interface Employee {
  id: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  email: string;
  employee_id: string | null;
  department: string | null;
  hourly_rate: number | null;
  manager_id: string | null;
  role?: string | null;
}

interface Submission {
  id: string;
  type: 'timesheet';
  employee?: Employee;
  date: string;
  amount: number;
  hours?: number;
  status: string;
  description?: string;
  overtime_hours?: number;
  week_range?: string;
}

interface ProjectOption {
  id: string;
  name: string;
  code: string;
}

interface ManagerExpenseReport {
  id: string;
  employee_id: string;
  title: string;
  period_month: string | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  total_amount: number;
  submitted_at: string | null;
  created_at: string;
  employee?: Employee;
}

export default function ManagerPage() {
  const router = useRouter();
  const { employee } = useAuth();
  const supabase = createClient();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [managerId, setManagerId] = useState<string | null>(null);

  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [timesheetProjectMap, setTimesheetProjectMap] = useState<
    Record<string, string[]>
  >({});

  const [timesheetEmployeeFilter, setTimesheetEmployeeFilter] =
    useState<string>('all');
  const [timesheetWeekFilter, setTimesheetWeekFilter] =
    useState<string>('all');
  const [timesheetStatusCardFilter, setTimesheetStatusCardFilter] =
    useState<string>('all');

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTimesheet, setSelectedTimesheet] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [expenseReports, setExpenseReports] = useState<ManagerExpenseReport[]>(
    []
  );
  const [expenseStatusFilter, setExpenseStatusFilter] = useState<
    'all' | 'submitted' | 'approved' | 'rejected'
  >('all');

  // Reject modal state
  const [rejectModal, setRejectModal] = useState<{
    open: boolean
    title: string
    message: string
    onConfirm: (reason?: string) => void
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  const { toast } = useToast();

  useEffect(() => {
    fetchManagerId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (managerId) {
      loadSubmissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managerId]);

  const fetchManagerId = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setManagerId(user.id);
    }
  };

  // Sunday–Saturday range for display
  const getWeekRange = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDay();
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - day);
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);

    const fmt = (date: Date) => {
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const dayNum = date.getDate().toString().padStart(2, '0');
      return `${month} ${dayNum}`;
    };

    const label = `${fmt(sunday)} - ${fmt(saturday)}, ${saturday.getFullYear()}`;
    const endDate = saturday;
    return { label, endDate };
  };

  const loadSubmissions = async () => {
    if (!managerId) return;
    setIsLoading(true);

    try {
      // Check for active delegations — managers who delegated to this user
      const today = new Date().toISOString().split('T')[0]
      const { data: delegations } = await supabase
        .from('approval_delegations')
        .select('delegator_id')
        .eq('delegate_id', managerId)
        .eq('is_active', true)
        .lte('start_date', today)
        .or(`end_date.is.null,end_date.gte.${today}`)

      const delegatedManagerIds = (delegations || []).map(d => d.delegator_id)

      // Employees for this manager + any delegated managers' teams
      const managerIds = [managerId, ...delegatedManagerIds]
      const orFilter = managerIds.map(id => `manager_id.eq.${id}`).join(',')

      const { data: allEmployees, error: empError } = await supabase
        .from('employees')
        .select('*')
        .or(`id.eq.${managerId},${orFilter}`)
        .order('last_name', { ascending: true });

      if (empError) throw empError;
      if (!allEmployees || allEmployees.length === 0) {
        setEmployees([]);
        setSubmissions([]);
        setTimesheetProjectMap({});
        setProjectOptions([]);
        setExpenseReports([]);
        return;
      }

      setEmployees(allEmployees as Employee[]);
      const employeeIds = (allEmployees as Employee[]).map((e) => e.id);

      // time approvers -> projects
      const { data: approverRows, error: approverError } = await supabase
        .from('time_approvers')
        .select('project_id')
        .eq('employee_id', managerId)
        .eq('can_approve', true);

      if (approverError) throw approverError;

      const approverProjectIds = (approverRows || [])
        .map((r) => r.project_id)
        .filter(Boolean);

      let timesheets: any[] = [];
      let timesheetEntries: any[] = [];

      if (approverProjectIds.length > 0) {
        const { data: entryRows, error: entryError } = await supabase
          .from('timesheet_entries')
          .select('timesheet_id, project_id')
          .in('project_id', approverProjectIds);

        if (entryError) throw entryError;

        const timesheetIds = Array.from(
          new Set(
            (entryRows || [])
              .map((e) => e.timesheet_id)
              .filter((id) => !!id)
          )
        );

        if (timesheetIds.length > 0) {
          const { data: tsData, error: tsError } = await supabase
            .from('timesheets')
            .select('*')
            .in('id', timesheetIds)
            .in('employee_id', employeeIds);

          if (tsError) throw tsError;
          timesheets = tsData || [];

          const { data: fullEntries, error: fullEntryError } = await supabase
            .from('timesheet_entries')
            .select(
              `
              id,
              timesheet_id,
              project_id,
              project:projects!timesheet_entries_project_id_fkey (
                id,
                name,
                code
              )
            `
            )
            .in('timesheet_id', timesheetIds);

          if (fullEntryError) throw fullEntryError;
          timesheetEntries = fullEntries || [];
        }
      } else {
        const { data: tsData, error: tsError } = await supabase
          .from('timesheets')
          .select('*')
          .in('employee_id', employeeIds);

        if (tsError) throw tsError;
        timesheets = tsData || [];

        if (timesheets.length > 0) {
          const { data: fullEntries, error: fullEntryError } = await supabase
            .from('timesheet_entries')
            .select(
              `
              id,
              timesheet_id,
              project_id,
              project:projects!timesheet_entries_project_id_fkey (
                id,
                name,
                code
              )
            `
            )
            .in(
              'timesheet_id',
              timesheets.map((t) => t.id)
            );

          if (fullEntryError) throw fullEntryError;
          timesheetEntries = fullEntries || [];
        }
      }

      // project filters
      const projectMap: Record<string, ProjectOption> = {};
      const tMap: Record<string, string[]> = {};

      timesheetEntries.forEach((entry: any) => {
        if (!entry.project_id) return;
        if (!tMap[entry.timesheet_id]) tMap[entry.timesheet_id] = [];
        tMap[entry.timesheet_id].push(entry.project_id);

        if (entry.project) {
          projectMap[entry.project.id] = {
            id: entry.project.id,
            name: entry.project.name,
            code: entry.project.code,
          };
        }
      });

      setTimesheetProjectMap(tMap);
      setProjectOptions(Object.values(projectMap));

      // timesheet submissions for cards/list
      const timesheetSubmissions: Submission[] = timesheets.map((t: any) => {
        const { label: week_range, endDate } = getWeekRange(t.week_ending);
        const emp = (allEmployees as Employee[]).find(
          (e) => e.id === t.employee_id
        );
        const hourlyRate = emp?.hourly_rate || 0;

        return {
          id: t.id,
          type: 'timesheet',
          employee: emp,
          date: endDate.toISOString(),
          amount: (t.total_hours || 0) * hourlyRate,
          hours: t.total_hours,
          overtime_hours: t.overtime_hours,
          status: t.status,
          week_range,
          description: `Week ending ${endDate.toLocaleDateString()}`,
        };
      });

      timesheetSubmissions.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setSubmissions(timesheetSubmissions);

      // Expense reports for this manager's team
      const { data: reports, error: reportsError } = await supabase
        .from('expense_reports')
        .select(
          `
          *,
          employee:employee_id (
            id,
            first_name,
            middle_name,
            last_name,
            email,
            department,
            hourly_rate,
            employee_id,
            manager_id,
            role
          )
        `
        )
        .in('employee_id', employeeIds)
        .order('created_at', { ascending: false });

      if (reportsError || !reports) {
        console.error('Error loading expense reports:', reportsError);
        setExpenseReports([]);
      } else {
        const baseReports = reports as ManagerExpenseReport[];
        const reportIds = baseReports.map((r) => r.id);

        const { data: expenseLines, error: expenseLinesError } = await supabase
          .from('expenses')
          .select('id, report_id, status')
          .in('report_id', reportIds);

        if (expenseLinesError || !expenseLines) {
          console.error(
            'Error loading expense line statuses:',
            expenseLinesError
          );
          setExpenseReports(baseReports);
        } else {
          const statusMap = new Map<string, LineStatus[]>();

          (expenseLines as { report_id: string; status: LineStatus }[]).forEach(
            (line) => {
              const list = statusMap.get(line.report_id) || [];
              list.push(line.status);
              statusMap.set(line.report_id, list);
            }
          );

          const normalizedReports: ManagerExpenseReport[] = baseReports.map(
            (report) => {
              const lineStatuses = statusMap.get(report.id) || [];
              const derivedStatus = deriveReportStatusFromLines(lineStatuses);
              return {
                ...report,
                status: derivedStatus,
              };
            }
          );

          setExpenseReports(normalizedReports);
        }
      }
    } catch (error) {
      console.error('Error loading submissions:', error);
      setSubmissions([]);
      setTimesheetProjectMap({});
      setProjectOptions([]);
      setExpenseReports([]);
    } finally {
      setIsLoading(false);
    }
  };

  // === Timesheet details / modal ===
  const handleViewTimesheet = async (submission: Submission) => {
    try {
      setProcessingId(submission.id);

      const { data: timesheetData, error: timesheetError } = await supabase
        .from('timesheets')
        .select(
          `
          *,
          employee:employees!timesheets_employee_id_fkey (
            id,
            first_name,
            middle_name,
            last_name,
            email,
            department,
            hourly_rate
          )
        `
        )
        .eq('id', submission.id)
        .single();

      if (timesheetError) throw timesheetError;

      const { data: entries, error: entriesError } = await supabase
        .from('timesheet_entries')
        .select(
          `
          *,
          project:projects!timesheet_entries_project_id_fkey (
            id,
            name,
            code
          )
        `
        )
        .eq('timesheet_id', submission.id)
        .order('date', { ascending: true });

      if (entriesError) throw entriesError;

      const totalHours = timesheetData.total_hours || 0;
      const overtimeHours =
        timesheetData.overtime_hours ?? Math.max(0, totalHours - 40);

      const timesheetWithDetails = {
        ...timesheetData,
        total_hours: totalHours,
        overtime_hours: overtimeHours,
        entries: entries || [],
      };

      setSelectedTimesheet(timesheetWithDetails);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error fetching timesheet details:', error);
    } finally {
      setProcessingId(null);
    }
  };

  // === TIMESHEET STATUS: call API route so emails + state machine are used ===
  const callTimesheetStatus = async (
    timesheetId: string,
    body: { action: 'approve' | 'reject'; rejectionReason?: string }
  ) => {
    const res = await fetch(`/api/timesheets/${timesheetId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let message = 'Failed to update timesheet.';
      try {
        const data = await res.json();
        if (data?.error) message = data.error;
      } catch {
        // ignore parse error
      }
      throw new Error(message);
    }

    return res.json();
  };

  const handleApproveTimesheet = async (submission: Submission) => {
    try {
      if (!submission.id) return;
      await callTimesheetStatus(submission.id, { action: 'approve' });
      toast('success', 'Timesheet approved successfully.');
      await loadSubmissions();
      if (selectedTimesheet?.id === submission.id) {
        setIsModalOpen(false);
        setSelectedTimesheet(null);
      }
    } catch (error: any) {
      console.error('Error approving timesheet:', error);
      toast('error', error?.message || 'An error occurred while approving the timesheet.');
    }
  };

  const promptRejectTimesheet = (submission: Submission) => {
    setRejectModal({
      open: true,
      title: 'Reject Timesheet',
      message: 'Please provide a reason for rejection. This will be visible to the employee.',
      onConfirm: async (reason) => {
        setRejectModal(prev => ({ ...prev, open: false }));
        if (!reason || !reason.trim()) {
          toast('warning', 'A rejection reason is required.');
          return;
        }
        try {
          await callTimesheetStatus(submission.id, {
            action: 'reject',
            rejectionReason: reason.trim(),
          });
          toast('success', 'Timesheet rejected successfully.');
          await loadSubmissions();
          if (selectedTimesheet?.id === submission.id) {
            setIsModalOpen(false);
            setSelectedTimesheet(null);
          }
        } catch (error: any) {
          console.error('Error rejecting timesheet:', error);
          toast('error', error?.message || 'An error occurred while rejecting the timesheet.');
        }
      }
    });
  };

  // Keep old name for modal handler reference
  const handleRejectTimesheet = (submission: Submission) => {
    promptRejectTimesheet(submission);
  };

  // Modal handlers wrap the same approve/reject
  const handleModalApprove = async () => {
    if (!selectedTimesheet) return;
    const submission = submissions.find((s) => s.id === selectedTimesheet.id);
    if (submission) {
      await handleApproveTimesheet(submission);
    }
  };

  const handleModalReject = async () => {
    if (!selectedTimesheet) return;
    const submission = submissions.find((s) => s.id === selectedTimesheet.id);
    if (submission) {
      await handleRejectTimesheet(submission);
    }
  };

  // === EXPENSE REPORT APPROVE / REJECT using finalize API (emails + logic) ===
  const handleApproveExpenseReport = async (report: ManagerExpenseReport) => {
    try {
      setProcessingId(report.id);

      const res = await fetch(
        `/api/expense-reports/${report.id}/finalize`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'approve' }),
        }
      );

      if (!res.ok) {
        let message = 'Failed to approve expense report.';
        try {
          const data = await res.json();
          if (data?.error) message = data.error;
        } catch {
          // ignore parse error
        }
        throw new Error(message);
      }

      toast('success', 'Expense report approved successfully.');
      await loadSubmissions();
    } catch (error: any) {
      console.error('Error approving expense report:', error);
      toast('error', error?.message || 'An error occurred while approving the report.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectExpenseReport = (report: ManagerExpenseReport) => {
    setRejectModal({
      open: true,
      title: 'Reject Expense Report',
      message: `Enter a reason for rejecting "${report.title ?? 'this expense report'}":`,
      onConfirm: async (reason) => {
        setRejectModal(prev => ({ ...prev, open: false }));
        if (!reason || !reason.trim()) {
          toast('warning', 'A rejection reason is required.');
          return;
        }

        try {
          setProcessingId(report.id);

          const res = await fetch(
            `/api/expense-reports/${report.id}/finalize`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'reject',
                reason: reason.trim(),
              }),
            }
          );

          if (!res.ok) {
            let message = 'Failed to reject expense report.';
            try {
              const data = await res.json();
              if (data?.error) message = data.error;
            } catch {
              // ignore parse error
            }
            throw new Error(message);
          }

          toast('success', 'Expense report rejected successfully.');
          await loadSubmissions();
        } catch (err: any) {
          console.error('Error rejecting expense report:', err);
          toast('error', err?.message || 'An error occurred while rejecting the report.');
        } finally {
          setProcessingId(null);
        }
      }
    });
  };

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const allTimesheetsCount = submissions.length;
  const timesheetPendingCount = submissions.filter(
    (s) => s.status === 'submitted'
  ).length;
  const approvedTimesheetCount = submissions.filter(
    (s) => s.status === 'approved'
  ).length;

  const allExpenseReportsCount = expenseReports.length;
  const expensePendingCount = expenseReports.filter(
    (r) => r.status === 'submitted'
  ).length;
  const approvedExpenseCount = expenseReports.filter(
    (r) => r.status === 'approved'
  ).length;

  const baseFilteredSubmissions = (() => {
    let filtered = submissions;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((s) => {
        const emp = s.employee;
        const name = formatName(
          emp?.first_name,
          emp?.middle_name || undefined,
          emp?.last_name,
          'firstLast'
        ).toLowerCase();
        const email = emp?.email?.toLowerCase() || '';
        const desc = (s.description || '').toLowerCase();
        const week = (s.week_range || '').toLowerCase();
        return (
          name.includes(term) ||
          email.includes(term) ||
          desc.includes(term) ||
          week.includes(term)
        );
      });
    }

    if (projectFilter !== 'all') {
      filtered = filtered.filter((s) => {
        const projectIds = timesheetProjectMap[s.id] || [];
        return projectIds.includes(projectFilter);
      });
    }

    return filtered;
  })();

  const allTimesheetSubmissions = baseFilteredSubmissions;

  const timesheetEmployeeOptions: Employee[] = Array.from(
    new Map(
      allTimesheetSubmissions
        .filter((s) => s.employee)
        .map((s) => [s.employee!.id, s.employee!])
    ).values()
  ).sort((a, b) =>
    formatName(a.first_name, a.middle_name || undefined, a.last_name)
      .toLowerCase()
      .localeCompare(
        formatName(
          b.first_name,
          b.middle_name || undefined,
          b.last_name
        ).toLowerCase()
      )
  );

  const weekOptions: string[] = Array.from(
    new Set(allTimesheetSubmissions.map((s) => s.week_range).filter(Boolean))
  ) as string[];

  const statusOptions = ['submitted', 'approved', 'rejected', 'draft'];

  const visibleTimesheetsAllTab = allTimesheetSubmissions
    .filter((s) => {
      if (
        timesheetEmployeeFilter !== 'all' &&
        s.employee?.id !== timesheetEmployeeFilter
      )
        return false;
      if (
        timesheetWeekFilter !== 'all' &&
        s.week_range !== timesheetWeekFilter
      )
        return false;
      if (
        timesheetStatusCardFilter !== 'all' &&
        s.status !== timesheetStatusCardFilter
      )
        return false;
      return true;
    })
    .sort((a, b) =>
      formatName(
        a.employee?.first_name,
        a.employee?.middle_name || undefined,
        a.employee?.last_name
      )
        .toLowerCase()
        .localeCompare(
          formatName(
            b.employee?.first_name,
            b.employee?.middle_name || undefined,
            b.employee?.last_name
          ).toLowerCase()
        )
    );

  const visibleTimesheetsCountAllTab = visibleTimesheetsAllTab.length;

  const baseFilteredExpenseReports = (() => {
    let filtered = expenseReports;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((r) => {
        const emp = r.employee;
        const name = formatName(
          emp?.first_name,
          emp?.middle_name || undefined,
          emp?.last_name,
          'firstLast'
        ).toLowerCase();
        const email = emp?.email?.toLowerCase() || '';
        const title = (r.title || '').toLowerCase();
        return (
          name.includes(term) ||
          email.includes(term) ||
          title.includes(term)
        );
      });
    }

    if (timesheetEmployeeFilter !== 'all') {
      filtered = filtered.filter(
        (r) => r.employee_id === timesheetEmployeeFilter
      );
    }

    if (expenseStatusFilter !== 'all') {
      filtered = filtered.filter((r) => r.status === expenseStatusFilter);
    }

    return filtered;
  })();

  const visibleExpenseReportsAllTab = baseFilteredExpenseReports.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const visibleExpensesCountAllTab = visibleExpenseReportsAllTab.length;

  const formatDateDisplay = (value: string | null) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const greeting = getTimeBasedGreeting();
  const displayName = employee?.first_name || 'Employee';

  const employeeFilterLabel =
    timesheetEmployeeFilter !== 'all'
      ? (() => {
          const emp = employees.find((e) => e.id === timesheetEmployeeFilter);
          return emp
            ? formatName(
                emp.first_name,
                emp.middle_name || undefined,
                emp.last_name,
                'firstLast'
              )
            : 'Employee';
        })()
      : null;

  const hasTimesheetFilters =
    timesheetEmployeeFilter !== 'all' ||
    timesheetWeekFilter !== 'all' ||
    timesheetStatusCardFilter !== 'all';

  const resetTimesheetFilters = () => {
    setTimesheetEmployeeFilter('all');
    setTimesheetWeekFilter('all');
    setTimesheetStatusCardFilter('all');
  };

  if (isLoading) {
    return (
      <div style={{ padding: '36px 40px' }}>
        <div style={{ marginBottom: 24 }}>
          <div className="anim-shimmer" style={{ width: 200, height: 28, borderRadius: 4, marginBottom: 8 }} />
          <div className="anim-shimmer" style={{ width: 300, height: 16, borderRadius: 4 }} />
        </div>
        <SkeletonStats count={4} />
        <SkeletonList rows={5} />
      </div>
    );
  }

  return (
    <>
      {/* PAGE TITLE */}
      <div style={{ padding: '36px 40px 0 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
              Review Dashboard
            </h1>
            <p style={{ fontSize: 13, fontWeight: 400, color: '#bbb', marginTop: 4 }}>
              Review and approve timesheets and expenses for your team.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={loadSubmissions}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', fontSize: 13, fontWeight: 500,
                color: '#777', background: '#fff',
                border: '0.5px solid #e0dcd7', borderRadius: 6,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ccc'; e.currentTarget.style.color = '#555'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e0dcd7'; e.currentTarget.style.color = '#777'; }}
            >
              <RefreshCw size={14} />
              Refresh
            </button>
            <NotificationBell />
          </div>
        </div>
      </div>

      {/* NAV TABS */}
      <div style={{ padding: '0 40px', borderBottom: '0.5px solid #f0ece7' }}>
        <div style={{ display: 'flex', gap: 28 }}>
          <button
            onClick={() => router.push('/manager')}
            style={{
              padding: '12px 0', fontSize: 12, fontWeight: 600, color: '#1a1a1a',
              borderBottom: '2px solid #e31c79', background: 'none', border: 'none',
              borderBottomWidth: 2, borderBottomStyle: 'solid', borderBottomColor: '#e31c79',
              cursor: 'pointer',
            }}
          >
            Review
          </button>

          <div className="relative group" style={{ position: 'relative' }}>
            <button
              style={{
                padding: '12px 0', fontSize: 12, fontWeight: 400, color: '#999',
                background: 'none', border: 'none', borderBottom: '2px solid transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              Reports
              <ChevronDown style={{ width: 14, height: 14 }} />
            </button>
            <div
              className="absolute left-0 mt-1 w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50"
              style={{ background: '#fff', borderRadius: 10, border: '0.5px solid #e8e4df' }}
            >
              <div style={{ padding: '8px 0', fontSize: 12 }}>
                <div style={{ padding: '6px 16px', fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const }}>
                  Time reports
                </div>
                <a href="/manager/reports/time-by-project" style={{ display: 'block', padding: '6px 16px', color: '#555', textDecoration: 'none' }}>
                  Time by project
                </a>
                <a href="/manager/reports/time-by-employee" style={{ display: 'block', padding: '6px 16px', color: '#555', textDecoration: 'none' }}>
                  Time by employee
                </a>
                <a href="/manager/reports/time-by-class" style={{ display: 'block', padding: '6px 16px', color: '#555', textDecoration: 'none' }}>
                  Time by class
                </a>
                <a href="/manager/reports/time-by-approver" style={{ display: 'block', padding: '6px 16px', color: '#555', textDecoration: 'none' }}>
                  Time by approver
                </a>
                <a href="/manager/reports/time-missing" style={{ display: 'block', padding: '6px 16px', color: '#555', textDecoration: 'none' }}>
                  Time missing
                </a>

                <div style={{ borderTop: '0.5px solid #f0ece7', margin: '6px 0' }} />

                <div style={{ padding: '6px 16px', fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const }}>
                  Expense reports
                </div>
                <a href="/manager/reports/expenses-by-employee" style={{ display: 'block', padding: '6px 16px', color: '#555', textDecoration: 'none' }}>
                  Expenses by employee
                </a>
                <a href="/manager/reports/expenses-by-project" style={{ display: 'block', padding: '6px 16px', color: '#555', textDecoration: 'none' }}>
                  Expenses by project
                </a>
                <a href="/manager/reports/expenses-by-approver" style={{ display: 'block', padding: '6px 16px', color: '#555', textDecoration: 'none' }}>
                  Expenses by approver
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SUMMARY CARDS — Enhanced Widgets */}
      <div style={{ padding: '24px 40px 0 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const }}>
            Overview
          </div>
          <button
            onClick={() => router.push('/manager/delegations')}
            className="transition-colors duration-150"
            style={{ fontSize: 11, fontWeight: 500, padding: '6px 14px', color: '#777', background: '#fff', border: '0.5px solid #e0dcd7', borderRadius: 7, cursor: 'pointer' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ccc'; e.currentTarget.style.color = '#555'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e0dcd7'; e.currentTarget.style.color = '#777'; }}
          >
            Manage Delegations
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Pending Your Approval" value={timesheetPendingCount + expensePendingCount} desc={`${timesheetPendingCount} timesheets, ${expensePendingCount} expenses`} color="pink" />
          <StatCard label="Team Hours This Week" value={(() => {
            const now = new Date();
            const dayOfWeek = now.getDay();
            const saturday = new Date(now);
            saturday.setDate(now.getDate() + (6 - dayOfWeek));
            const weekEndingStr = saturday.toISOString().split('T')[0];
            return submissions.filter(s => s.date?.split('T')[0] === weekEndingStr).reduce((sum, s) => sum + (s.hours || 0), 0).toFixed(1);
          })()} desc="current week total" color="default" />
          <StatCard label="Overdue Submissions" value={(() => {
            const now = new Date();
            const dayOfWeek = now.getDay();
            const saturday = new Date(now);
            saturday.setDate(now.getDate() + (6 - dayOfWeek));
            const weekEndingStr = saturday.toISOString().split('T')[0];
            const employeesWithTs = new Set(submissions.filter(s => s.date?.split('T')[0] === weekEndingStr && s.status !== 'draft').map(s => s.employee?.id));
            return employees.filter(e => e.id !== managerId && e.role !== 'admin' && !employeesWithTs.has(e.id)).length;
          })()} desc="not submitted this week" color={(() => {
            const now = new Date();
            const dayOfWeek = now.getDay();
            const saturday = new Date(now);
            saturday.setDate(now.getDate() + (6 - dayOfWeek));
            const weekEndingStr = saturday.toISOString().split('T')[0];
            const employeesWithTs = new Set(submissions.filter(s => s.date?.split('T')[0] === weekEndingStr && s.status !== 'draft').map(s => s.employee?.id));
            return employees.filter(e => e.id !== managerId && e.role !== 'admin' && !employeesWithTs.has(e.id)).length > 0 ? 'gold' : 'default';
          })()} />
          <StatCard label="Approved This Week" value={approvedTimesheetCount + approvedExpenseCount} desc={`${approvedTimesheetCount} timesheets, ${approvedExpenseCount} expenses`} color="green" />
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ padding: '24px 40px 40px 40px' }}>
        {/* search */}
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 320 }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#ccc' }} />
            <input
              type="text"
              placeholder="Search by employee, email, title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
                fontSize: 12, color: '#555', background: '#fff',
                border: '0.5px solid #e8e4df', borderRadius: 8,
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* TIMESHEETS SECTION */}
        <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, marginBottom: 20, overflow: 'hidden' }}>
          <div style={{ padding: '14px 22px', borderBottom: '0.5px solid #f0ece7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>Timesheets</span>
            <span style={{ fontSize: 10, fontWeight: 400, color: '#d0cbc4' }}>
              {visibleTimesheetsCountAllTab > 0 ? '1 – ' : '0 of '}
              {visibleTimesheetsCountAllTab} of {allTimesheetsCount}
            </span>
          </div>

          {hasTimesheetFilters && (
            <div style={{ padding: '10px 22px', borderBottom: '0.5px solid #f5f2ee' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderRadius: 6, background: '#FAFAF8', border: '0.5px solid #e8e4df', fontSize: 10, color: '#777' }}>
                <span style={{ fontWeight: 600 }}>Filtered by:</span>
                {employeeFilterLabel && (
                  <span>Employee: {employeeFilterLabel}</span>
                )}
                {timesheetWeekFilter !== 'all' && (
                  <span>Week: {timesheetWeekFilter}</span>
                )}
                {timesheetStatusCardFilter !== 'all' && (
                  <span>
                    Status:{' '}
                    {timesheetStatusCardFilter.charAt(0).toUpperCase() + timesheetStatusCardFilter.slice(1)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={resetTimesheetFilters}
                  style={{ marginLeft: 6, color: '#e31c79', background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, textDecoration: 'underline' }}
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          {allTimesheetsCount === 0 ? (
            <div style={{ padding: '32px 22px', textAlign: 'center', fontSize: 12, color: '#999' }}>
              No timesheets to display.
            </div>
          ) : (
            <>
              {/* header row */}
              <div style={{ padding: '8px 18px', display: 'flex', alignItems: 'center', fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase' as const }}>
                <div style={{ width: 32 }} />
                <div style={{ flex: 1, paddingRight: 8 }}>
                  <select
                    value={timesheetEmployeeFilter}
                    onChange={(e) => setTimesheetEmployeeFilter(e.target.value)}
                    style={{ width: '100%', fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase' as const, padding: '4px 6px', border: '0.5px solid #e8e4df', borderRadius: 4, background: '#fff', outline: 'none' }}
                  >
                    <option value="all">Employee</option>
                    {timesheetEmployeeOptions.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {formatName(emp.first_name, emp.middle_name || undefined, emp.last_name)}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ width: 160, paddingRight: 8 }}>
                  <select
                    value={timesheetWeekFilter}
                    onChange={(e) => setTimesheetWeekFilter(e.target.value)}
                    style={{ width: '100%', fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase' as const, padding: '4px 6px', border: '0.5px solid #e8e4df', borderRadius: 4, background: '#fff', outline: 'none' }}
                  >
                    <option value="all">Week</option>
                    {weekOptions.map((week) => (
                      <option key={week} value={week}>{week}</option>
                    ))}
                  </select>
                </div>
                <div style={{ width: 128, paddingRight: 8 }}>
                  <select
                    value={timesheetStatusCardFilter}
                    onChange={(e) => setTimesheetStatusCardFilter(e.target.value)}
                    style={{ width: '100%', fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase' as const, padding: '4px 6px', border: '0.5px solid #e8e4df', borderRadius: 4, background: '#fff', outline: 'none' }}
                  >
                    <option value="all">Status</option>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ width: 96, textAlign: 'right' }}>Hours</div>
                <div style={{ width: 128, textAlign: 'right' }}>Actions</div>
              </div>

              {visibleTimesheetsAllTab.map((submission) => (
                <div
                  key={submission.id}
                  style={{
                    padding: '13px 18px', display: 'flex', alignItems: 'center',
                    fontSize: 12.5, fontWeight: 400, color: '#555',
                    borderBottom: '0.5px solid #f5f2ee', cursor: 'pointer',
                    background: '#fff',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#FDFCFB'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                  onClick={() => router.push(`/manager/timesheet/${submission.id}`)}
                >
                  <div style={{ width: 32 }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: '#1a1a1a' }}>
                      {formatName(
                        submission.employee?.first_name,
                        submission.employee?.middle_name || undefined,
                        submission.employee?.last_name
                      )}
                    </span>
                  </div>
                  <div style={{ width: 160, fontSize: 12.5, color: '#555' }}>
                    {submission.week_range}
                  </div>
                  <div style={{ width: 128, textAlign: 'center' }}>
                    <StatusBadge status={submission.status} />
                  </div>
                  <div style={{ width: 96, textAlign: 'right', fontWeight: 500, color: '#1a1a1a' }}>
                    {submission.hours?.toFixed(2) || '0.00'}
                  </div>
                  <div style={{ width: 128, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
                    {submission.status === 'submitted' && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleApproveTimesheet(submission); }}
                          style={{ padding: 4, color: '#2d9b6e', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4 }}
                          title="Approve"
                        >
                          <CheckCircle style={{ width: 16, height: 16 }} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRejectTimesheet(submission); }}
                          style={{ padding: 4, color: '#b91c1c', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4 }}
                          title="Reject"
                        >
                          <XCircle style={{ width: 16, height: 16 }} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}

              <div style={{ padding: '10px 22px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', borderTop: '0.5px solid #f0ece7' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#1a1a1a' }}>
                  Total hours:{' '}
                  {visibleTimesheetsAllTab.reduce((sum, s) => sum + (s.hours || 0), 0).toFixed(2)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* EXPENSE REPORTS SECTION */}
        <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '14px 22px', borderBottom: '0.5px solid #f0ece7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>Expenses</span>
            <span style={{ fontSize: 10, fontWeight: 400, color: '#d0cbc4' }}>
              {visibleExpensesCountAllTab > 0 ? '1 – ' : '0 of '}
              {visibleExpensesCountAllTab} of {allExpenseReportsCount}
            </span>
          </div>

          {/* Expense status filters */}
          <div style={{ padding: '12px 22px', borderBottom: '0.5px solid #f0ece7', display: 'flex', gap: 8 }}>
            {(['all', 'submitted', 'approved', 'rejected'] as const).map((status) => {
              const isActive = expenseStatusFilter === status;
              const label = status === 'all' ? 'All' : status === 'submitted' ? 'Pending' : status.charAt(0).toUpperCase() + status.slice(1);
              return (
                <button
                  key={status}
                  onClick={() => setExpenseStatusFilter(status)}
                  style={{
                    padding: '4px 12px', borderRadius: 4, fontSize: 10, fontWeight: 500,
                    cursor: 'pointer', border: 'none',
                    background: isActive ? '#e31c79' : '#fff',
                    color: isActive ? '#fff' : '#777',
                    ...(isActive ? {} : { border: '0.5px solid #e0dcd7' }),
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {visibleExpenseReportsAllTab.length === 0 ? (
            <div style={{ padding: '32px 22px', textAlign: 'center', fontSize: 12, color: '#999' }}>
              {timesheetEmployeeFilter !== 'all'
                ? 'No expense reports for the selected employee.'
                : 'No expense reports to display.'}
            </div>
          ) : (
            <>
              {/* header */}
              <div style={{ padding: '8px 18px', display: 'flex', alignItems: 'center', fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase' as const }}>
                <div style={{ width: 32 }} />
                <div style={{ flex: 1 }}>Employee</div>
                <div style={{ flex: 1 }}>Title</div>
                <div style={{ width: 160 }}>Period / Created</div>
                <div style={{ width: 128, textAlign: 'center' }}>Status</div>
                <div style={{ width: 112, textAlign: 'right' }}>Total</div>
                <div style={{ width: 112, textAlign: 'right' }}>Actions</div>
              </div>

              {visibleExpenseReportsAllTab.map((report) => (
                <div
                  key={report.id}
                  style={{
                    padding: '13px 18px', display: 'flex', alignItems: 'center',
                    fontSize: 12.5, fontWeight: 400, color: '#555',
                    borderBottom: '0.5px solid #f5f2ee', cursor: 'pointer',
                    background: '#fff',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#FDFCFB'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                  onClick={() => router.push(`/manager/expense/${report.id}`)}
                >
                  <div style={{ width: 32 }} />
                  <div style={{ flex: 1 }}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); router.push(`/manager/expense/${report.id}`); }}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12.5, fontWeight: 500, color: '#1a1a1a', textAlign: 'left' }}
                    >
                      {formatName(
                        report.employee?.first_name,
                        report.employee?.middle_name || undefined,
                        report.employee?.last_name
                      ) || 'Employee'}
                    </button>
                  </div>
                  <div style={{ flex: 1, fontSize: 12.5, color: '#555' }}>
                    {report.title || 'Expense Report'}
                  </div>
                  <div style={{ width: 160, fontSize: 12.5, color: '#555' }}>
                    {report.period_month
                      ? formatDateDisplay(report.period_month)
                      : formatDateDisplay(report.created_at)}
                  </div>
                  <div style={{ width: 128, textAlign: 'center' }}>
                    <StatusBadge status={report.status} />
                  </div>
                  <div style={{ width: 112, textAlign: 'right', fontWeight: 500, color: '#1a1a1a' }}>
                    ${report.total_amount.toFixed(2)}
                  </div>
                  <div style={{ width: 112, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
                    {report.status === 'submitted' && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleApproveExpenseReport(report); }}
                          style={{ padding: 4, color: '#2d9b6e', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4 }}
                          title="Approve report"
                          disabled={processingId === report.id}
                        >
                          <CheckCircle style={{ width: 16, height: 16 }} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRejectExpenseReport(report); }}
                          style={{ padding: 4, color: '#b91c1c', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4 }}
                          title="Reject report"
                          disabled={processingId === report.id}
                        >
                          <XCircle style={{ width: 16, height: 16 }} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}

              <div style={{ padding: '10px 22px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', borderTop: '0.5px solid #f0ece7' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#1a1a1a' }}>
                  Total: $
                  {visibleExpenseReportsAllTab.reduce((sum, r) => sum + (r.total_amount || 0), 0).toFixed(2)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Timesheet review is now a full page at /manager/timesheet/[id] */}

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
        onConfirm={(reason) => rejectModal.onConfirm(reason)}
        onCancel={() => setRejectModal(prev => ({ ...prev, open: false }))}
      />
    </>
  );
}
