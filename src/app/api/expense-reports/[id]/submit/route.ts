// src/app/api/expense-reports/[id]/submit/route.ts

import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import nodemailer from 'nodemailer';

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
          .select('first_name, last_name, email')
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

/**
 * Manager submission notification email HTML.
 * Uses same header/footer style as other emails.
 */
export function buildManagerSubmissionEmailHtml(args: {
  managerUrl: string;
  employeeName: string;
  reportTitle: string;
  period: string;
  totalAmount: number;
  year: string;
}): string {
  const {
    managerUrl,
    employeeName,
    reportTitle,
    period,
    totalAmount,
    year,
  } = args;

  const logoUrl =
    'https://westendworkforce.com/wp-content/uploads/2025/11/WE-logo-SEPT2024v3-WHT.png';

  const formattedTotal = totalAmount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>New Expense Report Submitted</title>
  <link href="https://fonts.googleapis.com/css2?family=Antonio:wght@700&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    body { margin: 0; padding: 0; background: #f3f4f6; font-family: 'Montserrat', Arial, sans-serif; }
    .wrapper { width: 100%; table-layout: fixed; background: #f3f4f6; padding: 24px 0; }
    .main { background: #ffffff; margin: 0 auto; width: 100%; max-width: 620px; border-radius: 10px;
            overflow: hidden; border: 1px solid #e5e5e5; }
    .header { padding: 24px 20px 16px; background: #05202E; border-bottom: 3px solid #e31c79; text-align: center; }
    .header-title { font-family: 'Antonio', Arial, sans-serif; font-size: 28px; margin: 0; color: #ffffff;
                    font-weight: 700; letter-spacing: 0.4px; }
    .logo { margin-top: 10px; }
    .content { padding: 26px 28px 34px; font-size: 14px; color: #374151; line-height: 1.7; }
    .content h2 { margin-top: 0; font-family: 'Antonio', Arial, sans-serif; font-size: 22px;
                  margin-bottom: 12px; color: #111827; }
    .meta { margin-top: 14px; padding: 14px 16px; background: #f9fafb;
            border-radius: 6px; font-size: 13px; }
    .meta div { margin-bottom: 4px; }
    .button-wrapper { text-align: center; margin-top: 26px; margin-bottom: 8px; }
    .button { background: #e31c79; color: #ffffff !important; text-decoration: none;
              padding: 14px 28px; border-radius: 6px; font-size: 14px; font-weight: 600;
              display: inline-block; font-family: 'Montserrat', Arial, sans-serif; }
    .link-fallback { margin-top: 14px; font-size: 11px; color: #6b7280; word-break: break-all; }
    .footer { text-align: center; padding: 16px 20px 20px; font-size: 11px; color: #6b7280;
              background: #ffffff; border-top: 1px solid #e31c79; line-height: 1.6; }

    @media only screen and (max-width: 600px) {
      .main { width: 100% !important; border-radius: 0 !important; }
      .content { padding: 22px 18px 28px !important; font-size: 13.5px !important; }
      .header-title { font-size: 24px !important; }
      .content h2 { font-size: 20px !important; }
      .button { width: 100% !important; box-sizing: border-box !important; }
    }

    @media (prefers-color-scheme: dark) {
      body { background: #020617; }
      .wrapper { background: #020617; }
      .main { background: #020617; border-color: #1f2937; }
      .content { color: #e5e7eb; }
      .meta { background: #020617; border: 1px solid #374151; }
      .footer { background: #020617; color: #9ca3af; }
    }
  </style>
</head>

<body>
  <table role="presentation" class="wrapper">
    <tr><td align="center">
      <table role="presentation" class="main">

        <!-- HEADER -->
        <tr>
          <td class="header">
            <div class="header-title">West End Workforce</div>
            <img src="${logoUrl}" alt="West End Workforce Logo" width="64" class="logo" />
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td class="content">
            <h2>New Expense Report Submitted</h2>

            <p>
              <strong>${employeeName}</strong> has submitted a new
              expense report for your review.
            </p>

            <div class="meta">
              <div><strong>Report:</strong> ${reportTitle}</div>
              <div><strong>Period:</strong> ${period}</div>
              <div><strong>Total:</strong> ${formattedTotal}</div>
            </div>

            <div class="button-wrapper">
              <a href="${managerUrl}" class="button">Open Expense Report</a>
            </div>

            <p class="link-fallback">
              If the button does not work:<br />
              <a href="${managerUrl}" style="color:#e31c79;">${managerUrl}</a>
            </p>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td class="footer">
            <p>You are receiving this notification because you are a designated
               approver for expense reports in the Workforce Portal.</p>

            <p>This notification is intended for internal use by authorized personnel only
               and contains no sensitive information. Please sign into the portal
               to view full report details.</p>

            <p>
              West End Workforce · 800 Town & Country Blvd, Suite 500 · Houston, TX 77024<br />
              <a href="mailto:payroll@westendworkforce.com" style="color:#4b5563;">payroll@westendworkforce.com</a> ·
              <a href="https://www.westendworkforce.com" style="color:#4b5563;">westendworkforce.com</a>
            </p>

            <p>© ${year} West End Workforce. All rights reserved.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
`;
}
