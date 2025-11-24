// src/app/api/expense-reports/[id]/submit/route.ts

import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import nodemailer from 'nodemailer';
import { buildManagerSubmissionEmailHtml } from '@/lib/email-templates/manager';

export const runtime = 'nodejs'; // ✅ For nodemailer

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // ✅ Next.js 15
) {
  const { id: reportId } = await params;
  const supabase = createSupabaseClient();

  try {
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

    // 1) Ensure report belongs to the current employee
    const { data: report, error: reportError } = await supabase
      .from('expense_reports')
      .select('id, employee_id, title, period_month')
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      return NextResponse.json(
        { error: 'Expense report not found.' },
        { status: 404 }
      );
    }

    if (report.employee_id !== user.id) {
      return NextResponse.json(
        { error: 'You are not allowed to submit this report.' },
        { status: 403 }
      );
    }

    // 2) Load lines
    const { data: lines, error: linesError } = await supabase
      .from('expenses')
      .select('id, status, expense_date, category, amount, project_id')
      .eq('report_id', reportId);

    if (linesError || !lines || lines.length === 0) {
      return NextResponse.json(
        { error: 'No expense lines found for this report.' },
        { status: 400 }
      );
    }

    // 3) Basic validation
    for (const [idx, line] of lines.entries()) {
      if (
        !line.expense_date ||
        !line.category ||
        !line.amount ||
        line.amount <= 0 ||
        !line.project_id
      ) {
        return NextResponse.json(
          {
            error: `Line #${
              idx + 1
            } is missing a valid date, project, category or amount.`,
          },
          { status: 400 }
        );
      }
    }

    // 4) Move draft/rejected → submitted, leave approved as-is
    const updatableLines = lines.filter(
      (l) => l.status === 'draft' || l.status === 'rejected'
    );

    if (updatableLines.length > 0) {
      const { error: updateError } = await supabase
        .from('expenses')
        .update({ status: 'submitted' })
        .in(
          'id',
          updatableLines.map((l) => l.id)
        );

      if (updateError) {
        console.error(updateError);
        return NextResponse.json(
          { error: 'Failed to update line statuses.' },
          { status: 500 }
        );
      }
    }

    // 5) Update report status + timestamps
    const totalAmount = lines.reduce(
      (sum, l) => sum + (l.amount || 0),
      0
    );

    const { error: reportUpdateError } = await supabase
      .from('expense_reports')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        total_amount: totalAmount,
      })
      .eq('id', reportId);

    if (reportUpdateError) {
      console.error(reportUpdateError);
      return NextResponse.json(
        { error: 'Failed to update report.' },
        { status: 500 }
      );
    }

    // 6) Notify manager (if configured)
    try {
      const managerEmail = process.env.EXPENSE_MANAGER_NOTIFY_EMAIL;

      if (managerEmail) {
        // Get employee name for the email
        const { data: employee, error: employeeError } = await supabase
          .from('employees')
          .select('first_name, last_name')
          .eq('id', report.employee_id)
          .single();

        const employeeName =
          !employeeError && employee
            ? [employee.first_name, employee.last_name]
                .filter(Boolean)
                .join(' ')
            : 'Employee';

        const periodLabel = report.period_month
          ? new Date(report.period_month).toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
            })
          : 'Recent period';

        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const managerUrl = `${appUrl}/manager/expense/${reportId}`;

        const html = buildManagerSubmissionEmailHtml({
          managerUrl,
          employeeName,
          reportTitle: report.title || 'Expense Report',
          period: periodLabel,
          totalAmount,
          year: new Date().getFullYear().toString(),
        });

        await sendManagerEmail({
          to: managerEmail,
          subject: `New expense report submitted: ${report.title || 'Expense Report'}`,
          html,
        });
      } else {
        console.warn(
          'EXPENSE_MANAGER_NOTIFY_EMAIL not configured; skipping manager submission email.'
        );
      }
    } catch (emailErr) {
      console.error('Error sending manager submission email:', emailErr);
      // Do not fail submission on email error
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Submit report error:', err);
    return NextResponse.json(
      { error: 'Unexpected error submitting report.' },
      { status: 500 }
    );
  }
}

/**
 * Sends manager notification email when a report is submitted.
 */
async function sendManagerEmail(params: {
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
      'SMTP environment variables are not fully configured; skipping manager email send.'
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

  const fromAddress = EMAIL_FROM || 'no-reply@westendworkforce.com';
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
