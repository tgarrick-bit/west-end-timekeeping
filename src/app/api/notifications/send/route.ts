// src/app/api/notifications/send/route.ts
// Unified notification sender: creates in-app notification + sends email

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createNotification } from '@/lib/notify';
import { sendEmail } from '@/lib/sendEmail';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin/manager role
    const { data: currentUser } = await supabase
      .from('employees')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!currentUser || !['admin', 'manager'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Admin or manager access required' }, { status: 403 });
    }

    const body = await request.json();
    const { type, recipient_id, recipient_email, data: notifData } = body;

    if (!type || !recipient_id) {
      return NextResponse.json({ error: 'type and recipient_id required' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Build notification content based on type
    let title = '';
    let message = '';
    let link = '';
    let emailSubject = '';
    let emailHtml = '';
    const logoUrl = 'https://westendworkforce.com/wp-content/uploads/2025/11/WE-logo-SEPT2024v3-WHT.png';

    switch (type) {
      case 'timecard_reminder': {
        const empName = notifData?.employee_name || 'Employee';
        const weekEnding = notifData?.week_ending || 'this week';
        title = 'Timecard reminder';
        message = `Please submit your timecard for week ending ${weekEnding}`;
        link = '/timesheet/entry';
        emailSubject = `Timecard reminder — week ending ${weekEnding}`;
        emailHtml = `
          <div style="max-width:600px;margin:0 auto;font-family:'Montserrat',Arial,sans-serif;">
            <div style="background:#1a1a1a;padding:20px;text-align:center;">
              <img src="${logoUrl}" alt="West End Workforce" style="height:40px;" />
            </div>
            <div style="padding:30px 20px;background:#ffffff;">
              <h2 style="color:#e31c79;margin:0 0 16px;">Timecard Reminder</h2>
              <p style="color:#555;line-height:1.6;">Hi ${empName},</p>
              <p style="color:#555;line-height:1.6;">
                Your timecard for the week ending <strong>${weekEnding}</strong> has not been submitted yet.
                Please submit it at your earliest convenience.
              </p>
              <div style="text-align:center;margin:24px 0;">
                <a href="${appUrl}/timesheet/entry" style="background:#e31c79;color:#fff;padding:12px 32px;border-radius:7px;text-decoration:none;font-weight:600;display:inline-block;">
                  Submit Timecard
                </a>
              </div>
            </div>
            <div style="background:#FAFAF8;padding:16px;text-align:center;font-size:12px;color:#c0bab2;border-top:1px solid #e31c79;">
              West End Workforce &middot; 800 Town &amp; Country Blvd, Suite 500 &middot; Houston, TX 77024
            </div>
          </div>
        `;
        break;
      }

      case 'approval_reminder': {
        const mgrName = notifData?.manager_name || 'Manager';
        const pendingCount = notifData?.pending_count || 0;
        const details = notifData?.pending_details || [];
        title = 'Approval reminder';
        message = `You have ${pendingCount} timecard(s) pending your approval`;
        link = '/manager/pending';
        emailSubject = `Approval reminder — ${pendingCount} timecard(s) pending`;

        const detailRows = details.slice(0, 10).map((d: any) =>
          `<tr><td style="padding:6px 12px;border-bottom:0.5px solid #f0ece7;font-size:12px;color:#555;">${d.employee || 'Employee'}</td><td style="padding:6px 12px;border-bottom:0.5px solid #f0ece7;font-size:12px;color:#555;">${d.week || ''}</td></tr>`
        ).join('');

        emailHtml = `
          <div style="max-width:600px;margin:0 auto;font-family:'Montserrat',Arial,sans-serif;">
            <div style="background:#1a1a1a;padding:20px;text-align:center;">
              <img src="${logoUrl}" alt="West End Workforce" style="height:40px;" />
            </div>
            <div style="padding:30px 20px;background:#ffffff;">
              <h2 style="color:#e31c79;margin:0 0 16px;">Approval Reminder</h2>
              <p style="color:#555;line-height:1.6;">Hi ${mgrName},</p>
              <p style="color:#555;line-height:1.6;">
                You have <strong>${pendingCount}</strong> timecard(s) pending your approval:
              </p>
              ${detailRows ? `
                <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                  <thead><tr>
                    <th style="padding:8px 12px;text-align:left;font-size:9px;font-weight:500;letter-spacing:1px;color:#c0bab2;text-transform:uppercase;border-bottom:0.5px solid #e8e4df;">Employee</th>
                    <th style="padding:8px 12px;text-align:left;font-size:9px;font-weight:500;letter-spacing:1px;color:#c0bab2;text-transform:uppercase;border-bottom:0.5px solid #e8e4df;">Week</th>
                  </tr></thead>
                  <tbody>${detailRows}</tbody>
                </table>
              ` : ''}
              ${details.length > 10 ? `<p style="font-size:11px;color:#999;">+${details.length - 10} more...</p>` : ''}
              <div style="text-align:center;margin:24px 0;">
                <a href="${appUrl}/manager/pending" style="background:#e31c79;color:#fff;padding:12px 32px;border-radius:7px;text-decoration:none;font-weight:600;display:inline-block;">
                  Review Pending Approvals
                </a>
              </div>
            </div>
            <div style="background:#FAFAF8;padding:16px;text-align:center;font-size:12px;color:#c0bab2;border-top:1px solid #e31c79;">
              West End Workforce &middot; 800 Town &amp; Country Blvd, Suite 500 &middot; Houston, TX 77024
            </div>
          </div>
        `;
        break;
      }

      default:
        title = 'Notification';
        message = notifData?.message || 'You have a new notification';
        link = '/';
        emailSubject = 'Notification from West End Workforce';
        emailHtml = `<p>${message}</p>`;
    }

    // 1) Create in-app notification
    await createNotification(supabase, {
      user_id: recipient_id,
      title,
      message,
      type: 'info',
      link,
    });

    // 2) Send email (if recipient email provided)
    let emailSent = false;
    if (recipient_email) {
      try {
        emailSent = await sendEmail({
          to: recipient_email,
          subject: emailSubject,
          html: emailHtml,
        });
      } catch (emailErr) {
        console.error('[NOTIF SEND] Email failed:', emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      notification_created: true,
      email_sent: emailSent,
    });
  } catch (error) {
    console.error('Error in /api/notifications/send:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
