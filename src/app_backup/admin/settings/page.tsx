'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ChevronLeft, Save, Settings, Users, DollarSign, Bell, 
  Shield, Database, Zap, Edit, Plus, Download, Trash2, X 
} from 'lucide-react'

interface UserRole {
  id: string
  name: string
  description: string
  permissions: string[]
}

interface SystemSettings {
  // General
  companyName: string
  companyAddress: string
  companyPhone: string
  companyEmail: string
  defaultCurrency: string
  timeZone: string
  weekStartDay: string
  autoApproveTimesheets: boolean
  requireExpenseReceipts: boolean
  
  // User Management
  passwordMinLength: boolean
  passwordRequireNumbers: boolean
  passwordRequireSymbols: boolean
  sessionTimeout: number
  twoFactorAuth: boolean
  
  // Billing
  rates: {
    juniorDeveloper: number
    seniorDeveloper: number
    projectManager: number
    designer: number
  }
  invoicePrefix: string
  taxRate: number
  paymentTerms: string
  autoGenerateInvoices: boolean
  
  // Security
  enforceStrongPasswords: boolean
  lockAfterFailedAttempts: boolean
  failedAttemptLimit: number
  encryptSensitiveData: boolean
  logAdminActions: boolean
  
  // Backup
  automaticBackups: boolean
  backupFrequency: string
  backupRetention: number
}

interface BackupRecord {
  date: string
  size: string
  type: string
}

