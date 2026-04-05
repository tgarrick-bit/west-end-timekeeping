'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  Settings, Globe, Clock, CreditCard, Receipt,
  FileText, Users, Save, Bell,
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

  // Pay Period Settings
  pay_period_type: string;
  pay_period_start_date: string;
  pay_period_lock_delay_days: number;
  pay_period_auto_lock: boolean;

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

// Shared input styles
const inputStyle: React.CSSProperties = {
  border: '0.5px solid #e8e4df',
  borderRadius: 7,
  fontSize: 12,
  padding: '8px 12px',
  width: '100%',
  outline: 'none',
};

const inputFocusClass = 'focus:border-[#d3ad6b] focus:shadow-[0_0_0_3px_rgba(211,173,107,0.08)]';

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: '#555',
  display: 'block',
  marginBottom: 4,
};

const checkboxLabelStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#555',
};

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
  const supabase = createClient();

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
          pay_period_type: 'weekly',
          pay_period_start_date: '2026-01-05',
          pay_period_lock_delay_days: 3,
          pay_period_auto_lock: false,
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

  // Skeleton loading
  if (loading || !settings) {
    return (
      <div style={{ padding: '36px 40px' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="anim-shimmer" style={{ width: 120, height: 24, borderRadius: 6, marginBottom: 8 }} />
            <div className="anim-shimmer" style={{ width: 300, height: 14, borderRadius: 4 }} />
          </div>
          <div className="anim-shimmer" style={{ width: 130, height: 36, borderRadius: 7 }} />
        </div>

        <div className="flex gap-6">
          {/* Sidebar skeleton */}
          <div className="w-64 space-y-2">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <div key={n} className={`anim-slide-up stagger-${n}`} style={{ padding: '12px 16px', borderRadius: 7 }}>
                <div className="flex items-center gap-3">
                  <div className="anim-shimmer" style={{ width: 16, height: 16, borderRadius: 3 }} />
                  <div className="anim-shimmer" style={{ width: 100, height: 12, borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>

          {/* Content skeleton */}
          <div className="flex-1 anim-slide-up stagger-2" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: 24 }}>
            <div className="anim-shimmer" style={{ width: 120, height: 10, borderRadius: 3, marginBottom: 24 }} />
            <div className="grid grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(n => (
                <div key={n}>
                  <div className="anim-shimmer" style={{ width: 80, height: 10, borderRadius: 3, marginBottom: 8 }} />
                  <div className="anim-shimmer" style={{ width: '100%', height: 36, borderRadius: 7 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '36px 40px' }}>
      {/* Page Header + Save */}
      <div className="flex items-center justify-between mb-6 anim-slide-up stagger-1">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', letterSpacing: -0.3 }}>Settings</h1>
          <p style={{ fontSize: 13, fontWeight: 400, color: '#999' }}>Company configuration, time rules, and integrations</p>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 disabled:opacity-50"
          style={{ padding: '8px 18px', background: '#e31c79', color: '#fff', borderRadius: 7, fontSize: 12, fontWeight: 600 }}
          onMouseEnter={(e) => { if (!saving) { e.currentTarget.style.background = '#cc1069'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#e31c79'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div
          className="mb-4 flex items-center gap-2"
          style={{
            padding: '10px 14px',
            borderRadius: 7,
            background: saveMessage.includes('Error') ? 'rgba(185,28,28,0.06)' : 'rgba(45,155,110,0.06)',
            color: saveMessage.includes('Error') ? '#b91c1c' : '#2d9b6e',
            fontSize: 12,
          }}
        >
          {saveMessage.includes('Error') ? (
            <X className="h-4 w-4" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          {saveMessage}
        </div>
      )}

      <div className="flex gap-6 anim-slide-up stagger-2">
        {/* Sidebar Tabs */}
        <div className="w-64 space-y-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="w-full flex items-center gap-3 px-4 py-3 transition-colors"
              style={{
                borderRadius: 7,
                fontSize: 12,
                fontWeight: activeTab === tab.id ? 600 : 400,
                color: activeTab === tab.id ? '#1a1a1a' : '#777',
                background: activeTab === tab.id ? '#fff' : 'transparent',
                border: activeTab === tab.id ? '0.5px solid #e8e4df' : '0.5px solid transparent',
              }}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: 24 }}>
            {/* Global Settings Tab */}
            {activeTab === 'global' && (
              <div className="space-y-6">
                <h2 style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase', marginBottom: 16 }}>Global Settings</h2>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label style={labelStyle}>Time Zone</label>
                    <select
                      value={settings.timezone}
                      onChange={(e) => updateSetting('timezone', e.target.value)}
                      style={inputStyle}
                      className={`${inputFocusClass} outline-none`}
                    >
                      {TIMEZONES.map(tz => (
                        <option key={tz.value} value={tz.value}>{tz.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Currency</label>
                    <select
                      value={settings.currency}
                      onChange={(e) => updateSetting('currency', e.target.value)}
                      style={inputStyle}
                      className={`${inputFocusClass} outline-none`}
                    >
                      {CURRENCIES.map(curr => (
                        <option key={curr.value} value={curr.value}>{curr.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>
                    Allowed Entry Date
                    <span style={{ fontSize: 10.5, color: '#c0bab2', marginLeft: 8 }}>(locks all previous dates)</span>
                  </label>
                  <input
                    type="date"
                    value={settings.allowed_entry_date || ''}
                    onChange={(e) => updateSetting('allowed_entry_date', e.target.value)}
                    style={inputStyle}
                    className={`${inputFocusClass} outline-none`}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hide_company"
                    checked={settings.hide_company_name}
                    onChange={(e) => updateSetting('hide_company_name', e.target.checked)}
                    className="rounded border-[#e8e4df] accent-[#e31c79]"
                  />
                  <label htmlFor="hide_company" style={checkboxLabelStyle}>
                    Hide Company Name
                  </label>
                </div>
              </div>
            )}

            {/* Defaults Tab */}
            {activeTab === 'defaults' && (
              <div className="space-y-6">
                <h2 style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase', marginBottom: 16 }}>Default Settings</h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label htmlFor="email_notif" style={checkboxLabelStyle}>
                      Email Notifications Active
                    </label>
                    <input
                      type="checkbox"
                      id="email_notif"
                      checked={settings.email_notifications}
                      onChange={(e) => updateSetting('email_notifications', e.target.checked)}
                      className="rounded border-[#e8e4df] accent-[#e31c79]"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Logout Timeout (minutes)</label>
                    <input
                      type="number"
                      value={settings.logout_timeout_minutes}
                      onChange={(e) => updateSetting('logout_timeout_minutes', parseInt(e.target.value))}
                      style={{ ...inputStyle, width: 128 }}
                      className={`${inputFocusClass} outline-none`}
                    />
                  </div>

                  <div className="space-y-3 pt-4" style={{ borderTop: '0.5px solid #f0ece7' }}>
                    <h3 style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' }}>Feature Settings</h3>

                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { id: 'use_user_rates', label: 'Use User Rates', field: 'use_user_rates' as const },
                        { id: 'use_user_reps', label: 'Use User Reps', field: 'use_user_reps' as const },
                        { id: 'use_tasks', label: 'Use Tasks', field: 'use_tasks' as const },
                        { id: 'use_attachments', label: 'Use Attachments', field: 'use_attachments' as const },
                      ].map(item => (
                        <label key={item.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={settings[item.field] as boolean}
                            onChange={(e) => updateSetting(item.field, e.target.checked)}
                            className="rounded border-[#e8e4df] accent-[#e31c79]"
                          />
                          <span style={checkboxLabelStyle}>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Time Tab */}
            {activeTab === 'time' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' }}>Time & Attendance Settings</h2>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.time_enabled}
                      onChange={(e) => updateSetting('time_enabled', e.target.checked)}
                      className="rounded border-[#e8e4df] accent-[#e31c79]"
                    />
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#555' }}>Enable Time Module</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label style={labelStyle}>List Entry Time Cycle</label>
                    <select
                      value={settings.time_cycle}
                      onChange={(e) => updateSetting('time_cycle', e.target.value)}
                      style={inputStyle}
                      className={`${inputFocusClass} outline-none`}
                    >
                      <option value="Weekly">Weekly</option>
                      <option value="Bi-Weekly">Bi-Weekly</option>
                      <option value="Semi-Monthly">Semi-Monthly</option>
                      <option value="Monthly">Monthly</option>
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Accrual Display</label>
                    <select
                      value={settings.time_accrual_display}
                      onChange={(e) => updateSetting('time_accrual_display', e.target.value)}
                      style={inputStyle}
                      className={`${inputFocusClass} outline-none`}
                    >
                      <option value="Hours">Hours</option>
                      <option value="Days">Days</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label style={labelStyle}>OT Day Hours</label>
                    <input
                      type="number"
                      value={settings.ot_day_hours || ''}
                      onChange={(e) => updateSetting('ot_day_hours', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="Optional"
                      style={{ ...inputStyle, color: settings.ot_day_hours ? '#1a1a1a' : '#ccc' }}
                      className={`${inputFocusClass} outline-none placeholder:text-[#ccc]`}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>OT Week Hours</label>
                    <input
                      type="number"
                      value={settings.ot_week_hours}
                      onChange={(e) => updateSetting('ot_week_hours', parseFloat(e.target.value))}
                      style={inputStyle}
                      className={`${inputFocusClass} outline-none`}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>DT Day Hours</label>
                    <input
                      type="number"
                      value={settings.dt_day_hours || ''}
                      onChange={(e) => updateSetting('dt_day_hours', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="Optional"
                      style={{ ...inputStyle, color: settings.dt_day_hours ? '#1a1a1a' : '#ccc' }}
                      className={`${inputFocusClass} outline-none placeholder:text-[#ccc]`}
                    />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Time Increment (Minutes)</label>
                  <select
                    value={settings.time_increment_minutes}
                    onChange={(e) => updateSetting('time_increment_minutes', parseInt(e.target.value))}
                    style={{ ...inputStyle, width: 128 }}
                    className={`${inputFocusClass} outline-none`}
                  >
                    <option value="1">1</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                    <option value="10">10</option>
                    <option value="15">15</option>
                    <option value="30">30</option>
                  </select>
                </div>

                {/* Pay Period Configuration */}
                <div className="pt-4" style={{ borderTop: '0.5px solid #f0ece7' }}>
                  <h4 style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase', marginBottom: 12 }}>Pay Period Configuration</h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label style={labelStyle}>Pay Period Type</label>
                      <select
                        value={settings.pay_period_type}
                        onChange={(e) => updateSetting('pay_period_type', e.target.value)}
                        style={inputStyle}
                        className={`${inputFocusClass} outline-none`}
                      >
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Bi-Weekly</option>
                        <option value="semimonthly">Semi-Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Period Start Date (anchor)</label>
                      <input
                        type="date"
                        value={settings.pay_period_start_date}
                        onChange={(e) => updateSetting('pay_period_start_date', e.target.value)}
                        style={inputStyle}
                        className={`${inputFocusClass} outline-none`}
                      />
                      <p style={{ fontSize: 10.5, color: '#c0bab2', marginTop: 4 }}>
                        First day of the first pay period (e.g., a Monday for weekly)
                      </p>
                    </div>
                    <div>
                      <label style={labelStyle}>Lock Delay (days after period ends)</label>
                      <input
                        type="number"
                        min="0"
                        max="14"
                        value={settings.pay_period_lock_delay_days}
                        onChange={(e) => updateSetting('pay_period_lock_delay_days', parseInt(e.target.value))}
                        style={{ ...inputStyle, width: 128 }}
                        className={`${inputFocusClass} outline-none`}
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={settings.pay_period_auto_lock}
                          onChange={(e) => updateSetting('pay_period_auto_lock', e.target.checked)}
                          className="rounded border-[#e8e4df] accent-[#e31c79]"
                        />
                        <span style={checkboxLabelStyle}>Auto-lock periods after delay</span>
                      </label>
                    </div>
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/pay-periods', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'generate' }),
                          })
                          const data = await res.json()
                          if (res.ok) {
                            alert(`Generated ${data.generated} pay periods`)
                          } else {
                            alert(data.error || 'Failed to generate periods')
                          }
                        } catch (err) {
                          alert('Error generating pay periods')
                        }
                      }}
                      style={{ padding: '8px 18px', fontSize: 12, fontWeight: 600, background: '#e31c79', color: '#fff', borderRadius: 7 }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#cc1069'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#e31c79'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                      Generate Pay Periods (next 90 days)
                    </button>
                  </div>
                </div>

                <div className="space-y-3 pt-4" style={{ borderTop: '0.5px solid #f0ece7' }}>
                  {[
                    { field: 'allow_new_time_after_approval' as const, label: 'Allow new time after approval' },
                    { field: 'changes_require_reason' as const, label: 'Changes Require a Reason (DCAA)' },
                    { field: 'use_time_in_out' as const, label: 'Use Time In/Out' },
                    { field: 'use_clock_in_out' as const, label: 'Use Clock In/Out' },
                  ].map(item => (
                    <label key={item.field} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings[item.field] as boolean}
                        onChange={(e) => updateSetting(item.field, e.target.checked)}
                        className="rounded border-[#e8e4df] accent-[#e31c79]"
                      />
                      <span style={checkboxLabelStyle}>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Expense Tab */}
            {activeTab === 'expense' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' }}>Expense Settings</h2>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.expense_enabled}
                      onChange={(e) => updateSetting('expense_enabled', e.target.checked)}
                      className="rounded border-[#e8e4df] accent-[#e31c79]"
                    />
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#555' }}>Enable Expense Module</span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center gap-2 mb-4">
                    <input
                      type="checkbox"
                      checked={settings.expense_foreign_currencies}
                      onChange={(e) => updateSetting('expense_foreign_currencies', e.target.checked)}
                      className="rounded border-[#e8e4df] accent-[#e31c79]"
                    />
                    <span style={checkboxLabelStyle}>Use Foreign Currencies</span>
                  </label>
                </div>

                <div>
                  <label style={labelStyle}>Payment Memo</label>
                  <textarea
                    value={settings.expense_payment_memo}
                    onChange={(e) => updateSetting('expense_payment_memo', e.target.value)}
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical' }}
                    className={`${inputFocusClass} outline-none placeholder:text-[#ccc]`}
                    placeholder="Default payment memo for expense reports..."
                  />
                </div>
              </div>
            )}

            {/* Approvers Tab */}
            {activeTab === 'approvers' && (
              <div className="space-y-8">
                <div>
                  <h2 style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase', marginBottom: 16 }}>Enterprise Time Approvers</h2>
                  <div className="space-y-4">
                    <div>
                      <label style={{ ...labelStyle, marginBottom: 8 }}>
                        Additional Time Approvers
                      </label>
                      <div className="space-y-2">
                        {timeApprovers.map(approver => (
                          <div key={approver.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: '#FAFAF8' }}>
                            <div>
                              <p style={{ fontSize: 12.5, fontWeight: 500, color: '#1a1a1a' }}>
                                {approver.first_name} {approver.last_name}
                              </p>
                              <p style={{ fontSize: 10.5, color: '#c0bab2' }}>{approver.email}</p>
                            </div>
                            <button
                              onClick={() => removeApprover('time', approver.id)}
                              style={{ color: '#b91c1c' }}
                              className="hover:opacity-70 transition-opacity"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 flex gap-2">
                        <select
                          style={{ ...inputStyle, flex: 1 }}
                          className={`${inputFocusClass} outline-none`}
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
                  <h2 style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase', marginBottom: 16 }}>Enterprise Expense Approvers</h2>
                  <div className="space-y-4">
                    <div>
                      <label style={{ ...labelStyle, marginBottom: 8 }}>
                        Additional Expense Approvers
                      </label>
                      <div className="space-y-2">
                        {expenseApprovers.map(approver => (
                          <div key={approver.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: '#FAFAF8' }}>
                            <div>
                              <p style={{ fontSize: 12.5, fontWeight: 500, color: '#1a1a1a' }}>
                                {approver.first_name} {approver.last_name}
                              </p>
                              <p style={{ fontSize: 10.5, color: '#c0bab2' }}>{approver.email}</p>
                            </div>
                            <button
                              onClick={() => removeApprover('expense', approver.id)}
                              style={{ color: '#b91c1c' }}
                              className="hover:opacity-70 transition-opacity"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 flex gap-2">
                        <select
                          style={{ ...inputStyle, flex: 1 }}
                          className={`${inputFocusClass} outline-none`}
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
                  <h2 style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase', marginBottom: 16 }}>System Integrations</h2>

                  {/* QuickBooks Integration */}
                  <div style={{ border: '0.5px solid #e8e4df', borderRadius: 10, padding: 24, marginBottom: 24 }} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div style={{ width: 40, height: 40, background: 'rgba(45,155,110,0.06)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <DollarSign className="h-5 w-5" style={{ color: '#2d9b6e' }} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>QuickBooks Online</h3>
                          <p style={{ fontSize: 11, color: '#999' }}>Sync timesheets and expenses</p>
                        </div>
                      </div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={settings.quickbooks_enabled}
                          onChange={(e) => updateSetting('quickbooks_enabled', e.target.checked)}
                          className="rounded border-[#e8e4df] accent-[#e31c79]"
                        />
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#555' }}>Enable</span>
                      </label>
                    </div>

                    {settings.quickbooks_enabled && (
                      <div className="pt-4 space-y-4" style={{ borderTop: '0.5px solid #f0ece7' }}>
                        <div style={{ background: 'rgba(196,152,58,0.06)', border: '0.5px solid rgba(196,152,58,0.2)', borderRadius: 7, padding: 12 }}>
                          <div className="flex gap-2">
                            <AlertCircle className="h-4 w-4 mt-0.5" style={{ color: '#c4983a' }} />
                            <p style={{ fontSize: 12, color: '#c4983a' }}>
                              QuickBooks integration requires API credentials. Contact support for setup assistance.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tracker RMS Integration */}
                  <div style={{ border: '0.5px solid #e8e4df', borderRadius: 10, padding: 24 }} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div style={{ width: 40, height: 40, background: 'rgba(227,28,121,0.06)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Building2 className="h-5 w-5" style={{ color: '#e31c79' }} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>Tracker RMS</h3>
                          <p style={{ fontSize: 11, color: '#999' }}>Applicant Tracking System integration</p>
                        </div>
                      </div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={settings.tracker_rms_enabled}
                          onChange={(e) => updateSetting('tracker_rms_enabled', e.target.checked)}
                          className="rounded border-[#e8e4df] accent-[#e31c79]"
                        />
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#555' }}>Enable</span>
                      </label>
                    </div>

                    {settings.tracker_rms_enabled && (
                      <div className="pt-4 space-y-4" style={{ borderTop: '0.5px solid #f0ece7' }}>
                        <div>
                          <label style={labelStyle}>API Key</label>
                          <input
                            type="password"
                            value={settings.tracker_rms_api_key}
                            onChange={(e) => updateSetting('tracker_rms_api_key', e.target.value)}
                            placeholder="Enter your Tracker RMS API key"
                            style={inputStyle}
                            className={`${inputFocusClass} outline-none placeholder:text-[#ccc]`}
                          />
                        </div>

                        <div style={{ background: 'rgba(211,173,107,0.06)', border: '0.5px solid rgba(211,173,107,0.2)', borderRadius: 7, padding: 12 }}>
                          <div className="flex gap-2">
                            <AlertCircle className="h-4 w-4 mt-0.5" style={{ color: '#d3ad6b' }} />
                            <div style={{ fontSize: 12, color: '#777' }}>
                              <p style={{ fontWeight: 600, marginBottom: 4 }}>Integration Features:</p>
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
  );
}
