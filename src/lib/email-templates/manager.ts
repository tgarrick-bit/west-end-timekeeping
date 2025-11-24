// src/lib/email-templates/manager.ts

export function buildManagerSubmissionEmailHtml(args: {
    managerUrl: string;
    employeeName: string;
    reportTitle: string;
    period: string;
    totalAmount: number;
    year: string;
  }): string {
    const {
      managerUrl,
      employeeName,
      reportTitle,
      period,
      totalAmount,
      year,
    } = args;
  
    const logoUrl =
      'https://westendworkforce.com/wp-content/uploads/2025/11/WE-logo-SEPT2024v3-WHT.png';
  
    const formattedTotal = totalAmount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  
    return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>New Expense Report Submitted</title>
    <link href="https://fonts.googleapis.com/css2?family=Antonio:wght@700&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">
    <style>
      body { margin: 0; padding: 0; background: #f3f6f9; font-family: 'Montserrat', Arial, sans-serif; }
      .wrapper { width: 100%; table-layout: fixed; background: #f3f6f9; padding: 24px 0; }
      .main { background: #ffffff; margin: 0 auto; width: 100%; max-width: 620px; border-radius: 10px;
              overflow: hidden; border: 1px solid #e5e7eb; }
      .header { padding: 24px 20px 16px; background: #05202E; border-bottom: 3px solid #e31c79; text-align: center; }
      .header-title { font-family: 'Antonio', Arial, sans-serif; font-size: 28px; margin: 0; color: #ffffff;
                      font-weight: 700; letter-spacing: 0.4px; }
      .logo { margin-top: 10px; }
      .content { padding: 26px 28px 34px; font-size: 14px; color: #374151; line-height: 1.7; }
      .content h2 { margin-top: 0; font-family: 'Antonio', Arial, sans-serif; font-size: 22px;
                    margin-bottom: 12px; color: #111827; }
      .meta { margin-top: 14px; padding: 14px 16px; background: #f9fafb;
              border-radius: 6px; font-size: 13px; }
      .meta div { margin-bottom: 4px; }
      .button-wrapper { text-align: center; margin-top: 26px; margin-bottom: 8px; }
      .button { background: #e31c79; color: #ffffff !important; text-decoration: none;
                padding: 14px 28px; border-radius: 6px; font-size: 14px; font-weight: 600;
                display: inline-block; font-family: 'Montserrat', Arial, sans-serif; }
      .link-fallback { margin-top: 14px; font-size: 11px; color: #6b7280; word-break: break-all; }
      .footer { text-align: center; padding: 16px 20px 20px; font-size: 11px; color: #6b7280;
                background: #ffffff; border-top: 1px solid #e31c79; line-height: 1.6; }
  
      @media only screen and (max-width: 600px) {
        .main { width: 100% !important; border-radius: 0 !important; }
        .content { padding: 22px 18px 28px !important; font-size: 13.5px !important; }
        .header-title { font-size: 24px !important; }
        .content h2 { font-size: 20px !important; }
        .button { width: 100% !important; box-sizing: border-box !important; }
      }
  
      @media (prefers-color-scheme: dark) {
        body { background: #020617; }
        .wrapper { background: #020617; }
        .main { background: #020617; border-color: #1f2937; }
        .content { color: #e5e7eb; }
        .meta { background: #020617; border: 1px solid #374151; }
        .footer { background: #020617; color: #9fa6b2; }
      }
    </style>
  </head>
  
  <body>
    <table role="presentation" class="wrapper">
      <tr><td align="center">
        <table role="presentation" class="main">
  
          <!-- HEADER -->
          <tr>
            <td class="header">
              <div class="header-title">West End Workforce</div>
              <img src="${logoUrl}" alt="West End Workforce Logo" width="64" class="logo" />
            </td>
          </tr>
  
          <!-- BODY -->
          <tr>
            <td class="content">
              <h2>New Expense Report Submitted</h2>
  
              <p>
                <strong>${employeeName}</strong> has submitted a new
                expense report for your review.
              </p>
  
              <div class="meta">
                <div><strong>Report:</strong> ${reportTitle}</div>
                <div><strong>Period:</strong> ${period}</div>
                <div><strong>Total:</strong> ${formattedTotal}</div>
              </div>
  
              <div class="button-wrapper">
                <a href="${managerUrl}" class="button">Open Expense Report</a>
              </div>
  
              <p class="link-fallback">
                If the button does not work:<br />
                <a href="${managerUrl}" style="color:#e31c79; text-decoration:none;">${managerUrl}</a>
              </p>
            </td>
          </tr>
  
          <!-- FOOTER (manager version) -->
          <tr>
            <td class="footer">
              <p>You are receiving this notification because you are a designated
                 approver for expense reports in the Workforce Portal.</p>
  
              <p>This notification is intended for internal use by authorized personnel only
                 and contains no sensitive information. Please sign into the portal
                 to view full report details.</p>
  
              <p>
                West End Workforce · 800 Town & Country Blvd, Suite 500 · Houston, TX 77024<br />
                <a href="mailto:payroll@westendworkforce.com" style="color:#4b5563; text-decoration:none;">
                  payroll@westendworkforce.com
                </a> ·
                <a href="https://www.westendworkforce.com" style="color:#4b5563; text-decoration:none;">
                  westendworkforce.com
                </a>
              </p>
  
              <p>© ${year} West End Workforce. All rights reserved.</p>
            </td>
          </tr>
  
        </table>
      </td></tr>
    </table>
  </body>
  </html>
  `;
  }
  