'use client';

import React, { useState } from 'react';
import { Bell, Mail, Clock, Moon, Sun, Save, X } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { NotificationPreferences } from '@/types/notifications';

export default function NotificationSettings() {
  const { preferences, updatePreferences } = useNotifications();
  const [localPreferences, setLocalPreferences] = useState<NotificationPreferences>(preferences);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePreferenceChange = (key: keyof NotificationPreferences, value: any) => {
    setLocalPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleQuietHoursChange = (key: 'start' | 'end' | 'enabled', value: any) => {
    setLocalPreferences(prev => ({
      ...prev,
      quietHours: {
        ...prev.quietHours!,
        [key]: value
      }
    }));
  };

  // Save preferences
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePreferences(localPreferences);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = () => {
    setLocalPreferences(preferences);
  };

  // Check if preferences have changed
  const hasChanges = JSON.stringify(localPreferences) !== JSON.stringify(preferences);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bell className="w-6 h-6 text-pink-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Notification Settings</h2>
              <p className="text-sm text-gray-600">Customize how and when you receive notifications</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {hasChanges && (
              <button
                onClick={handleReset}
                className="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Reset
              </button>
            )}
            
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="px-4 py-2 text-sm bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {showSaved && (
        <div className="px-6 py-3 bg-green-50 border-b border-green-200">
          <div className="flex items-center space-x-2 text-green-800">
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">Preferences saved successfully!</span>
          </div>
        </div>
      )}

      <div className="p-6 space-y-8">
        {/* Notification Channels */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Channels</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email Notifications */}
            <div className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg">
              <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Email Notifications</h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localPreferences.email}
                      onChange={(e) => handlePreferenceChange('email', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                  </label>
                </div>
                <p className="text-sm text-gray-600">
                  Receive important notifications via email
                </p>
              </div>
            </div>

            {/* Browser Notifications */}
            <div className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg">
              <Bell className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Browser Notifications</h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localPreferences.browser}
                      onChange={(e) => handlePreferenceChange('browser', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                  </label>
                </div>
                <p className="text-sm text-gray-600">
                  Show notifications in your browser
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Types */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Types</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Timesheets */}
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-900">Timesheets</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localPreferences.timesheets}
                  onChange={(e) => handlePreferenceChange('timesheets', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600"></div>
              </label>
            </div>

            {/* Expenses */}
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-900">Expenses</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localPreferences.expenses}
                  onChange={(e) => handlePreferenceChange('expenses', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600"></div>
              </label>
            </div>

            {/* Deadlines */}
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-900">Deadlines</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localPreferences.deadlines}
                  onChange={(e) => handlePreferenceChange('deadlines', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600"></div>
              </label>
            </div>

            {/* System */}
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-900">System</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localPreferences.system}
                  onChange={(e) => handlePreferenceChange('system', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Frequency */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Frequency</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { value: 'immediate', label: 'Immediate', description: 'Receive notifications as they happen' },
              { value: 'daily', label: 'Daily Digest', description: 'Get a summary once per day' },
              { value: 'weekly', label: 'Weekly Digest', description: 'Get a summary once per week' }
            ].map((option) => (
              <label key={option.value} className="relative flex cursor-pointer rounded-lg border border-gray-200 p-4 focus:outline-none">
                <input
                  type="radio"
                  name="frequency"
                  value={option.value}
                  checked={localPreferences.frequency === option.value}
                  onChange={(e) => handlePreferenceChange('frequency', e.target.value)}
                  className="sr-only"
                />
                <div className={`flex flex-1 ${localPreferences.frequency === option.value ? 'border-pink-500 ring-2 ring-pink-500' : 'border-gray-300'}`}>
                  <div className="flex flex-col">
                    <span className={`block text-sm font-medium ${
                      localPreferences.frequency === option.value ? 'text-pink-900' : 'text-gray-900'
                    }`}>
                      {option.label}
                    </span>
                    <span className={`block text-sm ${
                      localPreferences.frequency === option.value ? 'text-pink-700' : 'text-gray-500'
                    }`}>
                      {option.description}
                    </span>
                  </div>
                </div>
                <div className={`ml-3 flex h-5 w-5 items-center justify-center ${
                  localPreferences.frequency === option.value ? 'text-pink-500' : 'text-gray-400'
                }`}>
                  {localPreferences.frequency === option.value && (
                    <Check className="w-4 h-4" />
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Quiet Hours */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quiet Hours</h3>
          <div className="space-y-4">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Moon className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Enable quiet hours</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localPreferences.quietHours?.enabled || false}
                  onChange={(e) => handleQuietHoursChange('enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
              </label>
            </div>

            {/* Time Range */}
            {localPreferences.quietHours?.enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                  <input
                    type="time"
                    value={localPreferences.quietHours?.start || '22:00'}
                    onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                  <input
                    type="time"
                    value={localPreferences.quietHours?.end || '08:00'}
                    onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            <p className="text-sm text-gray-600">
              During quiet hours, you'll only receive critical notifications unless you've set frequency to daily/weekly.
            </p>
          </div>
        </div>

        {/* Preview */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Preview</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">Current Settings Summary</span>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600">
              <p>• {localPreferences.email ? 'Email' : 'No email'} notifications</p>
              <p>• {localPreferences.browser ? 'Browser' : 'No browser'} notifications</p>
              <p>• {localPreferences.frequency} frequency</p>
              {localPreferences.quietHours?.enabled && (
                <p>• Quiet hours: {localPreferences.quietHours.start} - {localPreferences.quietHours.end}</p>
              )}
              <p>• Types: {[
                localPreferences.timesheets && 'Timesheets',
                localPreferences.expenses && 'Expenses',
                localPreferences.deadlines && 'Deadlines',
                localPreferences.system && 'System'
              ].filter(Boolean).join(', ')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add Check icon component
const Check = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);
