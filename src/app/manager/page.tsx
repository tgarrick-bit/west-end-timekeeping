'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import TimesheetModal from '@/components/TimesheetModal';

import {
  CheckCircle,
  XCircle,
  LogOut,
  AlertCircle,
  ChevronDown,
  Eye,
  Calendar,
  User,
  RefreshCw,
  SlidersHorizontal,
  Search,
} from 'lucide-react';

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
  const supabase = createClientComponentClient();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [managerId, setManagerId] = useState<string | null>(null);

  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [timesheetProjectMap, setTimesheetProjectMap] = useState<Record<string, string[]>>({});

  const [timesheetEmployeeFilter, setTimesheetEmployeeFilter] = useState<string>('all');
  const [timesheetWeekFilter, setTimesheetWeekFilter] = useState<string>('all');
  const [timesheetStatusCardFilter, setTimesheetStatusCardFilter] = useState<string>('all');

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTimesheet, setSelectedTimesheet] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [expenseReports, setExpenseReports] = useState<ManagerExpenseReport[]>([]);
  const [expenseStatusFilter, setExpenseStatusFilter] =
    useState<'all' | 'submitted' | 'approved' | 'rejected'>('all');

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

  // Sunday–Saturday range
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
      // employees for this manager
      const { data: allEmployees, error: empError } = await supabase
        .from('employees')
        .select('*')
        .or(`id.eq.${managerId},manager_id.eq.${managerId}`)
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

      const approverProjectIds = (approverRows || []).map((r) => r.project_id).filter(Boolean);

      let timesheets: any[] = [];
      let timesheetEntries: any[] = [];

      if (approverProjectIds.length > 0) {
        const { data: entryRows, error: entryError } = await supabase
          .from('timesheet_entries')
          .select('timesheet_id, project_id')
          .in('project_id', approverProjectIds);

        if (entryError) throw entryError;

        const timesheetIds = Array.from(
          new Set((entryRows || []).map((e) => e.timesheet_id).filter(Boolean))
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

      // timesheet submissions
      const timesheetSubmissions: Submission[] = timesheets.map((t: any) => {
        const { label: week_range, endDate } = getWeekRange(t.week_ending);
        const emp = (allEmployees as Employee[]).find((e) => e.id === t.employee_id);
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

      // expense reports for this manager's team
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

      if (reportsError) {
        console.error('Error loading expense reports:', reportsError);
        setExpenseReports([]);
      } else {
        setExpenseReports((reports || []) as ManagerExpenseReport[]);
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

  const handleApproveTimesheet = async (submission: Submission) => {
    if (!managerId) return;

    const { error } = await supabase
      .from('timesheets')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: managerId,
      })
      .eq('id', submission.id);

    if (!error) {
      await loadSubmissions();
      if (selectedTimesheet?.id === submission.id) {
        setIsModalOpen(false);
        setSelectedTimesheet(null);
      }
    } else {
      console.error('Error approving timesheet:', error);
    }
  };

  const handleRejectTimesheet = async (submission: Submission) => {
    if (!managerId) return;

    const reason = prompt(
      'Please provide a reason for rejection (this will be visible to the employee):'
    );
    if (!reason) return;

    const { error } = await supabase
      .from('timesheets')
      .update({
        status: 'rejected',
        approved_at: new Date().toISOString(),
        approved_by: managerId,
        comments: reason,
      })
      .eq('id', submission.id);

    if (!error) {
      await loadSubmissions();
      if (selectedTimesheet?.id === submission.id) {
        setIsModalOpen(false);
        setSelectedTimesheet(null);
      }
    } else {
      console.error('Error rejecting timesheet:', error);
    }
  };

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

  const handleApproveExpenseReport = async (report: ManagerExpenseReport) => {
    if (!managerId) return;

    try {
      setProcessingId(report.id);

      // update report
      const { error: reportError } = await supabase
        .from('expense_reports')
        .update({ status: 'approved' })
        .eq('id', report.id);

      if (reportError) throw reportError;

      // cascade to lines by report_id
      const { error: linesError } = await supabase
        .from('expenses')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: managerId,
        })
        .eq('report_id', report.id);

      if (linesError) throw linesError;

      await loadSubmissions();
    } catch (error) {
      console.error('Error approving expense report:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectExpenseReport = async (report: ManagerExpenseReport) => {
    const reason = window.prompt(
      `Enter a reason for rejecting "${report.title ?? 'this expense report'}":`
    );
  
    if (!reason || !reason.trim()) {
      // optional: alert and bail out
      alert('A rejection reason is required.');
      return;
    }
  
    try {
      const res = await fetch(`/api/expenses/${report.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          rejectionReason: reason.trim(),
        }),
      });
  
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error('Error rejecting expense report:', body);
        alert(body.error || 'Failed to reject expense report.');
        return;
      }
  
      // everything worked – refresh the list / UI
      router.refresh();
    } catch (err) {
      console.error('Error rejecting expense report:', err);
      alert('Network error rejecting expense report.');
    }
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
      if (timesheetEmployeeFilter !== 'all' && s.employee?.id !== timesheetEmployeeFilter)
        return false;
      if (timesheetWeekFilter !== 'all' && s.week_range !== timesheetWeekFilter)
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
        return name.includes(term) || email.includes(term) || title.includes(term);
      });
    }

    if (timesheetEmployeeFilter !== 'all') {
      filtered = filtered.filter((r) => r.employee_id === timesheetEmployeeFilter);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e31c79] mx-auto" />
          <p className="mt-3 text-gray-600">Loading submissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FC]">
      {/* HEADER */}
      <header className="bg-[#05202E] shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Image
                src="/WE-logo-SEPT2024v3-WHT.png"
                alt="West End Workforce"
                width={180}
                height={40}
                className="h-9 w-auto"
                priority
              />
              <div className="border-l border-gray-600 pl-3">
                <p className="text-xs text-gray-300 uppercase tracking-wide">
                  Manager Portal
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={loadSubmissions}
                className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-200 hover:text-white transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm text-gray-100 truncate max-w-[220px]">
                  {greeting}, {displayName}
                </span>
              </div>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.push('/auth/login');
                }}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-200 hover:text-white transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* PAGE TITLE */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[#05202E]">
                Review dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Review and approve timesheets and expenses for your team.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* NAV TABS */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => router.push('/manager')}
              className="py-3 text-sm font-medium text-[#05202E] border-b-2 border-[#e31c79]"
            >
              Review
            </button>

            <div className="relative group">
              <button className="py-3 text-sm font-medium text-gray-500 hover:text-[#05202E] flex items-center gap-1">
                Reports
                <ChevronDown className="h-4 w-4" />
              </button>
              <div className="absolute left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                <div className="py-2 text-sm">
                  <div className="px-4 py-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Time reports
                  </div>
                  <a
                    href="/manager/reports/time-by-project"
                    className="block px-4 py-1.5 hover:bg-gray-50 text-gray-700"
                  >
                    Time by project
                  </a>
                  <a
                    href="/manager/reports/time-by-employee"
                    className="block px-4 py-1.5 hover:bg-gray-50 text-gray-700"
                  >
                    Time by employee
                  </a>
                  <a
                    href="/manager/reports/time-by-class"
                    className="block px-4 py-1.5 hover:bg-gray-50 text-gray-700"
                  >
                    Time by class
                  </a>
                  <a
                    href="/manager/reports/time-by-approver"
                    className="block px-4 py-1.5 hover:bg-gray-50 text-gray-700"
                  >
                    Time by approver
                  </a>
                  <a
                    href="/manager/reports/time-missing"
                    className="block px-4 py-1.5 hover:bg-gray-50 text-gray-700"
                  >
                    Time missing
                  </a>

                  <div className="border-t my-2" />

                  <div className="px-4 py-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Expense reports
                  </div>
                  <a
                    href="/manager/reports/expenses-by-employee"
                    className="block px-4 py-1.5 hover:bg-gray-50 text-gray-700"
                  >
                    Expenses by employee
                  </a>
                  <a
                    href="/manager/reports/expenses-by-project"
                    className="block px-4 py-1.5 hover:bg-gray-50 text-gray-700"
                  >
                    Expenses by project
                  </a>
                  <a
                    href="/manager/reports/expenses-by-approver"
                    className="block px-4 py-1.5 hover:bg-gray-50 text-gray-700"
                  >
                    Expenses by approver
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#F7F8FC] border border-gray-200 rounded-xl p-4">
              <p className="text-xs uppercase font-semibold text-gray-500 mb-1">
                Timesheets Approved
              </p>
              <p className="text-2xl font-bold text-[#05202E]">
                {approvedTimesheetCount}
              </p>
              <p className="text-xs text-gray-500 mt-1">Completed</p>
            </div>
            <div className="bg-[#F7F8FC] border border-gray-200 rounded-xl p-4">
              <p className="text-xs uppercase font-semibold text-gray-500 mb-1">
                Timesheets Pending
              </p>
              <p className="text-2xl font-bold text-[#05202E]">
                {timesheetPendingCount}
              </p>
              <p className="text-xs text-gray-500 mt-1">Awaiting review</p>
            </div>
            <div className="bg-[#F7F8FC] border border-gray-200 rounded-xl p-4">
              <p className="text-xs uppercase font-semibold text-gray-500 mb-1">
                Expenses Approved
              </p>
              <p className="text-2xl font-bold text-[#05202E]">
                {approvedExpenseCount}
              </p>
              <p className="text-xs text-gray-500 mt-1">Ready for payroll</p>
            </div>
            <div className="bg-[#F7F8FC] border border-gray-200 rounded-xl p-4">
              <p className="text-xs uppercase font-semibold text-gray-500 mb-1">
                Expenses Pending
              </p>
              <p className="text-2xl font-bold text-[#05202E]">
                {expensePendingCount}
              </p>
              <p className="text-xs text-gray-500 mt-1">Needs your approval</p>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* search */}
        <div className="mb-4 flex justify-between items-center">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by employee, email, title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#e31c79]"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          {/* TIMESHEETS SECTION */}
          <div className="border-b border-gray-100 rounded-t-2xl overflow-hidden">
            <div className="bg-[#05202E] px-4 py-3 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-white">Timesheets</h3>
              <div className="flex items-center space-x-2 text-xs text-gray-300">
                <span>
                  {visibleTimesheetsCountAllTab > 0 ? '1 – ' : '0 of '}
                  {visibleTimesheetsCountAllTab} of {allTimesheetsCount}
                </span>
              </div>
            </div>

            {hasTimesheetFilters && (
              <div className="px-4 pt-2 pb-3 bg-white">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs text-gray-700">
                  <span className="font-semibold">Currently filtered by:</span>
                  {employeeFilterLabel && <span>Employee: {employeeFilterLabel}</span>}
                  {timesheetWeekFilter !== 'all' && <span>Week: {timesheetWeekFilter}</span>}
                  {timesheetStatusCardFilter !== 'all' && (
                    <span>
                      Status:{' '}
                      {timesheetStatusCardFilter.charAt(0).toUpperCase() +
                        timesheetStatusCardFilter.slice(1)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={resetTimesheetFilters}
                    className="ml-2 text-blue-600 hover:text-blue-700 underline decoration-blue-300"
                  >
                    Reset filters
                  </button>
                </div>
              </div>
            )}

            {allTimesheetsCount === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 bg-gray-50">
                No timesheets to display.
              </div>
            ) : (
              <>
                {/* header row */}
                <div className="px-4 py-2 bg-gray-50 flex items-center text-xs font-semibold text-gray-600 border-b border-gray-200">
                  <div className="w-8" />
                  <div className="flex-1 pr-2">
                    <select
                      value={timesheetEmployeeFilter}
                      onChange={(e) => setTimesheetEmployeeFilter(e.target.value)}
                      className="w-full text-xs px-2 py-1 border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#e31c79]"
                    >
                      <option value="all">Employee</option>
                      {timesheetEmployeeOptions.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {formatName(
                            emp.first_name,
                            emp.middle_name || undefined,
                            emp.last_name
                          )}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-40 pr-2">
                    <select
                      value={timesheetWeekFilter}
                      onChange={(e) => setTimesheetWeekFilter(e.target.value)}
                      className="w-full text-xs px-2 py-1 border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#e31c79]"
                    >
                      <option value="all">Week</option>
                      {weekOptions.map((week) => (
                        <option key={week} value={week}>
                          {week}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-32 pr-2">
                    <select
                      value={timesheetStatusCardFilter}
                      onChange={(e) => setTimesheetStatusCardFilter(e.target.value)}
                      className="w-full text-xs px-2 py-1 border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#e31c79]"
                    >
                      <option value="all">Status</option>
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24 text-right uppercase tracking-wide">
                    Hours
                  </div>
                  <div className="w-32 text-right uppercase tracking-wide">
                    Actions
                  </div>
                </div>

                {visibleTimesheetsAllTab.map((submission, index) => (
                  <div
                    key={submission.id}
                    className={`px-4 py-3 flex items-center text-sm border-b border-gray-100
                      ${
                        submission.status === 'submitted'
                          ? 'bg-blue-50 hover:bg-blue-100'
                          : index % 2 === 0
                          ? 'bg-white hover:bg-gray-50'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                  >
                    <div className="w-8" />
                    <div className="flex-1">
                      <button
                        type="button"
                        onClick={() => handleViewTimesheet(submission)}
                        className="text-left text-gray-900 font-medium hover:underline"
                      >
                        {formatName(
                          submission.employee?.first_name,
                          submission.employee?.middle_name || undefined,
                          submission.employee?.last_name
                        )}
                      </button>
                    </div>
                    <div className="w-40 text-sm text-gray-800">
                      {submission.week_range}
                    </div>
                    <div className="w-32 text-center">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          submission.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : submission.status === 'submitted'
                            ? 'bg-yellow-100 text-yellow-800'
                            : submission.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {submission.status.charAt(0).toUpperCase() +
                          submission.status.slice(1)}
                      </span>
                    </div>
                    <div className="w-24 text-right font-medium">
                      {submission.hours?.toFixed(2) || '0.00'}
                    </div>
                    <div className="w-32 flex justify-end items-center gap-2">
                      {submission.status === 'submitted' && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApproveTimesheet(submission);
                            }}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRejectTimesheet(submission);
                            }}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleViewTimesheet(submission)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        disabled={processingId === submission.id}
                        title="View timesheet"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="bg-gray-50 px-4 py-2 flex justify-end items-center">
                  <span className="text-sm font-semibold text-gray-800">
                    Total hours:{' '}
                    {visibleTimesheetsAllTab
                      .reduce((sum, s) => sum + (s.hours || 0), 0)
                      .toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* EXPENSE REPORTS SECTION */}
          <div className="mt-6 rounded-2xl overflow-hidden border border-gray-100">
            <div className="bg-[#e31c79] px-4 py-3 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-white">Expenses</h3>
              <div className="flex items-center space-x-2 text-xs text-white/90">
                <span>
                  {visibleExpensesCountAllTab > 0 ? '1 – ' : '0 of '}
                  {visibleExpensesCountAllTab} of {allExpenseReportsCount}
                </span>
              </div>
            </div>

            {/* Expense status filters */}
            <div className="px-4 py-3 bg-white flex flex-wrap gap-2 border-b border-gray-200">
              <button
                onClick={() => setExpenseStatusFilter('all')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                  expenseStatusFilter === 'all'
                    ? 'bg-[#e31c79] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setExpenseStatusFilter('submitted')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                  expenseStatusFilter === 'submitted'
                    ? 'bg-[#e31c79] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setExpenseStatusFilter('approved')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                  expenseStatusFilter === 'approved'
                    ? 'bg-[#e31c79] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Approved
              </button>
              <button
                onClick={() => setExpenseStatusFilter('rejected')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                  expenseStatusFilter === 'rejected'
                    ? 'bg-[#e31c79] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Rejected
              </button>
            </div>

            {visibleExpenseReportsAllTab.length === 0 ? (
              <div className="bg-gray-50 px-4 py-8 text-center text-gray-500">
                {timesheetEmployeeFilter !== 'all'
                  ? 'No expense reports for the selected employee.'
                  : 'No expense reports to display.'}
              </div>
            ) : (
              <>
                {/* header */}
                <div className="px-4 py-2 bg-gray-50 flex items-center text-xs font-semibold text-gray-600 border-b border-gray-200 uppercase tracking-wide">
                  <div className="w-8" />
                  <div className="flex-1">Employee</div>
                  <div className="flex-1">Title</div>
                  <div className="w-40">Period / Created</div>
                  <div className="w-32 text-center">Status</div>
                  <div className="w-28 text-right">Total</div>
                  <div className="w-28 text-right">Actions</div>
                </div>

                {visibleExpenseReportsAllTab.map((report, index) => (
                  <div
                    key={report.id}
                    className={`px-4 py-3 flex items-center text-sm border-b border-gray-100 cursor-pointer
                      ${
                        report.status === 'submitted'
                          ? 'bg-blue-50 hover:bg-blue-100'
                          : index % 2 === 0
                          ? 'bg-white hover:bg-gray-50'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    onClick={() => router.push(`/manager/expense/${report.id}`)}
                  >
                    <div className="w-8" />
                    <div className="flex-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/manager/expense/${report.id}`);
                        }}
                        className="font-medium text-[#05202E] hover:underline"
                      >
                        {formatName(
                          report.employee?.first_name,
                          report.employee?.middle_name || undefined,
                          report.employee?.last_name
                        ) || 'Employee'}
                      </button>
                    </div>
                    <div className="flex-1 text-sm text-gray-800">
                      {report.title || 'Expense Report'}
                    </div>
                    <div className="w-40 text-sm text-gray-700">
                      {report.period_month
                        ? formatDateDisplay(report.period_month)
                        : formatDateDisplay(report.created_at)}
                    </div>
                    <div className="w-32 text-center">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          report.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : report.status === 'submitted'
                            ? 'bg-yellow-100 text-yellow-800'
                            : report.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {report.status.charAt(0).toUpperCase() +
                          report.status.slice(1)}
                      </span>
                    </div>
                    <div className="w-28 text-right font-medium">
                      ${report.total_amount.toFixed(2)}
                    </div>
                    <div className="w-28 flex justify-end items-center gap-2">
                      {report.status === 'submitted' && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApproveExpenseReport(report);
                            }}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="Approve report"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRejectExpenseReport(report);
                            }}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Reject report"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/manager/expense/${report.id}`);
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="bg-gray-50 px-4 py-2 flex justify-end items-center">
                  <span className="text-sm font-semibold text-gray-800">
                    Total: $
                    {visibleExpenseReportsAllTab
                      .reduce((sum, r) => sum + (r.total_amount || 0), 0)
                      .toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Timesheet Modal */}
      {selectedTimesheet && (
        <TimesheetModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedTimesheet(null);
          }}
          timesheet={selectedTimesheet}
          onApprove={handleModalApprove}
          onReject={handleModalReject}
        />
      )}
    </div>
  );
}