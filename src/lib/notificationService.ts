import { 
  Notification, 
  NotificationType, 
  Priority, 
  NotificationTemplate,
  CrossCheckResult,
  NOTIFICATION_TYPES,
  PRIORITIES
} from '@/types/notifications';

// Notification templates for different types
export const NOTIFICATION_TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  [NOTIFICATION_TYPES.TIMESHEET_SUBMITTED]: {
    type: NOTIFICATION_TYPES.TIMESHEET_SUBMITTED,
    title: 'Timesheet Submitted',
    message: 'A new timesheet has been submitted for your approval',
    priority: PRIORITIES.HIGH,
    emailSubject: 'Timesheet Submitted - Action Required',
    emailBody: 'A new timesheet has been submitted and requires your approval.'
  },
  [NOTIFICATION_TYPES.TIMESHEET_APPROVED]: {
    type: NOTIFICATION_TYPES.TIMESHEET_APPROVED,
    title: 'Timesheet Approved',
    message: 'Your timesheet has been approved',
    priority: PRIORITIES.MEDIUM,
    emailSubject: 'Timesheet Approved',
    emailBody: 'Your timesheet has been approved by your manager.'
  },
  [NOTIFICATION_TYPES.TIMESHEET_REJECTED]: {
    type: NOTIFICATION_TYPES.TIMESHEET_REJECTED,
    title: 'Timesheet Rejected',
    message: 'Your timesheet has been rejected',
    priority: PRIORITIES.HIGH,
    emailSubject: 'Timesheet Rejected - Action Required',
    emailBody: 'Your timesheet has been rejected. Please review and resubmit.'
  },
  [NOTIFICATION_TYPES.EXPENSE_SUBMITTED]: {
    type: NOTIFICATION_TYPES.EXPENSE_SUBMITTED,
    title: 'Expense Submitted',
    message: 'A new expense has been submitted for your approval',
    priority: PRIORITIES.HIGH,
    emailSubject: 'Expense Submitted - Action Required',
    emailBody: 'A new expense has been submitted and requires your approval.'
  },
  [NOTIFICATION_TYPES.EXPENSE_APPROVED]: {
    type: NOTIFICATION_TYPES.EXPENSE_APPROVED,
    title: 'Expense Approved',
    message: 'Your expense has been approved',
    priority: PRIORITIES.MEDIUM,
    emailSubject: 'Expense Approved',
    emailBody: 'Your expense has been approved by your manager.'
  },
  [NOTIFICATION_TYPES.EXPENSE_REJECTED]: {
    type: NOTIFICATION_TYPES.EXPENSE_REJECTED,
    title: 'Expense Rejected',
    message: 'Your expense has been rejected',
    priority: PRIORITIES.HIGH,
    emailSubject: 'Expense Rejected - Action Required',
    emailBody: 'Your expense has been rejected. Please review and resubmit.'
  },
  [NOTIFICATION_TYPES.EXPENSES_PENDING_REMINDER]: {
    type: NOTIFICATION_TYPES.EXPENSES_PENDING_REMINDER,
    title: 'Expenses Pending',
    message: 'You have pending expenses that need to be submitted',
    priority: PRIORITIES.MEDIUM,
    emailSubject: 'Expenses Pending - Reminder',
    emailBody: 'You have pending expenses that need to be submitted for approval.'
  },
  [NOTIFICATION_TYPES.TIMESHEET_OVERDUE]: {
    type: NOTIFICATION_TYPES.TIMESHEET_OVERDUE,
    title: 'Timesheet Overdue',
    message: 'Your timesheet is overdue and needs immediate attention',
    priority: PRIORITIES.CRITICAL,
    emailSubject: 'Timesheet Overdue - Urgent Action Required',
    emailBody: 'Your timesheet is overdue and requires immediate submission.'
  },
  [NOTIFICATION_TYPES.MANAGER_PENDING_REMINDER]: {
    type: NOTIFICATION_TYPES.MANAGER_PENDING_REMINDER,
    title: 'Pending Approvals',
    message: 'You have pending items that require your approval',
    priority: PRIORITIES.HIGH,
    emailSubject: 'Pending Approvals - Action Required',
    emailBody: 'You have pending timesheets and expenses that require your approval.'
  },
  [NOTIFICATION_TYPES.PERIOD_COMPLETE]: {
    type: NOTIFICATION_TYPES.PERIOD_COMPLETE,
    title: 'Period Complete',
    message: 'Your timesheet and expenses for this period have been approved',
    priority: PRIORITIES.MEDIUM,
    emailSubject: 'Period Complete - Congratulations!',
    emailBody: 'Your timesheet and expenses for this period have been approved.'
  },
  [NOTIFICATION_TYPES.NEW_EMPLOYEE_ADDED]: {
    type: NOTIFICATION_TYPES.NEW_EMPLOYEE_ADDED,
    title: 'New Employee Added',
    message: 'A new employee has been added to your team',
    priority: PRIORITIES.INFO,
    emailSubject: 'New Team Member Added',
    emailBody: 'A new employee has been added to your team.'
  },
  [NOTIFICATION_TYPES.ADMIN_APPROVAL_ACTIVITY]: {
    type: NOTIFICATION_TYPES.ADMIN_APPROVAL_ACTIVITY,
    title: 'Approval Activity',
    message: 'New approval activity has occurred in the system',
    priority: PRIORITIES.INFO,
    emailSubject: 'System Approval Activity',
    emailBody: 'New approval activity has occurred in the system.'
  },
  [NOTIFICATION_TYPES.EMAIL_NOTIFICATION]: {
    type: NOTIFICATION_TYPES.EMAIL_NOTIFICATION,
    title: 'Email Notification',
    message: 'You have received an email notification',
    priority: PRIORITIES.LOW,
    emailSubject: 'Email Notification',
    emailBody: 'You have received an email notification.'
  },
  [NOTIFICATION_TYPES.DEADLINE_REMINDER]: {
    type: NOTIFICATION_TYPES.DEADLINE_REMINDER,
    title: 'Deadline Reminder',
    message: 'A deadline is approaching',
    priority: PRIORITIES.MEDIUM,
    emailSubject: 'Deadline Reminder',
    emailBody: 'A deadline is approaching and requires your attention.'
  },
  [NOTIFICATION_TYPES.PAYROLL_CUTOFF]: {
    type: NOTIFICATION_TYPES.PAYROLL_CUTOFF,
    title: 'Payroll Cutoff',
    message: 'Payroll cutoff is approaching',
    priority: PRIORITIES.HIGH,
    emailSubject: 'Payroll Cutoff Reminder',
    emailBody: 'Payroll cutoff is approaching. Please ensure all timesheets and expenses are submitted.'
  },
  [NOTIFICATION_TYPES.OVERTIME_ALERT]: {
    type: NOTIFICATION_TYPES.OVERTIME_ALERT,
    title: 'Overtime Alert',
    message: 'Overtime hours detected in your timesheet',
    priority: PRIORITIES.MEDIUM,
    emailSubject: 'Overtime Hours Detected',
    emailBody: 'Overtime hours have been detected in your timesheet.'
  },
  [NOTIFICATION_TYPES.LONG_SHIFT_ALERT]: {
    type: NOTIFICATION_TYPES.LONG_SHIFT_ALERT,
    title: 'Long Shift Alert',
    message: 'Unusually long shift detected',
    priority: PRIORITIES.MEDIUM,
    emailSubject: 'Long Shift Detected',
    emailBody: 'An unusually long shift has been detected in your timesheet.'
  },
  [NOTIFICATION_TYPES.TRAINING_REMINDER]: {
    type: NOTIFICATION_TYPES.TRAINING_REMINDER,
    title: 'Training Reminder',
    message: 'Training session reminder',
    priority: PRIORITIES.LOW,
    emailSubject: 'Training Session Reminder',
    emailBody: 'This is a reminder about your upcoming training session.'
  },
  [NOTIFICATION_TYPES.PERFORMANCE_REVIEW]: {
    type: NOTIFICATION_TYPES.PERFORMANCE_REVIEW,
    title: 'Performance Review',
    message: 'Performance review scheduled',
    priority: PRIORITIES.MEDIUM,
    emailSubject: 'Performance Review Scheduled',
    emailBody: 'Your performance review has been scheduled.'
  },
  [NOTIFICATION_TYPES.WORK_ANNIVERSARY]: {
    type: NOTIFICATION_TYPES.WORK_ANNIVERSARY,
    title: 'Work Anniversary',
    message: 'Congratulations on your work anniversary!',
    priority: PRIORITIES.INFO,
    emailSubject: 'Work Anniversary - Congratulations!',
    emailBody: 'Congratulations on your work anniversary!'
  },
  [NOTIFICATION_TYPES.SYSTEM_INTEGRATION]: {
    type: NOTIFICATION_TYPES.SYSTEM_INTEGRATION,
    title: 'System Integration',
    message: 'System integration update',
    priority: PRIORITIES.INFO,
    emailSubject: 'System Integration Update',
    emailBody: 'System integration has been updated.'
  }
};

