// src/app/api/expenses/[id]/status/route.ts

import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/auditLog';
import { createNotification } from '@/lib/notify';
import nodemailer from 'nodemailer';
import { buildFinalRejectionEmailHtml } from '@/lib/email-templates/employee';

export const runtime = 'nodejs';

type LineStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: lineId } = await params;

  const supabase = await createServerClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Check role - only managers and admins can approve/reject expenses
  const { data: actingEmployee } = await supabase
    .from('employees')
    .select('role')
    .eq('id', user.id)
    .single();
  const userRole = actingEmployee?.role || 'employee';

  if (!['admin', 'manager', 'time_approver', 'client_approver'].includes(userRole)) {
    return NextResponse.json({ error: 'Forbidden: manager or admin role required' }, { status: 403 });
  }

  try {
    if (!lineId) {
      return NextResponse.json(
        { error: 'Missing expense line id.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const action = body.action as 'approve' | 'reject';
    const rejectionReason: string | undefined = body.rejectionReason;

    if (!action) {
      return NextResponse.json(
        { error: 'Missing action (approve or reject).' },
        { status: 400 }
      );
    }

    // 1) Load the line so we know which report it belongs to
    const { data: line, error: lineError } = await supabase
      .from('expenses')
      .select('id, report_id, status')
      .eq('id', lineId)
      .single();

    if (lineError || !line) {
      console.error('[EXPENSE STATUS] Line not found:', lineError);
      return NextResponse.json(
        { error: 'Expense line not found.' },
        { status: 404 }
      );
    }

    const reportId = line.report_id as string;

    // 1b) Load the parent report (for title, period, employee_id)
    const { data: report, error: reportError } = await supabase
      .from('expense_reports')
      .select('id, employee_id, title, period_month')
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      console.error(
        '[EXPENSE STATUS] Expense report not found when updating line:',
        reportError
      );
      return NextResponse.json(
        { error: 'Parent expense report not found.' },
        { status: 404 }
      );
    }

    // 2) Build update payload for this line
    const updatePayload: Record<string, any> = {};

    if (action === 'approve') {
      updatePayload.status = 'approved';
      updatePayload.rejection_reason = null;
      updatePayload.approved_at = new Date().toISOString();
    } else {
      // reject
      if (!rejectionReason || !rejectionReason.trim()) {
        return NextResponse.json(
          { error: 'Rejection reason is required.' },
          { status: 400 }
        );
      }
      updatePayload.status = 'rejected';
      updatePayload.rejection_reason = rejectionReason.trim();
      updatePayload.approved_at = null;
    }

    const { error: updateLineError } = await supabase
      .from('expenses')
      .update(updatePayload)
      .eq('id', lineId);

    if (updateLineError) {
      console.error('[EXPENSE STATUS] Error updating expense line:', updateLineError);
      return NextResponse.json(
        { error: 'Failed to update expense line.' },
        { status: 500 }
      );
    }

    // 3) Recalculate the report's *intermediate* status based on all line statuses
    const { data: allLines, error: allLinesError } = await supabase
      .from('expenses')
      .select('status')
      .eq('report_id', reportId);

    if (allLinesError || !allLines) {
      console.error(
        '[EXPENSE STATUS] Error loading all lines for report:',
        allLinesError
      );
      return NextResponse.json(
        { error: 'Failed to recalculate report status.' },
        { status: 500 }
      );
    }

    const statuses = (allLines as { status: LineStatus }[]).map(
      (l) => l.status
    );

    const allDraft = statuses.every((s) => s === 'draft');
    const allApproved = statuses.every((s) => s === 'approved');
    const hasSubmitted = statuses.some((s) => s === 'submitted');
    const hasRejected = statuses.some((s) => s === 'rejected');

    let reportStatus: 'draft' | 'submitted' | 'approved' | 'rejected';

    if (allDraft) reportStatus = 'draft';
    else if (allApproved) reportStatus = 'approved';
    // 🔴 IMPORTANT: rejected wins over submitted
    else if (hasRejected) reportStatus = 'rejected';
    else if (hasSubmitted) reportStatus = 'submitted';
    else reportStatus = 'draft';

    const { error: reportUpdateError } = await supabase
      .from('expense_reports')
      .update({
        status: reportStatus,
      })
      .eq('id', reportId);

    if (reportUpdateError) {
      console.error(
        '[EXPENSE STATUS] Error updating expense report status:',
        reportUpdateError
      );
      return NextResponse.json(
        { error: 'Failed to update expense report.' },
        { status: 500 }
      );
    }

    // === AUDIT LOG ===
    await writeAuditLog(supabase, {
      user_id: user.id,
      action: `expense.${action}`,
      metadata: {
        entity_type: 'expense',
        entity_id: lineId,
        old_status: line.status,
        new_status: updatePayload.status,
        employee_id: report.employee_id,
        report_id: reportId,
        reason: updatePayload.rejection_reason || undefined,
      },
    });

    // 4) Notify employee of approval or rejection
    try {
      const { data: empRecord } = await supabase
        .from('employees')
        .select('email, first_name, last_name')
        .eq('id', report.employee_id)
        .single();

      const empName = empRecord ? [empRecord.first_name, empRecord.last_name].filter(Boolean).join(' ') : 'Employee';
      const reportTitle = report.title || 'Expense Report';

      if (action === 'approve') {
        // In-app notification
        await createNotification(supabase, {
          user_id: report.employee_id,
          title: 'Expense approved',
          message: `Your expense on "${reportTitle}" has been approved`,
          type: 'success',
          link: `/expense/${reportId}`,
        });

        // Approval email
        if (empRecord?.email) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const { buildFinalApprovalEmailHtml } = await import('@/lib/email-templates/employee');
          const approvalHtml = buildFinalApprovalEmailHtml({
            employeeName: empName,
            reportTitle,
            period: report.period_month
              ? new Date(report.period_month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
              : 'Recent period',
            reportUrl: `${appUrl}/expense/${reportId}`,
            year: new Date().getFullYear().toString(),
          });
          await sendEmployeeEmail({
            to: empRecord.email,
            subject: `Expense approved: ${reportTitle}`,
            html: approvalHtml,
          });
        }
      } else {
        // Rejection in-app notification
        await createNotification(supabase, {
          user_id: report.employee_id,
          title: 'Expense rejected',
          message: `Your expense on "${reportTitle}" was rejected: ${rejectionReason || 'No reason provided'}`,
          type: 'error',
          link: `/expense/${reportId}`,
        });
      }
    } catch (notifErr) {
      console.error('[EXPENSE STATUS] Error sending notification:', notifErr);
    }

    // 5) If this was a REJECT, also send rejection email
    if (action === 'reject') {
      try {
        console.log(
          '[EXPENSE STATUS] Line rejected; preparing rejection email for employee:',
          report.employee_id
        );

        // Load the employee to get their email + name
        const { data: employee, error: employeeError } = await supabase
          .from('employees')
          .select('email, first_name, last_name')
          .eq('id', report.employee_id)
          .single();

        if (employeeError || !employee) {
          console.warn(
            '[EXPENSE STATUS] Employee record not found for rejection email:',
            employeeError
          );
        } else if (!employee.email) {
          console.warn(
            '[EXPENSE STATUS] Employee has no email set; skipping rejection email.'
          );
        } else {
          const employeeName =
            (employee.first_name || employee.last_name)
              ? [employee.first_name, employee.last_name]
                  .filter(Boolean)
                  .join(' ')
              : 'Team Member';

          const periodLabel = report.period_month
            ? new Date(report.period_month).toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric',
              })
            : 'Recent period';

          const appUrl =
            process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const reportUrl = `${appUrl}/expense/${reportId}`; // uses your existing employee-view route

          const year = new Date().getFullYear().toString();

          const html = buildFinalRejectionEmailHtml({
            employeeName,
            reportTitle: report.title || 'Expense Report',
            period: periodLabel,
            reportUrl,
            year,
            reason: rejectionReason?.trim() || 'No reason provided.',
          });

          const subject = `Expense report updated: line rejected on ${
            report.title || 'Expense Report'
          }`;

          await sendEmployeeEmail({
            to: employee.email,
            subject,
            html,
          });

          console.log(
            '[EXPENSE STATUS] Rejection email sent to employee:',
            employee.email
          );
        }
      } catch (emailErr) {
        console.error(
          '[EXPENSE STATUS] Error sending employee rejection email:',
          emailErr
        );
        // Do not fail the PATCH just because email failed
      }
    }

    return NextResponse.json({
      success: true,
      lineStatus: updatePayload.status,
      reportStatus,
    });
  } catch (err) {
    console.error('Unexpected error in PATCH /api/expenses/[id]/status:', err);
    return NextResponse.json(
      { error: 'Unexpected error updating line.' },
      { status: 500 }
    );
  }
}

async function sendEmployeeEmail(params: {
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
      '[EXPENSE STATUS] SMTP env vars not fully configured; skipping employee email send.'
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

  console.log(
    '[EXPENSE STATUS] Sending employee rejection email via SMTP to',
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
