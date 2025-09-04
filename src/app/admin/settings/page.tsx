'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { 
  Settings,
  Users,
  Clock,
  Bell,
  Shield,
  ChevronLeft,
  Save,
  Plus,
  Trash2,
  Edit,
  X,
  AlertCircle,
  DollarSign,
  Calendar,
  Mail
} from 'lucide-react';

interface Approver {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  department?: string;
  employee_count?: number;
}

interface OvertimeRule {
  id: string;
  state: string;
  daily_threshold: number;
  weekly_threshold: number;
  daily_multiplier: number;
  weekly_multiplier: number;
  notes?: string;
}

interface SystemConfig {
  default_bill_rate: number;
  timesheet_reminder_day: string;
  timesheet_reminder_time: string;
  expense_auto_approve_limit: number;
  require_project_codes: boolean;
  require_expense_receipts: boolean;
  allow_future_dates: boolean;
  max_hours_per_day: number;
  min_hours_per_day: number;
  fiscal_year_start: string;
}

interface NotificationSetting {
  id: string;
  type: string;
  enabled: boolean;
  recipients: string[];
}

export default function SystemSettings() {
  const [activeTab, setActiveTab] = useState('general');
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [overtimeRules, setOvertimeRules] = useState<OvertimeRule[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    default_bill_rate: 150,
    timesheet_reminder_day: 'Friday',
    timesheet_reminder_time: '15:00',
    expense_auto_approve_limit: 100,
    require_project_codes: true,
    require_expense_receipts: true,
    allow_future_dates: false,
    max_hours_per_day: 24,
    min_hours_per_day: 0,
    fiscal_year_start: '01-01'
  });
  const [notifications, setNotifications] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddApproverModal, setShowAddApproverModal] = useState(false);
  const [availableEmployees, setAvailableEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  const supabase = createClientComponentClient();
  const router = useRouter();

  const tabs = [
    { id: 'general', label: 'General Settings', icon: Settings },
    { id: 'approvers', label: 'Time Approvers', icon: Users },
    { id: 'overtime', label: 'Overtime Rules', icon: Clock },
    { id: 'notifications', label: 'Notifications', icon: Bell }
  ];

  const defaultOvertimeRules: OvertimeRule[] = [
    {
      id: '1',
      state: 'CA',
      daily_threshold: 8,
      weekly_threshold: 40,
      daily_multiplier: 1.5,
      weekly_multiplier: 1.5,
      notes: 'California requires daily overtime after 8 hours and double time after 12 hours'
    },
    {
      id: '2',
      state: 'DEFAULT',
      daily_threshold: 0,
      weekly_threshold: 40,
      daily_multiplier: 0,
      weekly_multiplier: 1.5,
      notes: 'Standard federal overtime rules - weekly only'
    }
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // Fetch approvers
      const { data: approverData } = await supabase
        .from('employees')
        .select('*')
        .eq('is_approver', true)
        .eq('status', 'active');

      // Get employee counts for each approver
      const approversWithCounts = await Promise.all(
        (approverData || []).map(async (approver) => {
          const { count } = await supabase
            .from('employees')
            .select('*', { count: 'exact', head: true })
            .eq('time_approver_id', approver.id);

          return {
            ...approver,
            employee_count: count || 0
          };
        })
      );

      setApprovers(approversWithCounts);

      // Fetch available employees for adding as approvers
      const { data: allEmployees } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email')
        .eq('status', 'active')
        .eq('is_approver', false);

      setAvailableEmployees(allEmployees || []);

      // In a real app, these would come from a settings table
      setOvertimeRules(defaultOvertimeRules);
      
      // Set up default notifications
      setNotifications([
        {
          id: '1',
          type: 'missing_timesheet',
          enabled: true,
          recipients: ['admin@westendworkforce.com']
        },
        {
          id: '2',
          type: 'pending_approvals',
          enabled: true,
          recipients: ['admin@westendworkforce.com']
        },
        {
          id: '3',
          type: 'overtime_alert',
          enabled: true,
          recipients: ['admin@westendworkforce.com', 'hr@westendworkforce.com']
        }
      ]);

    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // In a real app, save to database
      // await supabase.from('system_settings').update(systemConfig);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddApprover = async () => {
    if (!selectedEmployeeId) return;

    try {
      await supabase
        .from('employees')
        .update({ is_approver: true })
        .eq('id', selectedEmployeeId);

      setShowAddApproverModal(false);
      setSelectedEmployeeId('');
      fetchSettings();
    } catch (error) {
      console.error('Error adding approver:', error);
      alert('Error adding approver');
    }
  };

  const handleRemoveApprover = async (id: string) => {
    if (!confirm('Remove this employee as an approver?')) return;

    try {
      await supabase
        .from('employees')
        .update({ is_approver: false })
        .eq('id', id);

      fetchSettings();
    } catch (error) {
      console.error('Error removing approver:', error);
      alert('Error removing approver');
    }
  };

  const updateOvertimeRule = (id: string, field: string, value: any) => {
    setOvertimeRules(rules => 
      rules.map(rule => 
        rule.id === id ? { ...rule, [field]: value } : rule
      )
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header style={{ backgroundColor: '#05202e' }} className="text-white">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin')}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">System Settings</h1>
                <p className="text-sm text-gray-300">Configure system-wide settings and rules</p>
              </div>
            </div>
            <button 
              onClick={() => router.push('/auth/logout')}
              className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6" style={{ borderWidth: '1px', borderColor: '#05202e' }}>
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-pink text-gray-900 bg-gray-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
                style={activeTab === tab.id ? { borderColor: '#e31c79' } : {}}
              >
                <tab.icon className="h-5 w-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm p-6" style={{ borderWidth: '1px', borderColor: '#05202e' }}>
          {/* General Settings Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">General Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Bill Rate ($/hour)
                  </label>
                  <input
                    type="number"
                    value={systemConfig.default_bill_rate}
                    onChange={(e) => setSystemConfig({...systemConfig, default_bill_rate: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expense Auto-Approve Limit ($)
                  </label>
                  <input
                    type="number"
                    value={systemConfig.expense_auto_approve_limit}
                    onChange={(e) => setSystemConfig({...systemConfig, expense_auto_approve_limit: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Expenses under this amount are auto-approved</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Timesheet Reminder Day
                  </label>
                  <select
                    value={systemConfig.timesheet_reminder_day}
                    onChange={(e) => setSystemConfig({...systemConfig, timesheet_reminder_day: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink focus:border-transparent"
                  >
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reminder Time
                  </label>
                  <input
                    type="time"
                    value={systemConfig.timesheet_reminder_time}
                    onChange={(e) => setSystemConfig({...systemConfig, timesheet_reminder_time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Hours Per Day
                  </label>
                  <input
                    type="number"
                    value={systemConfig.max_hours_per_day}
                    onChange={(e) => setSystemConfig({...systemConfig, max_hours_per_day: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fiscal Year Start
                  </label>
                  <input
                    type="text"
                    placeholder="MM-DD"
                    value={systemConfig.fiscal_year_start}
                    onChange={(e) => setSystemConfig({...systemConfig, fiscal_year_start: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink focus:border-transparent"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium text-gray-900">System Rules</h4>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={systemConfig.require_project_codes}
                    onChange={(e) => setSystemConfig({...systemConfig, require_project_codes: e.target.checked})}
                    className="mr-3"
                  />
                  <span className="text-sm">Require project codes on all timesheets</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={systemConfig.require_expense_receipts}
                    onChange={(e) => setSystemConfig({...systemConfig, require_expense_receipts: e.target.checked})}
                    className="mr-3"
                  />
                  <span className="text-sm">Require receipts for all expenses</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={systemConfig.allow_future_dates}
                    onChange={(e) => setSystemConfig({...systemConfig, allow_future_dates: e.target.checked})}
                    className="mr-3"
                  />
                  <span className="text-sm">Allow timesheet entries for future dates</span>
                </label>
              </div>
            </div>
          )}

          {/* Approvers Tab */}
          {activeTab === 'approvers' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Time Approvers</h3>
                <button
                  onClick={() => setShowAddApproverModal(true)}
                  className="px-4 py-2 text-white rounded-lg hover:opacity-90 flex items-center gap-2"
                  style={{ backgroundColor: '#e31c79' }}
                >
                  <Plus className="h-4 w-4" />
                  Add Approver
                </button>
              </div>

              <div className="space-y-4">
                {approvers.map((approver) => (
                  <div 
                    key={approver.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    style={{ borderColor: '#05202e' }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Users className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {approver.first_name} {approver.last_name}
                        </p>
                        <p className="text-sm text-gray-500">{approver.email}</p>
                        {approver.department && (
                          <p className="text-xs text-gray-500">Department: {approver.department}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600">
                        <span className="font-semibold">{approver.employee_count}</span> direct reports
                      </span>
                      <button
                        onClick={() => handleRemoveApprover(approver.id)}
                        className="p-2 hover:bg-gray-100 rounded"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {approvers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No approvers configured. Add approvers to enable timesheet approvals.
                </div>
              )}
            </div>
          )}

          {/* Overtime Rules Tab */}
          {activeTab === 'overtime' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Overtime Rules by State</h3>
              
              <div className="space-y-4">
                {overtimeRules.map((rule) => (
                  <div 
                    key={rule.id} 
                    className="p-4 border rounded-lg"
                    style={{ borderColor: rule.state === 'CA' ? '#e31c79' : '#05202e' }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-medium text-gray-900">
                        {rule.state === 'DEFAULT' ? 'Default (All Other States)' : `${rule.state} - Special Rules`}
                      </h4>
                      {rule.state === 'CA' && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                          Daily OT Required
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Daily OT After (hours)
                        </label>
                        <input
                          type="number"
                          value={rule.daily_threshold}
                          onChange={(e) => updateOvertimeRule(rule.id, 'daily_threshold', parseInt(e.target.value))}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          disabled={rule.state === 'DEFAULT'}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Daily OT Rate
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={rule.daily_multiplier}
                          onChange={(e) => updateOvertimeRule(rule.id, 'daily_multiplier', parseFloat(e.target.value))}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          disabled={rule.state === 'DEFAULT'}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Weekly OT After (hours)
                        </label>
                        <input
                          type="number"
                          value={rule.weekly_threshold}
                          onChange={(e) => updateOvertimeRule(rule.id, 'weekly_threshold', parseInt(e.target.value))}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Weekly OT Rate
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={rule.weekly_multiplier}
                          onChange={(e) => updateOvertimeRule(rule.id, 'weekly_multiplier', parseFloat(e.target.value))}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      </div>
                    </div>

                    {rule.notes && (
                      <p className="text-xs text-gray-500 mt-2 flex items-start gap-1">
                        <AlertCircle className="h-3 w-3 mt-0.5" />
                        {rule.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Overtime Calculation</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• California: Daily OT (8+ hrs) + Weekly OT (40+ hrs)</li>
                  <li>• Other States: Weekly OT only (40+ hrs)</li>
                  <li>• Double time applies in CA after 12 hours/day</li>
                </ul>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Notifications</h3>
              
              <div className="space-y-4">
                <div className="p-4 border rounded-lg" style={{ borderColor: '#05202e' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={notifications.find(n => n.type === 'missing_timesheet')?.enabled}
                        onChange={(e) => {
                          setNotifications(notifs => 
                            notifs.map(n => 
                              n.type === 'missing_timesheet' ? {...n, enabled: e.target.checked} : n
                            )
                          );
                        }}
                      />
                      <div>
                        <p className="font-medium text-gray-900">Missing Timesheet Alerts</p>
                        <p className="text-sm text-gray-500">Weekly email for employees who haven't submitted</p>
                      </div>
                    </div>
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                </div>

                <div className="p-4 border rounded-lg" style={{ borderColor: '#05202e' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={notifications.find(n => n.type === 'pending_approvals')?.enabled}
                        onChange={(e) => {
                          setNotifications(notifs => 
                            notifs.map(n => 
                              n.type === 'pending_approvals' ? {...n, enabled: e.target.checked} : n
                            )
                          );
                        }}
                      />
                      <div>
                        <p className="font-medium text-gray-900">Pending Approval Reminders</p>
                        <p className="text-sm text-gray-500">Daily digest of items awaiting approval</p>
                      </div>
                    </div>
                    <Clock className="h-5 w-5 text-gray-400" />
                  </div>
                </div>

                <div className="p-4 border rounded-lg" style={{ borderColor: '#05202e' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={notifications.find(n => n.type === 'overtime_alert')?.enabled}
                        onChange={(e) => {
                          setNotifications(notifs => 
                            notifs.map(n => 
                              n.type === 'overtime_alert' ? {...n, enabled: e.target.checked} : n
                            )
                          );
                        }}
                      />
                      <div>
                        <p className="font-medium text-gray-900">Overtime Alerts</p>
                        <p className="text-sm text-gray-500">Alert when employees exceed overtime thresholds</p>
                      </div>
                    </div>
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Email Recipients
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink focus:border-transparent"
                  rows={3}
                  placeholder="Enter email addresses, one per line"
                  defaultValue="admin@westendworkforce.com\nhr@westendworkforce.com"
                />
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end mt-6 pt-6 border-t">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-6 py-2 text-white rounded-lg hover:opacity-90 flex items-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: '#e31c79' }}
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* Add Approver Modal */}
      {showAddApproverModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Add Time Approver</h2>
                <button
                  onClick={() => {
                    setShowAddApproverModal(false);
                    setSelectedEmployeeId('');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Employee
              </label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink focus:border-transparent"
              >
                <option value="">Choose an employee...</option>
                {availableEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} - {emp.email}
                  </option>
                ))}
              </select>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddApproverModal(false);
                    setSelectedEmployeeId('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddApprover}
                  disabled={!selectedEmployeeId}
                  className="px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: '#e31c79' }}
                >
                  Add Approver
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}