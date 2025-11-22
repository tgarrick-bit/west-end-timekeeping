// src/app/api/expenses/[id]/status/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { ExpenseStatus } from '@/lib/status';

// Simple helper to send emails through your existing notifications API
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
      console.error('Failed to send email:', await res.text());
    }
  } catch (err) {
    console.error('Email send error:', err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Use cookies via callback to keep Next.js happy
  const supabase = createRouteHandlerClient({
    cookies: () => cookies(),
  });

  const { id } = params;
  const body = (await req.json()) as {
    action: 'save' | 'submit' | 'approve' | 'reject';
    rejectionReason?: string;
  };

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Look up the expense record
  const { data: existing, error: fetchError } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    console.error('Expense fetch error:', fetchError);
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  }

  let nextStatus: ExpenseStatus = existing.status as ExpenseStatus;
  const updates: Record<string, any> = {};

  switch (body.action) {
    case 'save':
      nextStatus = 'draft';
      break;

    case 'submit':
      nextStatus = 'submitted';
      updates.submitted_at = new Date().toISOString();
      break;

    case 'approve':
      nextStatus = 'approved';
      updates.approved_at = new Date().toISOString();
      updates.rejected_at = null;
      updates.rejected_by = null;
      updates.rejection_reason = null;
      break;

    case 'reject':
      if (!body.rejectionReason || !body.rejectionReason.trim()) {
        return NextResponse.json(
          { error: 'Rejection reason is required' },
          { status: 400 }
        );
      }
      nextStatus = 'rejected';
      updates.rejected_at = new Date().toISOString();
      updates.rejected_by = user.id;
      updates.rejection_reason = body.rejectionReason.trim();
      break;

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  updates.status = nextStatus;

  const { data: updated, error: updateError } = await supabase
    .from('expenses')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (updateError || !updated) {
    console.error('Expense update error:', updateError);
    return NextResponse.json(
      { error: updateError?.message || 'Failed to update expense' },
      { status: 500 }
    );
  }

  // 🔁 SYNC THE LINKED EXPENSE REPORT (so employee page sees the new status)
  try {
    const reportId =
      (updated as any).expense_report_id || (updated as any).report_id;

    if (reportId) {
      await supabase
        .from('expense_reports')
        .update({ status: nextStatus })
        .eq('id', reportId);
    }
  } catch (syncError) {
    console.error('Error syncing expense_reports status:', syncError);
    // don't fail the whole request for this
  }

  // === EMAIL NOTIFICATIONS ===
  try {
    const { data: employee } = await supabase
      .from('employees')
      .select('id, first_name, last_name, email, manager_id')
      .eq('id', updated.employee_id)
      .single();

    let manager:
      | {
          id: string;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
        }
      | null = null;

    if (employee?.manager_id) {
      const { data: mgr } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email')
        .eq('id', employee.manager_id)
        .single();
      manager = mgr;
    }

    const periodLabel =
      (updated as any).period_month || updated.created_at || 'this period';

    const employeeName = employee
      ? `${employee.first_name || ''} ${employee.last_name || ''}`.trim() ||
        'Employee'
      : 'Employee';

    const managerName = manager
      ? `${manager.first_name || ''} ${manager.last_name || ''}`.trim() ||
        'Manager'
      : 'Manager';

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const title = (updated as any).title || 'Expense report';

    if (body.action === 'submit' && manager?.email) {
      await sendEmail({
        to: manager.email,
        subject: `Expense submitted by ${employeeName}: ${title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #e31c79; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">West End Workforce</h1>
            </div>
            <div style="background-color: #f5f5f5; padding: 20px;">
              <h2 style="color: #05202E;">Expense Submitted</h2>
              <p>Hello ${managerName},</p>
              <p>${employeeName} has submitted an expense report (<strong>${title}</strong>) for <strong>${periodLabel}</strong>.</p>
              <p>Please review and approve it at your earliest convenience.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${appUrl}/manager" 
                   style="background-color: #e31c79; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Review Expense
                </a>
              </div>
            </div>
            <div style="background-color: #05202E; padding: 15px; text-align: center;">
              <p style="color: white; margin: 0; font-size: 12px;">© 2025 West End Workforce</p>
            </div>
          </div>
        `,
      });
    }

    if (body.action === 'approve' && employee?.email) {
      await sendEmail({
        to: employee.email,
        subject: `Your expense "${title}" was approved`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #e31c79; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">West End Workforce</h1>
            </div>
            <div style="background-color: #f5f5f5; padding: 20px;">
              <h2 style="color: #05202E;">Expense Approved</h2>
              <p>Hello ${employeeName},</p>
              <p>Your expense report <strong>${title}</strong> for <strong>${periodLabel}</strong> has been <strong>approved</strong>.</p>
              <p>No further action is required.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${appUrl}/employee/expenses" 
                   style="background-color: #e31c79; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  View Expense
                </a>
              </div>
            </div>
            <div style="background-color: #05202E; padding: 15px; text-align: center;">
              <p style="color: white; margin: 0; font-size: 12px;">© 2025 West End Workforce</p>
            </div>
          </div>
        `,
      });
    }

    if (body.action === 'reject' && employee?.email) {
      const reason =
        updates.rejection_reason || (updated as any).rejection_reason || '';
      await sendEmail({
        to: employee.email,
        subject: `Your expense "${title}" was rejected`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #e31c79; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">West End Workforce</h1>
            </div>
            <div style="background-color: #f5f5f5; padding: 20px;">
              <h2 style="color: #05202E;">Expense Rejected</h2>
              <p>Hello ${employeeName},</p>
              <p>Your expense report <strong>${title}</strong> for <strong>${periodLabel}</strong> has been <strong>rejected</strong>.</p>
              ${
                reason
                  ? `<p><strong>Reason:</strong> ${reason}</p>`
                  : `<p>Please review and update your expense report, then resubmit for approval.</p>`
              }
              <div style="text-align: center; margin: 30px 0;">
                <a href="${appUrl}/employee/expenses" 
                   style="background-color: #e31c79; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Fix and Resubmit
                </a>
              </div>
            </div>
            <div style="background-color: #05202E; padding: 15px; text-align: center;">
              <p style="color: white; margin: 0; font-size: 12px;">© 2025 West End Workforce</p>
            </div>
          </div>
        `,
      });
    }
  } catch (emailError) {
    console.error('Expense status email error:', emailError);
  }

  return NextResponse.json({ expense: updated });
}