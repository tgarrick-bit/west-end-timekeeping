import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email directly via SMTP. Use this from server-side code
 * (API routes, server actions) instead of calling the send-email API route.
 *
 * Returns true if sent, false if SMTP is not configured or send fails.
 */
export async function sendEmail({ to, subject, html, text }: EmailOptions): Promise<boolean> {
  try {
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const fromEmail = process.env.EMAIL_FROM || smtpUser || 'noreply@westendworkforce.com';
    const fromName = process.env.EMAIL_FROM_NAME || 'West End Workforce Timekeeping';

    if (!smtpUser && !smtpPass) {
      console.warn('SMTP not configured — skipping email to', to);
      return false;
    }

    const config: any = {
      host: smtpHost,
      port: smtpPort,
      secure: false,
      tls: { rejectUnauthorized: false },
    };

    if (smtpPass) {
      config.auth = { user: smtpUser, pass: smtpPass };
    }

    const transporter = nodemailer.createTransport(config);

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html,
      ...(text ? { text } : {}),
    });

    console.log(`Email sent to ${to}: ${subject}`);
    return true;
  } catch (error: any) {
    console.error(`Failed to send email to ${to}:`, error?.message || error);
    return false;
  }
}
