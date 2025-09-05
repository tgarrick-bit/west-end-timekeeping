// @ts-nocheck
'use client';


import { useState, useEffect } from 'react';
import { enhancedDataService } from '@/lib/enhanced_realistic_data_service';
import { User, EmployeeDashboardStats } from '@/types';
import { Clock, Plus, FileText, User as UserIcon, ArrowRight, Calendar, Receipt } from 'lucide-react';
import Link from 'next/link';

interface EmployeeDashboardProps {
  user: User;
}

export default function EmployeeDashboard({ user }: EmployeeDashboardProps) {
  const [stats, setStats] = useState<EmployeeDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [user.id]);

  const loadStats = async () => {
    try {
      const dashboardStats = await enhancedDataService.getDashboardStats(user.id);
      setStats(dashboardStats);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const StatCard = ({ title, value, subtitle, color = 'pink' }: {
    title: string;
    value: string | number;
    subtitle?: string;
    color?: 'pink' | 'darkBlue' | 'lightBeige';
  }) => {
    const colorClasses = {
      pink: 'bg-pink-50 text-pink-700 border-pink-200',
      darkBlue: 'bg-[#05202E]/10 text-[#05202E] border-[#05202E]/20',
      lightBeige: 'bg-[#E5DDD8]/50 text-[#05202E] border-[#E5DDD8]'
    };

    return (
      <div className={`p-6 rounded-lg border ${colorClasses[color]}`}>
        <h3 className="text-sm font-medium opacity-75">{title}</h3>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {subtitle && <p className="text-sm opacity-75 mt-1">{subtitle}</p>}
      </div>
    );
  };

  const NavigationCard = ({ title, description, icon: Icon, href, color = 'pink' }: {
    title: string;
    description: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: any;
    href: string;
    color?: 'pink' | 'darkBlue' | 'lightBeige';
  }) => {
    const colorClasses = {
      pink: 'bg-pink-50 border-pink-200 hover:bg-pink-100 text-pink-700',
      darkBlue: 'bg-[#05202E]/10 border-[#05202E]/20 hover:bg-[#05202E]/20 text-[#05202E]',
      lightBeige: 'bg-[#E5DDD8]/50 border-[#E5DDD8] hover:bg-[#E5DDD8]/70 text-[#05202E]'
    };

    return (
      <Link
        href={href}
        className={`block p-6 rounded-lg border transition-all hover:shadow-md ${colorClasses[color]}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-lg bg-white`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-sm opacity-75">{description}</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 opacity-75" />
        </div>
      </Link>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user.first_name}!
            </h1>
            <p className="text-gray-600 mt-1">
              {user.role} • {user.role} Department
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Employee
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Employee ID</p>
            <p className="font-mono text-gray-900">{user.id}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="This Week Hours"
            value={stats.thisWeekHours?.toFixed(1) || '0'}
            subtitle="Monday - Friday"
            color="pink"
          />
          <StatCard
            title="Pending Approvals"
            value={stats.pendingApprovals || 0}
            subtitle="Awaiting review"
            color="lightBeige"
          />
          <StatCard
            title="Active Projects"
            value={stats.totalProjects || 0}
            subtitle="Currently assigned"
            color="darkBlue"
          />
          <StatCard
            title="Total Entries"
            value={stats.totalEntries || 0}
            subtitle="All time"
            color="pink"
          />
        </div>
      )}

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NavigationCard
          title="Timesheets"
          description="Track time and submit weekly timesheets"
          icon={Calendar}
          href="/timesheets"
          color="pink"
        />
        <NavigationCard
          title="Expenses"
          description="Submit and track business expenses"
          icon={Receipt}
          href="/expenses"
          color="darkBlue"
        />
        <NavigationCard
          title="Profile"
          description="Update your personal information"
          icon={UserIcon}
          href="/profile"
          color="lightBeige"
        />
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-pink-600" />
              <span className="text-gray-700">Last timesheet submitted</span>
            </div>
            <span className="text-sm text-gray-500">2 days ago</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <FileText className="h-5 w-5 text-[#05202E]" />
              <span className="text-gray-700">Hours this month</span>
            </div>
            <span className="font-medium text-gray-900">
              {(stats?.thisWeekHours ? stats.thisWeekHours * 4 : 0).toFixed(1)}h
            </span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Plus className="h-5 w-5 text-[#E5DDD8]" />
              <span className="text-gray-700">Average daily hours</span>
            </div>
            <span className="font-medium text-gray-900">
              {(stats?.thisWeekHours ? stats.thisWeekHours / 5 : 0).toFixed(1)}h
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/timesheets"
            className="flex items-center justify-center p-4 bg-pink-50 border border-pink-200 rounded-lg hover:bg-pink-100 transition-colors text-pink-700 font-medium"
          >
            <Calendar className="h-5 w-5 mr-2" />
            Add Time Entry
          </Link>
          
          <Link
            href="/expenses"
            className="flex items-center justify-center p-4 bg-[#05202E]/10 border border-[#05202E]/20 rounded-lg hover:bg-[#05202E]/20 transition-colors text-[#05202E] font-medium"
          >
            <Receipt className="h-5 w-5 mr-2" />
            Submit Expense
          </Link>
        </div>
      </div>
    </div>
  );
}
