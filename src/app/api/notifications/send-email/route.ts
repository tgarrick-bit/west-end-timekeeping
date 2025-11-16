// src/app/api/notifications/send-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { Notification } from '@/types/notifications';

// POST /api/notifications/send-email - Send email notification
export async function POST(request: NextRequest) {
  try {
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

    // Debug: make sure env vars are present
    console.log('SMTP_USER present?', !!process.env.SMTP_USER);
    console.log('SMTP_PASS present?', !!process.env.SMTP_PASS);

    // Create SMTP transporter using env vars only
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER, // set in env
        pass: process.env.SMTP_PASS, // set in env
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

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
        process.env.EMAIL_FROM || 'notifications@westendworkforce.com'
      }>`,
      to,
      replyTo: process.env.EMAIL_REPLY_TO || 'support@westendworkforce.com',
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

// Helper function to get email template
function getEmailTemplate(
  type: string,
  customData?: Record<string, any>,
): { subject: string; htmlBody: string; textBody: string } {
  // use `any`-ish base so TS doesn’t complain about flexible keys
  const baseData: { [key: string]: any } = {
    companyName: 'West End Workforce',
    logoUrl: 'https://westendworkforce.com/logo.png',
    supportEmail: 'support@westendworkforce.com',
    ...customData,
  };

  switch (type) {
    /* -------------------------------------------------
     * TIMESHEET SUBMITTED
     * ------------------------------------------------- */
    case 'timesheet_submitted':
      return {
        subject: `Timesheet Submitted - ${baseData.employeeName || 'Employee'}`,
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f8f9fa; padding: 20px; text-align: center;">
              <h2 style="color: #333; margin: 0;">${baseData.companyName}</h2>
              <p style="color: #666; margin: 10px 0 0 0;">Timesheet & Expense Management</p>
            </div>
            <div style="padding: 30px 20px; background: white;">
              <h3 style="color: #333; margin-bottom: 20px;">Timesheet Submitted for Approval</h3>
              <p>Hello ${baseData.managerName || 'Manager'},</p>
              <p>A new timesheet has been submitted and requires your approval:</p>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Employee:</strong> ${baseData.employeeName || 'Employee'}</p>
                <p><strong>Period:</strong> ${baseData.period || 'Current Period'}</p>
                <p><strong>Total Hours:</strong> ${baseData.totalHours || 'N/A'}</p>
                <p><strong>Submitted:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
              <p>Please review and approve or reject this timesheet as soon as possible.</p>
              <p>Best regards,<br>${baseData.companyName} Team</p>
            </div>
            <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
              <p>This is an automated notification from the West End Workforce system.</p>
            </div>
          </div>
        `,
        textBody: `
Timesheet Submitted - ${baseData.employeeName || 'Employee'}

Hello ${baseData.managerName || 'Manager'},

A new timesheet has been submitted and requires your approval:

Employee: ${baseData.employeeName || 'Employee'}
Period: ${baseData.period || 'Current Period'}
Total Hours: ${baseData.totalHours || 'N/A'}
Submitted: ${new Date().toLocaleDateString()}

Please review and approve or reject this timesheet as soon as possible.

Best regards,
${baseData.companyName} Team
        `,
      };

    /* -------------------------------------------------
     * EXPENSE SUBMITTED
     * ------------------------------------------------- */
    case 'expense_submitted':
      return {
        subject: `Expense Submitted - $${baseData.amount || 0}`,
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f8f9fa; padding: 20px; text-align: center;">
              <h2 style="color: #333; margin: 0;">${baseData.companyName}</h2>
              <p style="color: #666; margin: 10px 0 0 0;">Timesheet & Expense Management</p>
            </div>
            <div style="padding: 30px 20px; background: white;">
              <h3 style="color: #333; margin-bottom: 20px;">💰 Expense Submitted for Approval</h3>
              <p>Hello ${baseData.managerName || 'Manager'},</p>
              <p>A new expense has been submitted and requires your approval:</p>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Employee:</strong> ${baseData.employeeName || 'Employee'}</p>
                <p><strong>Amount:</strong> $${baseData.amount || 0}</p>
                <p><strong>Description:</strong> ${baseData.description || 'N/A'}</p>
                <p><strong>Submitted:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
              <p>Please review and approve or reject this expense as soon as possible.</p>
              <p>Best regards,<br>${baseData.companyName} Team</p>
            </div>
            <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
              <p>This is an automated notification from the West End Workforce system.</p>
            </div>
          </div>
        `,
        textBody: `
Expense Submitted - $${baseData.amount || 0}

Hello ${baseData.managerName || 'Manager'},

A new expense has been submitted and requires your approval:

Employee: ${baseData.employeeName || 'Employee'}
Amount: $${baseData.amount || 0}
Description: ${baseData.description || 'N/A'}
Submitted: ${new Date().toLocaleDateString()}

Please review and approve or reject this expense as soon as possible.

Best regards,
${baseData.companyName} Team
        `,
      };

    /* -------------------------------------------------
     * TIMESHEET APPROVED
     * ------------------------------------------------- */
    case 'timesheet_approved':
      return {
        subject: 'Timesheet Approved',
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #d4edda; padding: 20px; text-align: center;">
              <h2 style="color: #155724; margin: 0;">${baseData.companyName}</h2>
              <p style="color: #155724; margin: 10px 0 0 0;">Timesheet & Expense Management</p>
            </div>
            <div style="padding: 30px 20px; background: white;">
              <h3 style="color: #333; margin-bottom: 20px;">✅ Timesheet Approved</h3>
              <p>Hello ${baseData.employeeName || 'Employee'},</p>
              <p>Great news! Your timesheet has been approved:</p>
              <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Period:</strong> ${baseData.period || 'Current Period'}</p>
                <p><strong>Total Hours:</strong> ${baseData.totalHours || 'N/A'}</p>
                <p><strong>Approved:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
              <p>Your timesheet is now complete for this period. Thank you for your timely submission!</p>
              <p>Best regards,<br>${baseData.companyName} Team</p>
            </div>
            <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
              <p>This is an automated notification from the West End Workforce system.</p>
            </div>
          </div>
        `,
        textBody: `
Timesheet Approved

Hello ${baseData.employeeName || 'Employee'},

Great news! Your timesheet has been approved:

Period: ${baseData.period || 'Current Period'}
Total Hours: ${baseData.totalHours || 'N/A'}
Approved: ${new Date().toLocaleDateString()}

Your timesheet is now complete for this period. Thank you for your timely submission!

Best regards,
${baseData.companyName} Team
        `,
      };

    /* -------------------------------------------------
     * TIMESHEET REJECTED
     * ------------------------------------------------- */
    case 'timesheet_rejected':
      return {
        subject: 'Timesheet Rejected - Action Required',
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f8d7da; padding: 20px; text-align: center;">
              <h2 style="color: #721c24; margin: 0;">${baseData.companyName}</h2>
              <p style="color: #721c24; margin: 10px 0 0 0;">Timesheet & Expense Management</p>
            </div>
            <div style="padding: 30px 20px; background: white;">
              <h3 style="color: #721c24; margin-bottom: 20px;">❌ Timesheet Rejected</h3>
              <p>Hello ${baseData.employeeName || 'Employee'},</p>
              <p>Your timesheet has been rejected and requires your attention:</p>
              <div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Period:</strong> ${baseData.period || 'Current Period'}</p>
                <p><strong>Reason:</strong> ${baseData.reason || 'Please review and correct issues'}</p>
                <p><strong>Rejected:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
              <p>Please review the feedback, make necessary corrections, and resubmit your timesheet.</p>
              <p>Best regards,<br>${baseData.companyName} Team</p>
            </div>
            <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
              <p>This is an automated notification from the West End Workforce system.</p>
            </div>
          </div>
        `,
        textBody: `
Timesheet Rejected - Action Required

Hello ${baseData.employeeName || 'Employee'},

Your timesheet has been rejected and requires your attention:

Period: ${baseData.period || 'Current Period'}
Reason: ${baseData.reason || 'Please review and correct issues'}
Rejected: ${new Date().toLocaleDateString()}

Please review the feedback, make necessary corrections, and resubmit your timesheet.

Best regards,
${baseData.companyName} Team
        `,
      };

    /* -------------------------------------------------
     * EXPENSE APPROVED
     * ------------------------------------------------- */
    case 'expense_approved':
      return {
        subject: 'Expense Approved',
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #d4edda; padding: 20px; text-align: center;">
              <h2 style="color: #155724; margin: 0;">${baseData.companyName}</h2>
              <p style="color: #155724; margin: 10px 0 0 0;">Timesheet & Expense Management</p>
            </div>
            <div style="padding: 30px 20px; background: white;">
              <h3 style="color: #333; margin-bottom: 20px;">✅ Expense Approved</h3>
              <p>Hello ${baseData.employeeName || 'Employee'},</p>
              <p>Great news! Your expense has been approved:</p>
              <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Amount:</strong> $${baseData.amount || 0}</p>
                <p><strong>Description:</strong> ${baseData.description || 'N/A'}</p>
                <p><strong>Approved:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
              <p>Your expense is now approved and will be processed for reimbursement.</p>
              <p>Best regards,<br>${baseData.companyName} Team</p>
            </div>
            <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
              <p>This is an automated notification from the West End Workforce system.</p>
            </div>
          </div>
        `,
        textBody: `
Expense Approved

Hello ${baseData.employeeName || 'Employee'},

Great news! Your expense has been approved:

Amount: $${baseData.amount || 0}
Description: ${baseData.description || 'N/A'}
Approved: ${new Date().toLocaleDateString()}

Your expense is now approved and will be processed for reimbursement.

Best regards,
${baseData.companyName} Team
        `,
      };

    /* -------------------------------------------------
     * TIME ENTRY REMINDER (timecard_reminder)
     * ------------------------------------------------- */
    case 'timecard_reminder':
      return {
        subject: 'Timecard Submission Reminder',
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #e31c79; padding: 24px; text-align: center;">
              <h1 style="color:white; margin: 0;">West End Workforce</h1>
            </div>
            <div style="padding: 24px; background:#f9fafb;">
              <h2 style="color:#05202E;">Timecard Submission Reminder</h2>
              <p>Hello ${baseData.employee_name || 'Employee'},</p>
              <p>
                This is a reminder that your timecard for the week ending
                <strong>${baseData.week_ending}</strong> has not been submitted yet.
              </p>
              <p>Your timecard is currently in <strong>draft</strong> status.</p>

              <div style="text-align:center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard"
                  style="display:inline-block; background:#e31c79; color:white; padding:12px 30px; text-decoration:none; border-radius:6px;">
                  Submit Timecard
                </a>
              </div>

              <p>Thank you,<br/>West End Workforce</p>
            </div>
            <div style="background-color:#05202E; padding:12px; text-align:center;">
              <p style="color:white; font-size:12px; margin:0;">© ${new Date().getFullYear()} West End Workforce</p>
            </div>
          </div>
        `,
        textBody: `
Timecard Submission Reminder

Hello ${baseData.employee_name || 'Employee'},

This is a reminder that your timecard for the week ending ${baseData.week_ending} has not been submitted yet.
Your timecard is currently in draft status.

Please log in and submit your timecard as soon as possible.
        `,
      };

    /* -------------------------------------------------
     * DEFAULT TEMPLATE
     * ------------------------------------------------- */
    default:
      return {
        subject: 'Notification from West End Workforce',
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f8f9fa; padding: 20px; text-align: center;">
              <h2 style="color: #333; margin: 0;">${baseData.companyName}</h2>
              <p style="color: #666; margin: 10px 0 0 0;">Timesheet & Expense Management</p>
            </div>
            <div style="padding: 30px 20px; background: white;">
              <h3 style="color: #333; margin-bottom: 20px;">System Notification</h3>
              <p>Hello,</p>
              <p>You have received a notification from the West End Workforce system.</p>
              <p>If you have any questions, please contact support at ${baseData.supportEmail}.</p>
              <p>Best regards,<br>${baseData.companyName} Team</p>
            </div>
            <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
              <p>This is an automated notification from the West End Workforce system.</p>
            </div>
          </div>
        `,
        textBody: `
Notification from West End Workforce

Hello,

You have received a notification from the West End Workforce system.

If you have any questions, please contact support at ${baseData.supportEmail}.

Best regards,
${baseData.companyName} Team
        `,
      };
  }
}
