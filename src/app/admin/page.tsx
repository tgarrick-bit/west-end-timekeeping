'use client';

// src/app/admin/page.tsx

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import RoleGuard from '@/components/auth/RoleGuard';
import type { Employee } from '@/types';
import { 
  Users, Clock, DollarSign, Building2, FileText, 
  TrendingUp, Settings, AlertCircle, BarChart3,
  Receipt, FolderOpen, UserCog, CreditCard,
  LogOut, Briefcase
} from 'lucide-react';

interface AdminStats {
  totalEmployees: number;
  activeEmployees: number;
  totalClients: number;
  activeProjects: number;
  pendingTimesheets: number;
  pendingExpenses: number;
  currentMonthRevenue: number;
  currentMonthHours: number;
}

export default function AdminDashboard() {
  const [admin, setAdmin] = useState<Employee | null>(null);
  const [stats, setStats] = useState<AdminStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    totalClients: 0,
    activeProjects: 0,
    pendingTimesheets: 0,
    pendingExpenses: 0,
    currentMonthRevenue: 0,
    currentMonthHours: 0
  });
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        router.push('/auth/login');
        return;
      }

      // Get admin info
      const { data: adminData } = await supabase
        .from('employees')
        .select('*')
        .eq('id', user.id)
        .single();

      if (adminData?.role !== 'admin') {
        if (adminData?.role === 'manager') {
          router.push('/manager');
        } else {
          router.push('/dashboard');
        }
        return;
      }

      setAdmin(adminData as Employee);
      await loadStats();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { count: totalEmp } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true });

      const { count: activeEmp } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      const { count: totalClients } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      const { count: activeProjects } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      const { count: pendingTime } = await supabase
        .from('timesheets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'submitted');

      const { count: pendingExp } = await supabase
        .from('expenses')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'submitted');

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: monthTimecards } = await supabase
        .from('timesheets')
        .select('total_hours')
        .gte('week_ending', startOfMonth.toISOString())
        .eq('status', 'approved');

      const monthHours = monthTimecards?.reduce((sum, tc) => sum + (tc.total_hours || 0), 0) || 0;

      setStats({
        totalEmployees: totalEmp || 0,
        activeEmployees: activeEmp || 0,
        totalClients: totalClients || 0,
        activeProjects: activeProjects || 0,
        pendingTimesheets: pendingTime || 0,
        pendingExpenses: pendingExp || 0,
        currentMonthRevenue: monthHours * 150,
        currentMonthHours: monthHours
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const mainSections = [
    {
      title: 'Employee Management',
      description: 'Manage workforce and permissions',
      path: '/admin/employees',
      badge: null
    },
    {
      title: 'Review Timesheets',
      description: `${stats.pendingTimesheets} pending approval`,
      path: '/admin/timesheets',
      badge: stats.pendingTimesheets
    },
    {
      title: 'Review Expenses',
      description: `${stats.pendingExpenses} pending approval`,
      path: '/admin/expenses',
      badge: stats.pendingExpenses
    },
    {
      title: 'Client Management',
      description: 'Manage client organizations',
      path: '/admin/clients',
      badge: null
    },
    {
      title: 'Reports & Analytics',
      description: 'View insights and reports',
      path: '/admin/reports',
      badge: null
    },
    {
      title: 'Billing & Invoicing',
      description: 'Generate invoices and statements',
      path: '/admin/billing',
      badge: null
    },
    {
      title: 'Project Management',
      description: 'Manage projects and assignments',
      path: '/admin/projects',
      badge: null
    },
    {
      title: 'System Settings',
      description: 'Configure system preferences',
      path: '/admin/settings',
      badge: null
    }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-gray-900 shadow-lg">
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
                    <span className="text-xs text-gray-300">Admin Portal</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-200">{admin?.email}</span>
                <button
                  onClick={() => router.push('/manager')}
                  className="text-sm text-gray-200 hover:text-white"
                >
                  Manager View
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-200 hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Welcome Section */}
        <div className="bg-gray-900 text-white pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            <h2 className="text-2xl font-bold">Welcome back, {admin?.first_name || 'Admin'}!</h2>
            <p className="text-gray-300 mt-1">System Administrator • West End Workforce</p>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div>
                <p className="text-xs text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
                <p className="text-xs text-green-600 mt-1">{stats.activeEmployees} active</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <div>
                <p className="text-xs text-gray-600">Active Clients</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalClients}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <div>
                <p className="text-xs text-gray-600">Pending Approvals</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.pendingTimesheets + stats.pendingExpenses}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.pendingTimesheets} timesheets, {stats.pendingExpenses} expenses
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <div>
                <p className="text-xs text-gray-600">Month Revenue</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(stats.currentMonthRevenue)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{stats.currentMonthHours} hours billed</p>
              </div>
            </div>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {mainSections.map((section) => (
              <button
                key={section.path}
                onClick={() => router.push(section.path)}
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-lg transition-all duration-200 text-left relative"
              >
                {section.badge !== null && section.badge > 0 && (
                  <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold">
                    {section.badge}
                  </span>
                )}
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  {section.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {section.description}
                </p>
              </button>
            ))}
          </div>

          {/* Action Required Section */}
          {(stats.pendingTimesheets > 0 || stats.pendingExpenses > 0) && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <h3 className="text-base font-semibold text-orange-900">Action Required</h3>
              </div>
              <div className="space-y-2">
                {stats.pendingTimesheets > 0 && (
                  <button
                    onClick={() => router.push('/admin/timesheets')}
                    className="w-full text-left p-3 bg-white rounded-lg hover:bg-orange-100 transition-colors flex items-center justify-between"
                  >
                    <span className="text-sm">
                      <strong>{stats.pendingTimesheets}</strong> timesheets awaiting approval
                    </span>
                    <span className="text-orange-600">→</span>
                  </button>
                )}
                {stats.pendingExpenses > 0 && (
                  <button
                    onClick={() => router.push('/admin/expenses')}
                    className="w-full text-left p-3 bg-white rounded-lg hover:bg-orange-100 transition-colors flex items-center justify-between"
                  >
                    <span className="text-sm">
                      <strong>{stats.pendingExpenses}</strong> expense reports awaiting approval
                    </span>
                    <span className="text-orange-600">→</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </RoleGuard>
  );
}