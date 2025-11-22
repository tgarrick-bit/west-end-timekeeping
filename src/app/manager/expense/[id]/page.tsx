'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import {
  ArrowLeft,
  Calendar,
  FileText,
  Receipt,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RotateCw,
  User,
  LogOut,
} from 'lucide-react';

interface ExpenseReport {
  id: string;
  employee_id: string;
  title: string;
  period_month: string | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  total_amount: number;
  submitted_at: string | null;
  created_at: string;
}

interface ExpenseLine {
  id: string;
  expense_date: string;
  category: string;
  amount: number;
  description: string | null;
  vendor?: string | null;
  project_id: string | null;
  receipt_url?: string | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  project_name?: string | null;
  project_code?: string | null;
  client_name?: string | null;
  rejection_reason?: string | null;
}

interface ProjectOption {
  id: string;
  name: string;
  code: string | null;
  client_name: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  airfare: 'Airfare',
  breakfast: 'Breakfast',
  dinner: 'Dinner',
  fuel: 'Fuel',
  incidental: 'Incidental',
  lodging: 'Lodging',
  lunch: 'Lunch',
  meals_and_incidentals_gsa: 'Meals and Incidentals (GSA)',
  mileage: 'Mileage',
  miscellaneous: 'Miscellaneous',
  parking: 'Parking',
  rental_car: 'Rental Car',
  travel: 'Travel',
  meals: 'Meals',
  accommodation: 'Accommodation',
  supplies: 'Supplies',
  equipment: 'Equipment',
  software: 'Software',
  training: 'Training',
  communication: 'Communication',
  shipping: 'Shipping',
  other: 'Other',
};

const getCategoryLabel = (category: string) =>
  CATEGORY_LABELS[category] || category;

