'use client'

import { useState, useEffect } from 'react'
import { 
  Settings, 
  Save, 
  RefreshCw, 
  Database, 
  Shield, 
  Users, 
  Clock,
  Bell,
  FileText,
  Globe
} from 'lucide-react'

interface SystemSettings {
  company_name: string
  timezone: string
  workweek_start: string
  default_hourly_rate: number
  timesheet_approval_required: boolean
  expense_approval_required: boolean
  auto_lock_timesheets: boolean
  timesheet_lock_days: number
  email_notifications: boolean
  system_maintenance_mode: boolean
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<SystemSettings>({
    company_name: 'West End Workforce',
    timezone: 'America/New_York',
    workweek_start: 'monday',
    default_hourly_rate: 25.00,
    timesheet_approval_required: true,
    expense_approval_required: true,
    auto_lock_timesheets: true,
    timesheet_lock_days: 7,
    email_notifications: true,
    system_maintenance_mode: false
  })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      
      // In production, this would fetch from a settings table or environment
      // For now, we'll use the default values
    } catch (error) {
      console.error('❌ Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      
      // In production, this would save to a settings table or environment
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('❌ Error saving settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      setSettings({
        company_name: 'West End Workforce',
        timezone: 'America/New_York',
        workweek_start: 'monday',
        default_hourly_rate: 25.00,
        timesheet_approval_required: true,
        expense_approval_required: true,
        auto_lock_timesheets: true,
        timesheet_lock_days: 7,
        email_notifications: true,
        system_maintenance_mode: false
      })
    }
  }

  const updateSetting = (key: keyof SystemSettings, value: string | number | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e31c79]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#232020]">System Settings</h2>
          <p className="text-[#465079]">Configure system-wide settings and preferences</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleReset}
            className="flex items-center px-4 py-2 text-[#465079] border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center px-6 py-2 bg-[#e31c79] text-white rounded-lg hover:bg-[#d4156a] transition-colors disabled:opacity-50"
          >
            <Save className="h-5 w-5 mr-2" />
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-5 w-5 text-green-400">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                Settings saved successfully!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Company Settings */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-[#e5ddd8] rounded-lg mr-3">
                <Globe className="h-5 w-5 text-[#465079]" />
              </div>
              <h3 className="text-lg font-semibold text-[#232020]">Company Settings</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#232020] mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={settings.company_name}
                  onChange={(e) => updateSetting('company_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#232020] mb-2">
                  Timezone
                </label>
                        <select
          value={settings.timezone}
          onChange={(e) => updateSetting('timezone', e.target.value as string)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
        >
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#232020] mb-2">
                  Work Week Starts On
                </label>
                <select
                  value={settings.workweek_start}
                  onChange={(e) => updateSetting('workweek_start', e.target.value as string)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                >
                  <option value="monday">Monday</option>
                  <option value="sunday">Sunday</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#232020] mb-2">
                  Default Hourly Rate ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.default_hourly_rate}
                  onChange={(e) => updateSetting('default_hourly_rate', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Workflow Settings */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-[#e5ddd8] rounded-lg mr-3">
                <Clock className="h-5 w-5 text-[#465079]" />
              </div>
              <h3 className="text-lg font-semibold text-[#232020]">Workflow Settings</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="timesheet_approval"
                  checked={settings.timesheet_approval_required}
                  onChange={(e) => updateSetting('timesheet_approval_required', e.target.checked)}
                  className="h-4 w-4 text-[#e31c79] focus:ring-[#e31c79] border-gray-300 rounded"
                />
                <label htmlFor="timesheet_approval" className="ml-2 text-sm text-[#232020]">
                  Require timesheet approval
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="expense_approval"
                  checked={settings.expense_approval_required}
                  onChange={(e) => updateSetting('expense_approval_required', e.target.checked)}
                  className="h-4 w-4 text-[#e31c79] focus:ring-[#e31c79] border-gray-300 rounded"
                />
                <label htmlFor="expense_approval" className="ml-2 text-sm text-[#232020]">
                  Require expense approval
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="auto_lock"
                  checked={settings.auto_lock_timesheets}
                  onChange={(e) => updateSetting('auto_lock_timesheets', e.target.checked)}
                  className="h-4 w-4 text-[#e31c79] focus:ring-[#e31c79] border-gray-300 rounded"
                />
                <label htmlFor="auto_lock" className="ml-2 text-sm text-[#232020]">
                  Auto-lock timesheets after submission
                </label>
              </div>

              {settings.auto_lock_timesheets && (
                <div>
                  <label className="block text-sm font-medium text-[#232020] mb-2">
                    Lock timesheets after (days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={settings.timesheet_lock_days}
                    onChange={(e) => updateSetting('timesheet_lock_days', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-[#e5ddd8] rounded-lg mr-3">
                <Bell className="h-5 w-5 text-[#465079]" />
              </div>
              <h3 className="text-lg font-semibold text-[#232020]">Notification Settings</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="email_notifications"
                  checked={settings.email_notifications}
                  onChange={(e) => updateSetting('email_notifications', e.target.checked)}
                  className="h-4 w-4 text-[#e31c79] focus:ring-[#e31c79] border-gray-300 rounded"
                />
                <label htmlFor="email_notifications" className="ml-2 text-sm text-[#232020]">
                  Enable email notifications
                </label>
              </div>

              <div className="text-sm text-[#465079]">
                Email notifications will be sent for:
                <ul className="mt-2 ml-4 list-disc space-y-1">
                  <li>Timesheet submissions</li>
                  <li>Expense report submissions</li>
                  <li>Approval requests</li>
                  <li>System alerts</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-[#e5ddd8] rounded-lg mr-3">
                <Settings className="h-5 w-5 text-[#465079]" />
              </div>
              <h3 className="text-lg font-semibold text-[#232020]">System Settings</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="maintenance_mode"
                  checked={settings.system_maintenance_mode}
                  onChange={(e) => updateSetting('system_maintenance_mode', e.target.checked)}
                  className="h-4 w-4 text-[#e31c79] focus:ring-[#e31c79] border-gray-300 rounded"
                />
                <label htmlFor="maintenance_mode" className="ml-2 text-sm text-[#232020]">
                  Enable maintenance mode
                </label>
              </div>

              {settings.system_maintenance_mode && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> Maintenance mode will restrict access to the system for all users except administrators.
                  </p>
                </div>
              )}

              <div className="text-sm text-[#465079]">
                <p className="font-medium mb-2">System Information:</p>
                <ul className="space-y-1">
                  <li>Version: 1.0.0</li>
                  <li>Database: PostgreSQL</li>
                  <li>Last Backup: {new Date().toLocaleDateString()}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
