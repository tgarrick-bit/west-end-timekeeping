// src/app/api/debug/email/manager/route.ts

import { NextResponse } from 'next/server';

// IMPORTANT: import your real function so the preview matches production
import { buildManagerSubmissionEmailHtml } from '@/app/api/expense-reports/[id]/submit/route';
// ^ If the import path is different in your project, adjust accordingly.

export const runtime = 'nodejs'; // ensures HTML renders correctly

export async function GET() {

  // Fake test data for preview
  const fakeData = {
    managerUrl: 'https://example.com/manager/expense/12345',
    employeeName: 'Jane Testerson',
    employeeEmail: 'jane.testerson@example.com',
    reportTitle: 'FIN TEST EXPENSES – November 2025',
    period: 'Nov 2025',
    totalAmount: 842.75,
    year: new Date().getFullYear().toString(),
  };

  const html = buildManagerSubmissionEmailHtml(fakeData);

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}
