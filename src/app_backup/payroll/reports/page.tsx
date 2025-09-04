'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, TrendingUp, Download, ArrowLeft, Calendar, DollarSign, Clock, Users, FileText } from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface PayrollData {
  totalEmployees: number;
  totalHours: number;
  totalExpenses: number;
  totalPayroll: number;
  pendingApprovals: number;
  monthlyTrend: { month: string; hours: number; payroll: number }[];
  topEmployees: { name: string; hours: number; payroll: number }[];
}

export default function PayrollReportsPage() {
  const router = useRouter();
  const [payrollData] = useState<PayrollData>({
    totalEmployees: 47,
    totalHours: 8947,
    totalExpenses: 15678.45,
    totalPayroll: 456789.23,
    pendingApprovals: 8,
    monthlyTrend: [
      { month: 'Jan', hours: 1840, payroll: 45600 },
      { month: 'Feb', hours: 1920, payroll: 47800 },
      { month: 'Mar', hours: 1880, payroll: 46700 },
      { month: 'Apr', hours: 1960, payroll: 48900 },
      { month: 'May', hours: 2000, payroll: 49800 },
      { month: 'Jun', hours: 1940, payroll: 48300 }
    ],
    topEmployees: [
      { name: 'Mike Chen', hours: 320, payroll: 30400 },
      { name: 'Sarah Johnson', hours: 298, payroll: 28310 },
      { name: 'David Thompson', hours: 285, payroll: 27075 },
      { name: 'Lisa Rodriguez', hours: 276, payroll: 26220 }
    ]
  });

  const handleExport = (type: 'payroll' | 'timesheets' | 'expenses' | 'summary') => {
    // In a real app, this would generate and download the report
    alert(`${type} report exported successfully!`);
  };

  return (
    <ProtectedRoute allowedRoles={['payroll']}>
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
                <h1 className="text-2xl font-bold text-gray-900">Payroll Reports</h1>
                <p className="text-gray-600">View and export payroll reports and analytics</p>
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
                onClick={() => handleExport('payroll')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Export Payroll</span>
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
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Employees</p>
                    <p className="text-2xl font-bold text-gray-900">{payrollData.totalEmployees}</p>
                    <p className="text-xs text-gray-500">Active this month</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Clock className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Hours</p>
                    <p className="text-2xl font-bold text-gray-900">{payrollData.totalHours}</p>
                    <p className="text-xs text-gray-500">This month</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Payroll</p>
                    <p className="text-2xl font-bold text-gray-900">${(payrollData.totalPayroll / 1000).toFixed(1)}k</p>
                    <p className="text-xs text-gray-500">This month</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <FileText className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-gray-900">{payrollData.pendingApprovals}</p>
                    <p className="text-xs text-gray-500">Approvals needed</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly Trend Chart */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Monthly Trends</h2>
                <p className="text-sm text-gray-600">Hours and payroll over the last 6 months</p>
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
                      {payrollData.monthlyTrend.map((item) => (
                        <div key={item.month} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{item.month}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${(item.hours / 2500) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-900 w-16 text-right">
                              {item.hours}h
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Payroll Trend */}
                  <div>
                    <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                      <DollarSign className="h-4 w-4 mr-2 text-green-600" />
                      Payroll Trend
                    </h3>
                    <div className="space-y-3">
                      {payrollData.monthlyTrend.map((item) => (
                        <div key={item.month} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{item.month}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full" 
                                style={{ width: `${(item.payroll / 60000) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-900 w-20 text-right">
                              ${(item.payroll / 1000).toFixed(1)}k
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Employees */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Top Employees</h2>
                <p className="text-sm text-gray-600">Employees with highest hours and payroll</p>
              </div>
              
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Employee
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Hours
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Payroll
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payrollData.topEmployees.map((employee) => (
                        <tr key={employee.name} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{employee.hours} hours</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">${employee.payroll.toFixed(2)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button 
                              onClick={() => handleExport('payroll')}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button 
                    onClick={() => handleExport('summary')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                  >
                    <BarChart3 className="h-8 w-8 text-blue-600 mb-2" />
                    <h3 className="font-medium text-gray-900">Summary Report</h3>
                    <p className="text-sm text-gray-600">High-level payroll overview</p>
                  </button>
                  
                  <button 
                    onClick={() => handleExport('payroll')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                  >
                    <DollarSign className="h-8 w-8 text-green-600 mb-2" />
                    <h3 className="font-medium text-gray-900">Payroll Report</h3>
                    <p className="text-sm text-gray-600">Detailed payroll breakdown</p>
                  </button>
                  
                  <button 
                    onClick={() => handleExport('timesheets')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                  >
                    <Clock className="h-8 w-8 text-purple-600 mb-2" />
                    <h3 className="font-medium text-gray-900">Timesheet Report</h3>
                    <p className="text-sm text-gray-600">Employee time tracking</p>
                  </button>
                  
                  <button 
                    onClick={() => handleExport('expenses')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                  >
                    <FileText className="h-8 w-8 text-orange-600 mb-2" />
                    <h3 className="font-medium text-gray-900">Expense Report</h3>
                    <p className="text-sm text-gray-600">Expense reimbursements</p>
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
