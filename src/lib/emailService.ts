// src/lib/emailService.ts
// Demo-safe EmailService used across client and server.
// - No top-level nodemailer import (avoids bundling in client).
// - Uses dynamic import on the server only.
// - Exposes a named `emailService` singleton for NotificationProvider.
// - Falls back to console logging if SMTP is not configured.

import type { Notification } from '@/types/notifications';

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
      smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
      smtpUser: process.env.SMTP_USER,
      smtpPassword: process.env.SMTP_PASSWORD,
      fromEmail: process.env.FROM_EMAIL || 'noreply@westendworkforce.com',
      fromName: process.env.FROM_NAME || 'West End Workforce',
      ...config,
    };
  }

  static getInstance(config?: Partial<EmailConfig>): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService(config);
    }
    return EmailService.instance;
  }

  /** Safe init for both client/server. */
  async initialize(config?: Partial<EmailConfig>): Promise<void> {
    if (config) this.config = { ...this.config, ...config };

    // Client: mark initialized; real sending will go through API
    if (typeof window !== 'undefined') {
      this.isInitialized = true;
      return;
    }

    // Server: try to verify SMTP config (optional for demo)
    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: this.config.smtpHost,
        port: this.config.smtpPort,
        secure: false,
        auth: this.config.smtpUser && this.config.smtpPassword ? {
          user: this.config.smtpUser,
          pass: this.config.smtpPassword,
        } : undefined,
      });

      await transporter.verify();
      this.isInitialized = true;
      // eslint-disable-next-line no-console
      console.log('EmailService: SMTP verified');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('EmailService: SMTP verify failed (ok for demo):', err);
      this.isInitialized = false; // we’ll degrade gracefully
    }
  }

  getEmailTemplate(notificationType: string, _customData?: Record<string, any>): EmailTemplate {
    const base: EmailTemplate = {
      subject: 'West End Workforce Notification',
      htmlContent: '<p>You have a new notification from West End Workforce.</p>',
      textContent: 'You have a new notification from West End Workforce.',
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
          textContent: `Timesheet Reminder: Don't forget to submit your timesheet for this period.`,
        };
      case 'shift_assignment':
        return {
          subject: 'New Shift Assignment - West End Workforce',
          htmlContent: `
            <h2>New Shift Assignment</h2>
            <p>You have been assigned a new shift.</p>
            <p>Please check your schedule for details.</p>
          `,
          textContent: 'New Shift Assignment: You have been assigned a new shift. Please check your schedule for details.',
        };
      default:
        return base;
    }
  }

  /**
   * Demo-friendly send:
   * - In the browser: call our API route (non-blocking demo).
   * - On the server: if SMTP is configured, send directly; else log and succeed.
   */
  async sendEmailNotification(
    toEmail: string,
    notification: Notification,
    customData?: Record<string, any>
  ): Promise<boolean> {
    const template = this.getEmailTemplate(notification.type, customData);

    if (typeof window !== 'undefined') {
      // Client -> API
      try {
        const res = await fetch('/api/notifications/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: toEmail,
            subject: template.subject,
            html: template.htmlContent,
            text: template.textContent,
            notification,
            customData,
            fromEmail: this.config.fromEmail,
            fromName: this.config.fromName,
          }),
        });
        return res.ok;
      } catch (err) {
        console.error('Email API error:', err);
        return false;
      }
    }

    // Server path
    try {
      if (!this.isInitialized) {
        // Degrade gracefully for demo
        console.log('[EmailService:noop]', {
          toEmail,
          subject: template.subject,
          from: `${this.config.fromName} <${this.config.fromEmail}>`,
        });
        return true;
      }

      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: this.config.smtpHost,
        port: this.config.smtpPort,
        secure: false,
        auth: this.config.smtpUser && this.config.smtpPassword ? {
          user: this.config.smtpUser,
          pass: this.config.smtpPassword,
        } : undefined,
      });

      await transporter.sendMail({
        to: toEmail,
        from: `${this.config.fromName} <${this.config.fromEmail}>`,
        subject: template.subject,
        html: template.htmlContent,
        text: template.textContent,
      });

      return true;
    } catch (err) {
      console.error('Email send failed:', err);
      return false;
    }
  }

  async sendBulkEmailNotifications(
    toEmails: string[],
    notification: Notification,
    customData?: Record<string, any>
  ): Promise<{ success: string[]; failed: string[] }> {
    const result = { success: [] as string[], failed: [] as string[] };
    for (const email of toEmails) {
      const ok = await this.sendEmailNotification(email, notification, customData);
      (ok ? result.success : result.failed).push(email);
    }
    return result;
  }

  async testEmailConfiguration(): Promise<{ success: boolean; message: string }> {
    if (typeof window !== 'undefined') {
      return { success: true, message: 'Email service available in client mode' };
    }
    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: this.config.smtpHost,
        port: this.config.smtpPort,
        secure: false,
        auth: this.config.smtpUser && this.config.smtpPassword ? {
          user: this.config.smtpUser,
          pass: this.config.smtpPassword,
        } : undefined,
      });
      await transporter.verify();
      return { success: true, message: 'Email configuration is valid' };
    } catch (err: any) {
      return { success: false, message: `Test failed: ${err?.message ?? 'Unknown error'}` };
    }
  }
}

// Named singleton (what the app imports)
export const emailService = EmailService.getInstance();

// Optional default export (not strictly needed)
export default EmailService;

