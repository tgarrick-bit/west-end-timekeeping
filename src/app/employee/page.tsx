// src/app/employee/page.tsx

'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import TimesheetModal from '@/components/TimesheetModal';
import { FileText, Receipt } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonStats, SkeletonList } from '@/components/ui/Skeleton';

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
  const [weeklyHours, setWeeklyHours] = useState(0);
  const [daysUntilDue, setDaysUntilDue] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [hasDraftThisWeek, setHasDraftThisWeek] = useState(false);
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

      // === Dashboard Widget Calculations ===
      // Current week ending (Saturday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const saturday = new Date(now);
      saturday.setDate(now.getDate() + (6 - dayOfWeek));
      const weekEndingStr = saturday.toISOString().split('T')[0];

      // Days until Friday (due date)
      const friday = new Date(now);
      friday.setDate(now.getDate() + ((5 - dayOfWeek + 7) % 7));
      if (dayOfWeek > 5) friday.setDate(friday.getDate() + 7);
      const diffTime = friday.getTime() - now.getTime();
      const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      setDaysUntilDue(diffDays);

      // This week's timesheet
      const currentWeekTimesheets = (timesheetsData || []).filter(
        (t: any) => t.week_ending === weekEndingStr
      );
      const thisWeekHours = currentWeekTimesheets.reduce(
        (sum: number, t: any) => sum + (t.total_hours || 0), 0
      );
      setWeeklyHours(thisWeekHours);

      const hasDraft = currentWeekTimesheets.some((t: any) => t.status === 'draft');
      setHasDraftThisWeek(hasDraft);

      // Total pending approvals (submitted timesheets + submitted expense reports)
      const pendingTs = (timesheetsData || []).filter((t: any) => t.status === 'submitted').length;

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
        setPendingApprovals(pendingTs);
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

        // Pending expense reports count
        const pendingExp = mappedReports.filter((r: ExpenseReport) => r.status === 'submitted').length;
        setPendingApprovals(pendingTs + pendingExp);
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
    // Draft and rejected — go straight to editing
    if (timecard.status === 'draft' || timecard.status === 'rejected') {
      // Pass the week_ending date directly — avoid timezone conversion issues
      router.push(`/timesheet/entry?week=${timecard.week_ending}`);
      return;
    }

    // Submitted/approved/payroll_approved — show read-only modal
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
      draft: 'bg-[#FAFAF8] text-[#555] border-[#e8e4df]',
      submitted: 'bg-amber-50 text-amber-700 border-amber-300',
      approved: 'bg-emerald-50 text-emerald-700 border-emerald-300',
      rejected: 'bg-red-50 text-red-700 border-red-300',
    };
    return `border ${colors[status] || 'bg-[#FAFAF8] text-[#555] border-[#e8e4df]'}`;
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
      <div style={{ padding: '36px 40px' }}>
        <SkeletonStats count={4} />
        <div style={{ marginTop: 24 }}><SkeletonList rows={3} /></div>
      </div>
    );
  }

  return (
    <>
      <div style={{ padding: '36px 40px' }}>
        {/* Greeting */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a' }}>
            {getTimeBasedGreeting()}{profile?.first_name ? `, ${profile.first_name}` : ''}
          </h1>
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={() => router.push('/timesheet/entry')}
              className="transition-colors duration-150"
              style={{ fontSize: 12, fontWeight: 500, padding: '8px 18px', color: '#777', background: '#fff', border: '0.5px solid #e0dcd7', borderRadius: 7 }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ccc'; e.currentTarget.style.color = '#555'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e0dcd7'; e.currentTarget.style.color = '#777'; }}
            >
              Access timesheet
            </button>
            <button
              onClick={() => router.push('/expense/entry')}
              className="transition-colors duration-150"
              style={{ fontSize: 12, fontWeight: 600, padding: '8px 18px', color: '#fff', background: '#e31c79', border: 'none', borderRadius: 7 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#cc1069')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#e31c79')}
            >
              Submit expense
            </button>
          </div>
        </div>

        {/* OVERVIEW */}
        <div style={{ marginBottom: 28 }} className="anim-slide-up stagger-1">
          <div className="grid grid-cols-12 gap-4">
            {/* Hero: Hours This Week */}
            <div style={{
              gridColumn: 'span 5',
              background: '#1a1a1a',
              borderRadius: 12,
              padding: '28px 30px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(227,28,121,0.06)' }} />
              <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const }}>Hours This Week</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
                <span style={{ fontSize: 48, fontWeight: 700, color: '#e31c79', lineHeight: 1 }}>{weeklyHours.toFixed(1)}</span>
                <span style={{ fontSize: 14, fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>/ 40 hrs</span>
              </div>
              {/* Progress bar */}
              <div style={{ marginTop: 16, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 2, background: '#e31c79', width: `${Math.min(100, (weeklyHours / 40) * 100)}%`, transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{((weeklyHours / 40) * 100).toFixed(0)}% of target</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{Math.max(0, 40 - weeklyHours).toFixed(1)} remaining</span>
              </div>
            </div>

            {/* Action cards */}
            <div style={{ gridColumn: 'span 7', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {/* Due Date */}
              <div style={{
                background: daysUntilDue <= 1 ? '#fef8f8' : '#fff',
                border: `0.5px solid ${daysUntilDue <= 1 ? '#f5d0d0' : '#e8e4df'}`,
                borderRadius: 10, padding: '20px 18px',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const }}>Due</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: daysUntilDue <= 1 ? '#b91c1c' : '#1a1a1a', lineHeight: 1.1, marginTop: 6 }}>
                    {daysUntilDue === 0 ? 'Now' : `${daysUntilDue}d`}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: daysUntilDue <= 1 ? '#b91c1c' : '#c0bab2', fontWeight: 500, marginTop: 12 }}>
                  {daysUntilDue === 0 ? 'submit today' : `${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''} until Friday`}
                </div>
              </div>

              {/* Pending / Status */}
              <div style={{
                background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '20px 18px',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const }}>Awaiting Review</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: pendingApprovals > 0 ? '#c4983a' : '#2d9b6e', lineHeight: 1.1, marginTop: 6 }}>
                    {pendingApprovals > 0 ? pendingApprovals : '\u2713'}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: pendingApprovals > 0 ? '#c4983a' : '#2d9b6e', fontWeight: 500, marginTop: 12 }}>
                  {pendingApprovals > 0 ? 'pending approval' : 'all approved'}
                </div>
              </div>

              {/* Quick Action */}
              <div style={{
                background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '20px 18px',
                display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10,
              }}>
                {hasDraftThisWeek ? (
                  <button
                    onClick={() => router.push('/timesheet/entry')}
                    style={{ fontSize: 12, fontWeight: 600, padding: '10px 0', color: '#fff', background: '#e31c79', border: 'none', borderRadius: 7, cursor: 'pointer', width: '100%' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#cc1069')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#e31c79')}
                  >
                    Submit This Week
                  </button>
                ) : (
                  <button
                    onClick={() => router.push('/timesheet/entry')}
                    style={{ fontSize: 12, fontWeight: 500, padding: '10px 0', color: '#777', background: '#fff', border: '0.5px solid #e0dcd7', borderRadius: 7, cursor: 'pointer', width: '100%' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ccc'; e.currentTarget.style.color = '#555'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e0dcd7'; e.currentTarget.style.color = '#777'; }}
                  >
                    Enter Hours
                  </button>
                )}
                <button
                  onClick={() => router.push('/expense/entry')}
                  style={{ fontSize: 12, fontWeight: 500, padding: '10px 0', color: '#777', background: '#fff', border: '0.5px solid #e0dcd7', borderRadius: 7, cursor: 'pointer', width: '100%' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ccc'; e.currentTarget.style.color = '#555'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e0dcd7'; e.currentTarget.style.color = '#777'; }}
                >
                  Submit Expense
                </button>
              </div>
            </div>
          </div>

          {/* Compact data strip */}
          <div style={{
            marginTop: 12,
            background: '#fff',
            border: '0.5px solid #e8e4df',
            borderRadius: 8,
            padding: '10px 22px',
            display: 'flex',
            gap: 32,
            fontSize: 11,
            color: '#777',
          }}>
            <span>Total Hours: <strong style={{ color: '#1a1a1a' }}>{stats.totalHours.toFixed(1)}</strong></span>
            <span>Approved: <strong style={{ color: '#2d9b6e' }}>{stats.approvedTimecards}</strong></span>
            <span>Pending: <strong style={{ color: '#c4983a' }}>{stats.pendingTimecards}</strong></span>
            {stats.rejectedTimecards > 0 && <span>Rejected: <strong style={{ color: '#b91c1c' }}>{stats.rejectedTimecards}</strong></span>}
            <span style={{ borderLeft: '1px solid #f0ece7', paddingLeft: 32 }}>Expenses: <strong style={{ color: '#1a1a1a' }}>{formatCurrencyLocal(stats.totalExpenses)}</strong></span>
            {stats.pendingExpenses > 0 && <span>Pending: <strong style={{ color: '#c4983a' }}>{formatCurrencyLocal(stats.pendingExpenses)}</strong></span>}
          </div>
        </div>

        {/* Recent sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 14 }}>
          {/* Recent Timesheets */}
          <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10 }}>
            <div style={{ padding: '14px 22px', borderBottom: '0.5px solid #f0ece7' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>Recent Timesheets</span>
            </div>
            <div style={{ padding: 22 }}>
              {timecards.length === 0 ? (
                <EmptyState icon={FileText} title="No timesheets yet" description="Submit your first timesheet" action={{ label: 'Access Timesheet', onClick: () => router.push('/timesheet/entry') }} />
              ) : (
                <div>
                  {timecards.map((tc) => {
                    const { title, rangeLabel } = getFiscalWeekInfo(tc.week_ending, tc.total_hours || 0);
                    return (
                      <div
                        key={tc.id}
                        onClick={() => handleTimesheetClick(tc)}
                        className="cursor-pointer transition-colors duration-150"
                        style={{ padding: '13px 0', borderBottom: '0.5px solid #f5f2ee', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#FDFCFB')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>{title}</p>
                          <p style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>{rangeLabel}</p>
                          {tc.status === 'rejected' && (tc as any).rejection_reason && (
                            <p style={{ fontSize: 11, color: '#b91c1c', marginTop: 4 }}>Reason: {(tc as any).rejection_reason}</p>
                          )}
                        </div>
                        <StatusBadge status={tc.status} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recent Expenses */}
          <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10 }}>
            <div style={{ padding: '14px 22px', borderBottom: '0.5px solid #f0ece7' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>Recent Expenses</span>
            </div>
            <div style={{ padding: 22 }}>
              {expenseReports.length === 0 ? (
                <EmptyState icon={Receipt} title="No expense reports yet" description="Submit your first expense" action={{ label: 'Submit Expense', onClick: () => router.push('/expense/entry') }} />
              ) : (
                <div>
                  {expenseReports.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => router.push(`/expense/${r.id}`)}
                      className="cursor-pointer transition-colors duration-150"
                      style={{ padding: '13px 0', borderBottom: '0.5px solid #f5f2ee', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#FDFCFB')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>{r.title || 'Expense Report'}</p>
                        <p style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>
                          {formatCurrencyLocal(r.total_amount)} &middot; {r.period_month ? formatDate(r.period_month) : formatDate(r.created_at)}
                        </p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <TimesheetModal isOpen={isModalOpen} onClose={handleCloseModal} timesheet={selectedTimesheet} isEmployeeView={true} />
    </>
  );
}
