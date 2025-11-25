// src/app/api/expense-reports/[id]/submit/route.ts

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import nodemailer from 'nodemailer';
import { buildManagerSubmissionEmailHtml } from '@/lib/email-templates/manager';

export const runtime = 'nodejs'; // ✅ For nodemailer

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // ✅ Next.js 15 async params
) {
  const { id: reportId } = await params;
  console.log('[EXPENSE SUBMIT] Route hit for report:', reportId);

  // ✅ Use route handler client so auth + RLS work on the server
  const supabase = createRouteHandlerClient({
    cookies: () => cookies(),
  });

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error('[EXPENSE SUBMIT] auth.getUser error:', userError);
    }

    if (userError || !user) {
      console.warn('[EXPENSE SUBMIT] Not authenticated');
      return NextResponse.json(
        { error: 'Not authenticated.' },
        { status: 401 }
      );
    }

    if (!reportId) {
      console.warn('[EXPENSE SUBMIT] Missing expense report id.');
      return NextResponse.json(
        { error: 'Missing expense report id.' },
        { status: 400 }
      );
    }

    // 1) Ensure report belongs to the current employee
    const { data: report, error: reportError } = await supabase
      .from('expense_reports')
      .select('id, employee_id, title, period_month')
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      console.error(
        '[EXPENSE SUBMIT] Expense report not found:',
        reportError
      );
      return NextResponse.json(
        { error: 'Expense report not found.' },
        { status: 404 }
      );
    }

    console.log(
      '[EXPENSE SUBMIT] Loaded report:',
      report.id,
      'employee_id:',
      report.employee_id,
      'current user:',
      user.id
    );

    if (report.employee_id !== user.id) {
      console.warn(
        '[EXPENSE SUBMIT] User is not allowed to submit this report.',
        'report.employee_id =',
        report.employee_id,
        'user.id =',
        user.id
      );
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

    if (linesError) {
      console.error('[EXPENSE SUBMIT] Error loading expense lines:', linesError);
      return NextResponse.json(
        { error: 'Failed to load expense lines.' },
        { status: 500 }
      );
    }

    if (!lines || lines.length === 0) {
      console.warn('[EXPENSE SUBMIT] No expense lines found for report.');
      return NextResponse.json(
        { error: 'No expense lines found for this report.' },
        { status: 400 }
      );
    }

    console.log(
      '[EXPENSE SUBMIT] Loaded',
      lines.length,
      'lines for report',
      reportId
    );

    // 3) Basic validation
    for (const [idx, line] of lines.entries()) {
      if (
        !line.expense_date ||
        !line.category ||
        !line.amount ||
        line.amount <= 0 ||
        !line.project_id
      ) {
        console.warn(
          `[EXPENSE SUBMIT] Line #${idx + 1} invalid:`,
          JSON.stringify(line)
        );
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
      console.log(
        '[EXPENSE SUBMIT] Updating',
        updatableLines.length,
        'lines to submitted.'
      );
      const { error: updateError } = await supabase
        .from('expenses')
        .update({ status: 'submitted' })
        .in(
          'id',
          updatableLines.map((l) => l.id)
        );

      if (updateError) {
        console.error(
          '[EXPENSE SUBMIT] Failed to update line statuses:',
          updateError
        );
        return NextResponse.json(
          { error: 'Failed to update line statuses.' },
          { status: 500 }
        );
      }
    } else {
      console.log(
        '[EXPENSE SUBMIT] No draft/rejected lines to update; all already submitted/approved.'
      );
    }

    // 5) Update report status + timestamps + total
    const totalAmount = lines.reduce(
      (sum, l) => sum + (l.amount || 0),
      0
    );

    console.log(
      '[EXPENSE SUBMIT] Updating report status to submitted. Total amount:',
      totalAmount
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
      console.error(
        '[EXPENSE SUBMIT] Failed to update report:',
        reportUpdateError
      );
      return NextResponse.json(
        { error: 'Failed to update report.' },
        { status: 500 }
      );
    }

    // 6) Notify manager (dynamic, with fallback)
    try {
      console.log(
        '[EXPENSE SUBMIT] Loading employee + manager for employee_id:',
        report.employee_id
      );

      // Load employee with manager_id
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('first_name, last_name, manager_id')
        .eq('id', report.employee_id)
        .single();

      if (employeeError || !employee) {
        console.warn(
          '[EXPENSE SUBMIT] Employee record not found or error:',
          employeeError
        );
      } else {
        console.log(
          '[EXPENSE SUBMIT] Employee:',
          employee.first_name,
          employee.last_name,
          'manager_id:',
          employee.manager_id
        );
      }

      let managerEmail: string | null = null;
      let managerName: string | null = null;

      if (employee && employee.manager_id) {
        const { data: manager, error: managerError } = await supabase
          .from('employees')
          .select('email, first_name, last_name')
          .eq('id', employee.manager_id)
          .single();

        if (managerError || !manager) {
          console.warn(
            '[EXPENSE SUBMIT] Manager lookup error or no manager record:',
            managerError
          );
        } else if (manager.email) {
          managerEmail = manager.email;
          managerName = `${manager.first_name ?? ''} ${
            manager.last_name ?? ''
          }`.trim() || 'Manager';
          console.log(
            '[EXPENSE SUBMIT] Manager resolved:',
            managerName,
            managerEmail
          );
        } else {
          console.warn(
            '[EXPENSE SUBMIT] Manager record found but no email set.'
          );
        }
      }

      // Fallback to EXPENSE_MANAGER_NOTIFY_EMAIL if no manager email
      const fallbackEmail = process.env.EXPENSE_MANAGER_NOTIFY_EMAIL || null;
      const to = managerEmail || fallbackEmail;

      if (!to) {
        console.warn(
          '[EXPENSE SUBMIT] No manager email and no EXPENSE_MANAGER_NOTIFY_EMAIL configured; skipping email.'
        );
      } else {
        const employeeName =
          employee && (employee.first_name || employee.last_name)
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

        console.log(
          '[EXPENSE SUBMIT] Building manager email HTML for:',
          to,
          'managerUrl:',
          managerUrl
        );

        const html = buildManagerSubmissionEmailHtml({
          managerUrl,
          employeeName,
          reportTitle: report.title || 'Expense Report',
          period: periodLabel,
          totalAmount,
          year: new Date().getFullYear().toString(),
        });

        const subject = `New expense report submitted: ${
          report.title || 'Expense Report'
        }`;

        await sendManagerEmail({
          to,
          subject,
          html,
        });

        console.log(
          '[EXPENSE SUBMIT] Manager expense submission email sent to',
          to
        );
      }
    } catch (emailErr) {
      console.error(
        '[EXPENSE SUBMIT] Error sending manager submission email:',
        emailErr
      );
      // Do not fail submission on email error
    }

    console.log(
      '[EXPENSE SUBMIT] Completed successfully for report:',
      reportId
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[EXPENSE SUBMIT] Unexpected error submitting report:', err);
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
      '[EXPENSE SUBMIT] SMTP env vars not fully configured; skipping manager email send.'
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

  console.log(
    '[EXPENSE SUBMIT] Sending email via SMTP to',
    params.to,
    'subject:',
    params.subject
  );

  await transporter.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to: params.to,
    subject: params.subject,
    html: params.html,
    replyTo,
  });
}
