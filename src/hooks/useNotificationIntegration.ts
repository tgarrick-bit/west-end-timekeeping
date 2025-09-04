import { useCallback } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { NOTIFICATION_TYPES, PRIORITIES } from '@/types/notifications';

export interface NotificationIntegrationOptions {
  sendEmail?: boolean;
  metadata?: Record<string, any>;
}

export function useNotificationIntegration() {
  const { createNotification } = useNotifications();

  // Timesheet workflow notifications
  const notifyTimesheetSubmitted = useCallback(async (
    managerId: string,
    employeeName: string,
    period: string,
    totalHours: number,
    options: NotificationIntegrationOptions = {}
  ) => {
    // Create in-app notification
    const notification = createNotification(
      NOTIFICATION_TYPES.TIMESHEET_SUBMITTED,
      managerId,
      undefined,
      'timesheet',
      {
        employeeName,
        period,
        totalHours,
        submittedAt: new Date().toISOString(),
        ...options.metadata
      }
    );

    // Also send email notification to manager
    try {
      await fetch('/api/notifications/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: 'tgarrick@westendworkforce.com', // For testing (represents manager)
          notification: {
            id: `timesheet_submitted_${Date.now()}`,
            type: 'timesheet_submitted',
            title: `Timesheet Pending Approval - ${employeeName} submitted timesheet`,
            message: `${employeeName} submitted timesheet for ${period} (${totalHours} hours)`,
            priority: 'high',
            userId: managerId,
            relatedId: notification.id,
            relatedType: 'timesheet',
            isRead: false,
            isEmailSent: false,
            createdAt: new Date(),
            metadata: {
              employeeName,
              period,
              totalHours,
              submittedAt: new Date().toISOString(),
              ...options.metadata
            }
          },
          customData: {
            employeeName,
            period,
            totalHours,
            submittedAt: new Date().toISOString(),
            managerName: 'Manager',
            actionUrl: '#',
            reviewUrl: '#',
            ...options.metadata
          }
        }),
      });
    } catch (error) {
      console.error('Failed to send timesheet submission email:', error);
    }

    return notification;
  }, [createNotification]);

  const notifyTimesheetApproved = useCallback(async (
    employeeId: string,
    managerName: string,
    period: string,
    totalHours: number,
    options: NotificationIntegrationOptions = {}
  ) => {
    // Create in-app notification
    const notification = createNotification(
      NOTIFICATION_TYPES.TIMESHEET_APPROVED,
      employeeId,
      undefined,
      'timesheet',
      {
        managerName,
        period,
        totalHours,
        approvedAt: new Date().toISOString(),
        ...options.metadata
      }
    );

    // Also send email notification to employee
    try {
      await fetch('/api/notifications/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: 'tgarrick@westendworkforce.com', // For testing (represents employee)
          notification: {
            id: `timesheet_approved_${Date.now()}`,
            type: 'timesheet_approved',
            title: 'Timesheet Approved - Your timesheet has been approved',
            message: `Your timesheet for ${period} (${totalHours} hours) has been approved by ${managerName}`,
            priority: 'medium',
            userId: employeeId,
            relatedId: notification.id,
            relatedType: 'timesheet',
            isRead: false,
            isEmailSent: false,
            createdAt: new Date(),
            metadata: {
              managerName,
              period,
              totalHours,
              approvedAt: new Date().toISOString(),
              ...options.metadata
            }
          },
          customData: {
            managerName,
            period,
            totalHours,
            approvedAt: new Date().toISOString(),
            employeeName: 'Employee',
            actionUrl: '#',
            viewUrl: '#',
            ...options.metadata
          }
        }),
      });
    } catch (error) {
      console.error('Failed to send timesheet approval email:', error);
    }

    return notification;
  }, [createNotification]);

  const notifyTimesheetRejected = useCallback((
    employeeId: string,
    managerName: string,
    period: string,
    reason: string,
    options: NotificationIntegrationOptions = {}
  ) => {
    return createNotification(
      NOTIFICATION_TYPES.TIMESHEET_REJECTED,
      employeeId,
      undefined,
      'timesheet',
      {
        managerName,
        period,
        reason,
        rejectedAt: new Date().toISOString(),
        ...options.metadata
      }
    );
  }, [createNotification]);

  // Expense workflow notifications
  const notifyExpenseSubmitted = useCallback(async (
    managerId: string,
    employeeName: string,
    amount: number,
    description: string,
    options: NotificationIntegrationOptions = {}
  ) => {
    // Create in-app notification
    const notification = createNotification(
      NOTIFICATION_TYPES.EXPENSE_SUBMITTED,
      managerId,
      undefined,
      'expense',
      {
        employeeName,
        amount,
        description,
        submittedAt: new Date().toISOString(),
        ...options.metadata
      }
    );

    // Also send email notification to manager
    try {
      await fetch('/api/notifications/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: 'tgarrick@westendworkforce.com', // For testing (represents manager)
          notification: {
            id: `expense_submitted_${Date.now()}`,
            type: 'expense_submitted',
            title: `Expense Report Pending - ${employeeName} submitted $${amount.toFixed(2)} expense`,
            message: `${employeeName} submitted expense report for $${amount.toFixed(2)}: ${description}`,
            priority: 'high',
            userId: managerId,
            relatedId: notification.id,
            relatedType: 'expense',
            isRead: false,
            isEmailSent: false,
            createdAt: new Date(),
            metadata: {
              employeeName,
              amount,
              description,
              submittedAt: new Date().toISOString(),
              ...options.metadata
            }
          },
          customData: {
            employeeName,
            amount,
            description,
            submittedAt: new Date().toISOString(),
            managerName: 'Manager',
            actionUrl: '#',
            reviewUrl: '#',
            receiptUrl: '#',
            ...options.metadata
          }
        }),
      });
    } catch (error) {
      console.error('Failed to send expense submission email:', error);
    }

    return notification;
  }, [createNotification]);

  const notifyExpenseApproved = useCallback(async (
    employeeId: string,
    managerName: string,
    amount: number,
    description: string,
    options: NotificationIntegrationOptions = {}
  ) => {
    // Create in-app notification
    const notification = createNotification(
      NOTIFICATION_TYPES.EXPENSE_APPROVED,
      employeeId,
      undefined,
      'expense',
      {
        managerName,
        amount,
        description,
        approvedAt: new Date().toISOString(),
        ...options.metadata
      }
    );

    // Also send email notification to employee
    try {
      await fetch('/api/notifications/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: 'tgarrick@westendworkforce.com', // For testing (represents employee)
          notification: {
            id: `expense_approved_${Date.now()}`,
            type: 'expense_approved',
            title: 'Expense Report Approved - Your expense has been approved',
            message: `Your expense report for $${amount.toFixed(2)}: ${description} has been approved by ${managerName}`,
            priority: 'medium',
            userId: employeeId,
            relatedId: notification.id,
            relatedType: 'expense',
            isRead: false,
            isEmailSent: false,
            createdAt: new Date(),
            metadata: {
              managerName,
              amount,
              description,
              approvedAt: new Date().toISOString(),
              ...options.metadata
            }
          },
          customData: {
            managerName,
            amount,
            description,
            approvedAt: new Date().toISOString(),
            employeeName: 'Employee',
            actionUrl: '#',
            viewUrl: '#',
            ...options.metadata
          }
        }),
      });
    } catch (error) {
      console.error('Failed to send expense approval email:', error);
    }

    return notification;
  }, [createNotification]);

  const notifyExpenseRejected = useCallback((
    employeeId: string,
    managerName: string,
    amount: number,
    description: string,
    reason: string,
    options: NotificationIntegrationOptions = {}
  ) => {
    return createNotification(
      NOTIFICATION_TYPES.EXPENSE_REJECTED,
      employeeId,
      undefined,
      'expense',
      {
        managerName,
        amount,
        description,
        reason,
        rejectedAt: new Date().toISOString(),
        ...options.metadata
      }
    );
  }, [createNotification]);

  // Overdue and deadline notifications
  const notifyTimesheetOverdue = useCallback((
    employeeId: string,
    period: string,
    daysOverdue: number,
    options: NotificationIntegrationOptions = {}
  ) => {
    return createNotification(
      NOTIFICATION_TYPES.TIMESHEET_OVERDUE,
      employeeId,
      undefined,
      'timesheet',
      {
        period,
        daysOverdue,
        dueDate: new Date().toISOString(),
        ...options.metadata
      }
    );
  }, [createNotification]);

  const notifyDeadlineReminder = useCallback((
    userId: string,
    type: string,
    deadline: string,
    daysUntil: number,
    options: NotificationIntegrationOptions = {}
  ) => {
    return createNotification(
      NOTIFICATION_TYPES.DEADLINE_REMINDER,
      userId,
      undefined,
      'system',
      {
        type,
        deadline,
        daysUntil,
        ...options.metadata
      }
    );
  }, [createNotification]);

  // Manager notifications
  const notifyManagerPendingReminder = useCallback((
    managerId: string,
    pendingCount: number,
    pendingTimesheets: number,
    pendingExpenses: number,
    options: NotificationIntegrationOptions = {}
  ) => {
    return createNotification(
      NOTIFICATION_TYPES.MANAGER_PENDING_REMINDER,
      managerId,
      undefined,
      'system',
      {
        pendingCount,
        pendingTimesheets,
        pendingExpenses,
        reminderAt: new Date().toISOString(),
        ...options.metadata
      }
    );
  }, [createNotification]);

  // Cross-check notifications
  const notifyExpensesPendingReminder = useCallback((
    employeeId: string,
    period: string,
    timesheetStatus: string,
    pendingExpenses: number,
    options: NotificationIntegrationOptions = {}
  ) => {
    return createNotification(
      NOTIFICATION_TYPES.EXPENSES_PENDING_REMINDER,
      employeeId,
      undefined,
      'expense',
      {
        period,
        timesheetStatus,
        pendingExpenses,
        reminderAt: new Date().toISOString(),
        ...options.metadata
      }
    );
  }, [createNotification]);

  const notifyPeriodComplete = useCallback((
    employeeId: string,
    period: string,
    timesheetStatus: string,
    expensesStatus: string,
    options: NotificationIntegrationOptions = {}
  ) => {
    return createNotification(
      NOTIFICATION_TYPES.PERIOD_COMPLETE,
      employeeId,
      undefined,
      'timesheet',
      {
        period,
        timesheetStatus,
        expensesStatus,
        completedAt: new Date().toISOString(),
        ...options.metadata
      }
    );
  }, [createNotification]);

  // System notifications
  const notifyNewEmployeeAdded = useCallback((
    managerId: string,
    employeeName: string,
    department: string,
    options: NotificationIntegrationOptions = {}
  ) => {
    return createNotification(
      NOTIFICATION_TYPES.NEW_EMPLOYEE_ADDED,
      managerId,
      undefined,
      'employee',
      {
        employeeName,
        department,
        addedAt: new Date().toISOString(),
        ...options.metadata
      }
    );
  }, [createNotification]);

  const notifyAdminApprovalActivity = useCallback((
    adminId: string,
    activity: string,
    details: Record<string, any>,
    options: NotificationIntegrationOptions = {}
  ) => {
    return createNotification(
      NOTIFICATION_TYPES.ADMIN_APPROVAL_ACTIVITY,
      adminId,
      undefined,
      'system',
      {
        activity,
        details,
        timestamp: new Date().toISOString(),
        ...options.metadata
      }
    );
  }, [createNotification]);

  // Payroll and system notifications
  const notifyPayrollCutoff = useCallback((
    userId: string,
    cutoffDate: string,
    daysUntil: number,
    options: NotificationIntegrationOptions = {}
  ) => {
    return createNotification(
      NOTIFICATION_TYPES.PAYROLL_CUTOFF,
      userId,
      undefined,
      'system',
      {
        cutoffDate,
        daysUntil,
        reminderAt: new Date().toISOString(),
        ...options.metadata
      }
    );
  }, [createNotification]);

  const notifySystemIntegration = useCallback((
    userId: string,
    system: string,
    status: string,
    details: Record<string, any>,
    options: NotificationIntegrationOptions = {}
  ) => {
    return createNotification(
      NOTIFICATION_TYPES.SYSTEM_INTEGRATION,
      userId,
      undefined,
      'system',
      {
        system,
        status,
        details,
        timestamp: new Date().toISOString(),
        ...options.metadata
      }
    );
  }, [createNotification]);

  // Performance and training notifications
  const notifyTrainingReminder = useCallback((
    userId: string,
    trainingType: string,
    scheduledDate: string,
    options: NotificationIntegrationOptions = {}
  ) => {
    return createNotification(
      NOTIFICATION_TYPES.TRAINING_REMINDER,
      userId,
      undefined,
      'system',
      {
        trainingType,
        scheduledDate,
        reminderAt: new Date().toISOString(),
        ...options.metadata
      }
    );
  }, [createNotification]);

  const notifyPerformanceReview = useCallback((
    userId: string,
    reviewDate: string,
    reviewer: string,
    options: NotificationIntegrationOptions = {}
  ) => {
    return createNotification(
      NOTIFICATION_TYPES.PERFORMANCE_REVIEW,
      userId,
      undefined,
      'system',
      {
        reviewDate,
        reviewer,
        scheduledAt: new Date().toISOString(),
        ...options.metadata
      }
    );
  }, [createNotification]);

  const notifyWorkAnniversary = useCallback((
    userId: string,
    years: number,
    startDate: string,
    options: NotificationIntegrationOptions = {}
  ) => {
    return createNotification(
      NOTIFICATION_TYPES.WORK_ANNIVERSARY,
      userId,
      undefined,
      'system',
      {
        years,
        startDate,
        anniversaryDate: new Date().toISOString(),
        ...options.metadata
      }
    );
  }, [createNotification]);

  // Overtime and unusual hours notifications
  const notifyOvertimeAlert = useCallback((
    userId: string,
    hours: number,
    period: string,
    threshold: number = 40,
    options: NotificationIntegrationOptions = {}
  ) => {
    return createNotification(
      NOTIFICATION_TYPES.OVERTIME_ALERT,
      userId,
      undefined,
      'timesheet',
      {
        hours,
        period,
        threshold,
        alertAt: new Date().toISOString(),
        ...options.metadata
      }
    );
  }, [createNotification]);

  const notifyLongShiftAlert = useCallback((
    userId: string,
    shiftHours: number,
    date: string,
    threshold: number = 10,
    options: NotificationIntegrationOptions = {}
  ) => {
    return createNotification(
      NOTIFICATION_TYPES.LONG_SHIFT_ALERT,
      userId,
      undefined,
      'timesheet',
      {
        shiftHours,
        date,
        threshold,
        alertAt: new Date().toISOString(),
        ...options.metadata
      }
    );
  }, [createNotification]);

  return {
    // Timesheet workflow
    notifyTimesheetSubmitted,
    notifyTimesheetApproved,
    notifyTimesheetRejected,
    
    // Expense workflow
    notifyExpenseSubmitted,
    notifyExpenseApproved,
    notifyExpenseRejected,
    
    // Overdue and deadlines
    notifyTimesheetOverdue,
    notifyDeadlineReminder,
    
    // Manager notifications
    notifyManagerPendingReminder,
    
    // Cross-check notifications
    notifyExpensesPendingReminder,
    notifyPeriodComplete,
    
    // System notifications
    notifyNewEmployeeAdded,
    notifyAdminApprovalActivity,
    
    // Payroll and system
    notifyPayrollCutoff,
    notifySystemIntegration,
    
    // Performance and training
    notifyTrainingReminder,
    notifyPerformanceReview,
    notifyWorkAnniversary,
    
    // Overtime and unusual hours
    notifyOvertimeAlert,
    notifyLongShiftAlert
  };
}
