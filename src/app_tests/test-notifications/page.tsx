'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Mail, 
  Send, 
  Settings, 
  TestTube, 
  Users, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { NOTIFICATION_TYPES, PRIORITIES } from '@/types/notifications';

export default function TestNotificationsPage() {
  const { notifications, createNotification, markAsRead, deleteNotification } = useNotifications();
  const [emailTestResult, setEmailTestResult] = useState<{
    success: boolean;
    message: string;
    type: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('tgarrick@westendworkforce.com');

  // Test notification creation
  const testNotification = (type: string, priority: string = PRIORITIES.MEDIUM) => {
    const notification = createNotification(
      type as any,
      'test-user',
      undefined,
      'system',
      {
        testNotification: true,
        timestamp: new Date().toISOString()
      }
    );

  };

  // Test email configuration
  const testEmailConfiguration = async () => {
    setIsLoading(true);
    setEmailTestResult(null);

    try {
      const response = await fetch('/api/notifications/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testType: 'configuration'
        }),
      });

      const result = await response.json();
      setEmailTestResult(result);
    } catch (error) {
      setEmailTestResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'configuration'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Test sending notification email
  const testNotificationEmail = async () => {
    if (!testEmail) {
      setEmailTestResult({
        success: false,
        message: 'Please enter an email address',
        type: 'notification'
      });
      return;
    }

    setIsLoading(true);
    setEmailTestResult(null);

    try {
      const response = await fetch('/api/notifications/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testType: 'notification',
          toEmail: testEmail
        }),
      });

      const result = await response.json();
      setEmailTestResult(result);
    } catch (error) {
      setEmailTestResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'notification'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Test bulk notifications
  const testBulkNotifications = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/notifications/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: NOTIFICATION_TYPES.SYSTEM_INTEGRATION,
          userIds: ['user1', 'user2', 'user3', 'user4', 'user5'],
          title: 'System Maintenance Notice',
          message: 'Scheduled system maintenance will occur tonight from 10 PM to 2 AM. Please save your work.',
          priority: PRIORITIES.HIGH,
          sendEmail: true,
          metadata: {
            maintenanceType: 'Scheduled',
            duration: '4 hours',
            impact: 'Minimal'
          }
        }),
      });

      const result = await response.json();
      alert(`Bulk notification sent to ${result.results.successful.length} users successfully!`);
    } catch (error) {
      console.error('Failed to send bulk notifications:', error);
      alert('Failed to send bulk notifications');
    } finally {
      setIsLoading(false);
    }
  };

  // Test cross-check notifications
  const testCrossCheckNotifications = () => {
    // Test timesheet approved but expenses pending
    createNotification(
      NOTIFICATION_TYPES.EXPENSES_PENDING_REMINDER,
      'emp1',
      undefined,
      'expense',
      {
        period: '2025-01-13',
        timesheetStatus: 'approved',
        pendingExpenses: 2
      }
    );

    // Test period completion
    createNotification(
      NOTIFICATION_TYPES.PERIOD_COMPLETE,
      'emp1',
      undefined,
      'timesheet',
      {
        period: '2025-01-13',
        timesheetStatus: 'approved',
        expensesStatus: 'approved'
      }
    );

  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <TestTube className="w-8 h-8 text-pink-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notification System Test Page</h1>
              <p className="text-gray-600">Test all notification system features and email integration</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="font-medium text-blue-800">Total Notifications</div>
              <div className="text-2xl font-bold text-blue-900">{notifications.length}</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="font-medium text-green-800">Unread</div>
              <div className="text-2xl font-bold text-green-900">
                {notifications.filter(n => !n.isRead).length}
              </div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <div className="font-medium text-orange-800">Critical</div>
              <div className="text-2xl font-bold text-orange-900">
                {notifications.filter(n => n.priority === PRIORITIES.CRITICAL).length}
              </div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="font-medium text-purple-800">High Priority</div>
              <div className="text-2xl font-bold text-purple-900">
                {notifications.filter(n => n.priority === PRIORITIES.HIGH).length}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notification Testing */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Bell className="w-5 h-5 text-pink-600" />
              <span>Test Notifications</span>
            </h2>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => testNotification(NOTIFICATION_TYPES.TIMESHEET_SUBMITTED, PRIORITIES.HIGH)}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Timesheet Submitted
                </button>
                <button
                  onClick={() => testNotification(NOTIFICATION_TYPES.EXPENSE_SUBMITTED, PRIORITIES.HIGH)}
                  className="px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Expense Submitted
                </button>
                <button
                  onClick={() => testNotification(NOTIFICATION_TYPES.TIMESHEET_OVERDUE, PRIORITIES.CRITICAL)}
                  className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Timesheet Overdue
                </button>
                <button
                  onClick={() => testNotification(NOTIFICATION_TYPES.PAYROLL_CUTOFF, PRIORITIES.HIGH)}
                  className="px-3 py-2 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
                >
                  Payroll Cutoff
                </button>
              </div>
              
              <button
                onClick={testCrossCheckNotifications}
                className="w-full px-3 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Test Cross-Check Logic
              </button>
              
              <button
                onClick={testBulkNotifications}
                disabled={isLoading}
                className="w-full px-3 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-300"
              >
                {isLoading ? 'Sending...' : 'Test Bulk Notifications'}
              </button>
            </div>
          </div>

          {/* Email Testing */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Mail className="w-5 h-5 text-pink-600" />
              <span>Test Email Service</span>
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Email Address
                </label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={testEmailConfiguration}
                  disabled={isLoading}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
                >
                  Test Configuration
                </button>
                <button
                  onClick={testNotificationEmail}
                  disabled={isLoading}
                  className="px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300"
                >
                  Test Email
                </button>
              </div>
              
              {emailTestResult && (
                <div className={`p-3 rounded-lg ${
                  emailTestResult.success 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center space-x-2">
                    {emailTestResult.success ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className={`text-sm font-medium ${
                      emailTestResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {emailTestResult.type === 'configuration' ? 'Configuration Test' : 'Email Test'}
                    </span>
                  </div>
                  <p className={`text-sm mt-1 ${
                    emailTestResult.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {emailTestResult.message}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notification List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Bell className="w-5 h-5 text-pink-600" />
            <span>Recent Test Notifications</span>
          </h2>
          
          <div className="space-y-3">
            {notifications
              .filter(n => n.metadata?.testNotification)
              .slice(0, 10)
              .map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border ${
                    !notification.isRead 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          notification.priority === PRIORITIES.CRITICAL ? 'bg-red-100 text-red-800' :
                          notification.priority === PRIORITIES.HIGH ? 'bg-orange-100 text-orange-800' :
                          notification.priority === PRIORITIES.MEDIUM ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {notification.priority}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </span>
                        {!notification.isRead && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                          title="Mark as read"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            
            {notifications.filter(n => n.metadata?.testNotification).length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No test notifications yet. Create some using the buttons above!</p>
              </div>
            )}
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Settings className="w-5 h-5 text-pink-600" />
            <span>System Status</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Mail className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-800">Email Service</span>
              </div>
              <p className="text-sm text-blue-700">
                {emailTestResult?.success ? '✅ Configured' : '❌ Not Tested'}
              </p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Bell className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">Notification Service</span>
              </div>
              <p className="text-sm text-green-700">✅ Active</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-purple-800">Scheduler</span>
              </div>
              <p className="text-sm text-purple-700">✅ Running</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
