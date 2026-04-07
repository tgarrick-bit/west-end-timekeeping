// src/app/api/notifications/send-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import nodemailer from 'nodemailer';
import { Notification } from '@/types/notifications';

// POST /api/notifications/send-email - Send email notification
export async function POST(request: NextRequest) {
  try {
    // Auth check — internal server-to-server calls also need valid session
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Two shapes supported:
    // 1) { to, subject, html, text? }
    // 2) { to, notification, customData }
    const hasDirectFields = body.to && body.subject && body.html;
    const hasTemplateFields = body.to && body.notification;

    if (!hasDirectFields && !hasTemplateFields) {
      return NextResponse.json(
        {
          error:
            'Invalid payload. Provide either {to, subject, html} OR {to, notification, customData}.',
        },
        { status: 400 },
      );
    }

    const to = body.to as string;


    // Create SMTP transporter using env vars only
    // Supports both authenticated (Gmail App Password) and relay (Google Workspace SMTP Relay) modes
    const smtpConfig: any = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      tls: {
        rejectUnauthorized: false,
      },
    };

    // Only add auth if SMTP_PASS is provided (SMTP Relay doesn't need it)
    if (process.env.SMTP_PASS) {
      smtpConfig.auth = {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      };
    }

    const transporter = nodemailer.createTransport(smtpConfig);

    let subject: string;
    let htmlBody: string;
    let textBody: string | undefined;

    if (hasDirectFields) {
      // 1) Simple direct email: { to, subject, html }
      subject = body.subject;
      htmlBody = body.html;
      textBody = body.text || undefined;
    } else {
      // 2) Template-based: { to, notification, customData }
      const notification: Notification = body.notification;
      const customData = body.customData || {};
      const template = getEmailTemplate(notification.type, customData);

      subject = template.subject;
      htmlBody = template.htmlBody;
      textBody = template.textBody;
    }

    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME || 'West End Workforce'} <${
        process.env.EMAIL_FROM || 'payroll@westendworkforce.com'
      }>`,
      to,
      replyTo: process.env.EMAIL_REPLY_TO || 'payroll@westendworkforce.com',
      subject,
      html: htmlBody,
      text: textBody,
    };

    const info = await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      message: 'Email sent successfully',
    });
  } catch (error) {
    console.error('Failed to send email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 },
    );
  }
}

// Branded email template wrapper — matches the WE design system
function getEmailTemplate(
  type: string,
  customData?: Record<string, any>,
): { subject: string; htmlBody: string; textBody: string } {
  const d = { ...customData };
  const logoUrl = 'https://westendworkforce.com/wp-content/uploads/2025/11/WE-logo-SEPT2024v3-WHT.png';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const year = new Date().getFullYear();

  const wrap = (heading: string, headingColor: string, body: string, cta?: { label: string; url: string }) => `
    <div style="max-width:600px;margin:0 auto;font-family:'Montserrat',Arial,sans-serif;">
      <div style="background:#1a1a1a;padding:20px;text-align:center;">
        <img src="${logoUrl}" alt="West End Workforce" style="height:40px;" />
      </div>
      <div style="padding:30px 20px;background:#ffffff;">
        <h2 style="color:${headingColor};margin:0 0 16px;">${heading}</h2>
        ${body}
        ${cta ? `<div style="text-align:center;margin:24px 0;"><a href="${cta.url}" style="background:#e31c79;color:#ffffff;padding:12px 32px;border-radius:7px;text-decoration:none;font-weight:600;display:inline-block;">${cta.label}</a></div>` : ''}
        <p style="color:#999;font-size:13px;line-height:1.5;">If you have any questions, please email <a href="mailto:payroll@westendworkforce.com" style="color:#e31c79;">payroll@westendworkforce.com</a>.</p>
      </div>
      <div style="background:#FAFAF8;padding:16px;text-align:center;font-size:12px;color:#c0bab2;border-top:1px solid #e31c79;">
        West End Workforce &middot; 800 Town &amp; Country Blvd, Suite 500 &middot; Houston, TX 77024
      </div>
    </div>`;

  const info = (label: string, value: string) => `<p style="margin:0 0 6px;color:#555;">${label}: <strong>${value}</strong></p>`;

  switch (type) {
    case 'timesheet_submitted':
      return {
        subject: `Timesheet submitted by ${d.employeeName || 'Employee'}`,
        htmlBody: wrap('Timesheet Submitted', '#e31c79',
          `<p style="color:#555;line-height:1.6;">Hi ${d.managerName || 'Manager'},</p>
           <p style="color:#555;line-height:1.6;"><strong>${d.employeeName || 'Employee'}</strong> has submitted a timesheet for your review.</p>
           <div style="background:#FAFAF8;border:0.5px solid #e8e4df;border-radius:10px;padding:16px;margin:20px 0;">
             ${info('Period', d.period || 'Current Period')}
             ${info('Total Hours', d.totalHours || 'N/A')}
           </div>`,
          { label: 'Review & Approve', url: `${appUrl}/manager` }),
        textBody: `Timesheet submitted by ${d.employeeName || 'Employee'} for ${d.period || 'current period'}. Total hours: ${d.totalHours || 'N/A'}.`,
      };
    case 'expense_submitted':
      return {
        subject: `Expense submitted — $${d.amount || 0}`,
        htmlBody: wrap('Expense Submitted', '#e31c79',
          `<p style="color:#555;line-height:1.6;">Hi ${d.managerName || 'Manager'},</p>
           <p style="color:#555;line-height:1.6;">A new expense has been submitted for your review.</p>
           <div style="background:#FAFAF8;border:0.5px solid #e8e4df;border-radius:10px;padding:16px;margin:20px 0;">
             ${info('Employee', d.employeeName || 'Employee')}
             ${info('Amount', '$' + (d.amount || 0))}
             ${d.description ? info('Description', d.description) : ''}
           </div>`,
          { label: 'Review Expenses', url: `${appUrl}/manager` }),
        textBody: `Expense submitted by ${d.employeeName || 'Employee'} for $${d.amount || 0}.`,
      };
    case 'timesheet_approved':
      return {
        subject: 'Your timesheet was approved',
        htmlBody: wrap('Timesheet Approved', '#2d9b6e',
          `<p style="color:#555;line-height:1.6;">Hi ${d.employeeName || 'Employee'},</p>
           <p style="color:#555;line-height:1.6;">Your timesheet has been approved. No further action is needed.</p>
           <div style="background:#FAFAF8;border:0.5px solid #e8e4df;border-radius:10px;padding:16px;margin:20px 0;">
             ${info('Period', d.period || 'Current Period')}
             ${info('Total Hours', d.totalHours || 'N/A')}
             <p style="margin:0;color:#2d9b6e;font-weight:600;">Status: Approved</p>
           </div>`,
          { label: 'View Dashboard', url: `${appUrl}/employee` }),
        textBody: `Your timesheet for ${d.period || 'current period'} was approved.`,
      };
    case 'timesheet_rejected':
      return {
        subject: 'Your timesheet was rejected — action required',
        htmlBody: wrap('Timesheet Rejected', '#b91c1c',
          `<p style="color:#555;line-height:1.6;">Hi ${d.employeeName || 'Employee'},</p>
           <p style="color:#555;line-height:1.6;">Your timesheet has been rejected and needs your attention.</p>
           <div style="background:#FEF2F2;border:0.5px solid #FECACA;border-radius:10px;padding:16px;margin:20px 0;">
             ${info('Period', d.period || 'Current Period')}
             ${d.reason ? `<p style="margin:0 0 6px;color:#b91c1c;"><strong>Reason:</strong> ${d.reason}</p>` : ''}
             <p style="margin:0;color:#b91c1c;font-weight:600;">Please update and resubmit.</p>
           </div>`,
          { label: 'Fix & Resubmit', url: `${appUrl}/timesheet/entry` }),
        textBody: `Your timesheet for ${d.period || 'current period'} was rejected. Reason: ${d.reason || 'Please review'}.`,
      };
    case 'expense_approved':
      return {
        subject: 'Your expense was approved',
        htmlBody: wrap('Expense Approved', '#2d9b6e',
          `<p style="color:#555;line-height:1.6;">Hi ${d.employeeName || 'Employee'},</p>
           <p style="color:#555;line-height:1.6;">Your expense has been approved and will be processed.</p>
           <div style="background:#FAFAF8;border:0.5px solid #e8e4df;border-radius:10px;padding:16px;margin:20px 0;">
             ${info('Amount', '$' + (d.amount || 0))}
             <p style="margin:0;color:#2d9b6e;font-weight:600;">Status: Approved</p>
           </div>`,
          { label: 'View Dashboard', url: `${appUrl}/employee` }),
        textBody: `Your expense for $${d.amount || 0} was approved.`,
      };
    case 'timecard_reminder':
      return {
        subject: `Timecard reminder — week ending ${d.week_ending || 'this week'}`,
        htmlBody: wrap('Timesheet Reminder', '#e31c79',
          `<p style="color:#555;line-height:1.6;">Hi ${d.employee_name || 'Employee'},</p>
           <p style="color:#555;line-height:1.6;">Your timesheet for the week ending <strong>${d.week_ending || 'this week'}</strong> has not been submitted yet.</p>`,
          { label: 'Submit Timesheet', url: `${appUrl}/timesheet/entry` }),
        textBody: `Reminder: Your timesheet for week ending ${d.week_ending || 'this week'} has not been submitted.`,
      };
    default:
      return {
        subject: 'Notification from West End Workforce',
        htmlBody: wrap('System Notification', '#1a1a1a',
          `<p style="color:#555;line-height:1.6;">You have received a notification from the West End Workforce system.</p>`),
        textBody: 'You have received a notification from the West End Workforce system.',
      };
  }
}
