import { useNotifications as useNotificationContext } from '@/contexts/NotificationContext';
import { notificationService } from '@/lib/notificationService';
import { NOTIFICATION_TYPES } from '@/types/notifications';

export function useNotifications() {
  const context = useNotificationContext();
  
  // Helper functions for common notification scenarios
  const notifyTimesheetSubmitted = (managerId: string, employeeName: string, period: string) => {
    return notificationService.createNotification(
      NOTIFICATION_TYPES.TIMESHEET_SUBMITTED,
      managerId,
      undefined,
      'timesheet',
      { employeeName, period }
    );
  };

  const notifyTimesheetApproved = (employeeId: string, period: string) => {
    return notificationService.createNotification(
      NOTIFICATION_TYPES.TIMESHEET_APPROVED,
      employeeId,
      undefined,
      'timesheet',
      { period }
    );
  };

  const notifyTimesheetRejected = (employeeId: string, period: string, reason: string) => {
    return notificationService.createNotification(
      NOTIFICATION_TYPES.TIMESHEET_REJECTED,
      employeeId,
      undefined,
      'timesheet',
      { period, reason }
    );
  };

  const notifyExpenseSubmitted = (managerId: string, employeeName: string, amount: number) => {
    return notificationService.createNotification(
      NOTIFICATION_TYPES.EXPENSE_SUBMITTED,
      managerId,
      undefined,
      'expense',
      { employeeName, amount }
    );
  };

  const notifyExpenseApproved = (employeeId: string, amount: number) => {
    return notificationService.createNotification(
      NOTIFICATION_TYPES.EXPENSE_APPROVED,
      employeeId,
      undefined,
      'expense',
      { amount }
    );
  };

  const notifyExpenseRejected = (employeeId: string, amount: number, reason: string) => {
    return notificationService.createNotification(
      NOTIFICATION_TYPES.EXPENSE_REJECTED,
      employeeId,
      undefined,
      'expense',
      { amount, reason }
    );
  };

  const notifyTimesheetOverdue = (employeeId: string, period: string) => {
    return notificationService.createNotification(
      NOTIFICATION_TYPES.TIMESHEET_OVERDUE,
      employeeId,
      undefined,
      'timesheet',
      { period }
    );
  };

  const notifyManagerPendingReminder = (managerId: string, pendingCount: number) => {
    return notificationService.createNotification(
      NOTIFICATION_TYPES.MANAGER_PENDING_REMINDER,
      managerId,
      undefined,
      'system',
      { pendingCount }
    );
  };

  const notifyPeriodComplete = (employeeId: string, period: string) => {
    return notificationService.createNotification(
      NOTIFICATION_TYPES.PERIOD_COMPLETE,
      employeeId,
      undefined,
      'timesheet',
      { period }
    );
  };

  const notifyNewEmployeeAdded = (managerId: string, employeeName: string) => {
    return notificationService.createNotification(
      NOTIFICATION_TYPES.NEW_EMPLOYEE_ADDED,
      managerId,
      undefined,
      'employee',
      { employeeName }
    );
  };

  const notifyAdminApprovalActivity = (adminId: string, activity: string) => {
    return notificationService.createNotification(
      NOTIFICATION_TYPES.ADMIN_APPROVAL_ACTIVITY,
      adminId,
      undefined,
      'system',
      { activity }
    );
  };

  const notifyDeadlineReminder = (userId: string, deadline: string, type: string) => {
    return notificationService.createNotification(
      NOTIFICATION_TYPES.DEADLINE_REMINDER,
      userId,
      undefined,
      'system',
      { deadline, type }
    );
  };

  const notifyPayrollCutoff = (userId: string, cutoffDate: string) => {
    return notificationService.createNotification(
      NOTIFICATION_TYPES.PAYROLL_CUTOFF,
      userId,
      undefined,
      'system',
      { cutoffDate }
    );
  };

  const notifyOvertimeAlert = (userId: string, hours: number, period: string) => {
    return notificationService.createNotification(
      NOTIFICATION_TYPES.OVERTIME_ALERT,
      userId,
      undefined,
      'timesheet',
      { hours, period }
    );
  };

  const notifyLongShiftAlert = (userId: string, shiftHours: number, date: string) => {
    return notificationService.createNotification(
      NOTIFICATION_TYPES.LONG_SHIFT_ALERT,
      userId,
      undefined,
      'timesheet',
      { shiftHours, date }
    );
  };

  const notifyTrainingReminder = (userId: string, trainingName: string, date: string) => {
    return notificationService.createNotification(
      NOTIFICATION_TYPES.TRAINING_REMINDER,
      userId,
      undefined,
      'system',
      { trainingName, date }
    );
  };

  const notifyPerformanceReview = (userId: string, reviewDate: string) => {
    return notificationService.createNotification(
      NOTIFICATION_TYPES.PERFORMANCE_REVIEW,
      userId,
      undefined,
      'system',
      { reviewDate }
    );
  };

  const notifyWorkAnniversary = (userId: string, years: number) => {
    return notificationService.createNotification(
      NOTIFICATION_TYPES.WORK_ANNIVERSARY,
      userId,
      undefined,
      'system',
      { years }
    );
  };

  const notifySystemIntegration = (userId: string, integration: string, status: string) => {
    return notificationService.createNotification(
      NOTIFICATION_TYPES.SYSTEM_INTEGRATION,
      userId,
      undefined,
      'system',
      { integration, status }
    );
  };

  // Cross-check notifications
  const createCrossCheckNotifications = (employeeId: string, period: string) => {
    notificationService.createCrossCheckNotifications(employeeId, period);
  };

  // Bulk notification helpers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notifyAllManagers = (type: string, message: string, metadata?: any) => {
    // In a real implementation, this would get all manager IDs from the database
    const managerIds = ['manager-demo', 'manager2-demo', 'manager3-demo'];
    managerIds.forEach(managerId => {
      notificationService.createNotification(
        NOTIFICATION_TYPES.EMAIL_NOTIFICATION,
        managerId,
        undefined,
        'system',
        { type, message, ...metadata }
      );
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notifyAllEmployees = (type: string, message: string, metadata?: any) => {
    // In a real implementation, this would get all employee IDs from the database
    const employeeIds = ['employee-demo', 'employee2-demo', 'employee3-demo'];
    employeeIds.forEach(employeeId => {
      notificationService.createNotification(
        NOTIFICATION_TYPES.EMAIL_NOTIFICATION,
        employeeId,
        undefined,
        'system',
        { type, message, ...metadata }
      );
    });
  };

  return {
    ...context,
    // Helper functions
    notifyTimesheetSubmitted,
    notifyTimesheetApproved,
    notifyTimesheetRejected,
    notifyExpenseSubmitted,
    notifyExpenseApproved,
    notifyExpenseRejected,
    notifyTimesheetOverdue,
    notifyManagerPendingReminder,
    notifyPeriodComplete,
    notifyNewEmployeeAdded,
    notifyAdminApprovalActivity,
    notifyDeadlineReminder,
    notifyPayrollCutoff,
    notifyOvertimeAlert,
    notifyLongShiftAlert,
    notifyTrainingReminder,
    notifyPerformanceReview,
    notifyWorkAnniversary,
    notifySystemIntegration,
    createCrossCheckNotifications,
    notifyAllManagers,
    notifyAllEmployees
  };
}
