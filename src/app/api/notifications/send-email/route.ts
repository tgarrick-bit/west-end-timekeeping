import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { Notification } from '@/types/notifications';

// POST /api/notifications/send-email - Send email notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, notification, customData } = body;

    if (!to || !notification) {
      return NextResponse.json(
        { error: 'Email address and notification are required' },
        { status: 400 }
      );
    }

    // Create SMTP transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || 'tgarrick@westendworkforce.com',
        pass: process.env.SMTP_PASS || 'ixan edkv dsde clou'
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Get email template based on notification type
    const template = getEmailTemplate(notification.type, customData);
    
    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME || 'West End Workforce'} <${process.env.EMAIL_FROM || 'notifications@westendworkforce.com'}>`,
      to: to,
      replyTo: process.env.EMAIL_REPLY_TO || 'support@westendworkforce.com',
      subject: template.subject,
      html: template.htmlBody,
      text: template.textBody
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    
    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      message: 'Email sent successfully'
    });
  } catch (error) {
    console.error('Failed to send email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}

// Helper function to get email template
function getEmailTemplate(type: string, customData?: Record<string, any>): { subject: string; htmlBody: string; textBody: string } {
  const baseData: Record<string, any> = {
    companyName: 'West End Workforce',
    logoUrl: 'https://westendworkforce.com/logo.png',
    supportEmail: 'support@westendworkforce.com',
    ...customData
  };

  switch (type) {
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
        `
      };
    
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
        `
      };

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
        `
      };

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
        `
      };

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
        `
      };

    case 'expense_rejected':
      return {
        subject: 'Expense Rejected - Action Required',
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f8d7da; padding: 20px; text-align: center;">
              <h2 style="color: #721c24; margin: 0;">${baseData.companyName}</h2>
              <p style="color: #721c24; margin: 10px 0 0 0;">Timesheet & Expense Management</p>
            </div>
            <div style="padding: 30px 20px; background: white;">
              <h3 style="color: #721c24; margin-bottom: 20px;">❌ Expense Rejected</h3>
              <p>Hello ${baseData.employeeName || 'Employee'},</p>
              <p>Your expense has been rejected and requires your attention:</p>
              <div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Amount:</strong> $${baseData.amount || 0}</p>
                <strong>Description:</strong> ${baseData.description || 'N/A'}</p>
                <p><strong>Reason:</strong> ${baseData.reason || 'Please review and correct issues'}</p>
                <p><strong>Rejected:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
              <p>Please review the feedback, make necessary corrections, and resubmit your expense.</p>
              <p>Best regards,<br>${baseData.companyName} Team</p>
            </div>
            <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
              <p>This is an automated notification from the West End Workforce system.</p>
            </div>
          </div>
        `,
        textBody: `
          Expense Rejected - Action Required
          
          Hello ${baseData.employeeName || 'Employee'},
          
          Your expense has been rejected and requires your attention:
          
          Amount: $${baseData.amount || 0}
          Description: ${baseData.description || 'N/A'}
          Reason: ${baseData.reason || 'Please review and correct issues'}
          Rejected: ${new Date().toLocaleDateString()}
          
          Please review the feedback, make necessary corrections, and resubmit your expense.
          
          Best regards,
          ${baseData.companyName} Team
        `
      };

    case 'timesheet_overdue':
      return {
        subject: '⚠️ Timesheet Overdue - Urgent Action Required',
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #fff3cd; padding: 20px; text-align: center;">
              <h2 style="color: #856404; margin: 0;">${baseData.companyName}</h2>
              <p style="color: #856404; margin: 10px 0 0 0;">Timesheet & Expense Management</p>
            </div>
            <div style="padding: 30px 20px; background: white;">
              <h3 style="color: #856404; margin-bottom: 20px;">⚠️ Timesheet Overdue</h3>
              <p>Hello ${baseData.employeeName || 'Employee'},</p>
              <p><strong>Your timesheet is overdue and requires immediate attention!</strong></p>
              <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Period:</strong> ${baseData.period || 'Current Period'}</p>
                <p><strong>Days Overdue:</strong> ${baseData.daysOverdue || 'Multiple days'}</p>
                <p><strong>Due Date:</strong> ${baseData.dueDate || 'N/A'}</p>
              </div>
              <p>Please submit your timesheet immediately to avoid any delays in processing.</p>
              <p>If you have any questions or need assistance, please contact support at ${baseData.supportEmail} immediately.</p>
              <p>Best regards,<br>${baseData.companyName} Team</p>
            </div>
            <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
              <p>This is an urgent automated notification from the West End Workforce system.</p>
            </div>
          </div>
        `,
        textBody: `
          ⚠️ Timesheet Overdue - Urgent Action Required
          
          Hello ${baseData.employeeName || 'Employee'},
          
          Your timesheet is overdue and requires immediate attention!
          
          Period: ${baseData.period || 'Current Period'}
          Days Overdue: ${baseData.daysOverdue || 'Multiple days'}
          Due Date: ${baseData.dueDate || 'N/A'}
          
          Please submit your timesheet immediately to avoid any delays in processing.
          
          If you have any questions or need assistance, please contact support at ${baseData.supportEmail} immediately.
          
          Best regards,
          ${baseData.companyName} Team
        `
      };

    case 'period_complete':
      return {
        subject: '🎉 Period Complete - Congratulations!',
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #d4edda; padding: 20px; text-align: center;">
              <h2 style="color: #155724; margin: 0;">${baseData.companyName}</h2>
              <p style="color: #155724; margin: 10px 0 0 0;">Timesheet & Expense Management</p>
            </div>
            <div style="padding: 30px 20px; background: white;">
              <h3 style="color: #333; margin-bottom: 20px;">🎉 Period Complete!</h3>
              <p>Hello ${baseData.employeeName || 'Employee'},</p>
              <p>Congratulations! Your timesheet and expenses for this period have been fully approved:</p>
              <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Period:</strong> ${baseData.period || 'Current Period'}</p>
                <p><strong>Timesheet Status:</strong> ✅ Approved</p>
                <p><strong>Expenses Status:</strong> ✅ Approved</p>
                <p><strong>Completed:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
              <p>Great job staying on top of your reporting! Your period is now complete and will be processed for payroll.</p>
              <p>Best regards,<br>${baseData.companyName} Team</p>
            </div>
            <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
              <p>This is an automated notification from the West End Workforce system.</p>
            </div>
          </div>
        `,
        textBody: `
          🎉 Period Complete - Congratulations!
          
          Hello ${baseData.employeeName || 'Employee'},
          
          Congratulations! Your timesheet and expenses for this period have been fully approved:
          
          Period: ${baseData.period || 'Current Period'}
          Timesheet Status: ✅ Approved
          Expenses Status: ✅ Approved
          Completed: ${new Date().toLocaleDateString()}
          
          Great job staying on top of your reporting! Your period is now complete and will be processed for payroll.
          
          Best regards,
          ${baseData.companyName} Team
        `
      };

    case 'deadline_reminder':
      return {
        subject: `⏰ Deadline Reminder - ${baseData.type || 'Action Required'}`,
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #fff3cd; padding: 20px; text-align: center;">
              <h2 style="color: #856404; margin: 0;">${baseData.companyName}</h2>
              <p style="color: #856404; margin: 10px 0 0 0;">Timesheet & Expense Management</p>
            </div>
            <div style="padding: 30px 20px; background: white;">
              <h3 style="color: #856404; margin-bottom: 20px;">⏰ Deadline Reminder</h3>
              <p>Hello ${baseData.employeeName || 'Employee'},</p>
              <p>This is a friendly reminder about an upcoming deadline:</p>
              <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Type:</strong> ${baseData.type || 'Action Required'}</p>
                <p><strong>Deadline:</strong> ${baseData.deadline || 'N/A'}</p>
                <p><strong>Days Until Due:</strong> ${baseData.daysUntil || 'N/A'}</p>
              </div>
              <p>Please ensure you complete this action before the deadline to avoid any delays.</p>
              <p>Best regards,<br>${baseData.companyName} Team</p>
            </div>
            <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
              <p>This is an automated notification from the West End Workforce system.</p>
            </div>
          </div>
        `,
        textBody: `
          ⏰ Deadline Reminder - ${baseData.type || 'Action Required'}
          
          Hello ${baseData.employeeName || 'Employee'},
          
          This is a friendly reminder about an upcoming deadline:
          
          Type: ${baseData.type || 'Action Required'}
          Deadline: ${baseData.deadline || 'N/A'}
          Days Until Due: ${baseData.daysUntil || 'N/A'}
          
          Please ensure you complete this action before the deadline to avoid any delays.
          
          Best regards,
          ${baseData.companyName} Team
        `
      };

    case 'payroll_cutoff':
      return {
        subject: '💰 Payroll Cutoff Reminder',
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #d1ecf1; padding: 20px; text-align: center;">
              <h2 style="color: #0c5460; margin: 0;">${baseData.companyName}</h2>
              <p style="color: #0c5460; margin: 10px 0 0 0;">Timesheet & Expense Management</p>
            </div>
            <div style="padding: 30px 20px; background: white;">
              <h3 style="color: #333; margin-bottom: 20px;">💰 Payroll Cutoff Reminder</h3>
              <p>Hello ${baseData.employeeName || 'Employee'},</p>
              <p>This is a reminder about the upcoming payroll cutoff:</p>
              <div style="background: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Cutoff Date:</strong> ${baseData.cutoffDate || 'N/A'}</p>
                <p><strong>Days Until Cutoff:</strong> ${baseData.daysUntil || 'N/A'}</p>
                <p><strong>Action Required:</strong> Submit timesheet and expenses</p>
              </div>
              <p>Please ensure your timesheet and expenses are submitted and approved before the cutoff to ensure timely payment processing.</p>
              <p>Best regards,<br>${baseData.companyName} Team</p>
            </div>
            <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
              <p>This is an automated notification from the West End Workforce system.</p>
            </div>
          </div>
        `,
        textBody: `
          💰 Payroll Cutoff Reminder
          
          Hello ${baseData.employeeName || 'Employee'},
          
          This is a reminder about the upcoming payroll cutoff:
          
          Cutoff Date: ${baseData.cutoffDate || 'N/A'}
          Days Until Cutoff: ${baseData.daysUntil || 'N/A'}
          Action Required: Submit timesheet and expenses
          
          Please ensure your timesheet and expenses are submitted and approved before the cutoff to ensure timely payment processing.
          
          Best regards,
          ${baseData.companyName} Team
        `
      };

    case 'manager_pending_reminder':
      return {
        subject: '📋 Pending Approvals - Action Required',
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f8d7da; padding: 20px; text-align: center;">
              <h2 style="color: #721c24; margin: 0;">${baseData.companyName}</h2>
              <p style="color: #721c24; margin: 10px 0 0 0;">Timesheet & Expense Management</p>
            </div>
            <div style="padding: 30px 20px; background: white;">
              <h3 style="color: #333; margin-bottom: 20px;">📋 Pending Approvals</h3>
              <p>Hello ${baseData.managerName || 'Manager'},</p>
              <p>You have pending items that require your approval:</p>
              <div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Pending Timesheets:</strong> ${baseData.pendingTimesheets || 0}</p>
                <p><strong>Pending Expenses:</strong> ${baseData.pendingExpenses || 0}</p>
                <p><strong>Total Pending:</strong> ${baseData.pendingCount || 0}</p>
              </div>
              <p>Please review and process these pending items as soon as possible to avoid delays for your team members.</p>
              <p>Best regards,<br>${baseData.companyName} Team</p>
            </div>
            <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
              <p>This is an automated notification from the West End Workforce system.</p>
            </div>
          </div>
        `,
        textBody: `
          📋 Pending Approvals - Action Required
          
          Hello ${baseData.managerName || 'Manager'},
          
          You have pending items that require your approval:
          
          Pending Timesheets: ${baseData.pendingTimesheets || 0}
          Pending Expenses: ${baseData.pendingExpenses || 0}
          Total Pending: ${baseData.pendingCount || 0}
          
          Please review and process these pending items as soon as possible to avoid delays for your team members.
          
          Best regards,
          ${baseData.companyName} Team
        `
      };
    
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
        `
      };
  }
}
