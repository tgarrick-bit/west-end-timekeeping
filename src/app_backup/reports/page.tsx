'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, TrendingUp, Download, ArrowLeft, Calendar, DollarSign, Clock, Users } from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface ReportData {
  totalHours: number;
  totalExpenses: number;
  pendingApprovals: number;
  approvedItems: number;
  rejectedItems: number;
  monthlyTrend: { month: string; hours: number; expenses: number }[];
  topProjects: { name: string; hours: number; expenses: number }[];
}

export default function ReportsPage() {
  const router = useRouter();
  const [reportData] = useState<ReportData>({
    totalHours: 1247,
    totalExpenses: 8945.67,
    pendingApprovals: 3,
    approvedItems: 156,
    rejectedItems: 12,
    monthlyTrend: [
      { month: 'Jan', hours: 120, expenses: 850 },
      { month: 'Feb', hours: 135, expenses: 920 },
      { month: 'Mar', hours: 142, expenses: 1100 },
      { month: 'Apr', hours: 128, expenses: 950 },
      { month: 'May', hours: 156, expenses: 1200 },
      { month: 'Jun', hours: 148, expenses: 1050 }
    ],
    topProjects: [
      { name: 'Metro Hospital', hours: 320, expenses: 2800 },
      { name: 'Downtown Office', hours: 280, expenses: 2100 },
      { name: 'City Schools', hours: 240, expenses: 1800 },
      { name: 'Riverside Manufacturing', hours: 200, expenses: 1600 }
    ]
  });

  const handleExport = (type: 'summary' | 'detailed' | 'monthly') => {
    // In a real app, this would generate and download the report
    alert(`${type} report exported successfully!`);
  };

  return (
    <ProtectedRoute allowedRoles={['client_approver']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => router.push('/dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5 mr-1" />
                Back to Dashboard
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
                <p className="text-gray-600">View and export project reports and analytics</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => handleExport('summary')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Export Summary</span>
              </button>
              <button 
                onClick={() => handleExport('detailed')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Export Detailed</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Hours</p>
                    <p className="text-2xl font-bold text-gray-900">{reportData.totalHours}</p>
                    <p className="text-xs text-gray-500">This year</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                    <p className="text-2xl font-bold text-gray-900">${reportData.totalExpenses.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">This year</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <Users className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-gray-900">{reportData.pendingApprovals}</p>
                    <p className="text-xs text-gray-500">Approvals needed</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Approved</p>
                    <p className="text-2xl font-bold text-gray-900">{reportData.approvedItems}</p>
                    <p className="text-xs text-gray-500">This year</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly Trend Chart */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Monthly Trends</h2>
                <p className="text-sm text-gray-600">Hours and expenses over the last 6 months</p>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Hours Trend */}
                  <div>
                    <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-blue-600" />
                      Hours Trend
                    </h3>
                    <div className="space-y-3">
                      {reportData.monthlyTrend.map((item) => (
                        <div key={item.month} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{item.month}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${(item.hours / 200) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-900 w-12 text-right">
                              {item.hours}h
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Expenses Trend */}
                  <div>
                    <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                      <DollarSign className="h-4 w-4 mr-2 text-green-600" />
                      Expenses Trend
                    </h3>
                    <div className="space-y-3">
                      {reportData.monthlyTrend.map((item) => (
                        <div key={item.month} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{item.month}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full" 
                                style={{ width: `${(item.expenses / 1500) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-900 w-16 text-right">
                              ${item.expenses}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Projects */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Top Projects</h2>
                <p className="text-sm text-gray-600">Projects with highest hours and expenses</p>
              </div>
              
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Project
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Hours
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Expenses
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.topProjects.map((project) => (
                        <tr key={project.name} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{project.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{project.hours} hours</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">${project.expenses.toFixed(2)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button 
                              onClick={() => handleExport('detailed')}
                              className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                            >
                              <Download className="h-4 w-4" />
                              <span>Export</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
                <p className="text-sm text-gray-600">Generate and export reports</p>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button 
                    onClick={() => handleExport('summary')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                  >
                    <BarChart3 className="h-8 w-8 text-blue-600 mb-2" />
                    <h3 className="font-medium text-gray-900">Summary Report</h3>
                    <p className="text-sm text-gray-600">High-level overview of all projects</p>
                  </button>
                  
                  <button 
                    onClick={() => handleExport('detailed')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                  >
                    <TrendingUp className="h-8 w-8 text-green-600 mb-2" />
                    <h3 className="font-medium text-gray-900">Detailed Report</h3>
                    <p className="text-sm text-gray-600">Comprehensive project breakdown</p>
                  </button>
                  
                  <button 
                    onClick={() => handleExport('monthly')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                  >
                    <Calendar className="h-8 w-8 text-purple-600 mb-2" />
                    <h3 className="font-medium text-gray-900">Monthly Report</h3>
                    <p className="text-sm text-gray-600">Monthly trends and analysis</p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}








