import { notificationService } from './notificationService';
import { NOTIFICATION_TYPES } from '@/types/notifications';

export class NotificationScheduler {
  private static instance: NotificationScheduler;
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  static getInstance(): NotificationScheduler {
    if (!NotificationScheduler.instance) {
      NotificationScheduler.instance = new NotificationScheduler();
    }
    return NotificationScheduler.instance;
  }

  // Start the scheduler
  start(): void {
    
    // Check for overdue timesheets every hour
    this.scheduleHourlyCheck();
    
    // Check for upcoming deadlines daily at 9 AM
    this.scheduleDailyDeadlineCheck();
    
    // Check for payroll cutoff reminders weekly
    this.scheduleWeeklyPayrollCheck();
    
    // Check for quiet hours compliance
    this.scheduleQuietHoursCheck();
  }

  // Stop the scheduler
  stop(): void {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();
  }

  // Schedule hourly checks for overdue items
  private scheduleHourlyCheck(): void {
    const interval = setInterval(() => {
      this.checkOverdueTimesheets();
      this.checkPendingApprovals();
    }, 60 * 60 * 1000); // Every hour
    
    this.intervals.set('hourly', interval);
  }

  // Schedule daily deadline checks
  private scheduleDailyDeadlineCheck(): void {
    const now = new Date();
    const nextCheck = new Date(now);
    nextCheck.setHours(9, 0, 0, 0); // 9 AM
    
    if (nextCheck <= now) {
      nextCheck.setDate(nextCheck.getDate() + 1); // Tomorrow
    }
    
    const timeUntilNextCheck = nextCheck.getTime() - now.getTime();
    
    setTimeout(() => {
      this.checkUpcomingDeadlines();
      
      // Then schedule daily
      const dailyInterval = setInterval(() => {
        this.checkUpcomingDeadlines();
      }, 24 * 60 * 60 * 1000); // Every 24 hours
      
      this.intervals.set('daily', dailyInterval);
    }, timeUntilNextCheck);
  }

  // Schedule weekly payroll checks
  private scheduleWeeklyPayrollCheck(): void {
    const interval = setInterval(() => {
      this.checkPayrollCutoff();
    }, 7 * 24 * 60 * 60 * 1000); // Every week
    
    this.intervals.set('weekly', interval);
  }

  // Schedule quiet hours compliance check
  private scheduleQuietHoursCheck(): void {
    const interval = setInterval(() => {
      this.checkQuietHoursCompliance();
    }, 15 * 60 * 1000); // Every 15 minutes
    
    this.intervals.set('quietHours', interval);
  }

  // Check for overdue timesheets
  private async checkOverdueTimesheets(): Promise<void> {
    try {
      // In a real implementation, this would query the database
      // For now, we'll simulate finding overdue timesheets
      const overdueEmployees = [
        { id: 'emp1', name: 'Mike Chen', period: '2025-01-13' },
        { id: 'emp2', name: 'Sarah Johnson', period: '2025-01-13' }
      ];

      overdueEmployees.forEach(employee => {
        notificationService.createNotification(
          NOTIFICATION_TYPES.TIMESHEET_OVERDUE,
          employee.id,
          undefined,
          'timesheet',
          { 
            employeeName: employee.name, 
            period: employee.period,
            daysOverdue: 2
          }
        );
      });

    } catch (error) {
      console.error('Error checking overdue timesheets:', error);
    }
  }

  // Check for pending approvals that need reminders
  private async checkPendingApprovals(): Promise<void> {
    try {
      // In a real implementation, this would query the database
      // For now, we'll simulate finding managers with pending items
      const managersWithPending = [
        { id: 'manager-demo', name: 'Jane Doe', pendingCount: 3 },
        { id: 'manager2-demo', name: 'Tom Wilson', pendingCount: 1 }
      ];

      managersWithPending.forEach(manager => {
        notificationService.createNotification(
          NOTIFICATION_TYPES.MANAGER_PENDING_REMINDER,
          manager.id,
          undefined,
          'system',
          { 
            managerName: manager.name, 
            pendingCount: manager.pendingCount 
          }
        );
      });

    } catch (error) {
      console.error('Error checking pending approvals:', error);
    }
  }

  // Check for upcoming deadlines
  private async checkUpcomingDeadlines(): Promise<void> {
    try {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // In a real implementation, this would query the database
      // For now, we'll simulate finding upcoming deadlines
      const upcomingDeadlines = [
        { 
          userId: 'emp1', 
          type: 'Timesheet', 
          deadline: '2025-01-20',
          daysUntil: 1
        },
        { 
          userId: 'emp2', 
          type: 'Expense Report', 
          deadline: '2025-01-21',
          daysUntil: 2
        }
      ];

      upcomingDeadlines.forEach(deadline => {
        if (deadline.daysUntil <= 3) {
          notificationService.createNotification(
            NOTIFICATION_TYPES.DEADLINE_REMINDER,
            deadline.userId,
            undefined,
            'system',
            { 
              type: deadline.type, 
              deadline: deadline.deadline,
              daysUntil: deadline.daysUntil
            }
          );
        }
      });

    } catch (error) {
      console.error('Error checking upcoming deadlines:', error);
    }
  }

  // Check for payroll cutoff
  private async checkPayrollCutoff(): Promise<void> {
    try {
      const now = new Date();
      const nextFriday = this.getNextFriday();
      const daysUntilFriday = Math.ceil((nextFriday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilFriday <= 3) {
        // Notify all employees about payroll cutoff
        const employees = ['emp1', 'emp2', 'emp3', 'emp4'];
        
        employees.forEach(employeeId => {
          notificationService.createNotification(
            NOTIFICATION_TYPES.PAYROLL_CUTOFF,
            employeeId,
            undefined,
            'system',
            { 
              cutoffDate: nextFriday.toISOString().split('T')[0],
              daysUntil: daysUntilFriday
            }
          );
        });

      }
    } catch (error) {
      console.error('Error checking payroll cutoff:', error);
    }
  }

  // Check quiet hours compliance
  private async checkQuietHoursCompliance(): Promise<void> {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Check if we're in quiet hours (10 PM - 8 AM)
      const isQuietHours = currentHour >= 22 || currentHour < 8;
      
      if (isQuietHours) {
        // Only send critical notifications during quiet hours
      }
    } catch (error) {
      console.error('Error checking quiet hours compliance:', error);
    }
  }

  // Get next Friday
  private getNextFriday(): Date {
    const now = new Date();
    const daysUntilFriday = (5 - now.getDay() + 7) % 7;
    const nextFriday = new Date(now);
    nextFriday.setDate(now.getDate() + daysUntilFriday);
    nextFriday.setHours(17, 0, 0, 0); // 5 PM
    return nextFriday;
  }

  // Manually trigger a specific check
  async triggerCheck(type: 'overdue' | 'deadlines' | 'payroll' | 'approvals'): Promise<void> {
    switch (type) {
      case 'overdue':
        await this.checkOverdueTimesheets();
        break;
      case 'deadlines':
        await this.checkUpcomingDeadlines();
        break;
      case 'payroll':
        await this.checkPayrollCutoff();
        break;
      case 'approvals':
        await this.checkPendingApprovals();
        break;
    }
  }

  // Get scheduler status
  getStatus(): { isRunning: boolean; activeIntervals: string[] } {
    return {
      isRunning: this.intervals.size > 0,
      activeIntervals: Array.from(this.intervals.keys())
    };
  }
}

export const notificationScheduler = NotificationScheduler.getInstance();
