// src/components/DashboardStats.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Clock, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';

// Narrow role locally so we can use clean comparisons with fallbacks
type Role = 'employee' | 'manager' | 'admin' | 'client_approver' | 'payroll';

// This component's *local* stats shape (matches what we render)
interface LocalStats {
  totalHoursThisWeek: number;
  totalExpensesThisMonth: number;
  pendingApprovals: number;
  submittedItems: number;
}

// Small helper type for stat cards
interface StatCard {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string; // tailwind class, e.g. "bg-blue-500"
}

export function DashboardStats() {
  const { appUser } = useAuth();

  const [stats, setStats] = useState<LocalStats>({
    totalHoursThisWeek: 0,
    totalExpensesThisMonth: 0,
    pendingApprovals: 0,
    submittedItems: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (appUser) {
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appUser?.id]); // only refetch when the logged-in user changes

  const fetchStats = async () => {
    if (!appUser) return;

    try {
      setLoading(true);
      const role = (appUser.role as Role | undefined) ?? 'employee';

      if (role === 'employee') {
        await fetchEmployeeStats();
      } else if (role === 'client_approver') {
        await fetchClientApproverStats();
      } else if (role === 'admin') {
        await fetchAdminStats();
      } else if (role === 'payroll') {
        await fetchPayrollStats();
      } else {
        // manager or unknown → safe default
        setStats((s) => ({ ...s, pendingApprovals: 0, submittedItems: 0 }));
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeStats = async () => {
    if (!appUser) return;

    const { start: weekStart, end: weekEnd } = getWeekDates();
    const { start: monthStart, end: monthEnd } = getMonthDates();

    // time_entries: sum hours for this week
    const { data: timeEntries } = await supabase
      .from('time_entries')
      .select('total_hours')
      .eq('user_id', appUser.id)
      .gte('date', weekStart.toISOString().split('T')[0])
      .lte('date', weekEnd.toISOString().split('T')[0]);

    // expense_items: sum amounts for this month
    const { data: expenses } = await supabase
      .from('expense_items')
      .select('amount')
      .eq('user_id', appUser.id)
      .gte('date', monthStart.toISOString().split('T')[0])
      .lte('date', monthEnd.toISOString().split('T')[0]);

    // approvals: pending (employee perspective)
    const { data: approvals } = await supabase
      .from('approvals')
      .select('*')
      .or(`timesheet_id.eq.${appUser.id},expense_report_id.eq.${appUser.id}`)
      .eq('status', 'pending');

    const hours =
      (timeEntries || []).reduce(
        (sum: number, entry: { total_hours?: number | null }) => sum + (entry.total_hours || 0),
        0
      ) / 60;

    const expenseTotal = (expenses || []).reduce(
      (sum: number, e: { amount?: number | null }) => sum + (e.amount || 0),
      0
    );

    setStats({
      totalHoursThisWeek: isFinite(hours) ? hours : 0,
      totalExpensesThisMonth: isFinite(expenseTotal) ? expenseTotal : 0,
      pendingApprovals: approvals?.length || 0,
      submittedItems: 0, // not used for employee
    });
  };

  const fetchClientApproverStats = async () => {
    if (!appUser) return;

    const { data: approvals } = await supabase
      .from('approvals')
      .select('*')
      .eq('approver_id', appUser.id)
      .eq('status', 'pending');

    setStats({
      totalHoursThisWeek: 0,
      totalExpensesThisMonth: 0,
      pendingApprovals: approvals?.length || 0,
      submittedItems: 0,
    });
  };

  const fetchAdminStats = async () => {
    // example: active users as a “submittedItems” stand-in
    const { data: users } = await supabase.from('users').select('*').eq('is_active', true);

    setStats({
      totalHoursThisWeek: 0,
      totalExpensesThisMonth: 0,
      pendingApprovals: 0,
      submittedItems: users?.length || 0,
    });
  };

  const fetchPayrollStats = async () => {
    const { data: approvals } = await supabase
      .from('approvals')
      .select('*')
      .eq('approver_type', 'payroll')
      .eq('status', 'pending');

    setStats({
      totalHoursThisWeek: 0,
      totalExpensesThisMonth: 0,
      pendingApprovals: approvals?.length || 0,
      submittedItems: 0,
    });
  };

  const getWeekDates = () => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  };

  const getMonthDates = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  };

  const getStatCards = (): StatCard[] => {
    const role = (appUser?.role as Role | undefined) ?? 'employee';

    if (role === 'employee') {
      return [
        {
          title: 'Hours This Week',
          value: `${stats.totalHoursThisWeek.toFixed(1)}h`,
          icon: Clock,
          color: 'bg-blue-500',
        },
        {
          title: 'Expenses This Month',
          value: `$${stats.totalExpensesThisMonth.toFixed(2)}`,
          icon: DollarSign,
          color: 'bg-green-500',
        },
        {
          title: 'Pending Approvals',
          value: stats.pendingApprovals,
          icon: AlertCircle,
          color: 'bg-yellow-500',
        },
      ];
    }
    if (role === 'client_approver') {
      return [
        {
          title: 'Pending Approvals',
          value: stats.pendingApprovals,
          icon: AlertCircle,
          color: 'bg-yellow-500',
        },
      ];
    }
    if (role === 'admin') {
      return [
        {
          title: 'Active Users',
          value: stats.submittedItems,
          icon: CheckCircle,
          color: 'bg-blue-500',
        },
      ];
    }
    if (role === 'payroll') {
      return [
        {
          title: 'Pending Approvals',
          value: stats.pendingApprovals,
          icon: AlertCircle,
          color: 'bg-yellow-500',
        },
      ];
    }
    return [];
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-8 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  const statCards = getStatCards();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <div key={index} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className={`p-3 rounded-full ${stat.color}`}>
              <stat.icon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{stat.title}</p>
              <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
