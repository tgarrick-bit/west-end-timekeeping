// src/app/api/expense-reports/[id]/finalize/route.ts

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import nodemailer from 'nodemailer';

import {
  buildFinalApprovalEmailHtml,
  buildFinalRejectionEmailHtml,
} from '@/lib/email-templates/employee';

export const runtime = 'nodejs'; // Required for nodemailer

type LineStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

interface FinalizeBody {
  action: 'approve' | 'reject';
  reason?: string;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: reportId } = await params;
  const supabase = createRouteHandlerClient({ cookies });

  try {
    if (!reportId) {
      return NextResponse.json(
        { error: 'Missing expense report id.' },
        { status: 400 }
      );
    }

    const body = (await req.json()) as FinalizeBody;
    const action = body.action;
    const reason = body.reason?.trim() || null;

    if (!action) {
      return NextResponse.json(
        { error: 'Missing action (approve or reject).' },
        { status: 400 }
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated.' },
        { status: 401 }
      );
    }

    // 1) Load report
    const { data: report, error: reportError } = await supabase
      .from('expense_reports')
      .select('id, title, period_month, total_amount, status, employee_id')
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      console.error('Error loading report:', reportError);
      return NextResponse.json(
        { error: 'Expense report not found.' },
        { status: 404 }
      );
    }

    // 2) Load line statuses
    const { data: lines, error: linesError } = await supabase
      .from('expenses')
      .select('status')
      .eq('report_id', reportId);

    if (linesError || !lines) {
      console.error('Error loading lines:', linesError);
      return NextResponse.json(
        { error: 'Unable to load line statuses.' },
        { status: 500 }
      );
    }

    const statuses = lines.map((l) => l.status as LineStatus);
    const hasSubmitted = statuses.some((s) => s === 'submitted');
    const hasRejected = statuses.some((s) => s === 'rejected');
    const hasDraft = statuses.some((s) => s === 'draft');

    // --------------------------------
    // APPROVE
    // --------------------------------
    if (action === 'approve') {
      if (hasSubmitted || hasRejected || hasDraft) {
        return NextResponse.json(
          {
            error:
              'All entries must be approved before finalizing this report.',
          },
          { status: 400 }
        );
      }

      const { error: finalizeError } = await supabase
        .from('expense_reports')
        .update({ status: 'approved' })
        .eq('id', reportId);

      if (finalizeError) {
        console.error('Error finalizing report:', finalizeError);
        return NextResponse.json(
          { error: 'Failed to finalize report.' },
          { status: 500 }
        );
      }

      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email')
        .eq('id', report.employee_id)
        .single();

      if (!employeeError && employee?.email) {
        try {
          const appUrl =
            process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const reportUrl = `${appUrl}/expense/${reportId}`;

          const employeeName =
            [employee.first_name, employee.last_name]
              .filter(Boolean)
              .join(' ') || 'there';

          const periodLabel = report.period_month
            ? new Date(report.period_month).toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric',
              })
            : 'your recent period';

          const html = buildFinalApprovalEmailHtml({
            employeeName,
            reportTitle: report.title || 'Expense Report',
            period: periodLabel,
            reportUrl,
            year: new Date().getFullYear().toString(),
          });

          await sendEmail({
            to: employee.email,
            subject: 'Your expense report has been approved',
            html,
          });
        } catch (emailErr) {
          console.error('Error sending final approval email:', emailErr);
        }
      }

      return NextResponse.json({ success: true, status: 'approved' });
    }

    // --------------------------------
    // REJECT
    // --------------------------------
    if (action === 'reject') {
      if (!reason) {
        return NextResponse.json(
          { error: 'Rejection reason is required.' },
          { status: 400 }
        );
      }

      const { error: rejectError } = await supabase
        .from('expense_reports')
        .update({ status: 'rejected' })
        .eq('id', reportId);

      if (rejectError) {
        console.error('Error rejecting report:', rejectError);
        return NextResponse.json(
          { error: 'Failed to reject report.' },
          { status: 500 }
        );
      }

      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email')
        .eq('id', report.employee_id)
        .single();

      if (!employeeError && employee?.email) {
        try {
          const appUrl =
            process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const reportUrl = `${appUrl}/expense/${reportId}`;

          const employeeName =
            [employee.first_name, employee.last_name]
              .filter(Boolean)
              .join(' ') || 'there';

          const periodLabel = report.period_month
            ? new Date(report.period_month).toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric',
              })
            : 'your recent period';

          const html = buildFinalRejectionEmailHtml({
            employeeName,
            reportTitle: report.title || 'Expense Report',
            period: periodLabel,
            reportUrl,
            year: new Date().getFullYear().toString(),
            reason,
          });

          await sendEmail({
            to: employee.email,
            subject: 'Your expense report has been rejected',
            html,
          });
        } catch (emailErr) {
          console.error('Error sending final rejection email:', emailErr);
        }
      }

      return NextResponse.json({ success: true, status: 'rejected' });
    }

    return NextResponse.json(
      { error: 'Invalid action.' },
      { status: 400 }
    );
  } catch (err) {
    console.error('Unexpected error finalizing report:', err);
    return NextResponse.json(
      { error: 'Failed to finalize report.' },
      { status: 500 }
    );
  }
}

// ------------------------------------------------------------------
// Email sending helper
// ------------------------------------------------------------------

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    EMAIL_FROM,
    EMAIL_FROM_NAME,
    EMAIL_REPLY_TO,
  } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    console.warn(
      'SMTP environment variables are not fully configured; skipping email send.'
    );
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  const fromAddress = EMAIL_FROM || 'payroll@westendworkforce.com';
  const fromName = EMAIL_FROM_NAME || 'West End Workforce';
  const replyTo = EMAIL_REPLY_TO || fromAddress;

  await transporter.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to: params.to,
    subject: params.subject,
    html: params.html,
    replyTo,
  });
}
