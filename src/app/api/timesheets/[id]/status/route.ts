import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { TimesheetStatus } from '@/lib/status';
import { writeAuditLog } from '@/lib/auditLog';
import { createNotification } from '@/lib/notify';
import { sendEmail } from '@/lib/sendEmail';

// Service role client for notification lookups (bypasses RLS)
const getAdminClient = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

type Action = 'save' | 'submit' | 'approve' | 'reject' | 'finalize' | 'client_approve';

interface Body {
  action: Action;
  rejectionReason?: string;
}

export const runtime = 'nodejs';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: timesheetId } = await params;

  if (!timesheetId) {
    return NextResponse.json(
      { error: 'Missing timesheet id.' },
      { status: 400 }
    );
  }

  const supabase = await createServerClient();

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

  const isOwner = existing.employee_id === user.id;

  // Look up acting user's role for authorization
  const { data: actingEmployee } = await supabase
    .from('employees')
    .select('role')
    .eq('id', user.id)
    .single();
  const userRole = actingEmployee?.role || 'employee';
  const isAdminOrManager = ['admin', 'manager', 'time_approver', 'client_approver'].includes(userRole);

  // === BASIC STATE MACHINE ===
  switch (body.action) {
    case 'save': {
      if (!isOwner) {
        return NextResponse.json(
          { error: 'You can only edit your own timesheets.' },
          { status: 403 }
        );
      }

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

      // Allow from draft, rejected, or already submitted (idempotent)
      if (!['draft', 'rejected', 'submitted'].includes(currentStatus)) {
        return NextResponse.json(
          {
            error:
              'Only draft, rejected, or already submitted timesheets can be submitted.',
          },
          { status: 400 }
        );
      }

      nextStatus = 'submitted';
      updates.submitted_at = new Date().toISOString();
      break;
    }

    case 'approve': {
      if (!isAdminOrManager) {
        return NextResponse.json(
          { error: 'Only managers and admins can approve timesheets.' },
          { status: 403 }
        );
      }
      if (currentStatus !== 'submitted') {
        return NextResponse.json(
          { error: 'Only submitted timesheets can be approved.' },
          { status: 400 }
        );
      }

      nextStatus = 'approved';
      updates.approved_at = new Date().toISOString();
      updates.rejection_reason = null;
      break;
    }

    case 'reject': {
      if (!isAdminOrManager) {
        return NextResponse.json(
          { error: 'Only managers and admins can reject timesheets.' },
          { status: 403 }
        );
      }
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

    case 'finalize': {
      if (!['admin', 'payroll'].includes(userRole)) {
        return NextResponse.json(
          { error: 'Only admins and payroll can finalize timesheets.' },
          { status: 403 }
        );
      }
      if (currentStatus !== 'approved' && currentStatus !== 'client_approved') {
        return NextResponse.json(
          { error: 'Only approved or client-approved timesheets can be finalized for payroll.' },
          { status: 400 }
        );
      }
      nextStatus = 'payroll_approved';
      updates.payroll_approved_at = new Date().toISOString();
      break;
    }

    case 'client_approve': {
      if (!isAdminOrManager) {
        return NextResponse.json(
          { error: 'Only managers and admins can client-approve timesheets.' },
          { status: 403 }
        );
      }
      if (currentStatus !== 'approved') {
        return NextResponse.json(
          { error: 'Only manager-approved timesheets can be client-approved.' },
          { status: 400 }
        );
      }
      nextStatus = 'client_approved';
      updates.client_approved_at = new Date().toISOString();
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

  // === AUDIT LOG ===
  await writeAuditLog(supabase, {
    user_id: user.id,
    action: `timesheet.${body.action}`,
    metadata: {
      entity_type: 'timesheet',
      entity_id: timesheetId,
      old_status: currentStatus,
      new_status: nextStatus,
      employee_id: existing.employee_id,
      reason: body.rejectionReason || undefined,
    },
  });

  // === IN-APP NOTIFICATIONS + EMAILS ===
  // Use service role client for all lookups (employee can't see manager records via RLS)
  const adminClient = getAdminClient();
  const weekLabel = updated.week_ending || 'this period';
  if (nextStatus === 'submitted' && existing.employee_id) {
    // Notify manager that employee submitted
    const { data: emp } = await adminClient.from('employees').select('manager_id, first_name, last_name').eq('id', existing.employee_id).single();
    if (emp?.manager_id) {
      await createNotification(adminClient, {
        user_id: emp.manager_id,
        title: 'Timesheet submitted',
        message: `${emp.first_name} ${emp.last_name} submitted their timesheet for week ending ${weekLabel}`,
        type: 'info',
        link: '/manager',
      });
    }
  } else if (nextStatus === 'approved') {
    await createNotification(supabase, {
      user_id: existing.employee_id,
      title: 'Timesheet approved',
      message: `Your timesheet for week ending ${weekLabel} has been approved`,
      type: 'success',
      link: '/employee',
    });
  } else if (nextStatus === 'rejected') {
    await createNotification(supabase, {
      user_id: existing.employee_id,
      title: 'Timesheet rejected',
      message: `Your timesheet for week ending ${weekLabel} was rejected. ${body.rejectionReason || ''}`.trim(),
      type: 'error',
      link: '/timesheet/entry',
    });
  } else if (nextStatus === 'payroll_approved') {
    await createNotification(supabase, {
      user_id: existing.employee_id,
      title: 'Timesheet finalized',
      message: `Your timesheet for week ending ${weekLabel} has been finalized for payroll`,
      type: 'success',
      link: '/employee',
    });
  }

  // === EMAIL NOTIFICATIONS (WE unified design) ===
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const logoUrl =
      'https://westendworkforce.com/wp-content/uploads/2025/11/WE-logo-SEPT2024v3-WHT.png';
    const weekEnding =
      (updated as any).week_ended_on ?? updated.week_ending ?? 'this period';

    // Employee record
    const {
      data: employee,
      error: employeeError,
    } = await adminClient
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

    // Manager lookup
    let managerEmail: string | null = null;
    let managerName: string | null = null;

    if (employee?.manager_id) {
      const { data: manager, error: managerError } = await adminClient
        .from('employees')
        .select('id, first_name, last_name, email')
        .eq('id', employee.manager_id)
        .single();

      if (managerError) {
        console.error('Error loading manager for timesheet email:', managerError);
      } else if (manager) {
        managerEmail = manager.email ?? null;
        managerName =
          (manager.first_name || manager.last_name
            ? `${manager.first_name || ''} ${manager.last_name || ''}`.trim()
            : null) ?? 'Manager';
      }
    }

    // Fallback manager notification recipient (same as expenses, if configured)
    const fallbackManagerEmail =
      process.env.EXPENSE_MANAGER_NOTIFY_EMAIL || null;

    const managerRecipient = managerEmail || fallbackManagerEmail;

    // === MANAGER EMAIL: SUBMITTED ===
    if (nextStatus === 'submitted' && managerRecipient) {
      const totalHours = updated.total_hours || 0;
      const overtimeHours = updated.overtime_hours || 0;
      const regularHours = totalHours - overtimeHours;
      const isResubmission = currentStatus === 'rejected';
      const previousReason = isResubmission ? (existing.rejection_reason || '') : '';

      const html = `
        <div style="max-width:600px;margin:0 auto;font-family:'Montserrat',Arial,sans-serif;">
          <div style="background:#1a1a1a;padding:20px;text-align:center;">
            <img src="${logoUrl}" alt="West End Workforce" style="height:40px;" />
          </div>
          <div style="padding:30px 20px;background:#ffffff;">
            <h2 style="color:#e31c79;margin:0 0 16px;">${isResubmission ? 'Timesheet Resubmitted' : 'Timesheet Submitted'}</h2>
            <p style="color:#555;line-height:1.6;">Hi ${managerName || 'Manager'},</p>
            <p style="color:#555;line-height:1.6;">
              <strong>${employeeName}</strong> has ${isResubmission ? 'revised and resubmitted' : 'submitted'} a timesheet for your review.
            </p>
            ${isResubmission && previousReason ? `
            <div style="background:#FEF2F2;border:0.5px solid #FECACA;border-radius:10px;padding:14px;margin:0 0 16px;">
              <p style="margin:0;color:#b91c1c;font-size:13px;"><strong>Previously rejected:</strong> ${previousReason}</p>
            </div>` : ''}
            <div style="background:#FAFAF8;border:0.5px solid #e8e4df;border-radius:10px;padding:16px;margin:20px 0;">
              <p style="margin:0 0 12px;color:#1a1a1a;font-weight:600;">Timesheet Details:</p>
              <p style="margin:0 0 6px;color:#555;">Week Ending: <strong>${weekEnding}</strong></p>
              <p style="margin:0 0 6px;color:#555;">Regular Hours: <strong>${regularHours.toFixed(1)}</strong></p>
              ${overtimeHours > 0 ? `<p style="margin:0 0 6px;color:#555;">Overtime Hours: <strong>${overtimeHours.toFixed(1)}</strong></p>` : ''}
              <p style="margin:0 0 6px;color:#555;">Total Hours: <strong>${totalHours.toFixed(1)}</strong></p>
            </div>
            <div style="text-align:center;margin:24px 0;">
              <a href="${appUrl}/manager/pending"
                 style="background:#e31c79;color:#ffffff;padding:12px 32px;border-radius:7px;text-decoration:none;font-weight:600;display:inline-block;">
                Review & Approve
              </a>
            </div>
          </div>
          <div style="background:#FAFAF8;padding:16px;text-align:center;font-size:12px;color:#c0bab2;border-top:1px solid #e31c79;">
            West End Workforce &middot; 800 Town &amp; Country Blvd, Suite 500 &middot; Houston, TX 77024
          </div>
        </div>
      `;

      await sendEmail({
        to: managerRecipient,
        subject: `Timesheet ${isResubmission ? 'resubmitted' : 'submitted'} by ${employeeName} — ${totalHours.toFixed(1)} hrs`,
        html,
      });

    }

    // === EMPLOYEE EMAIL: APPROVED ===
    if (nextStatus === 'approved' && employee?.email) {
      const html = `
        <div style="max-width:600px;margin:0 auto;font-family:'Montserrat',Arial,sans-serif;">
          <div style="background:#1a1a1a;padding:20px;text-align:center;">
            <img src="${logoUrl}" alt="West End Workforce" style="height:40px;" />
          </div>
          <div style="padding:30px 20px;background:#ffffff;">
            <h2 style="color:#2d9b6e;margin:0 0 16px;">Timesheet Approved</h2>
            <p style="color:#555;line-height:1.6;">Hi ${employeeName},</p>
            <p style="color:#555;line-height:1.6;">
              Your timesheet for the week ending <strong>${weekEnding}</strong> has been approved.
              No further action is needed.
            </p>
            <div style="background:#FAFAF8;border:0.5px solid #e8e4df;border-radius:10px;padding:16px;margin:20px 0;">
              <p style="margin:0 0 6px;color:#555;">Week Ending: <strong>${weekEnding}</strong></p>
              <p style="margin:0 0 6px;color:#555;">Total Hours: <strong>${(updated.total_hours || 0).toFixed(1)}</strong></p>
              <p style="margin:0;color:#2d9b6e;font-weight:600;">Status: Approved</p>
            </div>
            <div style="text-align:center;margin:24px 0;">
              <a href="${appUrl}/employee"
                 style="background:#e31c79;color:#ffffff;padding:12px 32px;border-radius:7px;text-decoration:none;font-weight:600;display:inline-block;">
                View Dashboard
              </a>
            </div>
            <p style="color:#999;font-size:13px;line-height:1.5;">
              If you have any questions, please email
              <a href="mailto:payroll@westendworkforce.com" style="color:#e31c79;">payroll@westendworkforce.com</a>.
            </p>
          </div>
          <div style="background:#FAFAF8;padding:16px;text-align:center;font-size:12px;color:#c0bab2;border-top:1px solid #e31c79;">
            West End Workforce &middot; 800 Town &amp; Country Blvd, Suite 500 &middot; Houston, TX 77024
          </div>
        </div>
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
        <div style="max-width:600px;margin:0 auto;font-family:'Montserrat',Arial,sans-serif;">
          <div style="background:#1a1a1a;padding:20px;text-align:center;">
            <img src="${logoUrl}" alt="West End Workforce" style="height:40px;" />
          </div>
          <div style="padding:30px 20px;background:#ffffff;">
            <h2 style="color:#b91c1c;margin:0 0 16px;">Timesheet Rejected</h2>
            <p style="color:#555;line-height:1.6;">Hi ${employeeName},</p>
            <p style="color:#555;line-height:1.6;">
              Your timesheet for the week ending <strong>${weekEnding}</strong> has been rejected and needs your attention.
            </p>
            <div style="background:#FEF2F2;border:0.5px solid #FECACA;border-radius:10px;padding:16px;margin:20px 0;">
              <p style="margin:0 0 6px;color:#555;">Week Ending: <strong>${weekEnding}</strong></p>
              ${reasonText ? `<p style="margin:0 0 6px;color:#b91c1c;"><strong>Reason:</strong> ${reasonText}</p>` : ''}
              <p style="margin:0;color:#b91c1c;font-weight:600;">Please update and resubmit.</p>
            </div>
            <div style="text-align:center;margin:24px 0;">
              <a href="${appUrl}/timesheet/entry"
                 style="background:#e31c79;color:#ffffff;padding:12px 32px;border-radius:7px;text-decoration:none;font-weight:600;display:inline-block;">
                Fix &amp; Resubmit
              </a>
            </div>
            <p style="color:#999;font-size:13px;line-height:1.5;">
              If you have any questions, please email
              <a href="mailto:payroll@westendworkforce.com" style="color:#e31c79;">payroll@westendworkforce.com</a>.
            </p>
          </div>
          <div style="background:#FAFAF8;padding:16px;text-align:center;font-size:12px;color:#c0bab2;border-top:1px solid #e31c79;">
            West End Workforce &middot; 800 Town &amp; Country Blvd, Suite 500 &middot; Houston, TX 77024
          </div>
        </div>
      `;

      await sendEmail({
        to: employee.email,
        subject: `Your timesheet for ${weekEnding} was rejected — action required`,
        html,
      });
    }

    // === EMPLOYEE EMAIL: PAYROLL APPROVED (FINALIZED) ===
    if (nextStatus === 'payroll_approved' && employee?.email) {
      const html = `
        <div style="max-width:600px;margin:0 auto;font-family:'Montserrat',Arial,sans-serif;">
          <div style="background:#1a1a1a;padding:20px;text-align:center;">
            <img src="${logoUrl}" alt="West End Workforce" style="height:40px;" />
          </div>
          <div style="padding:30px 20px;background:#ffffff;">
            <h2 style="color:#2d9b6e;margin:0 0 16px;">Timesheet Finalized for Payroll</h2>
            <p style="color:#555;line-height:1.6;">Hi ${employeeName},</p>
            <p style="color:#555;line-height:1.6;">
              Your timesheet for the week ending <strong>${weekEnding}</strong> has been finalized for payroll processing.
              This timesheet is now locked and no further changes can be made.
            </p>
            <div style="background:#FAFAF8;border:0.5px solid #e8e4df;border-radius:10px;padding:16px;margin:20px 0;">
              <p style="margin:0 0 6px;color:#555;">Week Ending: <strong>${weekEnding}</strong></p>
              <p style="margin:0 0 6px;color:#555;">Total Hours: <strong>${(updated.total_hours || 0).toFixed(1)}</strong></p>
              <p style="margin:0;color:#2d9b6e;font-weight:600;">Status: Finalized for Payroll</p>
            </div>
            <p style="color:#999;font-size:13px;line-height:1.5;">
              If you have any questions, please email
              <a href="mailto:payroll@westendworkforce.com" style="color:#e31c79;">payroll@westendworkforce.com</a>.
            </p>
          </div>
          <div style="background:#FAFAF8;padding:16px;text-align:center;font-size:12px;color:#c0bab2;border-top:1px solid #e31c79;">
            West End Workforce &middot; 800 Town &amp; Country Blvd, Suite 500 &middot; Houston, TX 77024
          </div>
        </div>
      `;

      await sendEmail({
        to: employee.email,
        subject: `Your timesheet for ${weekEnding} has been finalized for payroll`,
        html,
      });
    }
  } catch (emailError) {
    console.error('Timesheet status email error:', emailError);
    // Don’t fail the API if email sending fails
  }

  return NextResponse.json({ timesheet: updated });
}