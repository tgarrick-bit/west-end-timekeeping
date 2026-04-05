// src/app/employee/page.tsx

'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import TimesheetModal from '@/components/TimesheetModal';
import {
  FileText,
  Receipt,
  RefreshCw,
} from 'lucide-react';
import { AppShell } from '@/components/layout';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonStats, SkeletonList } from '@/components/ui/Skeleton';
import NotificationBell from '@/components/NotificationBell';

interface Timecard {
  id: string;
  employee_id: string;
  week_ending: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  total_hours: number;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  rejection_reason?: string | null;
  manager_comment?: string | null;
}

interface Expense {
  id: string;
  employee_id: string;
  expense_date: string;
  category: string;
  amount: number;
  description: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  project_id: string;
  receipt_url?: string;
  submitted_at: string | null;
  created_at: string;
  rejection_reason?: string | null;
}

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

interface Profile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
}

export default function EmployeeDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [timecards, setTimecards] = useState<Timecard[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseReports, setExpenseReports] = useState<ExpenseReport[]>([]);
  const [selectedTimesheet, setSelectedTimesheet] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stats, setStats] = useState({
    totalHours: 0,
    pendingTimecards: 0,
    approvedTimecards: 0,
    rejectedTimecards: 0,
    totalExpenses: 0,
    pendingExpenses: 0,
    approvedExpenses: 0,
    rejectedExpenses: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);
  const router = useRouter();
  const supabase = createSupabaseClient();

  useEffect(() => {
    checkUserRoleAndRedirect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkUserRoleAndRedirect = async () => {
    if (hasLoadedRef.current) {
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data: employeeData } = await supabase
        .from('employees')
        .select('role, first_name, last_name, email')
        .eq('id', user.id)
        .single();

      if (!employeeData) {
        const userEmail = user.email?.toLowerCase() || '';

        if (userEmail.includes('admin')) {
          router.push('/admin');
          return;
        } else if (
          userEmail.includes('manager') ||
          userEmail === 'sarah.johnson@westend-test.com'
        ) {
          router.push('/manager');
          return;
        }
      }

      const userRole = employeeData?.role?.toLowerCase().trim();

      if (userRole === 'admin') {
        router.push('/admin');
        return;
      }

      if (userRole === 'manager') {
        router.push('/manager');
        return;
      }

      if (employeeData) {
        setProfile({
          id: user.id,
          email: employeeData.email || user.email || '',
          first_name: employeeData.first_name,
          last_name: employeeData.last_name,
          role: employeeData.role,
        });
      }

      hasLoadedRef.current = true;
      await loadDashboardData(user.id);
    } catch (error) {
      console.error('Error checking user role:', error);
      setIsLoading(false);
    }
  };

  const loadDashboardData = async (userId: string, isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    }

    try {
      // Timesheets
      const { data: timesheetsData, error: timesheetsError } = await supabase
        .from('timesheets')
        .select('*')
        .eq('employee_id', userId)
        .order('created_at', { ascending: false });

      if (timesheetsError) {
        console.error('Error fetching timesheets:', timesheetsError);
        setTimecards([]);
      } else if (timesheetsData && timesheetsData.length > 0) {
        const uniqueTimesheets = Array.from(
          new Map(timesheetsData.map((item) => [item.id, item])).values()
        ) as Timecard[];

        setTimecards(uniqueTimesheets);

        const timecardStats = uniqueTimesheets.reduce(
          (acc, tc) => ({
            totalHours: acc.totalHours + (tc.total_hours || 0),
            pendingTimecards:
              acc.pendingTimecards + (tc.status === 'submitted' ? 1 : 0),
            approvedTimecards:
              acc.approvedTimecards + (tc.status === 'approved' ? 1 : 0),
            rejectedTimecards:
              acc.rejectedTimecards + (tc.status === 'rejected' ? 1 : 0),
          }),
          {
            totalHours: 0,
            pendingTimecards: 0,
            approvedTimecards: 0,
            rejectedTimecards: 0,
          }
        );

        setStats((prev) => ({ ...prev, ...timecardStats }));
      } else {
        setTimecards([]);
      }

      // Expense lines (for stats)
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('employee_id', userId)
        .order('expense_date', { ascending: false });

      if (!expensesError && expensesData) {
        const uniqueExpenses = Array.from(
          new Map(expensesData.map((item) => [item.id, item])).values()
        ) as Expense[];

        setExpenses(uniqueExpenses);

        const expenseStats = uniqueExpenses.reduce(
          (acc, exp) => ({
            totalExpenses: acc.totalExpenses + (exp.amount || 0),
            pendingExpenses:
              acc.pendingExpenses +
              (exp.status === 'submitted' ? exp.amount : 0),
            approvedExpenses:
              acc.approvedExpenses +
              (exp.status === 'approved' ? exp.amount : 0),
            rejectedExpenses:
              acc.rejectedExpenses + (exp.status === 'rejected' ? 1 : 0),
          }),
          {
            totalExpenses: 0,
            pendingExpenses: 0,
            approvedExpenses: 0,
            rejectedExpenses: 0,
          }
        );

        setStats((prev) => ({ ...prev, ...expenseStats }));
      } else {
        setExpenses([]);
      }

      // Expense reports (for recent list + editing)
      const { data: reportsData, error: reportsError } = await supabase
        .from('expense_reports')
        .select(`
          id,
          employee_id,
          title,
          period_month,
          status,
          total_amount,
          submitted_at,
          created_at,
          expenses (
            status
          )
        `)
        .eq('employee_id', userId)
        .order('created_at', { ascending: false });

      if (reportsError) {
        console.error('Error fetching expense reports:', reportsError);
        setExpenseReports([]);
      } else {
        const mappedReports: ExpenseReport[] = (reportsData || []).map(
          (r: any) => {
            const lineStatuses: string[] = (r.expenses || []).map(
              (e: any) => e.status
            );

            // Start from whatever is stored on the report
            let derivedStatus: ExpenseReport['status'] = r.status;

            // If any line is rejected → report is rejected
            if (lineStatuses.includes('rejected')) {
              derivedStatus = 'rejected';
            }
            // Else if any line is submitted → report is submitted
            else if (lineStatuses.includes('submitted')) {
              derivedStatus = 'submitted';
            }
            // Else if we have lines and all are approved → report is approved
            else if (
              lineStatuses.length > 0 &&
              lineStatuses.every((s) => s === 'approved')
            ) {
              derivedStatus = 'approved';
            }

            return {
              id: r.id,
              employee_id: r.employee_id,
              title: r.title,
              period_month: r.period_month,
              status: derivedStatus,
              total_amount: r.total_amount,
              submitted_at: r.submitted_at,
              created_at: r.created_at,
            } as ExpenseReport;
          }
        );

        setExpenseReports(mappedReports);
      }
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    if (!profile) return;
    await loadDashboardData(profile.id, true);
  };

  const handleTimesheetClick = async (timecard: Timecard) => {
    try {
      const { data: timesheetData, error: timesheetError } = await supabase
        .from('timesheets')
        .select('*')
        .eq('id', timecard.id)
        .single();

      if (timesheetError) throw timesheetError;

      const { data: entriesData, error: entriesError } = await supabase
        .from('timesheet_entries')
        .select('*')
        .eq('timesheet_id', timecard.id)
        .order('date', { ascending: true });

      console.log('Timesheet entries:', entriesData);

      let formattedEntries = entriesData || [];

      if (formattedEntries.length > 0) {
        const projectIds = [
          ...new Set(
            formattedEntries.map((e: any) => e.project_id).filter(Boolean)
          ),
        ];

        if (projectIds.length > 0) {
          const { data: projectsData } = await supabase
            .from('projects')
            .select('id, name, client_name, project_code')
            .in('id', projectIds);

          console.log('Projects data:', projectsData);

          if (projectsData) {
            formattedEntries = formattedEntries.map((entry: any) => ({
              ...entry,
              project_name:
                projectsData.find((p) => p.id === entry.project_id)?.name ||
                'General Work',
              project_code: projectsData.find((p) => p.id === entry.project_id)
                ?.project_code,
              client_name: projectsData.find((p) => p.id === entry.project_id)
                ?.client_name,
            }));
          }
        }
      }

      const formattedTimesheet = {
        ...timesheetData,
        employee_name:
          profile?.first_name && profile?.last_name
            ? `${profile.first_name} ${profile.last_name}`
            : 'John Employee',
        employee_email: profile?.email || '',
        entries: formattedEntries,
      };

      console.log('Final formatted timesheet:', formattedTimesheet);
      setSelectedTimesheet(formattedTimesheet);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error loading timesheet details:', error);
      const basicTimesheet = {
        ...timecard,
        employee_name:
          profile?.first_name && profile?.last_name
            ? `${profile.first_name} ${profile.last_name}`
            : 'John Employee',
        employee_email: profile?.email || '',
        entries: [],
      };
      setSelectedTimesheet(basicTimesheet);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTimesheet(null);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700 border-gray-300',
      submitted: 'bg-amber-50 text-amber-700 border-amber-300',
      approved: 'bg-emerald-50 text-emerald-700 border-emerald-300',
      rejected: 'bg-red-50 text-red-700 border-red-300',
    };
    return `border ${colors[status] || 'bg-gray-100 text-gray-700 border-gray-300'}`;
  };

  const renderTimecardStatus = (status: Timecard['status']) => {
    switch (status) {
      case 'draft':
        return 'Draft';
      case 'submitted':
        return 'Submitted';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected – needs your review';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string | Date) => {
    const date =
      typeof dateString === 'string' ? new Date(dateString) : dateString;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getFiscalWeekInfo = (weekEnding: string, totalHours: number) => {
    const weekEnd = new Date(weekEnding);
    if (Number.isNaN(weekEnd.getTime())) {
      return {
        title: `Week – ${totalHours.toFixed(1)} hrs`,
        rangeLabel: '',
      };
    }

    weekEnd.setHours(0, 0, 0, 0);

    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);

    const month = weekEnd.getMonth();
    const year = weekEnd.getFullYear();
    const fiscalYearStartYear = month >= 9 ? year : year - 1;

    const fiscalStartDate = new Date(fiscalYearStartYear, 9, 1);
    const firstWeekEnd = new Date(fiscalStartDate);
    const day = firstWeekEnd.getDay();
    const daysToSaturday = (6 - day + 7) % 7;
    firstWeekEnd.setDate(firstWeekEnd.getDate() + daysToSaturday);

    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const diffWeeks = Math.floor(
      (weekEnd.getTime() - firstWeekEnd.getTime()) / msPerWeek
    );
    const weekNumber = Math.max(1, diffWeeks + 1);

    const rangeLabel = `${formatDate(weekStart)} – ${formatDate(weekEnd)}`;

    return {
      title: `Week ${weekNumber} – ${totalHours.toFixed(1)} hrs`,
      rangeLabel,
    };
  };

  const formatCurrencyLocal = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      airfare: 'Airfare',
      breakfast: 'Breakfast',
      dinner: 'Dinner',
      fuel: 'Fuel',
      incidental: 'Incidental',
      lodging: 'Lodging',
      lunch: 'Lunch',
      meals_and_incidentals_gsa: 'Meals and Incidentals(GSA)',
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
    return labels[category] || category;
  };

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return 'Good morning';
    } else if (hour < 17) {
      return 'Good afternoon';
    } else {
      return 'Good evening';
    }
  };

  if (isLoading) {
    return (
      <AppShell
        role="employee"
        userName={profile?.first_name}
        userEmail={profile?.email}
        onSignOut={handleSignOut}
        showBottomNav
      >
        <div className="px-6 md:px-8 py-6 space-y-6">
          <div>
            <div className="anim-shimmer w-48 h-7 rounded mb-2" />
            <div className="anim-shimmer w-64 h-4 rounded" />
          </div>
          <SkeletonStats count={4} />
          <SkeletonList rows={3} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      role="employee"
      userName={profile?.first_name}
      userEmail={profile?.email}
      onSignOut={handleSignOut}
      showBottomNav
    >
      <div className="px-6 md:px-8 py-6">
        {/* Welcome + Quick Actions */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2
                className="text-[24px] font-bold"
                style={{ color: 'var(--we-text-1)', fontFamily: 'var(--font-heading)' }}
              >
                {getTimeBasedGreeting()}{profile?.first_name ? `, ${profile.first_name}` : ''}
              </h2>
              <p className="text-[13px] mt-1" style={{ color: 'var(--we-text-3)' }}>
                Manage your timesheets and expenses
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium rounded-[var(--we-radius-sm)] transition-all duration-200 disabled:opacity-50"
                style={{
                  color: 'var(--we-text-3)',
                  border: '1px solid var(--we-border)',
                  background: 'var(--we-bg-white)',
                }}
              >
                <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
              <NotificationBell />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3 mb-8">
            <button
              onClick={() => router.push('/timesheet/entry')}
              className="flex items-center gap-2.5 px-5 py-3 text-[14px] font-semibold text-white rounded-[var(--we-radius-sm)] transition-all duration-200 hover:-translate-y-[1px]"
              style={{ background: 'var(--we-navy)', boxShadow: 'var(--we-shadow-sm)' }}
            >
              <FileText size={16} />
              Access Timesheet
            </button>
            <button
              onClick={() => router.push('/expense/entry')}
              className="flex items-center gap-2.5 px-5 py-3 text-[14px] font-semibold text-white rounded-[var(--we-radius-sm)] transition-all duration-200 hover:-translate-y-[1px]"
              style={{ background: 'var(--we-pink)', boxShadow: 'var(--we-shadow-sm)' }}
            >
              <Receipt size={16} />
              Submit Expense
            </button>
          </div>
        </div>

        {/* TIMESHEET SUMMARY */}
        <div className="mb-8">
          <p className="we-section-label mb-4">Timesheet Summary</p>
          <div className="flex gap-0 rounded-xl overflow-hidden" style={{ border: '1px solid var(--we-border)' }}>
            <StatCard label="Total Hours" value={stats.totalHours.toFixed(1)} subtitle="all time" accent />
            <StatCard label="Pending" value={stats.pendingTimecards} subtitle="awaiting review" />
            <StatCard label="Approved" value={stats.approvedTimecards} subtitle="approved" />
            <StatCard label="Rejected" value={stats.rejectedTimecards} subtitle="need action" />
          </div>
        </div>

        {/* EXPENSE SUMMARY */}
        <div className="mb-8">
          <p className="we-section-label mb-4">Expense Summary</p>
          <div className="flex gap-0 rounded-xl overflow-hidden" style={{ border: '1px solid var(--we-border)' }}>
            <StatCard label="Total Expenses" value={formatCurrencyLocal(stats.totalExpenses)} subtitle="all time" accent />
            <StatCard label="Pending" value={formatCurrencyLocal(stats.pendingExpenses)} subtitle="awaiting review" />
            <StatCard label="Approved" value={formatCurrencyLocal(stats.approvedExpenses)} subtitle="approved" />
            <StatCard label="Rejected" value={stats.rejectedExpenses} subtitle="need action" />
          </div>
        </div>

        {/* Recent Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
          {/* Recent Timecards */}
          <div className="we-card overflow-hidden">
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--we-border-faint)' }}>
              <h3 className="text-[15px] font-semibold" style={{ color: 'var(--we-text-1)' }}>
                Recent Timesheets
              </h3>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--we-text-3)' }}>
                Your latest timesheet submissions
              </p>
            </div>
            <div className="p-4">
              {timecards.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No timesheets yet"
                  description="Click 'Access Timesheet' to get started"
                  action={{ label: 'Access Timesheet', onClick: () => router.push('/timesheet/entry') }}
                />
              ) : (
                <div className="space-y-2">
                  {timecards.map((timecard) => {
                    const { title, rangeLabel } = getFiscalWeekInfo(
                      timecard.week_ending,
                      timecard.total_hours || 0
                    );
                    const isRejected = timecard.status === 'rejected';
                    const rejectionReason = (timecard as any).rejection_reason || null;

                    return (
                      <div
                        key={timecard.id}
                        className="p-4 rounded-xl cursor-pointer transition-all duration-200"
                        style={{
                          border: `1px solid ${isRejected ? 'rgba(239, 68, 68, 0.15)' : 'var(--we-border-faint)'}`,
                          background: isRejected ? 'var(--we-status-rejected-bg)' : 'transparent',
                        }}
                        onClick={() => handleTimesheetClick(timecard)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = isRejected ? 'rgba(239, 68, 68, 0.08)' : 'var(--we-bg-subtle)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = isRejected ? 'var(--we-status-rejected-bg)' : 'transparent';
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[14px] font-semibold" style={{ color: 'var(--we-text-1)' }}>{title}</p>
                            <p className="text-[12px]" style={{ color: 'var(--we-text-3)' }}>{rangeLabel}</p>
                            {isRejected && rejectionReason && (
                              <p className="mt-1.5 text-[12px]" style={{ color: 'var(--we-status-rejected)' }}>
                                Reason: {rejectionReason}
                              </p>
                            )}
                            {isRejected && (
                              <p className="mt-1 text-[11px]" style={{ color: 'var(--we-status-rejected)' }}>
                                Update hours and re-submit for approval.
                              </p>
                            )}
                          </div>
                          <StatusBadge status={timecard.status} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recent Expense Reports */}
          <div className="we-card overflow-hidden">
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--we-border-faint)' }}>
              <h3 className="text-[15px] font-semibold" style={{ color: 'var(--we-text-1)' }}>
                Recent Expenses
              </h3>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--we-text-3)' }}>
                Your latest expense submissions
              </p>
            </div>
            <div className="p-4">
              {expenseReports.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="No expense reports yet"
                  description="Click 'Submit Expense' to get started"
                  action={{ label: 'Submit Expense', onClick: () => router.push('/expense/entry') }}
                />
              ) : (
                <div className="space-y-2">
                  {expenseReports.map((report) => (
                    <div
                      key={report.id}
                      className="p-4 rounded-xl cursor-pointer transition-all duration-200"
                      style={{
                        border: `1px solid ${report.status === 'rejected' ? 'rgba(239, 68, 68, 0.15)' : 'var(--we-border-faint)'}`,
                        background: report.status === 'rejected' ? 'var(--we-status-rejected-bg)' : 'transparent',
                      }}
                      onClick={() => router.push(`/expense/${report.id}`)}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--we-bg-subtle)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = report.status === 'rejected' ? 'var(--we-status-rejected-bg)' : 'transparent')}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[14px] font-semibold" style={{ color: 'var(--we-text-1)' }}>
                            {report.title || 'Expense Report'}
                          </p>
                          <p className="text-[12px]" style={{ color: 'var(--we-text-3)' }}>
                            {formatCurrencyLocal(report.total_amount)} &bull;{' '}
                            {report.period_month ? formatDate(report.period_month) : formatDate(report.created_at)}
                          </p>
                          {report.status === 'rejected' && (
                            <p className="mt-1.5 text-[12px]" style={{ color: 'var(--we-status-rejected)' }}>
                              Rejected &ndash; open to review and resubmit.
                            </p>
                          )}
                        </div>
                        <StatusBadge status={report.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <TimesheetModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        timesheet={selectedTimesheet}
        isEmployeeView={true}
      />
    </AppShell>
  );
}
