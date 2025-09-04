'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, Clock, DollarSign, CheckCircle, AlertCircle, Eye, MessageSquare } from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';

export default function ManagerContractorsPage() {
  const { appUser } = useAuth();
  const router = useRouter();

  // Sample team data
  const teamMembers = [
    {
      id: 'emp1',
      name: 'Mike Chen',
      initials: 'MC',
      department: 'Tech Infrastructure',
      hours: 26,
      expenses: 0,
      status: 'active',
      lastActive: '2 hours ago',
      utilization: 95,
      timeApprover: 'manager-demo'
    },
    {
      id: 'emp2',
      name: 'Sarah Johnson',
      initials: 'SJ',
      department: 'Software Development',
      hours: 37.5,
      expenses: 245.8,
      status: 'active',
      lastActive: '1 hour ago',
      utilization: 87,
      timeApprover: 'manager-demo'
    },
    {
      id: 'emp3',
      name: 'David Kim',
      initials: 'DK',
      department: 'Data Analysis',
      hours: 22,
      expenses: 156.3,
      status: 'active',
      lastActive: '4 hours ago',
      utilization: 78,
      timeApprover: 'manager2-demo'
    },
    {
      id: 'emp4',
      name: 'Lisa Garcia',
      initials: 'LG',
      department: 'Software Development',
      hours: 40,
      expenses: 0,
      status: 'active',
      lastActive: '30 minutes ago',
      utilization: 92,
      timeApprover: 'manager3-demo'
    }
  ];

  // Filter employees assigned to current manager
  const myTeam = teamMembers.filter(emp => emp.timeApprover === (appUser?.id || 'manager-demo'));

  const handleViewProfile = (employeeId: string) => {
    // Navigate to employee profile or timesheet
    router.push(`/manager/timesheets?employee=${employeeId}`);
  };

  const handleSendMessage = (employeeId: string) => {
    // In real implementation, this would open a messaging interface
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
              <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
              <p className="text-gray-600">ABC Corporation • Manage Your Team</p>
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
          {/* Team Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Team Size</p>
                  <p className="text-2xl font-bold text-gray-900">{myTeam.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Hours</p>
                  <p className="text-2xl font-bold text-gray-900">{myTeam.reduce((sum, emp) => sum + emp.hours, 0)}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Expenses</p>
                  <p className="text-2xl font-bold text-gray-900">${myTeam.reduce((sum, emp) => sum + emp.expenses, 0).toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Utilization</p>
                  <p className="text-2xl font-bold text-gray-900">{Math.round(myTeam.reduce((sum, emp) => sum + emp.utilization, 0) / myTeam.length)}%</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Team Members List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
              <p className="text-sm text-gray-600">Manage your direct reports and their assignments</p>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {myTeam.map((employee) => (
                  <div key={employee.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {employee.initials}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{employee.name}</h3>
                        <p className="text-sm text-gray-500">{employee.department}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-sm text-gray-600">{employee.hours} hrs this week</span>
                          {employee.expenses > 0 && (
                            <span className="text-sm text-gray-600">${employee.expenses} expenses</span>
                          )}
                          <span className="text-sm text-gray-600">{employee.utilization}% utilization</span>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-gray-500">Last active: {employee.lastActive}</span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            employee.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {employee.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleViewProfile(employee.id)}
                        className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors flex items-center space-x-2"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View Profile</span>
                      </button>
                      
                      <button
                        onClick={() => handleSendMessage(employee.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Message</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Team Performance Insights */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Insights</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Highest Utilization</span>
                  <span className="font-semibold text-green-600">
                    {myTeam.reduce((max, emp) => emp.utilization > max ? emp.utilization : max, 0)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Most Hours This Week</span>
                  <span className="font-semibold text-blue-600">
                    {myTeam.reduce((max, emp) => emp.hours > max ? emp.hours : max, 0)}h
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Pending Approvals</span>
                  <span className="font-semibold text-yellow-600">
                    {myTeam.filter(emp => emp.hours > 0 || emp.expenses > 0).length}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/manager/timesheets')}
                  className="w-full text-left p-3 bg-pink-50 border border-pink-200 rounded-lg hover:bg-pink-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-pink-600" />
                    <div>
                      <p className="font-medium text-pink-900">Review Timesheets</p>
                      <p className="text-sm text-pink-700">Approve pending time entries</p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => router.push('/manager/expenses')}
                  className="w-full text-left p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">Review Expenses</p>
                      <p className="text-sm text-blue-700">Approve pending expense reports</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
