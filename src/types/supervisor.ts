// COPY THIS ENTIRE FILE

export interface PendingItem {
    id: string;
    type: 'timesheet' | 'expense';
    employeeId: string;
    employeeName: string;
    employeeEmail: string;
    amount: number;
    hours?: number;
    weekEnding: string;
    projectName: string;
    submittedAt: string;
    status: string;
    selected?: boolean;
  }
  
  export interface PendingWeek {
    weekEnding: string;
    items: PendingItem[];
    totalAmount: number;
    totalHours: number;
    expanded: boolean;
  }
  
  export interface BulkApprovalRequest {
    itemIds: string[];
    approvalType: 'timesheets' | 'expenses' | 'both';
    approverId: string;
    comments?: string;
  }
  
  export interface SupervisorDashboardStats {
    pendingTimesheets: number;
    pendingExpenses: number;
    urgentItems: number;
    totalPendingHours: number;
    totalPendingAmount: number;
  }