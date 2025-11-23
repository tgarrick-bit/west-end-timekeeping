import { NextResponse } from 'next/server';
import {
  buildFinalRejectionEmailHtml,
} from '@/app/api/expense-reports/[id]/finalize/route';

export const runtime = 'nodejs';

export async function GET() {
  const html = buildFinalRejectionEmailHtml({
    employeeName: 'Tracy Garrick',
    reportTitle: 'TEST NOV EXPENSES – Demo',
    period: 'Nov 2025',
    reportUrl: 'https://example.com/expense/12345',
    year: new Date().getFullYear().toString(),
    reason: 'One or more expense lines do not follow policy (missing receipts and incorrect category).',
  });

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}
