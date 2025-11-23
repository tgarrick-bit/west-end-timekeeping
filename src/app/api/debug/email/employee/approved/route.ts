import { NextResponse } from 'next/server';
import {
  buildFinalApprovalEmailHtml,
} from '@/app/api/expense-reports/[id]/finalize/route';

export const runtime = 'nodejs';

export async function GET() {
  const html = buildFinalApprovalEmailHtml({
    employeeName: 'Tracy Garrick',
    reportTitle: 'TEST NOV EXPENSES – Demo',
    period: 'Nov 2025',
    reportUrl: 'https://example.com/expense/12345',
    year: new Date().getFullYear().toString(),
  });

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}
