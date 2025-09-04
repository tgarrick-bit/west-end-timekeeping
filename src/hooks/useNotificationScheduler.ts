import { useCallback, useEffect, useState } from 'react';
import { notificationScheduler } from '@/lib/notificationScheduler';
import { useNotifications } from '@/contexts/NotificationContext';

export function useNotificationScheduler() {
  const { createNotification } = useNotifications();
  const [isRunning, setIsRunning] = useState(false);
  const [activeIntervals, setActiveIntervals] = useState<string[]>([]);

  // Start the scheduler
  const startScheduler = useCallback(() => {
    try {
      notificationScheduler.start();
      setIsRunning(true);
      updateStatus();
    } catch (error) {
      console.error('Failed to start notification scheduler:', error);
    }
  }, []);

  // Stop the scheduler
  const stopScheduler = useCallback(() => {
    try {
      notificationScheduler.stop();
      setIsRunning(false);
      setActiveIntervals([]);
    } catch (error) {
      console.error('Failed to stop notification scheduler:', error);
    }
  }, []);

  // Update scheduler status
  const updateStatus = useCallback(() => {
    try {
      const status = notificationScheduler.getStatus();
      setIsRunning(status.isRunning);
      setActiveIntervals(status.activeIntervals);
    } catch (error) {
      console.error('Failed to get scheduler status:', error);
    }
  }, []);

  // Manually trigger specific checks
  const triggerCheck = useCallback(async (type: 'overdue' | 'deadlines' | 'payroll' | 'approvals') => {
    try {
      await notificationScheduler.triggerCheck(type);
      updateStatus();
    } catch (error) {
      console.error(`Failed to trigger ${type} check:`, error);
    }
  }, [updateStatus]);

  // Schedule a custom reminder
  const scheduleCustomReminder = useCallback((
    userId: string,
    type: string,
    message: string,
    reminderDate: Date,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ) => {
    try {
      const now = new Date();
      const timeUntilReminder = reminderDate.getTime() - now.getTime();
      
      if (timeUntilReminder > 0) {
        setTimeout(() => {
          createNotification(
            'deadline_reminder' as any,
            userId,
            undefined,
            'system',
            {
              type,
              message,
              priority,
              reminderDate: reminderDate.toISOString()
            }
          );
        }, timeUntilReminder);
        
        return true;
      } else {
        // Reminder date is in the past, create notification immediately
        createNotification(
          'deadline_reminder' as any,
          userId,
          undefined,
          'system',
          {
            type,
            message,
            priority,
            reminderDate: reminderDate.toISOString(),
            overdue: true
          }
        );
        return false;
      }
    } catch (error) {
      console.error('Failed to schedule custom reminder:', error);
      return false;
    }
  }, [createNotification]);

  // Schedule recurring reminders
  const scheduleRecurringReminder = useCallback((
    userId: string,
    type: string,
    message: string,
    interval: 'daily' | 'weekly' | 'monthly',
    startDate: Date = new Date(),
    endDate?: Date
  ) => {
    try {
      const intervalMs = {
        daily: 24 * 60 * 60 * 1000,
        weekly: 7 * 24 * 60 * 60 * 1000,
        monthly: 30 * 24 * 60 * 60 * 1000
      }[interval];

      let currentDate = new Date(startDate);
      
      const scheduleNext = () => {
        if (endDate && currentDate > endDate) {
          return; // Stop scheduling
        }

        createNotification(
          'deadline_reminder' as any,
          userId,
          undefined,
          'system',
          {
            type,
            message,
            interval,
            reminderDate: currentDate.toISOString()
          }
        );

        // Schedule next reminder
        currentDate = new Date(currentDate.getTime() + intervalMs);
        setTimeout(scheduleNext, intervalMs);
      };

      // Start the recurring schedule
      scheduleNext();
      
      return true;
    } catch (error) {
      console.error('Failed to schedule recurring reminder:', error);
      return false;
    }
  }, [createNotification]);

  // Get scheduler status on mount
  useEffect(() => {
    updateStatus();
  }, [updateStatus]);

  return {
    isRunning,
    activeIntervals,
    startScheduler,
    stopScheduler,
    triggerCheck,
    scheduleCustomReminder,
    scheduleRecurringReminder,
    updateStatus
  };
}
