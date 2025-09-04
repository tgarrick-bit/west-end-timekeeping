'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import NotificationSettings from '@/components/notifications/NotificationSettings';

export default function NotificationSettingsPage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute allowedRoles={['admin', 'manager', 'employee']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900">Notification Settings</h1>
            <p className="text-gray-600">Customize how and when you receive notifications</p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-6 py-8">
          <NotificationSettings />
        </div>
      </div>
    </ProtectedRoute>
  );
}
