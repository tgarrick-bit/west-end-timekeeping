'use client';

import React, { useState } from 'react';
import { Mail, Send, TestTube, Settings, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { NOTIFICATION_TYPES, PRIORITIES } from '@/types/notifications';

interface EmailNotificationsProps {
  className?: string;
}

export default function EmailNotifications({ className = '' }: EmailNotificationsProps) {
  const { createNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [emailForm, setEmailForm] = useState<{
    to: string;
    subject: string;
    message: string;
    priority: string;
    type: string;
  }>({
    to: '',
    subject: '',
    message: '',
    priority: PRIORITIES.MEDIUM,
    type: NOTIFICATION_TYPES.DEADLINE_REMINDER
  });

  const handleTestEmail = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/notifications/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toEmail: 'tgarrick@westendworkforce.com',
          testType: 'configuration'
        }),
      });

      const result = await response.json();
      setTestResult(result);
      
      if (result.success) {
        // Create a success notification
        createNotification(
          NOTIFICATION_TYPES.SYSTEM_INTEGRATION,
          'admin-001', // Admin user ID
          undefined,
          'system',
          { 
            integration: 'Email Service', 
            status: 'Test Successful',
            message: result.message
          }
        );
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailForm.to || !emailForm.subject || !emailForm.message) {
      alert('Please fill in all required fields');
      return;
    }

    setSending(true);
    
    try {
      // Create a notification first
      const notification = createNotification(
        emailForm.type as any,
        'admin-001', // Admin user ID
        undefined,
        'system',
        {
          emailSubject: emailForm.subject,
          emailMessage: emailForm.message,
          recipient: emailForm.to
        }
      );

      // Send the email via API
      const response = await fetch('/api/notifications/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: emailForm.to,
          notification: notification,
          customData: {
            subject: emailForm.subject,
            message: emailForm.message,
            priority: emailForm.priority
          }
        }),
      });

      const success = response.ok;

      if (success) {
        alert('Email sent successfully!');
        setEmailForm({
          to: '',
          subject: '',
          message: '',
          priority: PRIORITIES.MEDIUM,
          type: NOTIFICATION_TYPES.DEADLINE_REMINDER
        });
        setIsOpen(false);
      } else {
        alert('Failed to send email. Please check the configuration.');
      }
    } catch (error) {
      alert(`Error sending email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSending(false);
    }
  };

  const emailTemplates = [
    {
      name: 'Timesheet Reminder',
      subject: 'Timesheet Submission Reminder',
      message: 'This is a friendly reminder to submit your timesheet for the current period. Please ensure all hours are accurately recorded and submitted by the deadline.',
      type: NOTIFICATION_TYPES.DEADLINE_REMINDER
    },
    {
      name: 'Expense Approval',
      subject: 'Expense Report Approved',
      message: 'Your expense report has been approved and will be processed for reimbursement. Thank you for your timely submission.',
      type: NOTIFICATION_TYPES.EXPENSE_APPROVED
    },
    {
      name: 'System Maintenance',
      subject: 'Scheduled System Maintenance',
      message: 'The West End Workforce system will be undergoing scheduled maintenance. Please save your work and expect some downtime.',
      type: NOTIFICATION_TYPES.SYSTEM_INTEGRATION
    },
    {
      name: 'Training Reminder',
      subject: 'Upcoming Training Session',
      message: 'You have a training session scheduled. Please review the materials and prepare any questions you may have.',
      type: NOTIFICATION_TYPES.TRAINING_REMINDER
    }
  ];

  const applyTemplate = (template: typeof emailTemplates[0]) => {
    setEmailForm({
      ...emailForm,
      subject: template.subject,
      message: template.message,
      type: template.type
    });
  };

  return (
    <div className={className}>
      {/* Email Notifications Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Email Notifications"
      >
        <Mail className="w-5 h-5" />
      </button>

      {/* Email Notifications Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Email Notifications</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Test Email Configuration */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Test Email Configuration</h4>
              <button
                onClick={handleTestEmail}
                disabled={testing}
                className={`w-full px-3 py-2 text-sm rounded-lg flex items-center justify-center space-x-2 ${
                  testing
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <TestTube className="w-4 h-4" />
                <span>{testing ? 'Testing...' : 'Test Email Service'}</span>
              </button>
              
              {testResult && (
                <div className={`mt-2 p-2 rounded-lg text-sm ${
                  testResult.success 
                    ? 'bg-green-50 text-green-800 border border-green-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  <div className="flex items-center space-x-2">
                    {testResult.success ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Email Templates */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Email Templates</h4>
              <div className="grid grid-cols-2 gap-2">
                {emailTemplates.map((template, index) => (
                  <button
                    key={index}
                    onClick={() => applyTemplate(template)}
                    className="p-2 text-xs text-left bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 transition-colors"
                  >
                    <div className="font-medium text-gray-900">{template.name}</div>
                    <div className="text-gray-600 truncate">{template.subject}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Send Custom Email */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Send Custom Email</h4>
              <form onSubmit={handleSendEmail} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    To Email
                  </label>
                  <input
                    type="email"
                    value={emailForm.to}
                    onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="recipient@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={emailForm.subject}
                    onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Email subject"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    value={emailForm.message}
                    onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Email message content"
                    required
                  />
                </div>

                <div className="flex space-x-2">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      value={emailForm.priority}
                      onChange={(e) => setEmailForm({ ...emailForm, priority: e.target.value as any })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={PRIORITIES.LOW}>Low</option>
                      <option value={PRIORITIES.MEDIUM}>Medium</option>
                      <option value={PRIORITIES.HIGH}>High</option>
                      <option value={PRIORITIES.CRITICAL}>Critical</option>
                    </select>
                  </div>

                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      value={emailForm.type}
                      onChange={(e) => setEmailForm({ ...emailForm, type: e.target.value as any })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={NOTIFICATION_TYPES.EMAIL_NOTIFICATION}>General</option>
                      <option value={NOTIFICATION_TYPES.DEADLINE_REMINDER}>Deadline Reminder</option>
                      <option value={NOTIFICATION_TYPES.SYSTEM_INTEGRATION}>System Update</option>
                      <option value={NOTIFICATION_TYPES.TRAINING_REMINDER}>Training</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className={`w-full px-3 py-2 text-sm rounded-lg flex items-center justify-center space-x-2 ${
                    sending
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span>{sending ? 'Sending...' : 'Send Email'}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">
                Email notifications are sent via SMTP
              </span>
              <button
                onClick={() => window.location.href = '/admin/settings'}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1"
              >
                <Settings className="w-3 h-3" />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
