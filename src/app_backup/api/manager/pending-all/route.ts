import { NextResponse } from 'next/server';

export async function GET() {
  const mockData = {
    items: [
      {
        id: '1',
        type: 'timesheet',
        employeeId: 'emp1',
        employeeName: 'Mike Chen',
        employeeEmail: 'mike@example.com',
        amount: 26,
        hours: 26,
        weekEnding: '2024-01-07',
        projectName: 'Tech Infrastructure',
        submittedAt: '2024-01-05',
        status: 'pending'
      },
      {
        id: '2',
        type: 'timesheet',
        employeeId: 'emp2',
        employeeName: 'Sarah Johnson',
        employeeEmail: 'sarah@example.com',
        amount: 37.5,
        hours: 37.5,
        weekEnding: '2024-01-07',
        projectName: 'Software Development',
        submittedAt: '2024-01-05',
        status: 'pending'
      },
      {
        id: '3',
        type: 'expense',
        employeeId: 'emp2',
        employeeName: 'Sarah Johnson',
        employeeEmail: 'sarah@example.com',
        amount: 245.80,
        hours: 0,
        weekEnding: '2024-01-07',
        projectName: 'Various',
        submittedAt: '2024-01-05',
        status: 'pending'
      }
    ],
    stats: {
      pendingTimesheets: 2,
      pendingExpenses: 1,
      urgentItems: 0,
      totalPendingHours: 63.5,
      totalPendingAmount: 245.80
    }
  };

  return NextResponse.json(mockData);
}