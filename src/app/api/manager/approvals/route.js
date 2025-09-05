// Updated src/app/api/manager/approvals/route.js
// Add this to include expenses functionality

import { NextResponse } from 'next/server';

const mockData = {
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
      { 
        id: 'ex1', 
        date: '2025-08-19', 
        amount: 245.80, 
        description: 'Client dinner meeting', 
        category: 'Meals & Entertainment',
        receipt_url: '/receipts/dinner-receipt.jpg'
      }
    ]
  },
  emp3: {
    name: 'David Kim',
    timesheets: [
      { id: 'ts5', date: '2025-08-20', hours: 6, description: 'Data analysis and reporting', amount: 420 },
      { id: 'ts6', date: '2025-08-19', hours: 8, description: 'Database queries and optimization', amount: 560 }
    ],
    expenses: [
      { 
        id: 'ex2', 
        date: '2025-08-18', 
        amount: 156.30, 
        description: 'Travel expenses for client meeting', 
        category: 'Transportation',
        receipt_url: '/receipts/travel-receipt.jpg'
      }
    ]
  }
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const employee = searchParams.get('employee');
  const type = searchParams.get('type');
  
  if (!employee || !type) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }
  
  const employeeData = mockData[employee];
  if (!employeeData) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }
  
  let data = [];
  
  if (type === 'timesheet') {
    data = employeeData.timesheets || [];
  } else if (type === 'expense') {
    data = employeeData.expenses || [];
  } else {
    return NextResponse.json({ error: 'Invalid type. Use "timesheet" or "expense"' }, { status: 400 });
  }
  
  return NextResponse.json({
    success: true,
    employee: { id: employee, name: employeeData.name },
    type,
    data: data,
    count: data.length
  });
}