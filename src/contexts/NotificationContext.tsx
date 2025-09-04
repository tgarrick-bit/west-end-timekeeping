'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { 
  Notification, 
  NotificationType, 
  NotificationPreferences,
  NotificationStats,
  NOTIFICATION_TYPES,
  PRIORITIES
} from '@/types/notifications';
import { notificationService } from '@/lib/notificationService';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  stats: NotificationStats;
  preferences: NotificationPreferences;
  isLoading: boolean;
  
  // Actions
  createNotification: (type: NotificationType, userId: string, relatedId?: string, relatedType?: 'timesheet' | 'expense' | 'employee' | 'system', metadata?: Record<string, any>) => Notification;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (notificationId: string) => void;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => void;
  
  // Utility
  getNotificationsByType: (type: NotificationType) => Notification[];
  getNotificationsByPriority: (priority: string) => Notification[];
  hasUnreadNotifications: (type?: NotificationType) => boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Default notification preferences
const defaultPreferences: NotificationPreferences = {
  userId: '',
  email: true,
  browser: true,
  timesheets: true,
  expenses: true,
  deadlines: true,
  system: true,
  frequency: 'immediate',
  quietHours: {
    start: '22:00',
    end: '08:00',
    enabled: false
  }
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    byType: Object.values(NOTIFICATION_TYPES).reduce((acc, type) => {
      acc[type] = 0;
      return acc;
    }, {} as Record<NotificationType, number>)
  });
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize notification service
  useEffect(() => {
    const initializeServices = async () => {
      try {
        await notificationService.initialize();
        
        // Start notification scheduler in development mode
        if (process.env.NODE_ENV === 'development') {
          import('@/lib/notificationScheduler').then(({ notificationScheduler }) => {
            notificationScheduler.start();
          });
        }
      } catch (error) {
        console.error('Failed to initialize notification services:', error);
      }
    };
    
    initializeServices();
  }, []);

  // Load user notifications when user changes
  useEffect(() => {
    if (user) {
      loadUserNotifications();
      loadUserPreferences();
    } else {
      setNotifications([]);
      setStats({
        total: 0,
        unread: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        byType: Object.values(NOTIFICATION_TYPES).reduce((acc, type) => {
          acc[type] = 0;
          return acc;
        }, {} as Record<NotificationType, number>)
      });
    }
  }, [user]);

  // Subscribe to notification changes
  useEffect(() => {
    if (!user) return;

    const unsubscribe = notificationService.subscribe((allNotifications) => {
      const userNotifications = notificationService.getUserNotifications(user.id);
      setNotifications(userNotifications);
      updateStats(userNotifications);
    });

    return unsubscribe;
  }, [user]);

  // Load user notifications
  const loadUserNotifications = useCallback(() => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const userNotifications = notificationService.getUserNotifications(user.id);
      setNotifications(userNotifications);
      updateStats(userNotifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load user preferences
  const loadUserPreferences = useCallback(() => {
    if (!user) return;
    
    try {
      const saved = localStorage.getItem(`notification_preferences_${user.id}`);
      if (saved) {
        const userPreferences = JSON.parse(saved);
        setPreferences({ ...defaultPreferences, ...userPreferences, userId: user.id });
      } else {
        setPreferences({ ...defaultPreferences, userId: user.id });
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
      setPreferences({ ...defaultPreferences, userId: user.id });
    }
  }, [user]);

  // Update notification statistics
  const updateStats = useCallback((userNotifications: Notification[]) => {
    const unread = userNotifications.filter(n => !n.isRead);
    
    const newStats: NotificationStats = {
      total: userNotifications.length,
      unread: unread.length,
      critical: unread.filter(n => n.priority === PRIORITIES.CRITICAL).length,
      high: unread.filter(n => n.priority === PRIORITIES.HIGH).length,
      medium: unread.filter(n => n.priority === PRIORITIES.MEDIUM).length,
      low: unread.filter(n => n.priority === PRIORITIES.LOW).length,
      byType: Object.values(NOTIFICATION_TYPES).reduce((acc, type) => {
        acc[type] = unread.filter(n => n.type === type).length;
        return acc;
      }, {} as Record<NotificationType, number>)
    };
    
    setStats(newStats);
  }, []);

  // Create notification
  const createNotification = useCallback((
    type: NotificationType, 
    userId: string, 
    relatedId?: string, 
    relatedType?: 'timesheet' | 'expense' | 'employee' | 'system', 
    metadata?: Record<string, any>
  ) => {
    return notificationService.createNotification(type, userId, relatedId, relatedType, metadata);
  }, []);

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    notificationService.markAsRead(notificationId);
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    if (!user) return;
    notificationService.markAllAsRead(user.id);
  }, [user]);

  // Delete notification
  const deleteNotification = useCallback((notificationId: string) => {
    notificationService.deleteNotification(notificationId);
  }, []);

  // Update user preferences
  const updatePreferences = useCallback((newPreferences: Partial<NotificationPreferences>) => {
    if (!user) return;
    
    const updatedPreferences = { ...preferences, ...newPreferences };
    setPreferences(updatedPreferences);
    
    try {
      localStorage.setItem(`notification_preferences_${user.id}`, JSON.stringify(updatedPreferences));
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }, [preferences, user]);

  // Get notifications by type
  const getNotificationsByType = useCallback((type: NotificationType) => {
    return notifications.filter(n => n.type === type);
  }, [notifications]);

  // Get notifications by priority
  const getNotificationsByPriority = useCallback((priority: string) => {
    return notifications.filter(n => n.priority === priority);
  }, [notifications]);

  // Check if user has unread notifications
  const hasUnreadNotifications = useCallback((type?: NotificationType) => {
    if (type) {
      return stats.byType[type] > 0;
    }
    return stats.unread > 0;
  }, [stats]);

  // Check if we're in quiet hours
  const isInQuietHours = useCallback(() => {
    if (!preferences.quietHours?.enabled) return false;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = preferences.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = preferences.quietHours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Handles overnight quiet hours (e.g., 22:00 to 08:00)
      return currentTime >= startTime || currentTime <= endTime;
    }
  }, [preferences.quietHours]);

  // Filter notifications based on preferences and quiet hours
  const filteredNotifications = useCallback(() => {
    if (isInQuietHours() && preferences.frequency === 'daily') {
      return notifications.filter(n => n.priority === PRIORITIES.CRITICAL);
    }
    return notifications;
  }, [notifications, isInQuietHours, preferences.frequency]);

  const value: NotificationContextType = {
    notifications: filteredNotifications(),
    unreadCount: stats.unread,
    stats,
    preferences,
    isLoading,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updatePreferences,
    getNotificationsByType,
    getNotificationsByPriority,
    hasUnreadNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
