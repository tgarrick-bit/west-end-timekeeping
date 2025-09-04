export const NOTIFICATION_TYPES = {
  // Phase 1 - Essential
  TIMESHEET_SUBMITTED: 'timesheet_submitted',
  TIMESHEET_APPROVED: 'timesheet_approved', 
  TIMESHEET_REJECTED: 'timesheet_rejected',
  EXPENSE_SUBMITTED: 'expense_submitted',
  EXPENSE_APPROVED: 'expense_approved',
  EXPENSE_REJECTED: 'expense_rejected',
  EXPENSES_PENDING_REMINDER: 'expenses_pending_reminder',
  TIMESHEET_OVERDUE: 'timesheet_overdue',
  MANAGER_PENDING_REMINDER: 'manager_pending_reminder',
  
  // Phase 2 - Important  
  PERIOD_COMPLETE: 'period_complete',
  NEW_EMPLOYEE_ADDED: 'new_employee_added',
  ADMIN_APPROVAL_ACTIVITY: 'admin_approval_activity',
  EMAIL_NOTIFICATION: 'email_notification',
  
  // Phase 3 - Advanced
  DEADLINE_REMINDER: 'deadline_reminder',
  PAYROLL_CUTOFF: 'payroll_cutoff',
  OVERTIME_ALERT: 'overtime_alert',
  LONG_SHIFT_ALERT: 'long_shift_alert',
  TRAINING_REMINDER: 'training_reminder',
  PERFORMANCE_REVIEW: 'performance_review',
  WORK_ANNIVERSARY: 'work_anniversary',
  SYSTEM_INTEGRATION: 'system_integration'
} as const;

export const PRIORITIES = {
  CRITICAL: 'critical',  // Immediate action required
  HIGH: 'high',         // Important, action needed today
  MEDIUM: 'medium',     // Important, action needed this week  
  LOW: 'low',           // Informational
  INFO: 'info'          // General information
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];
export type Priority = typeof PRIORITIES[keyof typeof PRIORITIES];

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: Priority;
  userId: string;
  relatedId?: string; // ID of related timesheet, expense, etc.
  relatedType?: 'timesheet' | 'expense' | 'employee' | 'system';
  isRead: boolean;
  isEmailSent: boolean;
  createdAt: Date;
  readAt?: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface NotificationPreferences {
  userId: string;
  email: boolean;
  browser: boolean;
  timesheets: boolean;
  expenses: boolean;
  deadlines: boolean;
  system: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
  quietHours?: {
    start: string; // HH:mm format
    end: string;   // HH:mm format
    enabled: boolean;
  };
}

export interface NotificationTemplate {
  type: NotificationType;
  title: string;
  message: string;
  priority: Priority;
  emailSubject?: string;
  emailBody?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  byType: Record<NotificationType, number>;
}

export interface CrossCheckResult {
  employeeId: string;
  period: string;
  timesheetStatus: 'pending' | 'approved' | 'rejected';
  expensesStatus: 'pending' | 'approved' | 'rejected';
  hasPendingItems: boolean;
  periodComplete: boolean;
}
