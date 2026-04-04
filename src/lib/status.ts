// src/lib/status.ts

export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'client_approved' | 'payroll_approved' | 'rejected';
export type ExpenseStatus = 'draft' | 'submitted' | 'approved' | 'client_approved' | 'payroll_approved' | 'rejected';

export const TIMESHEET_STATUSES: TimesheetStatus[] = [
  'draft',
  'submitted',
  'approved',
  'client_approved',
  'payroll_approved',
  'rejected',
];

export const EXPENSE_STATUSES: ExpenseStatus[] = [
  'draft',
  'submitted',
  'approved',
  'client_approved',
  'payroll_approved',
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
    case 'client_approved':
      return 'Client Approved';
    case 'payroll_approved':
      return 'Payroll Approved';
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
    case 'client_approved':
      return 'Client Approved';
    case 'payroll_approved':
      return 'Payroll Approved';
    case 'rejected':
      return 'Rejected';
  }
}