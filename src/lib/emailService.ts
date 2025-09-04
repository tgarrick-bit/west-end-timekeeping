import { Notification } from '@/types/notifications';

export interface EmailConfig {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  fromEmail: string;
  fromName: string;
}

export interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
}

export class EmailService {
  private static instance: EmailService;
  private config: EmailConfig;
  private isInitialized = false;

  private constructor(config?: Partial<EmailConfig>) {
    this.config = {
      smtpHost: process.env.SMTP_HOST,
      smtpPort: parseInt(process.env.SMTP_PORT || '587'),
      smtpUser: process.env.SMTP_USER,
      smtpPassword: process.env.SMTP_PASSWORD,
      fromEmail: process.env.FROM_EMAIL || 'noreply@westendworkforce.com',
      fromName: process.env.FROM_NAME || 'West End Workforce',
      ...config
    };
  }

  static getInstance(config?: Partial<EmailConfig>): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService(config);
    }
    return EmailService.instance;
  }

  async initialize(config?: Partial<EmailConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // On client side, just mark as initialized
    if (typeof window !== 'undefined') {
      console.log('EmailService: Client-side initialization');
      this.isInitialized = true;
      return;
    }

    // On server side, try to initialize SMTP
    try {
      // Dynamic import for server-side only
      const nodemailer = await import('nodemailer');
      
      // Create SMTP transporter
      const transporter = nodemailer.default.createTransporter({
        host: this.config.smtpHost,
        port: this.config.smtpPort,
        secure: false,
        auth: {
          user: this.config.smtpUser,
          pass: this.config.smtpPassword,
        },
      });

      // Verify connection
      await transporter.verify();
      this.isInitialized = true;
      console.log('Email service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      // Don't throw error - allow graceful degradation
      this.isInitialized = false;
    }
  }

  getEmailTemplate(notificationType: string, customData?: Record<string, any>): EmailTemplate {
    const baseTemplate = {
      subject: 'West End Workforce Notification',
      htmlContent: '<p>You have a new notification from West End Workforce.</p>',
      textContent: 'You have a new notification from West End Workforce.'
    };

    switch (notificationType) {
      case 'timesheet_reminder':
        return {
          subject: 'Timesheet Reminder - West End Workforce',
          htmlContent: `
            <h2>Timesheet Reminder</h2>
            <p>Don't forget to submit your timesheet for this period.</p>
            <p>Log in to your account to complete your timesheet.</p>
          `,
          textContent: 'Timesheet Reminder: Don\'t forget to submit your timesheet for this period.'
        };
      case 'shift_assignment':
        return {
          subject: 'New Shift Assignment - West End Workforce',
          htmlContent: `
            <h2>New Shift Assignment</h2>
            <p>You have been assigned a new shift.</p>
            <p>Please check your schedule for details.</p>
          `,
          textContent: 'New Shift Assignment: You have been assigned a new shift. Please check your schedule for details.'
        };
      default:
        return baseTemplate;
    }
  }

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
        console.log('Sending email:', {
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

  async testEmailConfiguration(): Promise<{ success: boolean; message: string }> {
    try {
      if (typeof window !== 'undefined') {
        console.log('EmailService: Testing configuration in client mode');
        return { 
          success: true, 
          message: 'Email service available in client mode' 
        };
      }

      // On server side, test SMTP configuration
      try {
        const nodemailer = await import('nodemailer');
        
        const transporter = nodemailer.default.createTransporter({
          host: this.config.smtpHost,
          port: this.config.smtpPort,
          secure: false,
          auth: {
            user: this.config.smtpUser,
            pass: this.config.smtpPassword,
          },
        });

        await transporter.verify();
        return { 
          success: true, 
          message: 'Email configuration is valid' 
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
}

export default EmailService;
