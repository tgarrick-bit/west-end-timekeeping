'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, CheckCircle, XCircle, Clock, ArrowLeft, Eye, Download } from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface ApprovalItem {
  id: string;
  type: 'timesheet' | 'expense';
  employeeName: string;
  project: string;
  amount?: number;
  hours?: number;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
  description: string;
}

export default function ApprovalsPage() {
  const router = useRouter();
  const [approvals, setApprovals] = useState<ApprovalItem[]>([
    {
      id: '1',
      type: 'timesheet',
      employeeName: 'John Smith',
      project: 'Metro Hospital',
      hours: 40,
      date: '2025-01-15',
      status: 'pending',
      description: 'Weekly timesheet for Metro Hospital project'
    },
    {
      id: '2',
      type: 'expense',
      employeeName: 'Sarah Johnson',
      project: 'Downtown Office',
      amount: 245.50,
      date: '2025-01-14',
      status: 'pending',
      description: 'Office supplies and client lunch expenses'
    },
    {
      id: '3',
      type: 'timesheet',
      employeeName: 'Mike Chen',
      project: 'City Schools',
      hours: 38.5,
      date: '2025-01-13',
      status: 'approved',
      description: 'Weekly timesheet for City Schools project'
    }
  ]);

  const handleApprove = (id: string) => {
    setApprovals(prev => prev.map(item => 
      item.id === id ? { ...item, status: 'approved' as const } : item
    ));
  };

  const handleReject = (id: string) => {
    setApprovals(prev => prev.map(item => 
      item.id === id ? { ...item, status: 'rejected' as const } : item
    ));
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const pendingApprovals = approvals.filter(item => item.status === 'pending');
  const approvedItems = approvals.filter(item => item.status === 'approved');
  const rejectedItems = approvals.filter(item => item.status === 'rejected');

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
                <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
                <p className="text-gray-600">Review and approve timesheets and expenses</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-lg font-bold text-yellow-600">{pendingApprovals.length}</p>
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-gray-900">{pendingApprovals.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Approved</p>
                    <p className="text-2xl font-bold text-gray-900">{approvedItems.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-red-100 rounded-lg">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Rejected</p>
                    <p className="text-2xl font-bold text-gray-900">{rejectedItems.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pending Approvals */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Pending Approvals</h2>
                <p className="text-sm text-gray-600">Review and approve pending submissions</p>
              </div>
              
              <div className="p-6">
                {pendingApprovals.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">All Caught Up!</h3>
                    <p className="text-gray-600">No pending approvals at this time.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingApprovals.map((item) => (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <FileText className="h-5 w-5 text-blue-600" />
                              <span className="text-sm font-medium text-gray-500 uppercase">
                                {item.type}
                              </span>
                              {getStatusBadge(item.status)}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <p className="text-sm text-gray-500">Employee</p>
                                <p className="font-medium text-gray-900">{item.employeeName}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Project</p>
                                <p className="font-medium text-gray-900">{item.project}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Date</p>
                                <p className="font-medium text-gray-900">{item.date}</p>
                              </div>
                            </div>
                            
                            {item.type === 'timesheet' && (
                              <div className="mt-2">
                                <p className="text-sm text-gray-500">Hours</p>
                                <p className="font-medium text-gray-900">{item.hours} hours</p>
                              </div>
                            )}
                            
                            {item.type === 'expense' && (
                              <div className="mt-2">
                                <p className="text-sm text-gray-500">Amount</p>
                                <p className="font-medium text-gray-900">${item.amount?.toFixed(2)}</p>
                              </div>
                            )}
                            
                            <div className="mt-2">
                              <p className="text-sm text-gray-500">Description</p>
                              <p className="text-gray-900">{item.description}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3 ml-6">
                            <button
                              onClick={() => handleApprove(item.id)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleReject(item.id)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>Reject</span>
                            </button>
                            <button className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  {approvals.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {item.employeeName} - {item.type} for {item.project}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        {getStatusBadge(item.status)}
                        <span className="text-sm text-gray-500">{item.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}








