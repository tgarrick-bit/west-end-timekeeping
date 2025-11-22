// src/lib/status.ts

export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type ExpenseStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export const TIMESHEET_STATUSES: TimesheetStatus[] = [
  'draft',
  'submitted',
  'approved',
  'rejected',
];

export const EXPENSE_STATUSES: ExpenseStatus[] = [
  'draft',
  'submitted',
  'approved',
  'rejected',
];

export function getTimesheetStatusLabel(status: TimesheetStatus): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'submitted':
      return 'Submitted';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
  }
}

export function getExpenseStatusLabel(status: ExpenseStatus): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'submitted':
      return 'Submitted';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
  }
}