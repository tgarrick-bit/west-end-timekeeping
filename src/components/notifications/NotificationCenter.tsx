'use client';

import React, { useState, useMemo } from 'react';
import { 
  Bell, 
  Check, 
  Trash2, 
  Filter, 
  Search, 
  Settings, 
  Download,
  Send,
  AlertCircle,
  CheckCircle,
  Clock,
  Star
} from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { Notification, NOTIFICATION_TYPES, PRIORITIES, NotificationType, Priority } from '@/types/notifications';
import { formatDistanceToNow, format } from 'date-fns';

interface NotificationCenterProps {
  className?: string;
}

export default function NotificationCenter({ className = '' }: NotificationCenterProps) {
  const { 
    notifications, 
    stats, 
    preferences, 
    markAsRead, 
    deleteNotification, 
    markAllAsRead,
    updatePreferences 
  } = useNotifications();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'read' | 'unread'>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());

  // Filter notifications based on current filters
  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      // Search filter
      if (searchTerm && !notification.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !notification.message.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Type filter
      if (typeFilter !== 'all' && notification.type !== typeFilter) {
        return false;
      }
      
      // Priority filter
      if (priorityFilter !== 'all' && notification.priority !== priorityFilter) {
        return false;
      }
      
      // Status filter
      if (statusFilter === 'read' && !notification.isRead) {
        return false;
      }
      if (statusFilter === 'unread' && notification.isRead) {
        return false;
      }
      
      return true;
    });
  }, [notifications, searchTerm, typeFilter, priorityFilter, statusFilter]);

  // Handle bulk actions
  const handleBulkAction = (action: 'mark-read' | 'delete') => {
    if (selectedNotifications.size === 0) return;
    
    selectedNotifications.forEach(id => {
      if (action === 'mark-read') {
        markAsRead(id);
      } else if (action === 'delete') {
        deleteNotification(id);
      }
    });
    
    setSelectedNotifications(new Set());
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)));
    }
  };

  // Handle individual selection
  const handleSelectNotification = (id: string) => {
    const newSelected = new Set(selectedNotifications);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedNotifications(newSelected);
  };

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
      default:
        return '🔔';
    }
  };

  // Export notifications
  const exportNotifications = () => {
    const csvContent = [
      ['Type', 'Title', 'Message', 'Priority', 'Status', 'Created', 'Read'],
      ...filteredNotifications.map(n => [
        n.type,
        n.title,
        n.message,
        n.priority,
        n.isRead ? 'Read' : 'Unread',
        format(new Date(n.createdAt), 'yyyy-MM-dd HH:mm:ss'),
        n.readAt ? format(new Date(n.readAt), 'yyyy-MM-dd HH:mm:ss') : ''
      ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notifications_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bell className="w-6 h-6 text-pink-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Notification Center</h2>
              <p className="text-sm text-gray-600">
                {stats.total} total notifications • {stats.unread} unread
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={markAllAsRead}
              disabled={stats.unread === 0}
              className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4 mr-1 inline" />
              Mark All Read
            </button>
            
            <button
              onClick={exportNotifications}
              className="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4 mr-1 inline" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as NotificationType | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            {Object.values(NOTIFICATION_TYPES).map(type => (
              <option key={type} value={type}>{type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as Priority | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          >
            <option value="all">All Priorities</option>
            {Object.values(PRIORITIES).map(priority => (
              <option key={priority} value={priority}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'read' | 'unread')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedNotifications.size > 0 && (
        <div className="px-6 py-3 border-b border-gray-200 bg-blue-50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedNotifications.size} notification{selectedNotifications.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleBulkAction('mark-read')}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Check className="w-4 h-4 mr-1 inline" />
                Mark as Read
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-1 inline" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications List */}
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
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedNotifications.has(notification.id)}
                  onChange={() => handleSelectNotification(notification.id)}
                  className="mt-1 h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                />
                
                {/* Type Icon */}
                <div className="flex-shrink-0 text-2xl">
                  {getTypeIcon(notification.type)}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <h3 className={`text-sm font-medium ${
                        !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                      }`}>
                        {notification.title}
                      </h3>
                      {!notification.isRead && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          New
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(notification.priority)}`}>
                        {notification.priority}
                      </span>
                      
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-2">
                    {notification.message}
                  </p>
                  
                  {notification.metadata && Object.keys(notification.metadata).length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      {Object.entries(notification.metadata).map(([key, value]) => (
                        <span key={key} className="inline-block mr-3">
                          <strong>{key}:</strong> {String(value)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex items-center space-x-2">
                  {!notification.isRead && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Showing {filteredNotifications.length} of {notifications.length} notifications
          </span>
          
          <div className="flex items-center space-x-4">
            <span>Unread: {stats.unread}</span>
            <span>Critical: {stats.critical}</span>
            <span>High: {stats.high}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
