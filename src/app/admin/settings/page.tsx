'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import RoleGuard from '@/components/auth/RoleGuard';
import { 
  Settings, Globe, Clock, CreditCard, Receipt, 
  FileText, Users, Save, ChevronLeft, Bell,
  Link, AlertCircle, Check, X, Plus, Trash2,
  Building2, Calendar, DollarSign
} from 'lucide-react';

interface CompanySettings {
  // Global
  timezone: string;
  currency: string;
  hide_company_name: boolean;
  allowed_entry_date: string | null;
  
  // Defaults
  email_notifications: boolean;
  logout_timeout_minutes: number;
  use_user_rates: boolean;
  use_user_reps: boolean;
  use_tasks: boolean;
  use_attachments: boolean;
  
  // Time Settings
  time_enabled: boolean;
  allow_new_time_after_approval: boolean;
  changes_require_reason: boolean;
  effective_date: string;
  time_accrual_display: string;
  time_cycle: string;
  use_time_in_out: boolean;
  use_clock_in_out: boolean;
  ot_day_hours: number | null;
  ot_week_hours: number;
  dt_day_hours: number | null;
  time_increment_minutes: number;
  
  // Expense Settings
  expense_enabled: boolean;
  expense_foreign_currencies: boolean;
  expense_payment_memo: string;
  
  // Integration Settings
  quickbooks_enabled: boolean;
  quickbooks_config: any;
  tracker_rms_enabled: boolean;
  tracker_rms_api_key: string;
  tracker_rms_config: any;
}

