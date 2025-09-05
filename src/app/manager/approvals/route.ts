import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface TimesheetItem {
  id: string;
  date: string;
  hours: number;
  description: string;
  amount: number;
}
interface ExpenseItem {
  id: string;
  date: string;
  amount: number;
  description: string;
  category: string;
  receipt_url?: string;
}
interface EmployeeApprovalData {
  name: string;
  timesheets?: TimesheetItem[];
  expenses?: ExpenseItem[];
}

const mockData: Record<string, EmployeeApprovalData> = {
  emp1: {
    name: 'Mike Chen',
    timesheets: [
      { id: 'ts1', date: '2025-08-20', hours: 8, description: 'Frontend work', amount: 600 },
      { id: 'ts2', date: '2025-08-19', hours: 7.5, description: 'Bug fixes', amount: 562.5 }
    ]
  },
  emp2: {
    name: 'Sarah Johnson',
    timesheets: [
      { id: 'ts3', date: '2025-08-20', hours: 8, description: 'Backend API development', amount: 640 },
      { id: 'ts4', date: '2025-08-19', hours: 7.5, description: 'Database optimization', amount: 600 }
    ],
    expenses: [
      { id: 'ex1', date: '2025-08-19', amount: 245.8, description: 'Client dinner meeting', category: 'Meals & Entertainment', receipt_url: '/receipts/dinner-receipt.jpg' }
    ]
  },
  emp3: {
    name: 'David Kim',
    timesheets: [
      { id: 'ts5', date: '2025-08-20', hours: 6, description: 'Data analysis and reporting', amount: 420 },
      { id: 'ts6', date: '2025-08-19', hours: 8, description: 'Database queries and optimization', amount: 560 }
    ],
    expenses: [
      { id: 'ex2', date: '2025-08-18', amount: 156.3, description: 'Travel expenses for client meeting', category: 'Transportation', receipt_url: '/receipts/travel-receipt.jpg' }
    ]
  }
};

// GET /api/manager/approvals?employee=emp1&type=timesheet|expense
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const employee = searchParams.get('employee') ?? '';
  const type = searchParams.get('type') ?? '';

  if (!employee || !type) {
    return NextResponse.json({ error: 'Missing parameters: employee and type are required' }, { status: 400 });
  }

  const employeeData = mockData[employee];
  if (!employeeData) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }

  const data =
    type === 'timesheet' ? (employeeData.timesheets ?? [])
    : type === 'expense' ? (employeeData.expenses ?? [])
    : null;

  if (!data) {
    return NextResponse.json({ error: 'Invalid type. Use "timesheet" or "expense"' }, { status: 400
