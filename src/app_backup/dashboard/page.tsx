// src/app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  CalendarDays, 
  Clock, 
  DollarSign, 
  FileText,
  Plus,
  ChevronRight,
  User,
  LogOut,
  Briefcase,
  Receipt,
  CreditCard,
  AlertCircle
} from 'lucide-react';

interface Timecard {
  id: string;
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
  role: string;
}

export default function EmployeeDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [timecards, setTimecards] = useState<Timecard[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState({
    // Timesheet stats
    totalHours: 0,
    totalEarnings: 0,
    pendingTimecards: 0,
    approvedTimecards: 0,
    // Expense stats
    totalExpenses: 0,
    pendingExpenses: 0,
    approvedExpenses: 0,
    rejectedExpenses: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Error getting user:', userError);
        router.push('/auth/login');
        return;
      }

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        // Set basic profile from user data even if profiles table fails
        setProfile({
          id: user.id,
          email: user.email || '',
          role: 'employee'
        });
      } else {
        setProfile(profileData);
      }

      // Get user's timecards
      const { data: timecardsData, error: timecardsError } = await supabase
        .from('timecards')
        .select('*')
        .eq('employee_id', user.id)
        .order('week_ending', { ascending: false })
        .limit(10);

      if (timecardsError) {
        console.error('Error fetching timecards:', timecardsError);
      } else {
        setTimecards(timecardsData || []);
        
        // Calculate timecard stats
        const timecardStats = (timecardsData || []).reduce((acc, tc) => ({
          totalHours: acc.totalHours + (tc.total_hours || 0),
          totalEarnings: acc.totalEarnings + (tc.total_amount || 0),
          pendingTimecards: acc.pendingTimecards + (tc.status === 'submitted' ? 1 : 0),
          approvedTimecards: acc.approvedTimecards + (tc.status === 'approved' ? 1 : 0)
        }), {
          totalHours: 0,
          totalEarnings: 0,
          pendingTimecards: 0,
          approvedTimecards: 0
        });
        
        setStats(prev => ({ ...prev, ...timecardStats }));
      }

      // Get user's expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('employee_id', user.id)
        .order('expense_date', { ascending: false })
        .limit(10);

      if (expensesError) {
        console.error('Error fetching expenses:', expensesError);
      } else {
        setExpenses(expensesData || []);
        
        // Calculate expense stats
        const expenseStats = (expensesData || []).reduce((acc, exp) => ({
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
      }
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setIsLoading(false);
    }
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
      travel: 'Travel',
      mileage: 'Mileage',
      meals: 'Meals',
      accommodation: 'Accommodation',
      supplies: 'Supplies',
      equipment: 'Equipment',
      software: 'Software',
      training: 'Training',
      communication: 'Communication',
      parking: 'Parking',
      shipping: 'Shipping',
      other: 'Other'
    };
    return labels[category] || category;
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
                <div className="bg-white/10 p-2 rounded-lg">
                  <Briefcase className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-white">
                    West End Workforce
                  </h1>
                  <span className="text-xs text-gray-300">Employee Portal</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm text-gray-200">{profile?.email}</span>
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
            Welcome back{profile?.email ? `, ${profile.email.split('@')[0]}` : ''}!
          </h2>
          <p className="text-gray-600">
            Manage your timesheets and expenses
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 flex gap-4">
          <button 
            onClick={() => router.push('/timesheet/entry')}
            className="flex items-center gap-3 px-6 py-3 bg-[#e31c79] text-white rounded-lg hover:bg-[#c91865] transition-all duration-200 font-medium shadow-lg"
          >
            <Plus className="h-5 w-5" />
            Create New Timecard
          </button>
          
          <button 
            onClick={() => router.push('/expense/entry')}
            className="flex items-center gap-3 px-6 py-3 bg-[#05202E] text-white rounded-lg hover:bg-[#0a2a3d] transition-all duration-200 font-medium shadow-lg"
          >
            <Receipt className="h-5 w-5" />
            Submit Expense
          </button>
        </div>

        {/* Stats Grid - Timesheets Row */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">Timesheet Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
            <div className="bg-white rounded-lg border border-[#05202E] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <Clock className="h-6 w-6 text-[#05202E]" />
                <span className="text-xs text-gray-500 font-medium uppercase">All Time</span>
              </div>
              <div className="text-2xl font-bold text-[#05202E]">{stats.totalHours.toFixed(1)}</div>
              <p className="text-sm text-gray-600 mt-1">Total Hours</p>
            </div>

            <div className="bg-white rounded-lg border border-[#05202E] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <DollarSign className="h-6 w-6 text-[#05202E]" />
                <span className="text-xs text-gray-500 font-medium uppercase">Approved</span>
              </div>
              <div className="text-2xl font-bold text-[#05202E]">{formatCurrency(stats.totalEarnings)}</div>
              <p className="text-sm text-gray-600 mt-1">Total Earnings</p>
            </div>

            <div className="bg-white rounded-lg border border-[#05202E] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <FileText className="h-6 w-6 text-[#05202E]" />
                <span className="text-xs text-gray-500 font-medium uppercase">Pending</span>
              </div>
              <div className="text-2xl font-bold text-[#05202E]">{stats.pendingTimecards}</div>
              <p className="text-sm text-gray-600 mt-1">Awaiting Review</p>
            </div>

            <div className="bg-white rounded-lg border border-[#05202E] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <CalendarDays className="h-6 w-6 text-[#05202E]" />
                <span className="text-xs text-gray-500 font-medium uppercase">Completed</span>
              </div>
              <div className="text-2xl font-bold text-[#05202E]">{stats.approvedTimecards}</div>
              <p className="text-sm text-gray-600 mt-1">Approved</p>
            </div>
          </div>
        </div>

        {/* Stats Grid - Expenses Row */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">Expense Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg border border-[#e31c79] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <Receipt className="h-6 w-6 text-[#e31c79]" />
                <span className="text-xs text-gray-500 font-medium uppercase">Total</span>
              </div>
              <div className="text-2xl font-bold text-[#e31c79]">{formatCurrency(stats.totalExpenses)}</div>
              <p className="text-sm text-gray-600 mt-1">All Expenses</p>
            </div>

            <div className="bg-white rounded-lg border border-[#e31c79] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <CreditCard className="h-6 w-6 text-[#e31c79]" />
                <span className="text-xs text-gray-500 font-medium uppercase">Pending</span>
              </div>
              <div className="text-2xl font-bold text-[#e31c79]">{formatCurrency(stats.pendingExpenses)}</div>
              <p className="text-sm text-gray-600 mt-1">Under Review</p>
            </div>

            <div className="bg-white rounded-lg border border-[#e31c79] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <DollarSign className="h-6 w-6 text-[#e31c79]" />
                <span className="text-xs text-gray-500 font-medium uppercase">Approved</span>
              </div>
              <div className="text-2xl font-bold text-[#e31c79]">{formatCurrency(stats.approvedExpenses)}</div>
              <p className="text-sm text-gray-600 mt-1">Reimbursed</p>
            </div>

            <div className="bg-white rounded-lg border border-[#e31c79] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <AlertCircle className="h-6 w-6 text-[#e31c79]" />
                <span className="text-xs text-gray-500 font-medium uppercase">Action</span>
              </div>
              <div className="text-2xl font-bold text-[#e31c79]">{stats.rejectedExpenses}</div>
              <p className="text-sm text-gray-600 mt-1">Rejected</p>
            </div>
          </div>
        </div>

        {/* Recent Activity - Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Timecards */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-[#05202E]">Recent Timecards</h3>
              <p className="text-sm text-gray-600 mt-1">Your latest timesheet submissions</p>
            </div>
            <div className="p-6">
              {timecards.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 font-medium">No timecards yet</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Click "Create New Timecard" to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {timecards.slice(0, 5).map((timecard) => (
                    <div
                      key={timecard.id}
                      className="group flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200 border border-gray-200"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-medium text-sm text-[#05202E]">
                              Week ending {formatDate(timecard.week_ending)}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {timecard.total_hours} hrs • {formatCurrency(timecard.total_amount)}
                            </p>
                          </div>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(timecard.status)}`}>
                            {timecard.status.charAt(0).toUpperCase() + timecard.status.slice(1)}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Expenses */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-[#05202E]">Recent Expenses</h3>
              <p className="text-sm text-gray-600 mt-1">Your latest expense submissions</p>
            </div>
            <div className="p-6">
              {expenses.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Receipt className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 font-medium">No expenses yet</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Click "Submit Expense" to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {expenses.slice(0, 5).map((expense) => (
                    <div
                      key={expense.id}
                      className="group flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200 border border-gray-200"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-medium text-sm text-[#05202E]">
                              {getCategoryLabel(expense.category)} - {formatDate(expense.expense_date)}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {formatCurrency(expense.amount)} • {expense.description || 'No description'}
                            </p>
                          </div>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(expense.status)}`}>
                            {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