export default function AdminSettingsPage() {
  const router = useRouter()
  const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'users' | 'billing' | 'security' | 'backup'>('general')
  const [showAddRoleModal, setShowAddRoleModal] = useState(false)
  const [showAddRateModal, setShowAddRateModal] = useState(false)
  const [editingRole, setEditingRole] = useState<UserRole | null>(null)
  const [editingRate, setEditingRate] = useState<{ name: string; value: number } | null>(null)

  const [settings, setSettings] = useState<SystemSettings>({
    // General
    companyName: 'West End Workforce',
    companyAddress: '123 Business St, Calgary, AB T2P 1A1',
    companyPhone: '(403) 555-0123',
    companyEmail: 'info@westendworkforce.com',
    defaultCurrency: 'CAD',
    timeZone: 'America/Edmonton',
    weekStartDay: 'monday',
    autoApproveTimesheets: false,
    requireExpenseReceipts: true,
    
    // User Management
    passwordMinLength: true,
    passwordRequireNumbers: true,
    passwordRequireSymbols: false,
    sessionTimeout: 120,
    twoFactorAuth: false,
    
    // Billing
    rates: {
      juniorDeveloper: 65,
      seniorDeveloper: 90,
      projectManager: 85,
      designer: 75
    },
    invoicePrefix: 'WEW',
    taxRate: 5.0,
    paymentTerms: 'net30',
    autoGenerateInvoices: true,
    
    // Security
    enforceStrongPasswords: true,
    lockAfterFailedAttempts: true,
    failedAttemptLimit: 5,
    encryptSensitiveData: true,
    logAdminActions: true,
    
    // Backup
    automaticBackups: true,
    backupFrequency: 'daily',
    backupRetention: 30
  })

  const userRoles: UserRole[] = [
    {
      id: 'admin',
      name: 'Administrator',
      description: 'Full system access and configuration',
      permissions: ['all_access', 'user_management', 'system_settings', 'reports']
    },
    {
      id: 'manager',
      name: 'Manager',
      description: 'Can manage timesheets, expenses, and team members',
      permissions: ['timesheet_approval', 'expense_approval', 'team_management', 'reports_view']
    },
    {
      id: 'employee',
      name: 'Employee',
      description: 'Can submit timesheets and expenses',
      permissions: ['timesheet_submit', 'expense_submit', 'profile_edit']
    }
  ]

  const recentBackups: BackupRecord[] = [
    { date: '2025-08-21 03:00 AM', size: '245 MB', type: 'Automatic' },
    { date: '2025-08-20 03:00 AM', size: '243 MB', type: 'Automatic' },
    { date: '2025-08-19 03:00 AM', size: '241 MB', type: 'Automatic' }
  ]

  const settingsCategories = [
    { id: 'general', name: 'General', icon: Settings },
    { id: 'users', name: 'User Management', icon: Users },
    { id: 'billing', name: 'Billing & Rates', icon: DollarSign },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'backup', name: 'Backup & Data', icon: Database }
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateSetting = (key: keyof SystemSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const updateRate = (key: keyof SystemSettings['rates'], value: number) => {
    setSettings(prev => ({ 
      ...prev, 
      rates: { ...prev.rates, [key]: value } 
    }))
  }

  const toggleSetting = (key: keyof SystemSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSaveAllSettings = () => {
    alert('All settings have been saved successfully!')
  }

  const handleAddRole = () => {
    setEditingRole(null)
    setShowAddRoleModal(true)
  }

  const handleEditRole = (role: UserRole) => {
    setEditingRole(role)
    setShowAddRoleModal(true)
  }

  const handleAddRate = () => {
    setEditingRate(null)
    setShowAddRateModal(true)
  }

  const handleEditRate = (name: string, value: number) => {
    setEditingRate({ name, value })
    setShowAddRateModal(true)
  }

  const createBackup = () => {
    alert('Backup creation started. You will be notified when complete.')
  }

  const downloadBackup = (backup: BackupRecord) => {
    alert(`Downloading backup from ${backup.date}`)
  }

  const deleteBackup = (backup: BackupRecord) => {
    if (confirm('Are you sure you want to delete this backup?')) {
      alert('Backup deleted successfully')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome back, Tracy!</h1>
            <p className="text-gray-600">System Administrator • Full Access</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold">
              TR
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">Tracy</div>
              <div className="text-xs text-gray-500">Admin</div>
              <div className="text-xs text-gray-400">ID: admin-demo</div>
            </div>
          </div>
        </div>
      </header>

      {/* Settings Navigation & Controls */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => router.push('/admin')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Back to Admin Dashboard
            </button>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">System Settings</h2>
              <p className="text-gray-600">Configure system options and preferences</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
              Export Settings
            </button>
            <button 
              onClick={handleSaveAllSettings}
              className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Save All Changes</span>
            </button>
          </div>
        </div>
        
        {/* Settings Category Tabs */}
        <div className="flex space-x-1">
          {settingsCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveSettingsTab(category.id as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeSettingsTab === category.id
                  ? 'bg-white text-pink-600 shadow-sm border border-gray-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <category.icon className="w-4 h-4 inline mr-2" />
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* General Settings Tab */}
      {activeSettingsTab === 'general' && (
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Company Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Company Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                  <input
                    type="text"
                    value={settings.companyName}
                    onChange={(e) => updateSetting('companyName', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500"
                    placeholder="West End Workforce"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company Address</label>
                  <textarea
                    value={settings.companyAddress}
                    onChange={(e) => updateSetting('companyAddress', e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500"
                    placeholder="123 Business St, Calgary, AB T2P 1A1"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={settings.companyPhone}
                      onChange={(e) => updateSetting('companyPhone', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500"
                      placeholder="(403) 555-0123"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={settings.companyEmail}
                      onChange={(e) => updateSetting('companyEmail', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500"
                      placeholder="info@westendworkforce.com"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* System Preferences */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">System Preferences</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Default Currency</label>
                  <select
                    value={settings.defaultCurrency}
                    onChange={(e) => updateSetting('defaultCurrency', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="CAD">CAD - Canadian Dollar</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time Zone</label>
                  <select
                    value={settings.timeZone}
                    onChange={(e) => updateSetting('timeZone', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="America/Edmonton">Mountain Time (MT)</option>
                    <option value="America/Toronto">Eastern Time (ET)</option>
                    <option value="America/Vancouver">Pacific Time (PT)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Week Start Day</label>
                  <select
                    value={settings.weekStartDay}
                    onChange={(e) => updateSetting('weekStartDay', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="monday">Monday</option>
                    <option value="sunday">Sunday</option>
                  </select>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Auto-approve timesheets</label>
                    <button
                      type="button"
                      onClick={() => toggleSetting('autoApproveTimesheets')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.autoApproveTimesheets ? 'bg-pink-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.autoApproveTimesheets ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Require expense receipts</label>
                    <button
                      type="button"
                      onClick={() => toggleSetting('requireExpenseReceipts')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.requireExpenseReceipts ? 'bg-pink-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.requireExpenseReceipts ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Management Settings Tab */}
      {activeSettingsTab === 'users' && (
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* User Roles */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">User Roles & Permissions</h3>
              <div className="space-y-4">
                {userRoles.map((role) => (
                  <div key={role.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">{role.name}</h4>
                      <button 
                        onClick={() => handleEditRole(role)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{role.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {role.permissions.map((permission) => (
                        <span key={permission} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                          {permission}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                
                <button 
                  onClick={handleAddRole}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-pink-500 transition-colors"
                >
                  <Plus className="w-5 h-5 mx-auto mb-2 text-gray-400" />
                  <span className="text-sm text-gray-600">Add New Role</span>
                </button>
              </div>
            </div>

            {/* Access Control */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Access Control</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password Requirements</label>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.passwordMinLength}
                        onChange={(e) => updateSetting('passwordMinLength', e.target.checked)}
                        className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                      />
                      <label className="ml-2 text-sm text-gray-700">Minimum 8 characters</label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.passwordRequireNumbers}
                        onChange={(e) => updateSetting('passwordRequireNumbers', e.target.checked)}
                        className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                      />
                      <label className="ml-2 text-sm text-gray-700">Require numbers</label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.passwordRequireSymbols}
                        onChange={(e) => updateSetting('passwordRequireSymbols', e.target.checked)}
                        className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                      />
                      <label className="ml-2 text-sm text-gray-700">Require special characters</label>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
                  <input
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500"
                    min="15"
                    max="480"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Two-Factor Authentication</label>
                  <button
                    type="button"
                    onClick={() => toggleSetting('twoFactorAuth')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.twoFactorAuth ? 'bg-pink-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.twoFactorAuth ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Billing & Rates Settings Tab */}
      {activeSettingsTab === 'billing' && (
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Default Rates */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Default Hourly Rates</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Junior Developer</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">$</span>
                      <input
                        type="number"
                        value={settings.rates.juniorDeveloper}
                        onChange={(e) => updateRate('juniorDeveloper', parseFloat(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-pink-500"
                        step="0.01"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Senior Developer</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">$</span>
                      <input
                        type="number"
                        value={settings.rates.seniorDeveloper}
                        onChange={(e) => updateRate('seniorDeveloper', parseFloat(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-pink-500"
                        step="0.01"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Project Manager</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">$</span>
                      <input
                        type="number"
                        value={settings.rates.projectManager}
                        onChange={(e) => updateRate('projectManager', parseFloat(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-pink-500"
                        step="0.01"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Designer</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">$</span>
                      <input
                        type="number"
                        value={settings.rates.designer}
                        onChange={(e) => updateRate('designer', parseFloat(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-pink-500"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={handleAddRate}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-pink-500 transition-colors"
                >
                  <Plus className="w-4 h-4 inline mr-2 text-gray-400" />
                  <span className="text-sm text-gray-600">Add Custom Rate</span>
                </button>
              </div>
            </div>

            {/* Billing Configuration */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Billing Configuration</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Prefix</label>
                  <input
                    type="text"
                    value={settings.invoicePrefix}
                    onChange={(e) => updateSetting('invoicePrefix', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500"
                    placeholder="WEW"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tax Rate (%)</label>
                  <input
                    type="number"
                    value={settings.taxRate}
                    onChange={(e) => updateSetting('taxRate', parseFloat(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500"
                    step="0.01"
                    min="0"
                    max="100"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Terms</label>
                  <select
                    value={settings.paymentTerms}
                    onChange={(e) => updateSetting('paymentTerms', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="net15">Net 15 Days</option>
                    <option value="net30">Net 30 Days</option>
                    <option value="net45">Net 45 Days</option>
                    <option value="net60">Net 60 Days</option>
                  </select>
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Auto-generate invoices</label>
                  <button
                    type="button"
                    onClick={() => toggleSetting('autoGenerateInvoices')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.autoGenerateInvoices ? 'bg-pink-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.autoGenerateInvoices ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Settings Tab */}
      {activeSettingsTab === 'security' && (
        <div className="px-6 py-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Security Configuration</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h4 className="font-medium text-gray-900">Login Security</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Enforce strong passwords</label>
                    <button
                      type="button"
                      onClick={() => toggleSetting('enforceStrongPasswords')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.enforceStrongPasswords ? 'bg-pink-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.enforceStrongPasswords ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Lock accounts after failed attempts</label>
                    <button
                      type="button"
                      onClick={() => toggleSetting('lockAfterFailedAttempts')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.lockAfterFailedAttempts ? 'bg-pink-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.lockAfterFailedAttempts ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Failed attempt limit</label>
                    <input
                      type="number"
                      value={settings.failedAttemptLimit}
                      onChange={(e) => updateSetting('failedAttemptLimit', parseInt(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500"
                      min="3"
                      max="10"
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <h4 className="font-medium text-gray-900">Data Protection</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Encrypt sensitive data</label>
                    <button
                      type="button"
                      onClick={() => toggleSetting('encryptSensitiveData')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.encryptSensitiveData ? 'bg-pink-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.encryptSensitiveData ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Log all admin actions</label>
                    <button
                      type="button"
                      onClick={() => toggleSetting('logAdminActions')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.logAdminActions ? 'bg-pink-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.logAdminActions ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backup & Data Management Tab */}
      {activeSettingsTab === 'backup' && (
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Backup Configuration</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Automatic backups</label>
                  <button
                    type="button"
                    onClick={() => toggleSetting('automaticBackups')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.automaticBackups ? 'bg-pink-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.automaticBackups ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Backup frequency</label>
                  <select
                    value={settings.backupFrequency}
                    onChange={(e) => updateSetting('backupFrequency', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Retention period (days)</label>
                  <input
                    type="number"
                    value={settings.backupRetention}
                    onChange={(e) => updateSetting('backupRetention', parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500"
                    min="7"
                    max="365"
                  />
                </div>
                
                <div className="pt-4 space-y-2">
                  <button 
                    onClick={createBackup}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create Backup Now
                  </button>
                  <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                    Download Latest Backup
                  </button>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Backups</h3>
              <div className="space-y-3">
                {recentBackups.map((backup, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{backup.date}</p>
                      <p className="text-xs text-gray-500">{backup.size} • {backup.type}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => downloadBackup(backup)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteBackup(backup)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Role Modal */}
      {showAddRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">
                {editingRole ? 'Edit Role' : 'Add New Role'}
              </h3>
              <button 
                onClick={() => setShowAddRoleModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                {editingRole ? 'Update role information below.' : 'Fill in the role details below.'}
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role Name</label>
                  <input
                    type="text"
                    defaultValue={editingRole?.name || ''}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500"
                    placeholder="Enter role name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    defaultValue={editingRole?.description || ''}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500"
                    placeholder="Enter role description"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 pt-6 border-t">
                <button
                  onClick={() => setShowAddRoleModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
                >
                  {editingRole ? 'Update Role' : 'Add Role'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Rate Modal */}
      {showAddRateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">
                {editingRate ? 'Edit Rate' : 'Add Custom Rate'}
              </h3>
              <button 
                onClick={() => setShowAddRateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rate Name</label>
                  <input
                    type="text"
                    defaultValue={editingRate?.name || ''}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500"
                    placeholder="e.g., Senior Designer"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hourly Rate</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                    <input
                      type="number"
                      defaultValue={editingRate?.value || ''}
                      className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-pink-500"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 pt-6 border-t">
                <button
                  onClick={() => setShowAddRateModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
                >
                  {editingRate ? 'Update Rate' : 'Add Rate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
