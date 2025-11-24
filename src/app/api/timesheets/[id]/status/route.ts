// src/app/api/timesheets/[id]/status/route.ts

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { TimesheetStatus } from '@/lib/status';

type Action = 'save' | 'submit' | 'approve' | 'reject';

interface Body {
  action: Action;
  rejectionReason?: string;
}

export const runtime = 'nodejs'; // we use supabase-js + fetch

// tiny helper so logging bad responses is easier
async function $fetchText(res: Response) {
  try {
    return await res.text();
  } catch {
    return '<no body>';
  }
}

// Shared helper for sending emails via your notifications API
async function sendEmail(payload: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const res = await fetch(`${baseUrl}/api/notifications/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error('Failed to send email:', await $fetchText(res));
    }
  } catch (err) {
    console.error('Email send error:', err);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id: timesheetId } = params;

  if (!timesheetId) {
    return NextResponse.json(
      { error: 'Missing timesheet id.' },
      { status: 400 }
    );
  }

  // ✅ Correct cookies usage in App Router
  const supabase = createRouteHandlerClient({ cookies });

  const body = (await req.json()) as Body;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('Auth error in timesheet status route:', userError);
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Load existing timesheet
  const { data: existing, error: fetchError } = await supabase
    .from('timesheets')
    .select('*')
    .eq('id', timesheetId)
    .single();

  if (fetchError || !existing) {
    console.error('Timesheet fetch error:', fetchError);
    return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
  }

  const currentStatus = existing.status as TimesheetStatus;
  let nextStatus: TimesheetStatus = currentStatus;
  const updates: Record<string, any> = {};

  // Simple ownership + manager check helpers
  const isOwner = existing.employee_id === user.id;

  // If you later add manager logic, you can look up employee + manager here
  // and enforce that the current user is the manager for approve/reject.

  // === BASIC STATE MACHINE ===
  switch (body.action) {
    case 'save': {
      // Only the owner can save their timesheet
      if (!isOwner) {
        return NextResponse.json(
          { error: 'You can only edit your own timesheets.' },
          { status: 403 }
        );
      }

      // Don’t allow editing approved timesheets
      if (currentStatus === 'approved') {
        return NextResponse.json(
          { error: 'Approved timesheets cannot be modified.' },
          { status: 400 }
        );
      }
      nextStatus = 'draft';
      break;
    }

    case 'submit': {
      if (!isOwner) {
        return NextResponse.json(
          { error: 'You can only submit your own timesheets.' },
          { status: 403 }
        );
      }

      // Only draft or rejected can be submitted
      if (!['draft', 'rejected'].includes(currentStatus)) {
        return NextResponse.json(
          { error: 'Only draft or rejected timesheets can be submitted.' },
          { status: 400 }
        );
      }
      nextStatus = 'submitted';
      updates.submitted_at = new Date().toISOString();
      break;
    }

    case 'approve': {
      // Manager check can be added later (after we finalize employees RLS)
      // For now, just ensure you don't approve your own timesheets unless intended.

      // Only submitted can be approved
      if (currentStatus !== 'submitted') {
        return NextResponse.json(
          { error: 'Only submitted timesheets can be approved.' },
          { status: 400 }
        );
      }
      nextStatus = 'approved';
      updates.approved_at = new Date().toISOString();
      // Clear any old rejection note
      updates.rejection_reason = null;
      break;
    }

    case 'reject': {
      // Manager check can be added here as well.

      if (currentStatus !== 'submitted') {
        return NextResponse.json(
          { error: 'Only submitted timesheets can be rejected.' },
          { status: 400 }
        );
      }
      if (!body.rejectionReason || !body.rejectionReason.trim()) {
        return NextResponse.json(
          { error: 'Rejection reason is required.' },
          { status: 400 }
        );
      }
      nextStatus = 'rejected';
      updates.rejection_reason = body.rejectionReason.trim();
      break;
    }

    default:
      return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  }

  updates.status = nextStatus;

  const { data: updated, error: updateError } = await supabase
    .from('timesheets')
    .update(updates)
    .eq('id', timesheetId)
    .select()
    .single();

  if (updateError || !updated) {
    console.error('Timesheet update error:', updateError);
    return NextResponse.json(
      { error: updateError?.message || 'Failed to update timesheet.' },
      { status: 500 }
    );
  }

  // === EMAIL NOTIFICATIONS (WE unified design) ===
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const logoUrl =
      'https://westendworkforce.com/wp-content/uploads/2025/11/WE-logo-SEPT2024v3-WHT.png';
    const weekEnding =
      (updated as any).week_ended_on ?? updated.week_ending ?? 'this period';

    const testManagerEmail = process.env.MANAGER_TEST_EMAIL || null;

    // Employee record
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, first_name, last_name, email, manager_id')
      .eq('id', updated.employee_id)
      .single();

    if (employeeError) {
      console.error(
        'Error loading employee for timesheet email:',
        employeeError
      );
    }

    const employeeName =
      employee && (employee.first_name || employee.last_name)
        ? `${employee.first_name || ''} ${employee.last_name || ''}`.trim()
        : 'Employee';

    const year = new Date().getFullYear().toString();

    const footerHtml = `
      <tr>
        <td class="footer" style="
          text-align: center;
          padding: 18px 20px 22px;
          font-size: 12px;
          color: #6b7280;
          font-family: 'Montserrat', Arial, sans-serif;
          line-height: 1.6;
          background: #ffffff;
          border-top: 1px solid #e31c79;
        ">
          <p style="margin: 0 0 6px;">
            This notification is intended for internal use by authorized personnel only
            and contains no sensitive information. Please sign into the portal
            to view full timesheet details.
          </p>

          <p style="margin: 0 0 6px;">
            West End Workforce · 800 Town &amp; Country Blvd, Suite 500 · Houston, TX 77024<br />
            <a href="mailto:payroll@westendworkforce.com" style="color:#4b5563; text-decoration:none;">
              payroll@westendworkforce.com
            </a> ·
            <a href="https://www.westendworkforce.com" style="color:#4b5563; text-decoration:none;">
              westendworkforce.com
            </a>
          </p>

          <p style="margin: 0;">
            © ${year} West End Workforce. All rights reserved.
          </p>
        </td>
      </tr>
    `;

    // === TEMP: HARD-CODED MANAGER TEST EMAIL ON SUBMIT ===
    if (nextStatus === 'submitted' && testManagerEmail) {
      console.log('TIMESHEET → manager TEST email branch entered', {
        timesheetId,
        currentStatus,
        nextStatus,
        employeeId: employee?.id,
        testManagerEmail,
      });

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Timesheet Submitted (Test Manager)</title>
  <link href="https://fonts.googleapis.com/css2?family=Antonio:wght@700&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#f3f6f9;font-family:'Montserrat',Arial,sans-serif;">
  <table role="presentation" width="100%" style="table-layout:fixed;background:#f3f6f9;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:620px;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">

          <!-- HEADER -->
          <tr>
            <td style="padding:28px 20px 18px;background:#05202E;border-bottom:3px solid #e31c79;text-align:center;">
              <div style="font-family:'Antonio',Arial,sans-serif;font-size:28px;margin:0;color:#ffffff;font-weight:700;letter-spacing:0.4px;">
                West End Workforce
              </div>
              <img src="${logoUrl}" alt="West End Workforce Logo" width="72" style="display:block;margin:14px auto 0;" />
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:26px 28px 34px;font-size:14px;color:#374151;line-height:1.7;font-family:'Montserrat',Arial,sans-serif;">
              <h2 style="
                margin:0 0 12px;
                font-family:'Antonio', Arial, sans-serif;
                font-size:22px;
                font-weight:700;
                color:#111827;
              ">
                New Timesheet Submitted (Test)
              </h2>
              <p>Hello,</p>
              <p>This is a <strong>test manager notification</strong> sent from the timesheet status route.</p>
              <p><strong>${employeeName}</strong> has submitted a timesheet for the week ending <strong>${weekEnding}</strong>.</p>

              <p style="margin-top:18px;font-size:13px;color:#6b7280;">
                If you are seeing this email at <code>${testManagerEmail}</code>, the manager notification path is working.
              </p>

              <div style="text-align:center;margin:30px 0 10px;">
                <a href="${appUrl}/manager"
                   style="background:#e31c79;color:#ffffff !important;padding:14px 28px;border-radius:6px;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;font-family:'Montserrat',Arial,sans-serif;">
                  Open Manager Portal
                </a>
              </div>

              <p style="margin:16px 0 0;font-size:12px;color:#6b7280;">
                If the button does not work, copy and paste this link into your browser:<br/>
                <a href="${appUrl}/manager" style="color:#e31c79;text-decoration:none;">${appUrl}/manager</a>
              </p>
            </td>
          </tr>

          ${footerHtml}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      await sendEmail({
        to: testManagerEmail,
        subject: `TEST: Timesheet submitted by ${employeeName}`,
        html,
      });

      console.log(
        `TIMESHEET → manager TEST email SENT to ${testManagerEmail}`
      );
    }

    // === EMPLOYEE EMAIL: APPROVED ===
    if (nextStatus === 'approved' && employee?.email) {
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Timesheet Approved</title>
  <link href="https://fonts.googleapis.com/css2?family=Antonio:wght@700&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#f3f6f9;font-family:'Montserrat',Arial,sans-serif;">
  <table role="presentation" width="100%" style="table-layout:fixed;background:#f3f6f9;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:620px;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">

          <!-- HEADER -->
          <tr>
            <td style="padding:28px 20px 18px;background:#05202E;border-bottom:3px solid #e31c79;text-align:center;">
              <div style="font-family:'Antonio',Arial,sans-serif;font-size:28px;margin:0;color:#ffffff;font-weight:700;letter-spacing:0.4px;">
                West End Workforce
              </div>
              <img src="${logoUrl}" alt="West End Workforce Logo" width="72" style="display:block;margin:14px auto 0;" />
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:26px 28px 34px;font-size:14px;color:#374151;line-height:1.7;font-family:'Montserrat',Arial,sans-serif;">
              <h2 style="
                margin:0 0 14px;
                font-family:'Antonio', Arial, sans-serif;
                font-size:26px;
                font-weight:700;
                color:#111827;
              ">
                Timesheet Approved
              </h2>
              <p>Hello ${employeeName},</p>
              <p>Your timesheet for the week ending <strong>${weekEnding}</strong> has been <strong>approved</strong>.</p>
              <p>No further action is required.</p>

              <div style="text-align:center;margin:30px 0 10px;">
                <a href="${appUrl}/employee"
                   style="background:#e31c79;color:#ffffff !important;padding:14px 28px;border-radius:6px;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;font-family:'Montserrat',Arial,sans-serif;">
                  View Timesheet
                </a>
              </div>

              <p style="margin:16px 0 0;font-size:12px;color:#6b7280;">
                If the button does not work, copy and paste this link into your browser:<br/>
                <a href="${appUrl}/employee" style="color:#e31c79;text-decoration:none;">${appUrl}/employee</a>
              </p>
            </td>
          </tr>

          ${footerHtml}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      await sendEmail({
        to: employee.email,
        subject: `Your timesheet for ${weekEnding} was approved`,
        html,
      });
    }

    // === EMPLOYEE EMAIL: REJECTED ===
    if (nextStatus === 'rejected' && employee?.email) {
      const reasonText =
        updates.rejection_reason || (updated as any).rejection_reason || '';
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Timesheet Rejected</title>
  <link href="https://fonts.googleapis.com/css2?family=Antonio:wght@700&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#f3f6f9;font-family:'Montserrat',Arial,sans-serif;">
  <table role="presentation" width="100%" style="table-layout:fixed;background:#f3f6f9;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:620px;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">

          <!-- HEADER -->
          <tr>
            <td style="padding:28px 20px 18px;background:#05202E;border-bottom:3px solid #e31c79;text:text-align:center;">
              <div style="font-family:'Antonio',Arial,sans-serif;font-size:28px;margin:0;color:#ffffff;font-weight:700;letter-spacing:0.4px;">
                West End Workforce
              </div>
              <img src="${logoUrl}" alt="West End Workforce Logo" width="72" style="display:block;margin:14px auto 0;" />
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:26px 28px 34px;font-size:14px;color:#374151;line-height:1.7;font-family:'Montserrat',Arial,sans-serif;">
              <h2 style="
                margin:0 0 14px;
                font-family:'Antonio', Arial, sans-serif;
                font-size:26px;
                font-weight:700;
                color:#b91c1c;
              ">
                Timesheet Rejected
              </h2>
              <p>Hello ${employeeName},</p>
              <p>Your timesheet for the week ending <strong>${weekEnding}</strong> has been <strong>rejected</strong>.</p>
              ${
                reasonText
                  ? `<p><strong>Reason:</strong> ${reasonText}</p>`
                  : '<p>Please review and update your timesheet, then resubmit for approval.</p>'
              }

              <div style="text-align:center;margin:30px 0 10px;">
                <a href="${appUrl}/employee"
                   style="background:#e31c79;color:#ffffff !important;padding:14px 28px;border-radius:6px;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;font-family:'Montserrat',Arial,sans-serif;">
                  Update and Resubmit
                </a>
              </div>

              <p style="margin:16px 0 0;font-size:12px;color:#6b7280;">
                If the button does not work, copy and paste this link into your browser:<br/>
                <a href="${appUrl}/employee" style="color:#e31c79;text-decoration:none;">${appUrl}/employee</a>
              </p>
            </td>
          </tr>

          ${footerHtml}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      await sendEmail({
        to: employee.email,
        subject: `Your timesheet for ${weekEnding} was rejected`,
        html,
      });
    }
  } catch (emailError) {
    console.error('Timesheet status email error:', emailError);
    // Don’t fail the API if email sending fails
  }

  return NextResponse.json({ timesheet: updated });
}