interface Approver {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

const TABS = [
  { id: 'global', label: 'Global Settings', icon: Globe },
  { id: 'defaults', label: 'Defaults', icon: Settings },
  { id: 'time', label: 'Time & Attendance', icon: Clock },
  { id: 'expense', label: 'Expense', icon: Receipt },
  { id: 'approvers', label: 'Approvers', icon: Users },
  { id: 'integrations', label: 'Integrations', icon: Link },
];

const TIMEZONES = [
  { value: 'Eastern', label: 'Eastern Time (ET)' },
  { value: 'Central', label: 'Central Time (CT)' },
  { value: 'Mountain', label: 'Mountain Time (MT)' },
  { value: 'Pacific', label: 'Pacific Time (PT)' },
];

const CURRENCIES = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
];

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('global');
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [timeApprovers, setTimeApprovers] = useState<Approver[]>([]);
  const [expenseApprovers, setExpenseApprovers] = useState<Approver[]>([]);
  const [availableApprovers, setAvailableApprovers] = useState<Approver[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    loadSettings();
    loadApprovers();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .single();

      if (data) {
        setSettings(data);
      } else {
        // Initialize with defaults if no settings exist
        const defaultSettings: CompanySettings = {
          timezone: 'Central',
          currency: 'USD',
          hide_company_name: false,
          allowed_entry_date: null,
          email_notifications: true,
          logout_timeout_minutes: 60,
          use_user_rates: false,
          use_user_reps: false,
          use_tasks: false,
          use_attachments: true,
          time_enabled: true,
          allow_new_time_after_approval: false,
          changes_require_reason: false,
          effective_date: new Date().toISOString().split('T')[0],
          time_accrual_display: 'Hours',
          time_cycle: 'Weekly',
          use_time_in_out: false,
          use_clock_in_out: false,
          ot_day_hours: null,
          ot_week_hours: 40,
          dt_day_hours: null,
          time_increment_minutes: 15,
          expense_enabled: true,
          expense_foreign_currencies: false,
          expense_payment_memo: '',
          quickbooks_enabled: false,
          quickbooks_config: {},
          tracker_rms_enabled: false,
          tracker_rms_api_key: '',
          tracker_rms_config: {}
        };
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadApprovers = async () => {
    try {
      // Load all employees who can be approvers (managers and admins)
      const { data: employees } = await supabase
        .from('employees')
        .select('id, email, first_name, last_name')
        .in('role', ['admin', 'manager', 'time_approver'])
        .eq('is_active', true);
  
      setAvailableApprovers(employees || []);
  
      // Load current time approvers
      const { data: timeApprovalSettings } = await supabase
        .from('approval_settings')
        .select(`
          *,
          additional_approvers (
            approver_id,
            is_active,
            employees:approver_id (
              id,
              email,
              first_name,
              last_name
            )
          )
        `)
        .eq('type', 'time')
        .single();
  
      if (timeApprovalSettings?.additional_approvers) {
        const timeApproversList = timeApprovalSettings.additional_approvers
          .filter((a: any) => a.is_active && a.employees)
          .map((a: any) => ({
            id: a.employees.id,
            email: a.employees.email,
            first_name: a.employees.first_name,
            last_name: a.employees.last_name
          }));
        setTimeApprovers(timeApproversList);
      }
  
      // Load current expense approvers
      const { data: expenseApprovalSettings } = await supabase
        .from('approval_settings')
        .select(`
          *,
          additional_approvers (
            approver_id,
            is_active,
            employees:approver_id (
              id,
              email,
              first_name,
              last_name
            )
          )
        `)
        .eq('type', 'expense')
        .single();
  
      if (expenseApprovalSettings?.additional_approvers) {
        const expenseApproversList = expenseApprovalSettings.additional_approvers
          .filter((a: any) => a.is_active && a.employees)
          .map((a: any) => ({
            id: a.employees.id,
            email: a.employees.email,
            first_name: a.employees.first_name,
            last_name: a.employees.last_name
          }));
        setExpenseApprovers(expenseApproversList);
      }
    } catch (error) {
      console.error('Error loading approvers:', error);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    
    setSaving(true);
    setSaveMessage('');
    
    try {
      const { error } = await supabase
        .from('company_settings')
        .upsert(settings);

      if (error) throw error;
      
      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addApprover = async (type: 'time' | 'expense', approverId: string) => {
    try {
      // First get or create approval_settings record
      const { data: approvalSetting } = await supabase
        .from('approval_settings')
        .select('id')
        .eq('type', type)
        .single();

      let settingId = approvalSetting?.id;
      
      if (!settingId) {
        const { data: newSetting } = await supabase
          .from('approval_settings')
          .insert({ type, use_additional_approvers: true })
          .select('id')
          .single();
        
        settingId = newSetting?.id;
      }

      // Add the approver
      await supabase
        .from('additional_approvers')
        .insert({
          approval_setting_id: settingId,
          approver_id: approverId,
          is_active: true
        });

      // Reload approvers
      loadApprovers();
    } catch (error) {
      console.error('Error adding approver:', error);
    }
  };

  const removeApprover = async (type: 'time' | 'expense', approverId: string) => {
    try {
      // Optional: Add confirmation dialog
      const approverName = type === 'time' 
        ? timeApprovers.find(a => a.id === approverId)
        : expenseApprovers.find(a => a.id === approverId);
      
      if (!confirm(`Remove ${approverName?.first_name} ${approverName?.last_name} as ${type} approver?`)) {
        return;
      }
  
      // Get the approval setting ID
      const { data: approvalSetting, error: fetchError } = await supabase
        .from('approval_settings')
        .select('id')
        .eq('type', type)
        .single();
  
      if (fetchError) {
        console.error('Error fetching approval setting:', fetchError);
        setSaveMessage(`Error removing approver. Please try again.`);
        setTimeout(() => setSaveMessage(''), 3000);
        return;
      }
  
      if (approvalSetting?.id) {
        const { error: deleteError } = await supabase
          .from('additional_approvers')
          .delete()
          .eq('approval_setting_id', approvalSetting.id)
          .eq('approver_id', approverId);
  
        if (deleteError) {
          console.error('Error deleting approver:', deleteError);
          setSaveMessage(`Error removing approver. Please try again.`);
          setTimeout(() => setSaveMessage(''), 3000);
          return;
        }
        
        // Update local state immediately for better UX
        if (type === 'time') {
          setTimeApprovers(prev => prev.filter(a => a.id !== approverId));
        } else {
          setExpenseApprovers(prev => prev.filter(a => a.id !== approverId));
        }
        
        // Still reload to ensure sync, but debounce it slightly
        setTimeout(() => {
          loadApprovers();
        }, 500);
        
        setSaveMessage(`Approver removed successfully!`);
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error removing approver:', error);
      setSaveMessage(`Error removing approver. Please try again.`);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const updateSetting = (field: keyof CompanySettings, value: any) => {
    if (settings) {
      setSettings({ ...settings, [field]: value });
    }
  };

  if (loading || !settings) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gray-900 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/admin')}
                  className="text-gray-400 hover:text-white"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-xl font-semibold text-white">System Settings</h1>
                  <p className="text-xs text-gray-400">Configure West End Workforce</p>
                </div>
              </div>
              <button
                onClick={saveSettings}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Save Message */}
          {saveMessage && (
            <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
              saveMessage.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
            }`}>
              {saveMessage.includes('Error') ? (
                <X className="h-4 w-4" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {saveMessage}
            </div>
          )}

          <div className="flex gap-6">
            {/* Sidebar Tabs */}
            <div className="w-64 space-y-1">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white shadow-sm text-blue-600 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-white rounded-lg shadow-sm p-6">
              {/* Global Settings Tab */}
              {activeTab === 'global' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Global Settings</h2>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Time Zone
                      </label>
                      <select
                        value={settings.timezone}
                        onChange={(e) => updateSetting('timezone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      >
                        {TIMEZONES.map(tz => (
                          <option key={tz.value} value={tz.value}>{tz.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Currency
                      </label>
                      <select
                        value={settings.currency}
                        onChange={(e) => updateSetting('currency', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      >
                        {CURRENCIES.map(curr => (
                          <option key={curr.value} value={curr.value}>{curr.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Allowed Entry Date
                      <span className="text-xs text-gray-500 ml-2">(locks all previous dates)</span>
                    </label>
                    <input
                      type="date"
                      value={settings.allowed_entry_date || ''}
                      onChange={(e) => updateSetting('allowed_entry_date', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="hide_company"
                      checked={settings.hide_company_name}
                      onChange={(e) => updateSetting('hide_company_name', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="hide_company" className="text-sm text-gray-700">
                      Hide Company Name
                    </label>
                  </div>
                </div>
              )}

              {/* Defaults Tab */}
              {activeTab === 'defaults' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Default Settings</h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label htmlFor="email_notif" className="text-sm font-medium text-gray-700">
                        Email Notifications Active
                      </label>
                      <input
                        type="checkbox"
                        id="email_notif"
                        checked={settings.email_notifications}
                        onChange={(e) => updateSetting('email_notifications', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Logout Timeout (minutes)
                      </label>
                      <input
                        type="number"
                        value={settings.logout_timeout_minutes}
                        onChange={(e) => updateSetting('logout_timeout_minutes', parseInt(e.target.value))}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-3 pt-4 border-t">
                      <h3 className="text-sm font-semibold text-gray-700">Feature Settings</h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={settings.use_user_rates}
                            onChange={(e) => updateSetting('use_user_rates', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">Use User Rates</span>
                        </label>

                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={settings.use_user_reps}
                            onChange={(e) => updateSetting('use_user_reps', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">Use User Reps</span>
                        </label>

                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={settings.use_tasks}
                            onChange={(e) => updateSetting('use_tasks', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">Use Tasks</span>
                        </label>

                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={settings.use_attachments}
                            onChange={(e) => updateSetting('use_attachments', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">Use Attachments</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Time Tab */}
              {activeTab === 'time' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Time & Attendance Settings</h2>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.time_enabled}
                        onChange={(e) => updateSetting('time_enabled', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Enable Time Module</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        List Entry Time Cycle
                      </label>
                      <select
                        value={settings.time_cycle}
                        onChange={(e) => updateSetting('time_cycle', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="Weekly">Weekly</option>
                        <option value="Bi-Weekly">Bi-Weekly</option>
                        <option value="Semi-Monthly">Semi-Monthly</option>
                        <option value="Monthly">Monthly</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Accrual Display
                      </label>
                      <select
                        value={settings.time_accrual_display}
                        onChange={(e) => updateSetting('time_accrual_display', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="Hours">Hours</option>
                        <option value="Days">Days</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        OT Day Hours
                      </label>
                      <input
                        type="number"
                        value={settings.ot_day_hours || ''}
                        onChange={(e) => updateSetting('ot_day_hours', e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="Optional"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        OT Week Hours
                      </label>
                      <input
                        type="number"
                        value={settings.ot_week_hours}
                        onChange={(e) => updateSetting('ot_week_hours', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        DT Day Hours
                      </label>
                      <input
                        type="number"
                        value={settings.dt_day_hours || ''}
                        onChange={(e) => updateSetting('dt_day_hours', e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="Optional"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time Increment (Minutes)
                    </label>
                    <select
                      value={settings.time_increment_minutes}
                      onChange={(e) => updateSetting('time_increment_minutes', parseInt(e.target.value))}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="1">1</option>
                      <option value="5">5</option>
                      <option value="6">6</option>
                      <option value="10">10</option>
                      <option value="15">15</option>
                      <option value="30">30</option>
                    </select>
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.allow_new_time_after_approval}
                        onChange={(e) => updateSetting('allow_new_time_after_approval', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Allow new time after approval</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.changes_require_reason}
                        onChange={(e) => updateSetting('changes_require_reason', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Changes Require a Reason (DCAA)</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.use_time_in_out}
                        onChange={(e) => updateSetting('use_time_in_out', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Use Time In/Out</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.use_clock_in_out}
                        onChange={(e) => updateSetting('use_clock_in_out', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Use Clock In/Out</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Expense Tab */}
              {activeTab === 'expense' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Expense Settings</h2>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.expense_enabled}
                        onChange={(e) => updateSetting('expense_enabled', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Enable Expense Module</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 mb-4">
                      <input
                        type="checkbox"
                        checked={settings.expense_foreign_currencies}
                        onChange={(e) => updateSetting('expense_foreign_currencies', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Use Foreign Currencies</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Memo
                    </label>
                    <textarea
                      value={settings.expense_payment_memo}
                      onChange={(e) => updateSetting('expense_payment_memo', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Default payment memo for expense reports..."
                    />
                  </div>
                </div>
              )}

              {/* Approvers Tab */}
              {activeTab === 'approvers' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Enterprise Time Approvers</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Additional Time Approvers
                        </label>
                        <div className="space-y-2">
                          {timeApprovers.map(approver => (
                            <div key={approver.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {approver.first_name} {approver.last_name}
                                </p>
                                <p className="text-xs text-gray-500">{approver.email}</p>
                              </div>
                              <button
                                onClick={() => removeApprover('time', approver.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                        
                        <div className="mt-3 flex gap-2">
                          <select
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            onChange={(e) => {
                              if (e.target.value) {
                                addApprover('time', e.target.value);
                                e.target.value = '';
                              }
                            }}
                          >
                            <option value="">Add Time Approver...</option>
                            {availableApprovers
                              .filter(a => !timeApprovers.find(ta => ta.id === a.id))
                              .map(approver => (
                                <option key={approver.id} value={approver.id}>
                                  {approver.first_name} {approver.last_name} ({approver.email})
                                </option>
                              ))
                            }
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Enterprise Expense Approvers</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Additional Expense Approvers
                        </label>
                        <div className="space-y-2">
                          {expenseApprovers.map(approver => (
                            <div key={approver.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {approver.first_name} {approver.last_name}
                                </p>
                                <p className="text-xs text-gray-500">{approver.email}</p>
                              </div>
                              <button
                                onClick={() => removeApprover('expense', approver.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                        
                        <div className="mt-3 flex gap-2">
                          <select
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            onChange={(e) => {
                              if (e.target.value) {
                                addApprover('expense', e.target.value);
                                e.target.value = '';
                              }
                            }}
                          >
                            <option value="">Add Expense Approver...</option>
                            {availableApprovers
                              .filter(a => !expenseApprovers.find(ea => ea.id === a.id))
                              .map(approver => (
                                <option key={approver.id} value={approver.id}>
                                  {approver.first_name} {approver.last_name} ({approver.email})
                                </option>
                              ))
                            }
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Integrations Tab */}
              {activeTab === 'integrations' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">System Integrations</h2>
                    
                    {/* QuickBooks Integration */}
                    <div className="border rounded-lg p-6 space-y-4 mb-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">QuickBooks Online</h3>
                            <p className="text-sm text-gray-500">Sync timesheets and expenses</p>
                          </div>
                        </div>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={settings.quickbooks_enabled}
                            onChange={(e) => updateSetting('quickbooks_enabled', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-700">Enable</span>
                        </label>
                      </div>
                      
                      {settings.quickbooks_enabled && (
                        <div className="pt-4 border-t space-y-4">
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <div className="flex gap-2">
                              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                              <p className="text-sm text-yellow-800">
                                QuickBooks integration requires API credentials. Contact support for setup assistance.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Tracker RMS Integration */}
                    <div className="border rounded-lg p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">Tracker RMS</h3>
                            <p className="text-sm text-gray-500">Applicant Tracking System integration</p>
                          </div>
                        </div>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={settings.tracker_rms_enabled}
                            onChange={(e) => updateSetting('tracker_rms_enabled', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-700">Enable</span>
                        </label>
                      </div>
                      
                      {settings.tracker_rms_enabled && (
                        <div className="pt-4 border-t space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              API Key
                            </label>
                            <input
                              type="password"
                              value={settings.tracker_rms_api_key}
                              onChange={(e) => updateSetting('tracker_rms_api_key', e.target.value)}
                              placeholder="Enter your Tracker RMS API key"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex gap-2">
                              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                              <div className="text-sm text-blue-800">
                                <p className="font-medium mb-1">Integration Features:</p>
                                <ul className="list-disc list-inside space-y-1">
                                  <li>Auto-sync candidate placements to employees</li>
                                  <li>Import timesheet data to Tracker</li>
                                  <li>Sync client and project information</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}