'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ArrowLeft, DollarSign, TrendingUp, Users, FileText } from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';

export default function ManagerFinancialPage() {
  const { appUser } = useAuth();
  const router = useRouter();

  // Sample financial data
  const financialData = {
    totalExpenses: 245.80,
    pendingExpenses: 156.30,
    approvedExpenses: 89.50,
    totalHours: 125.5,
    hourlyRate: 75,
    projectedRevenue: 9412.50,
    teamSize: 2,
    averageUtilization: 87
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => router.push('/manager')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5 mr-1" />
              Back to Dashboard
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Financial Summary</h1>
              <p className="text-gray-600">ABC Corporation • Financial Overview</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* Notification Bell */}
            <NotificationBell className="text-gray-600 hover:text-pink-600" />
            
            <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold">
              {appUser ? `${appUser.first_name?.[0] || ''}${appUser.last_name?.[0] || ''}` : 'M'}
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">{appUser ? `${appUser.first_name} ${appUser.last_name}` : 'Manager'}</div>
              <div className="text-xs text-gray-500">Manager</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Financial Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-gray-900">${financialData.totalExpenses}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Expenses</p>
                  <p className="text-2xl font-bold text-gray-900">${financialData.pendingExpenses}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Projected Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">${financialData.projectedRevenue}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Team Utilization</p>
                  <p className="text-2xl font-bold text-gray-900">{financialData.averageUtilization}%</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Financial Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Expense Breakdown */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Pending Approval</span>
                  <span className="font-semibold text-yellow-600">${financialData.pendingExpenses}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Approved This Week</span>
                  <span className="font-semibold text-green-600">${financialData.approvedExpenses}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total This Week</span>
                  <span className="font-semibold text-gray-900">${financialData.totalExpenses}</span>
                </div>
              </div>
            </div>

            {/* Revenue Projection */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Projection</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Hours</span>
                  <span className="font-semibold text-gray-900">{financialData.totalHours}h</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Hourly Rate</span>
                  <span className="font-semibold text-gray-900">${financialData.hourlyRate}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Projected Revenue</span>
                  <span className="font-semibold text-green-600">${financialData.projectedRevenue}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Financial Activity</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">Sarah Johnson - Travel Expenses</p>
                    <p className="text-sm text-gray-500">Pending approval • $89.50</p>
                  </div>
                </div>
                <span className="text-sm text-gray-500">2 hours ago</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-gray-900">Mike Chen - Office Supplies</p>
                    <p className="text-sm text-gray-500">Approved • $45.20</p>
                  </div>
                </div>
                <span className="text-sm text-gray-500">1 day ago</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-gray-900">David Kim - Software License</p>
                    <p className="text-sm text-gray-500">Approved • $120.00</p>
                  </div>
                </div>
                <span className="text-sm text-gray-500">3 days ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
