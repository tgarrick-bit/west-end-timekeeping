'use client';

import { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { NOTIFICATION_TYPES, PRIORITIES } from '@/types/notifications';
import { 
  Bell, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info,
  Trash2,
  Check,
  Filter,
  Search,
  Settings,
  Download,
  Upload
} from 'lucide-react';

export default function NotificationsPage() {
  const { 
    notifications, 
    unreadCount, 
    stats,
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    preferences,
    updatePreferences
  } = useNotifications();
  
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showSettings, setShowSettings] = useState(false);

  // Filter notifications based on current filters
  const filteredNotifications = notifications.filter(notification => {
    // Type filter
    if (selectedType !== 'all' && notification.type !== selectedType) {
      return false;
    }
    
    // Priority filter
    if (filter === 'unread' && notification.isRead) {
      return false;
    }
    if (filter !== 'all' && filter !== 'unread' && notification.priority !== filter) {
      return false;
    }
    
    // Search filter
    if (searchTerm && !notification.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !notification.message.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case PRIORITIES.CRITICAL:
        return 'bg-red-100 text-red-800 border-red-200';
      case PRIORITIES.HIGH:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case PRIORITIES.MEDIUM:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case PRIORITIES.LOW:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case NOTIFICATION_TYPES.TIMESHEET_SUBMITTED:
      case NOTIFICATION_TYPES.TIMESHEET_APPROVED:
      case NOTIFICATION_TYPES.TIMESHEET_REJECTED:
        return '📅';
      case NOTIFICATION_TYPES.EXPENSE_SUBMITTED:
      case NOTIFICATION_TYPES.EXPENSE_APPROVED:
      case NOTIFICATION_TYPES.EXPENSE_REJECTED:
        return '💰';
      case NOTIFICATION_TYPES.TIMESHEET_OVERDUE:
        return '⚠️';
      case NOTIFICATION_TYPES.PERIOD_COMPLETE:
        return '✅';
      case NOTIFICATION_TYPES.DEADLINE_REMINDER:
        return '⏰';
      case NOTIFICATION_TYPES.PAYROLL_CUTOFF:
        return '💳';
      default:
        return '🔔';
    }
  };

  // Get notification type label
  const getTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Export notifications
  const exportNotifications = () => {
    const dataStr = JSON.stringify(filteredNotifications, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `notifications_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Bell className="w-8 h-8 text-pink-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notification Center</h1>
              <p className="text-gray-600">Manage and review all your notifications</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={exportNotifications}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Bell className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Unread</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.unread}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Critical</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.critical}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">High Priority</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.high}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              {/* Search */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search notifications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center space-x-3">
                {/* Type Filter */}
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  {Object.values(NOTIFICATION_TYPES).map(type => (
                    <option key={type} value={type}>
                      {getTypeLabel(type)}
                    </option>
                  ))}
                </select>

                {/* Priority Filter */}
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                >
                  <option value="all">All Priorities</option>
                  <option value="unread">Unread Only</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="px-3 py-2 text-sm text-pink-600 hover:text-pink-700 font-medium"
                    >
                      Mark All Read
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          {showSettings && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Notification Types</h4>
                  <div className="space-y-3">
                    {Object.entries({
                      timesheets: preferences.timesheets,
                      expenses: preferences.expenses,
                      deadlines: preferences.deadlines,
                      system: preferences.system
                    }).map(([key, value]) => (
                      <label key={key} className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => updatePreferences({ [key]: e.target.checked })}
                          className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                        />
                        <span className="text-sm text-gray-700 capitalize">{key}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Delivery Settings</h4>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={preferences.email}
                        onChange={(e) => updatePreferences({ email: e.target.checked })}
                        className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                      />
                      <span className="text-sm text-gray-700">Email notifications</span>
                    </label>
                    
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={preferences.browser}
                        onChange={(e) => updatePreferences({ browser: e.target.checked })}
                        className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                      />
                      <span className="text-sm text-gray-700">Browser notifications</span>
                    </label>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                      <select
                        value={preferences.frequency}
                        onChange={(e) => updatePreferences({ frequency: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      >
                        <option value="immediate">Immediate</option>
                        <option value="daily">Daily digest</option>
                        <option value="weekly">Weekly digest</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Notifications ({filteredNotifications.length})
                </h3>
                <div className="text-sm text-gray-500">
                  {unreadCount > 0 && `${unreadCount} unread`}
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {filteredNotifications.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No notifications found</p>
                  <p className="text-sm">Try adjusting your filters or search terms</p>
                </div>
              ) : (
                filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-6 py-4 hover:bg-gray-50 transition-colors ${
                      !notification.isRead ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      {/* Type Icon */}
                      <div className="flex-shrink-0 text-2xl">
                        {getTypeIcon(notification.type)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className={`text-sm font-medium ${
                              !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.title}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message}
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-2 ml-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(notification.priority)}`}>
                              {notification.priority}
                            </span>
                            
                            <span className="text-xs text-gray-500">
                              {new Date(notification.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        
                        {/* Metadata */}
                        {notification.metadata && Object.keys(notification.metadata).length > 0 && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              {Object.entries(notification.metadata).map(([key, value]) => (
                                <div key={key}>
                                  <span className="font-medium text-gray-700">{key}:</span>
                                  <span className="text-gray-600 ml-1">{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Actions */}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center space-x-2">
                            {!notification.isRead && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="flex items-center space-x-1 text-xs text-green-600 hover:text-green-700 font-medium"
                              >
                                <Check className="w-3 h-3" />
                                <span>Mark as read</span>
                              </button>
                            )}
                            
                            <span className="text-xs text-gray-400">
                              {notification.relatedType && `Related: ${notification.relatedType}`}
                            </span>
                          </div>
                          
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete notification"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
