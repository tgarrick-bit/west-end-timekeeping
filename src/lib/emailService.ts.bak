import { Notification, NotificationType } from '@/types/notifications';

// Email service configuration
export interface EmailConfig {
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
}

// Email template interface
export interface EmailTemplate {
  subject: string;
  htmlBody: string;
  textBody: string;
}

// Email service class
export class EmailService {
  private static instance: EmailService;
  private config: EmailConfig;
  private isInitialized: boolean = false;

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  constructor() {
    this.config = {
      fromEmail: process.env.EMAIL_FROM || 'notifications@westendworkforce.com',
      fromName: process.env.EMAIL_FROM_NAME || 'West End Workforce',
      replyTo: process.env.EMAIL_REPLY_TO || 'support@westendworkforce.com'
    };
  }

  // Initialize the email service with SMTP configuration
  async initialize(config?: Partial<EmailConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // On client side, just mark as initialized
    if (typeof window !== 'undefined') {
  console.log({
      this.isInitialized = true;
      return;
    }

    // On server side, try to initialize SMTP
    try {
      // Dynamic import for server-side only
      const nodemailer = await import('nodemailer');
      
      // Create SMTP transporter
      const transporter = nodemailer.default.createTransport({
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

      // Verify connection
      await transporter.verify();
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      this.isInitialized = false;
    }
  }

  // Send email notification
  async sendEmailNotification(
    toEmail: string,
    notification: Notification,
    customData?: Record<string, any>
  ): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        console.warn('Email service not initialized');
        return false;
      }

      const template = this.getEmailTemplate(notification.type, customData);
      
      // On client side, just log the email
      if (typeof window !== 'undefined') {
  console.log({
          to: toEmail,
          subject: template.subject,
          from: `${this.config.fromName} <${this.config.fromEmail}>`
        });
        return true;
      }

      // On server side, send via API
      try {
        const response = await fetch('/api/notifications/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: toEmail,
            notification,
            customData
          }),
        });

        if (response.ok) {
          return true;
        } else {
          console.error('Failed to send email via API');
          return false;
        }
      } catch (error) {
        console.error('Error sending email via API:', error);
        return false;
      }
    } catch (error) {
      console.error('Failed to send email notification:', error);
      return false;
    }
  }

  // Send bulk email notifications
  async sendBulkEmailNotifications(
    toEmails: string[],
    notification: Notification,
    customData?: Record<string, any>
  ): Promise<{ success: string[], failed: string[] }> {
    const results = { success: [] as string[], failed: [] as string[] };

    for (const email of toEmails) {
      try {
        const success = await this.sendEmailNotification(email, notification, customData);
        if (success) {
          results.success.push(email);
        } else {
          results.failed.push(email);
        }
      } catch (error) {
        console.error(`Failed to send email to ${email}:`, error);
        results.failed.push(email);
      }
    }

    return results;
  }

  // Test email configuration
  async testEmailConfiguration(): Promise<{ success: boolean; message: string }> {
    try {
      if (typeof window !== 'undefined') {
  console.log({
        return { 
          success: true, 
          message: 'Email service available in client mode' 
        };
      }

      // On server side, test SMTP configuration
      try {
        const nodemailer = await import('nodemailer');
        
        const transporter = nodemailer.default.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: false,
          auth: {
            user: process.env.SMTP_USER || 'tgarrick@westendworkforce.com',
            pass: process.env.SMTP_PASS || 'ixan edkv dsde clou'
          },
          tls: {
            rejectUnauthorized: false
          }
        });

        // Send test email to verify configuration
        const testEmail = process.env.SMTP_USER || 'tgarrick@westendworkforce.com';
        
        const mailOptions = {
          from: `${this.config.fromName} <${this.config.fromEmail}>`,
          to: testEmail,
          subject: 'West End Workforce - Email Service Test',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #f8f9fa; padding: 20px; text-align: center;">
                <h2 style="color: #333; margin: 0;">West End Workforce</h2>
                <p style="color: #666; margin: 10px 0 0 0;">Email Service Test</p>
              </div>
              <div style="padding: 30px 20px; background: white;">
                <h3 style="color: #333; margin-bottom: 20px;">✅ Email Service Test Successful</h3>
                <p>This is a test email to verify that the West End Workforce email service is working correctly.</p>
                <p><strong>Test Time:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>SMTP Host:</strong> ${process.env.SMTP_HOST || 'smtp.gmail.com'}</p>
                <p><strong>SMTP Port:</strong> ${process.env.SMTP_PORT || '587'}</p>
                <p>If you received this email, the notification system is properly configured!</p>
              </div>
              <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
                <p>This is a test email from the West End Workforce system.</p>
              </div>
            </div>
          `,
          text: `
            West End Workforce - Email Service Test
            
            This is a test email to verify that the West End Workforce email service is working correctly.
            
            Test Time: ${new Date().toLocaleString()}
            SMTP Host: ${process.env.SMTP_HOST || 'smtp.gmail.com'}
            SMTP Port: ${process.env.SMTP_PORT || '587'}
            
            If you received this email, the notification system is properly configured!
          `
        };

        const info = await transporter.sendMail(mailOptions);
        
        return { 
          success: true, 
          message: `Test email sent successfully! Message ID: ${info.messageId}` 
        };
      } catch (error) {
        return { 
          success: false, 
          message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
        };
      }
    } catch (error) {
      console.error('Email configuration test failed:', error);
      return { 
        success: false, 
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  // Get email template for notification type
  private getEmailTemplate(type: NotificationType, customData?: Record<string, any>): EmailTemplate {
    const baseData = {
      companyName: 'West End Workforce',
      logoUrl: 'https://westendworkforce.com/logo.png',
      supportEmail: 'support@westendworkforce.com',
      ...customData
    };

    switch (type) {
      case 'timesheet_submitted':
        return this.getTimesheetSubmittedTemplate(baseData);
      case 'timesheet_approved':
        return this.getTimesheetApprovedTemplate(baseData);
      case 'timesheet_rejected':
        return this.getTimesheetRejectedTemplate(baseData);
      case 'expense_submitted':
        return this.getExpenseSubmittedTemplate(baseData);
      case 'expense_approved':
        return this.getExpenseApprovedTemplate(baseData);
      case 'expense_rejected':
        return this.getExpenseRejectedTemplate(baseData);
      case 'timesheet_overdue':
        return this.getTimesheetOverdueTemplate(baseData);
      case 'period_complete':
        return this.getPeriodCompleteTemplate(baseData);
      case 'deadline_reminder':
        return this.getDeadlineReminderTemplate(baseData);
      case 'payroll_cutoff':
        return this.getPayrollCutoffTemplate(baseData);
      case 'manager_pending_reminder':
        return this.getManagerPendingReminderTemplate(baseData);
      default:
        return this.getDefaultTemplate(baseData);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getTimesheetSubmittedTemplate(data: any): EmailTemplate {
    return {
      subject: `Timesheet Submitted - ${data.employeeName || 'Employee'}`,
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f8f9fa; padding: 20px; text-align: center;">
            <h2 style="color: #333; margin: 0;">${data.companyName}</h2>
            <p style="color: #666; margin: 10px 0 0 0;">Timesheet & Expense Management</p>
          </div>
          
          <div style="padding: 30px 20px; background: white;">
            <h3 style="color: #333; margin-bottom: 20px;">Timesheet Submitted for Approval</h3>
            
            <p>Hello ${data.managerName || 'Manager'},</p>
            
            <p>A new timesheet has been submitted and requires your approval:</p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Employee:</strong> ${data.employeeName || 'Employee'}</p>
              <p><strong>Period:</strong> ${data.period || 'Current Period'}</p>
              <p><strong>Total Hours:</strong> ${data.totalHours || 'N/A'}</p>
              <p><strong>Submitted:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <p>Please review and approve or reject this timesheet as soon as possible.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.approvalUrl || '#'}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Review Timesheet</a>
            </div>
            
            <p>If you have any questions, please contact support at ${data.supportEmail}.</p>
            
            <p>Best regards,<br>${data.companyName} Team</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
            <p>This is an automated notification from the West End Workforce system.</p>
          </div>
        </div>
      `,
      textBody: `
        Timesheet Submitted - ${data.employeeName || 'Employee'}
        
        Hello ${data.managerName || 'Manager'},
        
        A new timesheet has been submitted and requires your approval:
        
        Employee: ${data.employeeName || 'Employee'}
        Period: ${data.period || 'Current Period'}
        Total Hours: ${data.totalHours || 'N/A'}
        Submitted: ${new Date().toLocaleDateString()}
        
        Please review and approve or reject this timesheet as soon as possible.
        
        If you have any questions, please contact support at ${data.supportEmail}.
        
        Best regards,
        ${data.companyName} Team
      `
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getTimesheetApprovedTemplate(data: any): EmailTemplate {
    return {
      subject: 'Timesheet Approved',
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #d4edda; padding: 20px; text-align: center;">
            <h2 style="color: #155724; margin: 0;">${data.companyName}</h2>
            <p style="color: #155724; margin: 10px 0 0 0;">Timesheet & Expense Management</p>
          </div>
          
          <div style="padding: 30px 20px; background: white;">
            <h3 style="color: #333; margin-bottom: 20px;">✅ Timesheet Approved</h3>
            
            <p>Hello ${data.employeeName || 'Employee'},</p>
            
            <p>Great news! Your timesheet has been approved:</p>
            
            <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Period:</strong> ${data.period || 'Current Period'}</p>
              <p><strong>Total Hours:</strong> ${data.totalHours || 'N/A'}</p>
              <p><strong>Approved:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <p>Your timesheet is now complete for this period. Thank you for your timely submission!</p>
            
            <p>If you have any questions, please contact support at ${data.supportEmail}.</p>
            
            <p>Best regards,<br>${data.companyName} Team</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
            <p>This is an automated notification from the West End Workforce system.</p>
          </div>
        </div>
      `,
      textBody: `
        Timesheet Approved
        
        Hello ${data.employeeName || 'Employee'},
        
        Great news! Your timesheet has been approved:
        
        Period: ${data.period || 'Current Period'}
        Total Hours: ${data.totalHours || 'N/A'}
        Approved: ${new Date().toLocaleDateString()}
        
        Your timesheet is now complete for this period. Thank you for your timely submission!
        
        If you have any questions, please contact support at ${data.supportEmail}.
        
        Best regards,
        ${data.companyName} Team
      `
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getTimesheetRejectedTemplate(data: any): EmailTemplate {
    return {
      subject: 'Timesheet Rejected - Action Required',
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f8d7da; padding: 20px; text-align: center;">
            <h2 style="color: #721c24; margin: 0;">${data.companyName}</h2>
            <p style="color: #721c24; margin: 10px 0 0 0;">Timesheet & Expense Management</p>
          </div>
          
          <div style="padding: 30px 20px; background: white;">
            <h3 style="color: #721c24; margin-bottom: 20px;">❌ Timesheet Rejected</h3>
            
            <p>Hello ${data.employeeName || 'Employee'},</p>
            
            <p>Your timesheet has been rejected and requires your attention:</p>
            
            <div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Period:</strong> ${data.period || 'Current Period'}</p>
              <p><strong>Reason:</strong> ${data.reason || 'Please review and correct issues'}</p>
              <p><strong>Rejected:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <p>Please review the feedback, make necessary corrections, and resubmit your timesheet.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.resubmitUrl || '#'}" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Resubmit Timesheet</a>
            </div>
            
            <p>If you have any questions, please contact support at ${data.supportEmail}.</p>
            
            <p>Best regards,<br>${data.companyName} Team</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
            <p>This is an automated notification from the West End Workforce system.</p>
          </div>
        </div>
      `,
      textBody: `
        Timesheet Rejected - Action Required
        
        Hello ${data.employeeName || 'Employee'},
        
        Your timesheet has been rejected and requires your attention:
        
        Period: ${data.period || 'Current Period'}
        Reason: ${data.reason || 'Please review and correct issues'}
        Rejected: ${new Date().toLocaleDateString()}
        
        Please review the feedback, make necessary corrections, and resubmit your timesheet.
        
        If you have any questions, please contact support at ${data.supportEmail}.
        
        Best regards,
        ${data.companyName} Team
      `
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getExpenseSubmittedTemplate(data: any): EmailTemplate {
    return {
      subject: `Expense Submitted - $${data.amount || 0}`,
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f8f9fa; padding: 20px; text-align: center;">
            <h2 style="color: #333; margin: 0;">${data.companyName}</h2>
            <p style="color: #666; margin: 10px 0 0 0;">Timesheet & Expense Management</p>
          </div>
          
          <div style="padding: 30px 20px; background: white;">
            <h3 style="color: #333; margin-bottom: 20px;">💰 Expense Submitted for Approval</h3>
            
            <p>Hello ${data.managerName || 'Manager'},</p>
            
            <p>A new expense has been submitted and requires your approval:</p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Employee:</strong> ${data.employeeName || 'Employee'}</p>
              <p><strong>Amount:</strong> $${data.amount || 0}</p>
              <p><strong>Description:</strong> ${data.description || 'N/A'}</p>
              <p><strong>Submitted:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <p>Please review and approve or reject this expense as soon as possible.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.approvalUrl || '#'}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Review Expense</a>
            </div>
            
            <p>If you have any questions, please contact support at ${data.supportEmail}.</p>
            
            <p>Best regards,<br>${data.companyName} Team</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
            <p>This is an automated notification from the West End Workforce system.</p>
          </div>
        </div>
      `,
      textBody: `
        Expense Submitted - $${data.amount || 0}
        
        Hello ${data.managerName || 'Manager'},
        
        A new expense has been submitted and requires your approval:
        
        Employee: ${data.employeeName || 'Employee'}
        Amount: $${data.amount || 0}
        Description: ${data.description || 'N/A'}
        Submitted: ${new Date().toLocaleDateString()}
        
        Please review and approve or reject this expense as soon as possible.
        
        If you have any questions, please contact support at ${data.supportEmail}.
        
        Best regards,
        ${data.companyName} Team
      `
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getExpenseApprovedTemplate(data: any): EmailTemplate {
    return {
      subject: 'Expense Approved',
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #d4edda; padding: 20px; text-align: center;">
            <h2 style="color: #155724; margin: 0;">${data.companyName}</h2>
            <p style="color: #155724; margin: 10px 0 0 0;">Timesheet & Expense Management</p>
          </div>
          
          <div style="padding: 30px 20px; background: white;">
            <h3 style="color: #333; margin-bottom: 20px;">✅ Expense Approved</h3>
            
            <p>Hello ${data.employeeName || 'Employee'},</p>
            
            <p>Great news! Your expense has been approved:</p>
            
            <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Amount:</strong> $${data.amount || 0}</p>
              <p><strong>Description:</strong> ${data.description || 'N/A'}</p>
              <p><strong>Approved:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <p>Your expense is now approved and will be processed for reimbursement.</p>
            
            <p>If you have any questions, please contact support at ${data.supportEmail}.</p>
            
            <p>Best regards,<br>${data.companyName} Team</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
            <p>This is an automated notification from the West End Workforce system.</p>
          </div>
        </div>
      `,
      textBody: `
        Expense Approved
        
        Hello ${data.employeeName || 'Employee'},
        
        Great news! Your expense has been approved:
        
        Amount: $${data.amount || 0}
        Description: ${data.description || 'N/A'}
        Approved: ${new Date().toLocaleDateString()}
        
        Your expense is now approved and will be processed for reimbursement.
        
        If you have any questions, please contact support at ${data.supportEmail}.
        
        Best regards,
        ${data.companyName} Team
      `
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getExpenseRejectedTemplate(data: any): EmailTemplate {
    return {
      subject: 'Expense Rejected - Action Required',
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f8d7da; padding: 20px; text-align: center;">
            <h2 style="color: #721c24; margin: 0;">${data.companyName}</h2>
            <p style="color: #721c24; margin: 10px 0 0 0;">Timesheet & Expense Management</p>
          </div>
          
          <div style="padding: 30px 20px; background: white;">
            <h3 style="color: #721c24; margin-bottom: 20px;">❌ Expense Rejected</h3>
            
            <p>Hello ${data.employeeName || 'Employee'},</p>
            
            <p>Your expense has been rejected and requires your attention:</p>
            
            <div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Amount:</strong> $${data.amount || 0}</p>
              <p><strong>Description:</strong> ${data.description || 'N/A'}</p>
              <p><strong>Reason:</strong> ${data.reason || 'Please review and correct issues'}</p>
              <p><strong>Rejected:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <p>Please review the feedback, make necessary corrections, and resubmit your expense.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.resubmitUrl || '#'}" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Resubmit Expense</a>
            </div>
            
            <p>If you have any questions, please contact support at ${data.supportEmail}.</p>
            
            <p>Best regards,<br>${data.companyName} Team</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
            <p>This is an automated notification from the West End Workforce system.</p>
          </div>
        </div>
      `,
      textBody: `
        Expense Rejected - Action Required
        
        Hello ${data.employeeName || 'Employee'},
        
        Your expense has been rejected and requires your attention:
        
        Amount: $${data.amount || 0}
        Description: ${data.description || 'N/A'}
        Reason: ${data.reason || 'Please review and correct issues'}
        Rejected: ${new Date().toLocaleDateString()}
        
        Please review the feedback, make necessary corrections, and resubmit your expense.
        
        If you have any questions, please contact support at ${data.supportEmail}.
        
        Best regards,
        ${data.companyName} Team
      `
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getTimesheetOverdueTemplate(data: any): EmailTemplate {
    return {
      subject: '⚠️ Timesheet Overdue - Urgent Action Required',
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #fff3cd; padding: 20px; text-align: center;">
            <h2 style="color: #856404; margin: 0;">${data.companyName}</h2>
            <p style="color: #856404; margin: 10px 0 0 0;">Timesheet & Expense Management</p>
          </div>
          
          <div style="padding: 30px 20px; background: white;">
            <h3 style="color: #856404; margin-bottom: 20px;">⚠️ Timesheet Overdue</h3>
            
            <p>Hello ${data.employeeName || 'Employee'},</p>
            
            <p><strong>Your timesheet is overdue and requires immediate attention!</strong></p>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Period:</strong> ${data.period || 'Current Period'}</p>
              <p><strong>Days Overdue:</strong> ${data.daysOverdue || 'Multiple days'}</p>
              <p><strong>Due Date:</strong> ${data.dueDate || 'N/A'}</p>
            </div>
            
            <p>Please submit your timesheet immediately to avoid any delays in processing.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.submitUrl || '#'}" style="background: #ffc107; color: #212529; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Submit Timesheet Now</a>
            </div>
            
            <p>If you have any questions or need assistance, please contact support at ${data.supportEmail} immediately.</p>
            
            <p>Best regards,<br>${data.companyName} Team</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
            <p>This is an urgent automated notification from the West End Workforce system.</p>
          </div>
        </div>
      `,
      textBody: `
        ⚠️ Timesheet Overdue - Urgent Action Required
        
        Hello ${data.employeeName || 'Employee'},
        
        Your timesheet is overdue and requires immediate attention!
        
        Period: ${data.period || 'Current Period'}
        Days Overdue: ${data.daysOverdue || 'Multiple days'}
        Due Date: ${data.dueDate || 'N/A'}
        
        Please submit your timesheet immediately to avoid any delays in processing.
        
        If you have any questions or need assistance, please contact support at ${data.supportEmail} immediately.
        
        Best regards,
        ${data.companyName} Team
      `
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getPeriodCompleteTemplate(data: any): EmailTemplate {
    return {
      subject: '🎉 Period Complete - Congratulations!',
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #d4edda; padding: 20px; text-align: center;">
            <h2 style="color: #155724; margin: 0;">${data.companyName}</h2>
            <p style="color: #155724; margin: 10px 0 0 0;">Timesheet & Expense Management</p>
          </div>
          
          <div style="padding: 30px 20px; background: white;">
            <h3 style="color: #333; margin-bottom: 20px;">🎉 Period Complete!</h3>
            
            <p>Hello ${data.employeeName || 'Employee'},</p>
            
            <p>Congratulations! Your timesheet and expenses for this period have been fully approved:</p>
            
            <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Period:</strong> ${data.period || 'Current Period'}</p>
              <p><strong>Timesheet Status:</strong> ✅ Approved</p>
              <p><strong>Expenses Status:</strong> ✅ Approved</p>
              <p><strong>Completed:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <p>Great job staying on top of your reporting! Your period is now complete and will be processed for payroll.</p>
            
            <p>If you have any questions, please contact support at ${data.supportEmail}.</p>
            
            <p>Best regards,<br>${data.companyName} Team</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
            <p>This is an automated notification from the West End Workforce system.</p>
          </div>
        </div>
      `,
      textBody: `
        🎉 Period Complete - Congratulations!
        
        Hello ${data.employeeName || 'Employee'},
        
        Congratulations! Your timesheet and expenses for this period have been fully approved:
        
        Period: ${data.period || 'Current Period'}
        Timesheet Status: ✅ Approved
        Expenses Status: ✅ Approved
        Completed: ${new Date().toLocaleDateString()}
        
        Great job staying on top of your reporting! Your period is now complete and will be processed for payroll.
        
        If you have any questions, please contact support at ${data.supportEmail}.
        
        Best regards,
        ${data.companyName} Team
      `
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getDeadlineReminderTemplate(data: any): EmailTemplate {
    return {
      subject: `⏰ Deadline Reminder - ${data.type || 'Action Required'}`,
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #fff3cd; padding: 20px; text-align: center;">
            <h2 style="color: #856404; margin: 0;">${data.companyName}</h2>
            <p style="color: #856404; margin: 10px 0 0 0;">Timesheet & Expense Management</p>
          </div>
          
          <div style="padding: 30px 20px; background: white;">
            <h3 style="color: #856404; margin-bottom: 20px;">⏰ Deadline Reminder</h3>
            
            <p>Hello ${data.employeeName || 'Employee'},</p>
            
            <p>This is a friendly reminder about an upcoming deadline:</p>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Type:</strong> ${data.type || 'Action Required'}</p>
              <p><strong>Deadline:</strong> ${data.deadline || 'N/A'}</p>
              <p><strong>Days Until Due:</strong> ${data.daysUntil || 'N/A'}</p>
            </div>
            
            <p>Please ensure you complete this action before the deadline to avoid any delays.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.actionUrl || '#'}" style="background: #ffc107; color: #212529; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Take Action Now</a>
            </div>
            
            <p>If you have any questions, please contact support at ${data.supportEmail}.</p>
            
            <p>Best regards,<br>${data.companyName} Team</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
            <p>This is an automated notification from the West End Workforce system.</p>
          </div>
        </div>
      `,
      textBody: `
        ⏰ Deadline Reminder - ${data.type || 'Action Required'}
        
        Hello ${data.employeeName || 'Employee'},
        
        This is a friendly reminder about an upcoming deadline:
        
        Type: ${data.type || 'Action Required'}
        Deadline: ${data.deadline || 'N/A'}
        Days Until Due: ${data.daysUntil || 'N/A'}
        
        Please ensure you complete this action before the deadline to avoid any delays.
        
        If you have any questions, please contact support at ${data.supportEmail}.
        
        Best regards,
        ${data.companyName} Team
      `
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getPayrollCutoffTemplate(data: any): EmailTemplate {
    return {
      subject: '💰 Payroll Cutoff Reminder',
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #d1ecf1; padding: 20px; text-align: center;">
            <h2 style="color: #0c5460; margin: 0;">${data.companyName}</h2>
            <p style="color: #0c5460; margin: 10px 0 0 0;">Timesheet & Expense Management</p>
          </div>
          
          <div style="padding: 30px 20px; background: white;">
            <h3 style="color: #333; margin-bottom: 20px;">💰 Payroll Cutoff Reminder</h3>
            
            <p>Hello ${data.employeeName || 'Employee'},</p>
            
            <p>This is a reminder about the upcoming payroll cutoff:</p>
            
            <div style="background: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Cutoff Date:</strong> ${data.cutoffDate || 'N/A'}</p>
              <p><strong>Days Until Cutoff:</strong> ${data.daysUntil || 'N/A'}</p>
              <p><strong>Action Required:</strong> Submit timesheet and expenses</p>
            </div>
            
            <p>Please ensure your timesheet and expenses are submitted and approved before the cutoff to ensure timely payment processing.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.submitUrl || '#'}" style="background: #17a2b8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Submit Now</a>
            </div>
            
            <p>If you have any questions, please contact support at ${data.supportEmail}.</p>
            
            <p>Best regards,<br>${data.companyName} Team</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
            <p>This is an automated notification from the West End Workforce system.</p>
          </div>
        </div>
      `,
      textBody: `
        💰 Payroll Cutoff Reminder
        
        Hello ${data.employeeName || 'Employee'},
        
        This is a reminder about the upcoming payroll cutoff:
        
        Cutoff Date: ${data.cutoffDate || 'N/A'}
        Days Until Cutoff: ${data.daysUntil || 'N/A'}
        Action Required: Submit timesheet and expenses
        
        Please ensure your timesheet and expenses are submitted and approved before the cutoff to ensure timely payment processing.
        
        If you have any questions, please contact support at ${data.supportEmail}.
        
        Best regards,
        ${data.companyName} Team
      `
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getManagerPendingReminderTemplate(data: any): EmailTemplate {
    return {
      subject: '📋 Pending Approvals - Action Required',
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f8d7da; padding: 20px; text-align: center;">
            <h2 style="color: #721c24; margin: 0;">${data.companyName}</h2>
            <p style="color: #721c24; margin: 10px 0 0 0;">Timesheet & Expense Management</p>
          </div>
          
          <div style="padding: 30px 20px; background: white;">
            <h3 style="color: #333; margin-bottom: 20px;">📋 Pending Approvals</h3>
            
            <p>Hello ${data.managerName || 'Manager'},</p>
            
            <p>You have pending items that require your approval:</p>
            
            <div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Pending Timesheets:</strong> ${data.pendingTimesheets || 0}</p>
              <p><strong>Pending Expenses:</strong> ${data.pendingExpenses || 0}</p>
              <p><strong>Total Pending:</strong> ${data.pendingCount || 0}</p>
            </div>
            
            <p>Please review and process these pending items as soon as possible to avoid delays for your team members.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.reviewUrl || '#'}" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Review Pending Items</a>
            </div>
            
            <p>If you have any questions, please contact support at ${data.supportEmail}.</p>
            
            <p>Best regards,<br>${data.companyName} Team</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
            <p>This is an automated notification from the West End Workforce system.</p>
          </div>
        </div>
      `,
      textBody: `
        📋 Pending Approvals - Action Required
        
        Hello ${data.managerName || 'Manager'},
        
        You have pending items that require your approval:
        
        Pending Timesheets: ${data.pendingTimesheets || 0}
        Pending Expenses: ${data.pendingExpenses || 0}
        Total Pending: ${data.pendingCount || 0}
        
        Please review and process these pending items as soon as possible to avoid delays for your team members.
        
        If you have any questions, please contact support at ${data.supportEmail}.
        
        Best regards,
        ${data.companyName} Team
      `
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getDefaultTemplate(data: any): EmailTemplate {
    return {
      subject: 'Notification from West End Workforce',
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f8f9fa; padding: 20px; text-align: center;">
            <h2 style="color: #333; margin: 0;">${data.companyName}</h2>
            <p style="color: #666; margin: 10px 0 0 0;">Timesheet & Expense Management</p>
          </div>
          
          <div style="padding: 30px 20px; background: white;">
            <h3 style="color: #333; margin-bottom: 20px;">System Notification</h3>
            
            <p>Hello,</p>
            
            <p>You have received a notification from the West End Workforce system.</p>
            
            <p>If you have any questions, please contact support at ${data.supportEmail}.</p>
            
            <p>Best regards,<br>${data.companyName} Team</p>
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
        
        If you have any questions, please contact support at ${data.supportEmail}.
        
        Best regards,
        ${data.companyName} Team
      `
    };
  }

  // Get service status
  getStatus(): { isInitialized: boolean; config: EmailConfig } {
    return {
      isInitialized: this.isInitialized,
      config: this.config
    };
  }
}

export const emailService = EmailService.getInstance();
