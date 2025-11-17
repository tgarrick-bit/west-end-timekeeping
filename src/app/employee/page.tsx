'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import TimesheetModal from '@/components/TimesheetModal';
import Image from 'next/image';
import { 
  CalendarDays, 
  Clock, 
  FileText,
  Plus,
  ChevronRight,
  User,
  LogOut,
  Briefcase,
  Receipt,
  CreditCard,
  AlertCircle,
  RefreshCw,
  DollarSign,
  CheckCircle,
  Calendar
} from 'lucide-react';

interface Timecard {
  id: string;
  employee_id: string;
  week_ending: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  total_hours: number;
  total_amount: number;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
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
    rejectedExpenses: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);
  const router = useRouter();
  const supabase = createSupabaseClient();
  
  useEffect(() => {
    checkUserRoleAndRedirect();
  }, []);

  const checkUserRoleAndRedirect = async () => {
    // Prevent double loading
    if (hasLoadedRef.current) {
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Check user's role in employees table
      const { data: employeeData } = await supabase
        .from('employees')
        .select('role, first_name, last_name, email')
        .eq('id', user.id)
        .single();
      
      // If no employee record exists, check email pattern as fallback
      if (!employeeData) {
        const userEmail = user.email?.toLowerCase() || '';
        
        if (userEmail.includes('admin')) {
          router.push('/admin');
          return;
        } else if (userEmail.includes('manager') || userEmail === 'sarah.johnson@westend-test.com') {
          router.push('/manager');
          return;
        }
      }

      const userRole = employeeData?.role?.toLowerCase().trim();
      
      // Redirect admins and managers to their respective dashboards
      if (userRole === 'admin') {
        router.push('/admin');
        return;
      }
      
      if (userRole === 'manager') {
        router.push('/manager');
        return;
      }
      
      // If employee role, stay on this dashboard and load data
      if (employeeData) {
        setProfile({
          id: user.id,
          email: employeeData.email || user.email || '',
          first_name: employeeData.first_name,
          last_name: employeeData.last_name,
          role: employeeData.role
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
      // Query from 'timesheets' table (correct table)
      const { data: timesheetsData, error: timesheetsError } = await supabase
        .from('timesheets')
        .select('*')
        .eq('employee_id', userId)
        .order('created_at', { ascending: false });

      if (timesheetsError) {
        console.error('Error fetching timesheets:', timesheetsError);
        setTimecards([]);
      } else if (timesheetsData && timesheetsData.length > 0) {
        // Remove duplicates based on ID
        const uniqueTimesheets = Array.from(
          new Map(timesheetsData.map(item => [item.id, item])).values()
        );
        
        setTimecards(uniqueTimesheets);
        
        // Calculate stats - removed totalEarnings
        const timecardStats = uniqueTimesheets.reduce((acc, tc) => ({
          totalHours: acc.totalHours + (tc.total_hours || 0),
          pendingTimecards: acc.pendingTimecards + (tc.status === 'submitted' ? 1 : 0),
          approvedTimecards: acc.approvedTimecards + (tc.status === 'approved' ? 1 : 0),
          rejectedTimecards: acc.rejectedTimecards + (tc.status === 'rejected' ? 1 : 0) // 👈 new
        }), {
          totalHours: 0,
          pendingTimecards: 0,
          approvedTimecards: 0,
          rejectedTimecards: 0
        })        
        
        setStats(prev => ({ ...prev, ...timecardStats }));
      } else {
        setTimecards([]);
      }

      // Get user's expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('employee_id', userId)
        .order('expense_date', { ascending: false });

      if (!expensesError && expensesData) {
        const uniqueExpenses = Array.from(
          new Map(expensesData.map(item => [item.id, item])).values()
        );
        setExpenses(uniqueExpenses);
        
        // Calculate expense stats
        const expenseStats = uniqueExpenses.reduce((acc, exp) => ({
          totalExpenses: acc.totalExpenses + (exp.amount || 0),
          pendingExpenses: acc.pendingExpenses + (exp.status === 'submitted' ? exp.amount : 0),
          approvedExpenses: acc.approvedExpenses + (exp.status === 'approved' ? exp.amount : 0),
          rejectedExpenses: acc.rejectedExpenses + (exp.status === 'rejected' ? 1 : 0)
        }), {
          totalExpenses: 0,
          pendingExpenses: 0,
          approvedExpenses: 0,
          rejectedExpenses: 0
        });

        setStats(prev => ({ ...prev, ...expenseStats }));
      } else {
        setExpenses([]);
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
      // Fetch full timesheet details
      const { data: timesheetData, error: timesheetError } = await supabase
        .from('timesheets')
        .select('*')
        .eq('id', timecard.id)
        .single();

      if (timesheetError) throw timesheetError;

      // Fetch from timesheet_entries table
      const { data: entriesData, error: entriesError } = await supabase
        .from('timesheet_entries')
        .select('*')
        .eq('timesheet_id', timecard.id)
        .order('date', { ascending: true });

      console.log('Timesheet entries:', entriesData);

      let formattedEntries = entriesData || [];

      // If we have entries, fetch project details
      if (formattedEntries.length > 0) {
        const projectIds = [...new Set(formattedEntries.map(e => e.project_id).filter(Boolean))];
        
        if (projectIds.length > 0) {
          const { data: projectsData } = await supabase
            .from('projects')
            .select('id, name, client_name, project_code')
            .in('id', projectIds);

          console.log('Projects data:', projectsData);

          if (projectsData) {
            formattedEntries = formattedEntries.map(entry => ({
              ...entry,
              project_name: projectsData.find(p => p.id === entry.project_id)?.name || 'General Work',
              project_code: projectsData.find(p => p.id === entry.project_id)?.project_code,
              client_name: projectsData.find(p => p.id === entry.project_id)?.client_name
            }));
          }
        }
      }

      // Format the data for the modal
      const formattedTimesheet = {
        ...timesheetData,
        employee_name: profile?.first_name && profile?.last_name 
          ? `${profile.first_name} ${profile.last_name}` 
          : 'John Employee',
        employee_email: profile?.email || '',
        entries: formattedEntries
      };

      console.log('Final formatted timesheet:', formattedTimesheet);
      setSelectedTimesheet(formattedTimesheet);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error loading timesheet details:', error);
      // Still show modal with basic data
      const basicTimesheet = {
        ...timecard,
        employee_name: profile?.first_name && profile?.last_name 
          ? `${profile.first_name} ${profile.last_name}` 
          : 'John Employee',
        employee_email: profile?.email || '',
        entries: []
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
      rejected: 'bg-red-50 text-red-700 border-red-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const renderTimecardStatus = (status: Timecard['status']) => {
    switch (status) {
      case 'draft':
        return 'Draft'
      case 'submitted':
        return 'Submitted'
      case 'approved':
        return 'Approved'
      case 'rejected':
        return 'Rejected – needs your review'
      default:
        return status
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
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
      // Keep backward compatibility for any old entries
      travel: 'Travel',
      meals: 'Meals',
      accommodation: 'Accommodation',
      supplies: 'Supplies',
      equipment: 'Equipment',
      software: 'Software',
      training: 'Training',
      communication: 'Communication',
      shipping: 'Shipping',
      other: 'Other'
    };
    return labels[category] || category;
  };

  // Add greeting function HERE - before the if statement
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e31c79] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#05202E] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center gap-3">
                <Image
                  src="/WE-logo-SEPT2024v3-WHT.png"
                  alt="West End Workforce"
                  width={200}
                  height={50}
                  className="h-9 w-auto"
                  priority
                />
                <div className="border-l border-gray-600 pl-3">
                  <span className="text-sm text-gray-300">Employee Portal</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-200 hover:text-white transition-colors disabled:opacity-50"
                title="Refresh data"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm text-gray-200">
                  {getTimeBasedGreeting()}, {profile?.first_name || 'Employee'}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-200 hover:text-white transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-[#05202E] mb-2">
            Welcome back{profile?.first_name ? `, ${profile.first_name}` : ''}!
          </h2>
          <p className="text-gray-600">
            Manage your timesheets and expenses
          </p>
        </div>

        {/* Quick Actions - Swapped colors */}
        <div className="mb-8 flex gap-4">
          <button 
            onClick={() => router.push('/timesheet/entry')}
            className="flex items-center gap-3 px-6 py-3 bg-[#05202E] text-white rounded-lg hover:bg-[#0a2a3d] transition-all duration-200 font-medium shadow-lg"
          >
            <FileText className="h-5 w-5" />
            Access Timecards
          </button>
          
          <button 
            onClick={() => router.push('/expense/entry')}
            className="flex items-center gap-3 px-6 py-3 bg-[#e31c79] text-white rounded-lg hover:bg-[#c91865] transition-all duration-200 font-medium shadow-lg"
          >
            <Receipt className="h-5 w-5" />
            Submit Expense
          </button>
        </div>

        {/* TIMESHEET SUMMARY */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Timesheet Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* All Time Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[4px_4px_12px_rgba(0,0,0,0.12)] transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <Clock className="h-5 w-5 text-[#05202E]" />
                <span className="text-xs font-medium text-gray-500 uppercase">All Time</span>
              </div>
              <p className="text-3xl font-bold text-[#05202E]">{stats.totalHours.toFixed(1)}</p>
              <p className="text-sm text-gray-500 mt-1">Total Hours</p>
            </div>

            {/* Pending Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[4px_4px_12px_rgba(0,0,0,0.12)] transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <FileText className="h-5 w-5 text-[#05202E]" />
                <span className="text-xs font-medium text-gray-500 uppercase">Pending</span>
              </div>
              <p className="text-3xl font-bold text-[#05202E]">{stats.pendingTimecards}</p>
              <p className="text-sm text-gray-500 mt-1">Awaiting Review</p>
            </div>

            {/* Approved Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[4px_4px_12px_rgba(0,0,0,0.12)] transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-xs font-medium text-gray-500 uppercase">Approved</span>
              </div>
              <p className="text-3xl font-bold text-[#05202E]">{stats.approvedTimecards}</p>
              <p className="text-sm text-gray-500 mt-1">Completed</p>
            </div>

            {/* Rejected Card - NEW */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[4px_4px_12px_rgba(0,0,0,0.12)] transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-xs font-medium text-gray-500 uppercase">Rejected</span>
              </div>
              <p className="text-3xl font-bold text-gray-500">
  {stats.rejectedTimecards}
</p>
              <p className="text-sm text-gray-500 mt-1">Need Action</p>
            </div>
          </div>
        </div>

        {/* EXPENSE SUMMARY */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Expense Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Total Card */}
            <div className="bg-white rounded-lg border border-[#e31c79]/20 p-6 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[4px_4px_12px_rgba(0,0,0,0.12)] transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <DollarSign className="h-5 w-5 text-[#e31c79]" />
                <span className="text-xs font-medium text-gray-500 uppercase">Total</span>
              </div>
              <p className="text-2xl font-bold text-[#e31c79]">{formatCurrency(stats.totalExpenses)}</p>
              <p className="text-sm text-gray-500 mt-1">All Expenses</p>
            </div>

            {/* Pending Card */}
            <div className="bg-white rounded-lg border border-[#e31c79]/20 p-6 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[4px_4px_12px_rgba(0,0,0,0.12)] transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <Receipt className="h-5 w-5 text-[#e31c79]" />
                <span className="text-xs font-medium text-gray-500 uppercase">Pending</span>
              </div>
              <p className="text-2xl font-bold text-[#e31c79]">{formatCurrency(stats.pendingExpenses)}</p>
              <p className="text-sm text-gray-500 mt-1">Under Review</p>
            </div>

            {/* Approved Card */}
            <div className="bg-white rounded-lg border border-[#e31c79]/20 p-6 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[4px_4px_12px_rgba(0,0,0,0.12)] transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-xs font-medium text-gray-500 uppercase">Approved</span>
              </div>
              <p className="text-2xl font-bold text-[#e31c79]">{formatCurrency(stats.approvedExpenses)}</p>
              <p className="text-sm text-gray-500 mt-1">Approved</p>
            </div>

            {/* Rejected Card */}
            <div className="bg-white rounded-lg border border-[#e31c79]/20 p-6 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[4px_4px_12px_rgba(0,0,0,0.12)] transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-xs font-medium text-gray-500 uppercase">Rejected</span>
              </div>
              <p className="text-2xl font-bold text-gray-500">{stats.rejectedExpenses}</p>
              <p className="text-sm text-gray-500 mt-1">Need Action</p>
            </div>
          </div>
        </div>

        {/* Recent Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Recent Timecards */}
          <div>
            <div className="bg-white rounded-t-lg border border-[#05202E]-200 px-6 py-4 shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
              <h3 className="text-lg font-semibold text-[#05202E]">Recent Timecards</h3>
              <p className="text-sm text-gray-500">Your latest timesheet submissions</p>
            </div>
            <div className="bg-white rounded-b-lg border-x border-b border-[#05202E]-200 p-6 shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
              {timecards.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-600 font-medium">No timecards yet</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Click "Access Timecards" to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {timecards.map((timecard) => (
                    <div
                      key={timecard.id}
                      className="p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleTimesheetClick(timecard)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-[#05202E]">
                            Week ending {formatDate(timecard.week_ending)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {timecard.total_hours || 0} hrs
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(timecard.status)}`}>
                          {timecard.status.charAt(0).toUpperCase() + timecard.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Expenses */}
          <div>
            <div className="bg-white rounded-t-lg border border-gray-200 px-6 py-4 shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
              <h3 className="text-lg font-semibold text-[#05202E]">Recent Expenses</h3>
              <p className="text-sm text-gray-500">Your latest expense submissions</p>
            </div>
            <div className="bg-white rounded-b-lg border-x border-b border-gray-200 p-6 shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
              {expenses.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-600 font-medium">No expenses yet</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Click "Submit Expense" to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/expense/${expense.id}`)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-[#05202E]">
                            {getCategoryLabel(expense.category)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatCurrency(expense.amount)} • {formatDate(expense.expense_date)}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(expense.status)}`}>
                          {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Timesheet Modal */}
      <TimesheetModal
  isOpen={isModalOpen}
  onClose={handleCloseModal}
  timesheet={selectedTimesheet}
  isEmployeeView={true}
/>
    </div>
  );
}