export class NotificationService {
  private static instance: NotificationService;
  private notifications: Notification[] = [];
  private listeners: Set<(notifications: Notification[]) => void> = new Set();

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Create a new notification
  createNotification(
    type: NotificationType,
    userId: string,
    relatedId?: string,
    relatedType?: 'timesheet' | 'expense' | 'employee' | 'system',
    metadata: Record<string, any> = {}
  ): Notification {
    const template = NOTIFICATION_TEMPLATES[type];

    // Safely derive title, message, and priority
    const title =
      metadata.title ??
      template?.title ??
      'Notification';

    const message =
      metadata.message ??
      template?.message ??
      '';

    const priority: Priority =
      metadata.priority ??
      template?.priority ??
      PRIORITIES.MEDIUM;

    const notification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      priority,
      userId,
      relatedId,
      relatedType,
      isRead: false,
      isEmailSent: false,
      createdAt: new Date(),
      metadata
    };

    this.notifications.push(notification);
    this.notifyListeners();
    this.persistNotifications();
    
    // Send email notification if configured
    this.sendEmailNotification(notification);
    
    return notification;
  }

  // Get notifications for a user
  getUserNotifications(userId: string): Notification[] {
    return this.notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Get unread notifications for a user
  getUnreadNotifications(userId: string): Notification[] {
    return this.getUserNotifications(userId).filter(n => !n.isRead);
  }

  // Mark notification as read
  markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.isRead = true;
      notification.readAt = new Date();
      this.notifyListeners();
      this.persistNotifications();
    }
  }

  // Mark all notifications as read for a user
  markAllAsRead(userId: string): void {
    this.notifications
      .filter(n => n.userId === userId && !n.isRead)
      .forEach(n => {
        n.isRead = true;
        n.readAt = new Date();
      });
    this.notifyListeners();
    this.persistNotifications();
  }

  // Delete notification
  deleteNotification(notificationId: string): void {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.notifyListeners();
    this.persistNotifications();
  }

  // Get notification statistics
  getNotificationStats(userId: string) {
    const userNotifications = this.getUserNotifications(userId);
    const unread = userNotifications.filter(n => !n.isRead);
    
    return {
      total: userNotifications.length,
      unread: unread.length,
      critical: unread.filter(n => n.priority === PRIORITIES.CRITICAL).length,
      high: unread.filter(n => n.priority === PRIORITIES.HIGH).length,
      medium: unread.filter(n => n.priority === PRIORITIES.MEDIUM).length,
      low: unread.filter(n => n.priority === PRIORITIES.LOW).length,
      byType: Object.values(NOTIFICATION_TYPES).reduce((acc, type) => {
        acc[type as NotificationType] = unread.filter(n => n.type === type).length;
        return acc;
      }, {} as Record<NotificationType, number>)
    };
  }

  // Cross-check timesheet and expense status
  async crossCheckTimesheetExpenses(
    employeeId: string, 
    period: string
  ): Promise<CrossCheckResult> {
    // This would typically query the database
    // For now, return mock data
    const mockResult: CrossCheckResult = {
      employeeId,
      period,
      timesheetStatus: 'approved',
      expensesStatus: 'pending',
      hasPendingItems: true,
      periodComplete: false
    };

    return mockResult;
  }

  // Create cross-check notifications
  createCrossCheckNotifications(employeeId: string, period: string): void {
    this.crossCheckTimesheetExpenses(employeeId, period).then(result => {
      if (result.hasPendingItems) {
        // Notify employee about pending expenses
        this.createNotification(
          NOTIFICATION_TYPES.EXPENSES_PENDING_REMINDER,
          employeeId,
          undefined,
          'expense',
          { period, timesheetStatus: result.timesheetStatus }
        );
      }

      if (result.periodComplete) {
        // Notify employee and admin about period completion
        this.createNotification(
          NOTIFICATION_TYPES.PERIOD_COMPLETE,
          employeeId,
          undefined,
          'timesheet',
          { period }
        );
      }
    });
  }

  // Send email notification
  private async sendEmailNotification(notification: Notification): Promise<void> {
    try {
      // Get user email from metadata or user service
      const userEmail =
        notification.metadata?.userEmail ||
        `${notification.userId}@westendworkforce.com`;

      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

      // Send email via API endpoint (absolute URL for server-side usage)
      const response = await fetch(`${baseUrl}/api/notifications/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: userEmail,
          notification,
          customData: notification.metadata,
        }),
      });

      if (response.ok) {
        notification.isEmailSent = true;
      } else {
        console.warn(
          `Failed to send email notification to ${userEmail}. Status: ${response.status}`,
        );
      }
    } catch (error) {
      console.error('Failed to send email notification via API:', error);
    }
  }

  // Subscribe to notification changes
  subscribe(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  // Persist notifications to localStorage
  private persistNotifications(): void {
    try {
      localStorage.setItem('notifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Failed to persist notifications:', error);
    }
  }

  // Load notifications from localStorage
  loadNotifications(): void {
    try {
      const saved = localStorage.getItem('notifications');
      if (saved) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.notifications = JSON.parse(saved).map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt),
          readAt: n.readAt ? new Date(n.readAt) : undefined,
          expiresAt: n.expiresAt ? new Date(n.expiresAt) : undefined,
        }));
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }

  // Initialize the service
  async initialize(): Promise<void> {
    this.loadNotifications();
  }
}

export const notificationService = NotificationService.getInstance();
