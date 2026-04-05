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
  User,
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

      const { data: reportData, error: reportError } = await supabase
        .from('expense_reports')
        .select(
          '*, employees!expense_reports_employee_id_fkey(first_name,last_name)'
        )
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

      const lineStatuses = baseLines.map((l) => l.status);
      let derivedStatus: ExpenseReport['status'] = cleanReport.status;

      if (lineStatuses.length > 0) {
        const allDraft = lineStatuses.every((s) => s === 'draft');
        const allApproved = lineStatuses.every((s) => s === 'approved');
        const hasSubmitted = lineStatuses.some((s) => s === 'submitted');
        const hasRejected = lineStatuses.some((s) => s === 'rejected');

        if (allDraft) {
          derivedStatus = 'draft';
        } else if (allApproved) {
          derivedStatus = 'approved';
        } else if (hasSubmitted) {
          derivedStatus = 'submitted';
        } else if (hasRejected) {
          derivedStatus = 'rejected';
        } else {
          derivedStatus = cleanReport.status;
        }
      }

      setReport({
        ...cleanReport,
        status: derivedStatus,
      });

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

  const approveReport = async () => {
    if (!report) return;

    if (
      !window.confirm(
        'Approve this entire expense report? This will finalize all approved/submitted lines.'
      )
    ) {
      return;
    }

    try {
      setIsWorking(true);
      setActionError(null);
      setActionMessage(null);

      const res = await fetch(`/api/expense-reports/${report.id}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error('Approve report error:', data);
        setActionError(
          data.error ||
            'Unable to approve this report. Please check for any remaining submitted or rejected lines.'
        );
        return;
      }

      router.push('/manager');
    } catch (err) {
      console.error('Approve report network error:', err);
      setActionError('Network error approving this report.');
    } finally {
      setIsWorking(false);
    }
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

  const canFinalApprove =
    totalSubmitted === 0 &&
    totalRejected === 0 &&
    lines.length > 0 &&
    totalApproved === lines.length;

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

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 1,
    color: '#c0bab2',
    textTransform: 'uppercase',
    marginBottom: 12,
  };

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    border: '0.5px solid #e8e4df',
    borderRadius: 10,
    padding: 20,
  };

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
        <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: 20, marginTop: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            <div style={{ ...shimmer, width: '100%', height: 36, borderRadius: 7 }} />
            <div style={{ ...shimmer, width: '100%', height: 36, borderRadius: 7 }} />
          </div>
        </div>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: 20, marginTop: 16 }}>
            <div style={{ ...shimmer, width: '100%', height: 80, borderRadius: 8, animationDelay: `${i * 0.15}s` }} />
          </div>
        ))}
      </div>
    );
  }

  if (loadErrorMessage && !report) {
    return (
      <div style={{ padding: '36px 40px', maxWidth: 800 }}>
        <div style={{ ...cardStyle, display: 'flex', gap: 10, alignItems: 'flex-start', borderColor: '#b91c1c' }}>
          <AlertCircle className="h-5 w-5" style={{ color: '#b91c1c', flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12.5, color: '#b91c1c' }}>{loadErrorMessage}</span>
        </div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div style={{ padding: '36px 40px' }}>
      {/* Back link */}
      <button
        onClick={() => router.push('/manager/expenses')}
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
        Back to Expenses
      </button>

      {/* Page title */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
            Expense Report Details
          </h1>
          <StatusBadge status={report.status} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#999' }}>
          {employeeName && (
            <>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <User className="h-3 w-3" style={{ color: '#ccc' }} />
                {employeeName}
              </span>
              <span style={{ opacity: 0.4 }}>&bull;</span>
            </>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar className="h-3 w-3" style={{ color: '#ccc' }} />
            Period: {report.period_month ? formatDate(report.period_month) : formatDate(report.created_at)}
          </span>
          <span style={{ opacity: 0.4 }}>&bull;</span>
          <span style={{ fontWeight: 600, color: '#1a1a1a' }}>
            {formatCurrency(computedTotal)}
          </span>
        </div>
      </div>

      {/* Alerts */}
      {hasRejected && (
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
            <p style={{ fontWeight: 600, margin: 0 }}>This report has rejected entries.</p>
            <p style={{ marginTop: 4, margin: 0 }}>
              The employee will see these lines highlighted with your rejection reason.
            </p>
          </div>
        </div>
      )}

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

      {/* Report Title / Period card */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#c0bab2', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 6 }}>
              Report Title
            </label>
            <input
              type="text"
              value={report.title}
              disabled
              style={{
                width: '100%',
                border: '0.5px solid #e8e4df',
                borderRadius: 7,
                fontSize: 12,
                padding: '8px 12px',
                color: '#555',
                background: '#FDFCFB',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#c0bab2', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 6 }}>
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
              style={{
                width: '100%',
                border: '0.5px solid #e8e4df',
                borderRadius: 7,
                fontSize: 12,
                padding: '8px 12px',
                color: '#555',
                background: '#FDFCFB',
              }}
            />
          </div>
        </div>
      </div>

      {/* Category summary */}
      {Object.keys(categoryTotals).length > 0 && (
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <h2 style={sectionHeaderStyle}>Category Summary</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {Object.entries(categoryTotals).map(([category, total]) => (
              <div
                key={category}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: '#FDFCFB',
                  borderRadius: 7,
                  border: '0.5px solid #f5f2ee',
                }}
              >
                <span style={{ fontSize: 11, color: '#777' }}>
                  {getCategoryLabel(category)}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#1a1a1a' }}>
                  {formatCurrency(total)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expense entries */}
      <div style={{ ...cardStyle, padding: 0, marginBottom: 16 }}>
        <div
          style={{
            padding: '10px 20px',
            borderBottom: '0.5px solid #f5f2ee',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText className="h-3.5 w-3.5" style={{ color: '#ccc' }} />
            <span style={sectionHeaderStyle as any}>Expense Entries</span>
          </div>
          {totalSubmitted > 0 && (
            <button
              type="button"
              disabled={isWorking}
              onClick={approveAllSubmitted}
              style={{
                background: '#e31c79',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '6px 14px',
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Approve All Submitted ({totalSubmitted})
            </button>
          )}
        </div>

        <div style={{ padding: 20 }}>
          {lines.length === 0 ? (
            <p style={{ fontSize: 12.5, color: '#999', textAlign: 'center', padding: '20px 0' }}>
              No expense entries are attached to this report.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {lines.map((line, idx) => {
                const isRejectedLine = line.status === 'rejected';

                return (
                  <div
                    key={line.id}
                    style={{
                      border: isRejectedLine ? '0.5px solid #f5d0d0' : '0.5px solid #f5f2ee',
                      borderRadius: 8,
                      padding: 16,
                      background: isRejectedLine ? '#fef8f8' : '#FDFCFB',
                    }}
                  >
                    {/* line header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: '#e31c79',
                            color: '#fff',
                            fontSize: 10,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {idx + 1}
                        </div>
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>
                            Entry #{idx + 1}
                          </span>
                          <span style={{ fontSize: 11, color: '#999', marginLeft: 8 }}>
                            {formatDate(line.expense_date)}
                          </span>
                          {isRejectedLine && (
                            <p style={{ fontSize: 11, color: '#b91c1c', marginTop: 2, margin: 0 }}>
                              Rejection: {line.rejection_reason || 'No reason provided.'}
                            </p>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <StatusBadge status={line.status} />
                        <button
                          type="button"
                          disabled={isWorking || line.status === 'approved'}
                          onClick={() => approveLine(line)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 10px',
                            fontSize: 10,
                            borderRadius: 4,
                            border: '0.5px solid #2d9b6e',
                            background: '#ecfdf5',
                            color: '#2d9b6e',
                            cursor: 'pointer',
                            opacity: isWorking || line.status === 'approved' ? 0.4 : 1,
                          }}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={
                            isWorking ||
                            (line.status !== 'submitted' && line.status !== 'rejected')
                          }
                          onClick={() => rejectLine(line)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 10px',
                            fontSize: 10,
                            borderRadius: 4,
                            border: '0.5px solid #b91c1c',
                            background: '#fef2f2',
                            color: '#b91c1c',
                            cursor: 'pointer',
                            opacity:
                              isWorking || (line.status !== 'submitted' && line.status !== 'rejected')
                                ? 0.4
                                : 1,
                          }}
                        >
                          <XCircle className="h-3 w-3" />
                          Reject
                        </button>
                      </div>
                    </div>

                    {/* line details */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 600, color: '#c0bab2', textTransform: 'uppercase' as const, letterSpacing: 1, margin: 0 }}>Date</p>
                        <p style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{formatDate(line.expense_date)}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 600, color: '#c0bab2', textTransform: 'uppercase' as const, letterSpacing: 1, margin: 0 }}>Project</p>
                        <p style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
                          {line.project_name
                            ? `${line.project_name}${line.project_code ? ` (${line.project_code})` : ''}`
                            : '\u2014'}
                        </p>
                        {line.client_name && (
                          <p style={{ fontSize: 10, color: '#999', marginTop: 1 }}>{line.client_name}</p>
                        )}
                      </div>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 600, color: '#c0bab2', textTransform: 'uppercase' as const, letterSpacing: 1, margin: 0 }}>Category</p>
                        <p style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{getCategoryLabel(line.category)}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 600, color: '#c0bab2', textTransform: 'uppercase' as const, letterSpacing: 1, margin: 0 }}>Amount</p>
                        <p style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{formatCurrency(line.amount)}</p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 600, color: '#c0bab2', textTransform: 'uppercase' as const, letterSpacing: 1, margin: 0 }}>Vendor / Description</p>
                        <p style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{line.vendor || '\u2014'}</p>
                        {line.description && (
                          <p style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{line.description}</p>
                        )}
                      </div>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 600, color: '#c0bab2', textTransform: 'uppercase' as const, letterSpacing: 1, margin: 0 }}>Receipt</p>
                        {line.receipt_url ? (
                          <div>
                            {/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(line.receipt_url) ? (
                              <a href={line.receipt_url} target="_blank" rel="noreferrer">
                                <img
                                  src={line.receipt_url}
                                  alt="Receipt"
                                  style={{
                                    marginTop: 6,
                                    maxWidth: 180,
                                    maxHeight: 180,
                                    borderRadius: 7,
                                    border: '0.5px solid #e8e4df',
                                    objectFit: 'cover',
                                    cursor: 'zoom-in',
                                  }}
                                />
                              </a>
                            ) : (
                              <a
                                href={line.receipt_url}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  color: '#e31c79',
                                  fontSize: 12,
                                  marginTop: 4,
                                }}
                              >
                                <Receipt className="h-3 w-3" />
                                <span>View receipt</span>
                              </a>
                            )}
                          </div>
                        ) : (
                          <p style={{ fontSize: 12, color: '#999', marginTop: 2 }}>No receipt attached.</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
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
              <p style={{ fontSize: 11, fontWeight: 600, color: '#c0bab2', textTransform: 'uppercase' as const, letterSpacing: 1, margin: 0 }}>
                Total Expenses
              </p>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#e31c79', marginTop: 2 }}>
                {formatCurrency(computedTotal)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#c0bab2', textTransform: 'uppercase' as const, letterSpacing: 1, margin: 0 }}>
                Entries
              </p>
              <p style={{ fontSize: 13, color: '#555', marginTop: 2 }}>
                {totalSubmitted} submitted / {totalApproved} approved / {totalRejected} rejected
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={approveReport}
              disabled={!canFinalApprove || isWorking}
              title={
                !canFinalApprove
                  ? 'All entries must be approved before finalizing'
                  : 'Approve the full expense report'
              }
              style={{
                padding: '8px 20px',
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 6,
                border: 'none',
                cursor: canFinalApprove ? 'pointer' : 'not-allowed',
                background: canFinalApprove ? '#e31c79' : '#eee',
                color: canFinalApprove ? '#fff' : '#bbb',
              }}
            >
              Final Approve Report
            </button>
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
              Back to Manager Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
