'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, Trash2, Settings, Filter } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { Notification, NOTIFICATION_TYPES, PRIORITIES } from '@/types/notifications';
import { formatDistanceToNow } from 'date-fns';

interface NotificationBellProps {
  className?: string;
}

export default function NotificationBell({ className = '' }: NotificationBellProps) {
  const { notifications, unreadCount, markAsRead, deleteNotification, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical' | 'high'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter notifications based on current filter
  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.isRead;
      case 'critical':
        return notification.priority === PRIORITIES.CRITICAL;
      case 'high':
        return notification.priority === PRIORITIES.HIGH;
      default:
        return true;
    }
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
      default:
        return '🔔';
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    
    // Handle navigation based on notification type
    if (notification.relatedType === 'timesheet') {
      // Navigate to timesheet page
      window.location.href = '/timesheets';
    } else if (notification.relatedType === 'expense') {
      // Navigate to expenses page
      window.location.href = '/expenses';
    }
    
    // Close dropdown after a short delay
    setTimeout(() => setIsOpen(false), 300);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-pink-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-2 py-1 text-xs rounded ${
                    filter === 'all' ? 'bg-pink-100 text-pink-700' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`px-2 py-1 text-xs rounded ${
                    filter === 'unread' ? 'bg-pink-100 text-pink-700' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Unread
                </button>
                <button
                  onClick={() => setFilter('critical')}
                  className={`px-2 py-1 text-xs rounded ${
                    filter === 'critical' ? 'bg-red-100 text-red-700' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Critical
                </button>
                <button
                  onClick={() => setFilter('high')}
                  className={`px-2 py-1 text-xs rounded ${
                    filter === 'high' ? 'bg-orange-100 text-orange-700' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  High
                </button>
              </div>
            </div>
            
            {unreadCount > 0 && (
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-600">
                  {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-pink-600 hover:text-pink-700 font-medium"
                >
                  Mark all as read
                </button>
              </div>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No notifications</p>
                {filter !== 'all' && (
                  <button
                    onClick={() => setFilter('all')}
                    className="text-xs text-pink-600 hover:text-pink-700 mt-1"
                  >
                    View all notifications
                  </button>
                )}
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !notification.isRead ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start space-x-3">
                    {/* Type Icon */}
                    <div className="flex-shrink-0 text-lg">
                      {getTypeIcon(notification.type)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <p className={`text-sm font-medium ${
                          !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notification.title}
                        </p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(notification.priority)}`}>
                          {notification.priority}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </span>
                        
                        <div className="flex items-center space-x-1">
                          {!notification.isRead && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                              title="Mark as read"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          )}
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <button
                onClick={() => window.location.href = '/notifications'}
                className="text-xs text-pink-600 hover:text-pink-700 font-medium"
              >
                View all notifications
              </button>
              
              <button
                onClick={() => window.location.href = '/notifications/settings'}
                className="text-xs text-gray-600 hover:text-gray-900 flex items-center space-x-1"
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