const formatDate = (dateString: string | null) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatCurrency = (amount: number | null | undefined) => {
  if (!amount) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const reportStatusBadge = (status: ExpenseReport['status']) => {
  const base =
    'inline-flex px-2 py-1 rounded-full text-xs font-medium border';
  switch (status) {
    case 'submitted':
      return `${base} bg-amber-50 text-amber-700 border-amber-200`;
    case 'approved':
      return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
    case 'rejected':
      return `${base} bg-red-50 text-red-700 border-red-200`;
    default:
      return `${base} bg-gray-100 text-gray-700 border-gray-200`;
  }
};

const lineStatusChip = (status: ExpenseLine['status']) => {
  const base =
    'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border';
  switch (status) {
    case 'submitted':
      return `${base} bg-amber-50 text-amber-700 border-amber-200`;
    case 'approved':
      return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
    case 'rejected':
      return `${base} bg-red-50 text-red-700 border-red-200`;
    default:
      return `${base} bg-gray-100 text-gray-700 border-gray-200`;
  }
};

export default function ManagerExpenseReportPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createSupabaseClient();

  const [report, setReport] = useState<ExpenseReport | null>(null);
  const [lines, setLines] = useState<ExpenseLine[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [employeeName, setEmployeeName] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadErrorMessage, setLoadErrorMessage] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const reportId = params?.id as string | undefined;

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadReport = async () => {
    try {
      setIsLoading(true);
      setLoadErrorMessage('');
      setActionMessage(null);
      setActionError(null);

      if (!reportId) {
        setLoadErrorMessage('No expense report id was provided.');
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setLoadErrorMessage('You must be signed in as a manager.');
        return;
      }

      // Load report + basic employee info
      const { data: reportData, error: reportError } = await supabase
        .from('expense_reports')
        .select('*, employees!expense_reports_employee_id_fkey(first_name,last_name)')
        .eq('id', reportId)
        .single();

      if (reportError || !reportData) {
        console.error('Error loading expense report:', reportError);
        setLoadErrorMessage('Expense report not found.');
        return;
      }

      const emp = (reportData as any).employees;
      if (emp) {
        setEmployeeName(
          emp.first_name
            ? `${emp.first_name} ${emp.last_name || ''}`.trim()
            : null
        );
      }

      const cleanReport: ExpenseReport = {
        id: reportData.id,
        employee_id: reportData.employee_id,
        title: reportData.title,
        period_month: reportData.period_month,
        status: reportData.status,
        total_amount: reportData.total_amount,
        submitted_at: reportData.submitted_at,
        created_at: reportData.created_at,
      };

      // Load lines
      const { data: lineData, error: lineError } = await supabase
        .from('expenses')
        .select('*')
        .eq('report_id', reportId)
        .order('expense_date', { ascending: true });

      if (lineError) {
        console.error('Error loading expense lines:', lineError);
        setLoadErrorMessage('Unable to load expense lines.');
        return;
      }

      const baseLines = (lineData || []) as ExpenseLine[];

      // Derive report status from line statuses
      const lineStatuses = baseLines.map((l) => l.status);
      let derivedStatus = cleanReport.status;

      if (lineStatuses.includes('rejected')) {
        derivedStatus = 'rejected';
      } else if (lineStatuses.includes('submitted')) {
        derivedStatus = 'submitted';
      } else if (
        lineStatuses.length > 0 &&
        lineStatuses.every((s) => s === 'approved')
      ) {
        derivedStatus = 'approved';
      }

      setReport({
        ...cleanReport,
        status: derivedStatus,
      });

      // Load any projects referenced
      const projectIds = [
        ...new Set(
          baseLines
            .map((l) => l.project_id)
            .filter((id): id is string => !!id)
        ),
      ];

      if (projectIds.length > 0) {
        const {
          data: projectsData,
          error: projectsError,
        } = await supabase
          .from('projects')
          .select('id, name, code, client_name')
          .in('id', projectIds)
          .order('name', { ascending: true });

        if (projectsError) {
          console.error('Error loading projects:', projectsError);
          setProjects([]);
          setLines(baseLines);
        } else {
          const projectList = (projectsData || []) as ProjectOption[];
          setProjects(projectList);

          const merged = baseLines.map((line) => {
            const proj = projectList.find((p) => p.id === line.project_id);
            return {
              ...line,
              project_name: proj?.name || null,
              project_code: proj?.code || null,
              client_name: proj?.client_name || null,
            };
          });

          setLines(merged);
        }
      } else {
        setProjects([]);
        setLines(baseLines);
      }
    } catch (err) {
      console.error('Unexpected error loading manager expense report:', err);
      setLoadErrorMessage('Something went wrong loading this expense report.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const handleRefresh = () => {
    loadReport();
  };

  const approveLine = async (line: ExpenseLine) => {
    try {
      setIsWorking(true);
      setActionError(null);
      setActionMessage(null);

      const res = await fetch(`/api/expenses/${line.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error('Error approving line:', body);
        setActionError(body.error || 'Failed to approve this expense line.');
        return;
      }

      setActionMessage('Expense line approved.');
      await loadReport();
    } catch (err) {
      console.error('Approve line error:', err);
      setActionError('Network error approving this line.');
    } finally {
      setIsWorking(false);
    }
  };

  const rejectLine = async (line: ExpenseLine) => {
    const reason = window.prompt(
      `Enter a reason for rejecting this line (e.g., "Missing project" or "Amount too high").`,
      line.rejection_reason || ''
    );

    if (!reason || !reason.trim()) {
      return;
    }

    try {
      setIsWorking(true);
      setActionError(null);
      setActionMessage(null);

      const res = await fetch(`/api/expenses/${line.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          rejectionReason: reason.trim(),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error('Error rejecting line:', body);
        setActionError(body.error || 'Failed to reject this expense line.');
        return;
      }

      setActionMessage('Expense line rejected.');
      await loadReport();
    } catch (err) {
      console.error('Reject line error:', err);
      setActionError('Network error rejecting this line.');
    } finally {
      setIsWorking(false);
    }
  };

  const approveAllSubmitted = async () => {
    if (!report) return;
    const toApprove = lines.filter((l) => l.status === 'submitted');
    if (toApprove.length === 0) {
      setActionError('No submitted lines to approve.');
      return;
    }

    if (
      !window.confirm(
        `Approve ${toApprove.length} submitted line(s) on this report?`
      )
    ) {
      return;
    }

    try {
      setIsWorking(true);
      setActionError(null);
      setActionMessage(null);

      const results = await Promise.all(
        toApprove.map((line) =>
          fetch(`/api/expenses/${line.id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'approve' }),
          })
        )
      );

      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) {
        setActionError(
          'Some lines could not be approved. Please refresh and try again.'
        );
      } else {
        setActionMessage('All submitted lines approved.');
      }

      await loadReport();
    } catch (err) {
      console.error('Approve all error:', err);
      setActionError('Network error approving lines.');
    } finally {
      setIsWorking(false);
    }
  };

  const totalSubmitted = lines.filter((l) => l.status === 'submitted').length;
  const totalRejected = lines.filter((l) => l.status === 'rejected').length;
  const totalApproved = lines.filter((l) => l.status === 'approved').length;
  const hasRejected = totalRejected > 0;

  const computedTotal = lines.reduce((sum, line) => {
    const value = Number.isFinite(line.amount) ? line.amount : 0;
    return sum + (value || 0);
  }, 0);

  const categoryTotals = lines.reduce<Record<string, number>>((acc, line) => {
    if (!line.category) return acc;
    const value = Number.isFinite(line.amount) ? line.amount : 0;
    acc[line.category] = (acc[line.category] || 0) + (value || 0);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600 text-sm">Loading expense report...</p>
      </div>
    );
  }

  const ManagerHeader = () => (
    <header className="bg-[#022234] text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/manager')}
              className="mr-1 p-2 hover:bg.white/10 rounded-full transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/WE-logo-SEPT2024v3-WHT.png"
                alt="West End Workforce"
                className="h-9 w-9 object-contain"
              />
              <span className="h-6 w-px bg-white/30" />
              <span className="text-sm tracking-wide">Manager Portal</span>
              <span className="ml-3 text-xs text-gray-300">
                Expense Approval
              </span>
            </div>
          </div>
          <div className="flex items-center gap-5 text-sm">
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-1 text-gray-200 hover:text-gray-100"
            >
              <RotateCw className="h-4 w-4" />
              <span className="font-normal">Refresh</span>
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1 text-gray-200 hover:text-gray-100"
            >
              <LogOut className="h-4 w-4" />
              <span className="font-normal">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );

  if (loadErrorMessage && !report) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ManagerHeader />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <span className="text-red-700 text-sm">{loadErrorMessage}</span>
          </div>
        </main>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <ManagerHeader />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {/* header */}
          <div className="bg-[#022234] text.white px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs mb-1">
                <span className={reportStatusBadge(report.status)}>
                  {report.status.charAt(0).toUpperCase() +
                    report.status.slice(1)}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 border border-white/30 text-white">
                  Manager View
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-semibold">
                Expense Report Details
              </h1>
              <p className="mt-1 text-xs text-gray-200 flex items-center gap-2">
                {employeeName && (
                  <>
                    <User className="h-3 w-3 text-gray-300" />
                    <span>{employeeName}</span>
                    <span className="opacity-40">•</span>
                  </>
                )}
                <Calendar className="h-3 w-3 text-gray-300" />
                <span>
                  Period:{' '}
                  {report.period_month
                    ? formatDate(report.period_month)
                    : formatDate(report.created_at)}
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wide text-gray-300">
                Total Submitted
              </p>
              <p className="text-xl font-bold text-white">
                {formatCurrency(computedTotal)}
              </p>
              <p className="mt-1 text-[11px] text-gray-200">
                {totalSubmitted} submitted • {totalApproved} approved •{' '}
                {totalRejected} rejected
              </p>
            </div>
          </div>

          {/* body */}
          <div className="px-6 py-6 space-y-6 bg-gray-50">
            {hasRejected && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="text-sm text-red-800">
                  <p className="font-semibold">
                    This report has rejected entries.
                  </p>
                  <p className="mt-1">
                    The employee will see these lines highlighted in red with
                    your rejection reason.
                  </p>
                </div>
              </div>
            )}

            {actionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>{actionError}</span>
              </div>
            )}
            {actionMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>{actionMessage}</span>
              </div>
            )}

            {/* title / period card */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Report Title
                  </label>
                  <input
                    type="text"
                    value={report.title}
                    disabled
                    className="w-full rounded-md border border-gray-200 bg-gray-50 text-sm px-3 py-2 text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Expense Period
                  </label>
                  <input
                    type="text"
                    value={
                      report.period_month
                        ? formatDate(report.period_month)
                        : formatDate(report.created_at)
                    }
                    disabled
                    className="w-full rounded-md border border-gray-200 bg-gray-50 text-sm px-3 py-2 text-gray-700"
                  />
                </div>
              </div>
            </div>

            {/* category summary */}
            {Object.keys(categoryTotals).length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
                <h2 className="text-xs font-semibold text-gray-700 mb-3">
                  Category Summary
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(categoryTotals).map(([category, total]) => (
                    <div
                      key={category}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 border border-gray-100"
                    >
                      <span className="text-xs text-gray-700">
                        {getCategoryLabel(category)}
                      </span>
                      <span className="text-xs font-semibold text-gray-900">
                        {formatCurrency(total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* expense entry section */}
            <div className="rounded-xl overflow-hidden border border-gray-200 bg-white">
              <div className="bg-[#022234] text-white px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-100" />
                  <span className="text-xs font-semibold tracking-wide">
                    Expense Entries
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={approveAllSubmitted}
                    disabled={isWorking || totalSubmitted === 0}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-md border border-emerald-300 bg-emerald-50/10 text-emerald-100 hover:bg-emerald-50/20 disabled:opacity-40"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Approve all submitted
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-5 space-y-4">
                {lines.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No expense entries are attached to this report.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {lines.map((line, idx) => {
                      const isRejectedLine = line.status === 'rejected';
                      const isSubmittedLine = line.status === 'submitted';
                      const entryBg = isRejectedLine
                        ? 'bg-red-50 border-red-300'
                        : 'bg-gray-50 border-gray-200';

                      return (
                        <div
                          key={line.id}
                          className={`rounded-xl border ${entryBg} px-4 py-4 sm:px-5 sm:py-5`}
                        >
                          {/* line header */}
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-[#ff3b96] text-white text-xs font-semibold flex items-center justify-center">
                                {idx + 1}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold text-gray-800">
                                  Entry #{idx + 1}
                                </span>
                                <span className="text-[11px] text-gray-500">
                                  Submitted on{' '}
                                  {formatDate(line.expense_date)}
                                </span>
                                {isRejectedLine && (
                                  <span className="mt-1 text-[11px] text-red-700">
                                    Rejection reason:{' '}
                                    {line.rejection_reason ||
                                      'No reason was provided.'}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className={lineStatusChip(line.status)}>
                                {line.status.charAt(0).toUpperCase() +
                                  line.status.slice(1)}
                              </span>
                              <div className="flex gap-1 mt-1">
                                <button
                                  type="button"
                                  disabled={
                                    isWorking ||
                                    line.status === 'approved'
                                  }
                                  onClick={() => approveLine(line)}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-md border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  disabled={
                                    isWorking ||
                                    (line.status !== 'submitted' &&
                                      line.status !== 'rejected')
                                  }
                                  onClick={() => rejectLine(line)}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-md border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40"
                                >
                                  <XCircle className="h-3 w-3" />
                                  Reject
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* line details */}
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                            <div>
                              <p className="font-semibold text-gray-600">
                                Date
                              </p>
                              <p className="text-gray-900">
                                {formatDate(line.expense_date)}
                              </p>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-600">
                                Project
                              </p>
                              <p className="text-gray-900">
                                {line.project_name
                                  ? `${line.project_name}${
                                      line.project_code
                                        ? ` (${line.project_code})`
                                        : ''
                                    }`
                                  : '—'}
                              </p>
                              {line.client_name && (
                                <p className="text-[11px] text-gray-500">
                                  {line.client_name}
                                </p>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-600">
                                Category
                              </p>
                              <p className="text-gray-900">
                                {getCategoryLabel(line.category)}
                              </p>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-600">
                                Amount
                              </p>
                              <p className="text-gray-900">
                                {formatCurrency(line.amount)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div>
                              <p className="font-semibold text-gray-600">
                                Vendor / Description
                              </p>
                              <p className="text-gray-900">
                                {line.vendor || '—'}
                              </p>
                              {line.description && (
                                <p className="text-[11px] text-gray-600 mt-1">
                                  {line.description}
                                </p>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-600">
                                Receipt
                              </p>
                              {line.receipt_url ? (
                                <a
                                  href={line.receipt_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[#e31c79] hover:underline"
                                >
                                  <Receipt className="h-3 w-3" />
                                  <span>View receipt</span>
                                </a>
                              ) : (
                                <p className="text-gray-500">
                                  No receipt attached.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* footer */}
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-dashed border-gray-200">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-xs font-semibold text-gray-600">
                        Total Expenses
                      </p>
                      <p className="text-base font-bold text-[#e31c79]">
                        {formatCurrency(computedTotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600">
                        Entries
                      </p>
                      <p className="text-sm text-gray-800">
                        {lines.length} of {lines.length}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end w-full">
                    <button
                      type="button"
                      onClick={() => router.push('/manager')}
                      className="px-4 py-2 text-xs font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Back to Manager Dashboard
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}