// src/lib/email-templates/employee.ts

export function buildFinalApprovalEmailHtml(args: {
    employeeName: string;
    reportTitle: string;
    period: string;
    reportUrl: string;
    year: string;
  }): string {
    const { employeeName, reportTitle, period, reportUrl, year } = args;
  
    const logoUrl =
      'https://westendworkforce.com/wp-content/uploads/2025/11/WE-logo-SEPT2024v3-WHT.png';
  
    return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Expense Report Approved</title>
    <link href="https://fonts.googleapis.com/css2?family=Antonio:wght@700&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">
    <style>
      body { margin: 0; padding: 0; background: #f3f6f9; font-family: 'Montserrat', Arial, sans-serif; }
      .wrapper { width: 100%; table-layout: fixed; background: #f3f6f9; padding: 24px 0; }
      .main { background: #ffffff; margin: 0 auto; width: 100%; max-width: 620px; border-radius: 10px;
              overflow: hidden; border: 1px solid #e5e7eb; }
      .header { padding: 28px 20px 18px; background: #05202E; border-bottom: 3px solid #e31c79; text-align: center; }
      .header-title { font-family: 'Antonio', Arial, sans-serif; font-size: 32px; margin: 0; color: #ffffff;
                      font-weight: 700; letter-spacing: 0.4px; }
      .logo { margin-top: 14px; }
      .content { padding: 32px 32px 40px; font-size: 15px; color: #374151; line-height: 1.7; }
      .content h2 { margin-top: 0; font-size: 26px; margin-bottom: 14px; color: #111827;
                    font-family: 'Antonio', Arial, sans-serif; }
      .button-wrapper { text-align: center; margin-top: 32px; margin-bottom: 10px; }
      .button { background: #e31c79; color: #ffffff !important; padding: 14px 30px; border-radius: 6px;
                font-size: 15px; font-weight: 600; text-decoration: none; display: inline-block; }
      .link-fallback { margin-top: 16px; font-size: 12px; color: #6b7280; word-break: break-all; }
      .footer { text-align: center; padding: 18px 20px 22px; font-size: 12px; color: #6b7280;
                background: #ffffff; border-top: 1px solid #e31c79; line-height: 1.6; }
  
      @media only infix screen and (max-width: 600px) {
        .main { width: 100% !important; border-radius: 0 ! !
        }
        .content { padding: 24px 18px 28px !important; font-size: 14px !important; }
        .header-title { font-size: 26px !important; }
        .content h2 { font-size: 22px !important; }
        .button { width: 100% !important; box-sizing: border-box !important; }
      }
  
      @media (prefers-color-scheme: dark) {
        body { background: #020617; }
        .wrapper { background: #020617; }
        .main { background: #020617; border-color: #1f2937; }
        .content { color: #e5e7eb; }
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
              <img src="${logoUrl}" alt="West End Workforce Logo" width="72" class="logo" />
            </td>
          </tr>
  
          <!-- BODY -->
          <tr>
            <td class="content">
              <h2>Expense Report Approved</h2>
  
              <p>Hello ${employeeName},</p>
  
              <p>Your expense report <strong>${reportTitle}</strong> for
                 <strong>${period}</strong> has been officially approved.</p>
  
              <p>No further action is required.</p>
  
              <div class="button-wrapper">
                <a href="${reportUrl}" class="button">View Expense Report</a>
              </div>
  
              <p class="link-fallback">
                If the button does not work, copy and paste this link into your browser:<br />
                <a href="${reportUrl}" style="color:#e31c79; text-decoration:none;">${reportUrl}</a>
              </p>
            </td>
          </tr>
  
          <!-- FOOTER (employee version) -->
          <tr>
            <td class="footer">
              <p>You are receiving this notification because you submitted an expense
                 report in the Workforce Portal.</p>
  
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
  
  export function buildFinalRejectionEmailHtml(args: {
    employeeName: string;
    reportTitle: string;
    period: string;
    reportUrl: string;
    year: string;
    reason: string;
  }): string {
    const { employeeName, reportTitle, period, reportUrl, year, reason } = args;
  
    const logoUrl =
      'https://westendworkforce.com/wp-content/uploads/2025/11/WE-logo-SEPT2024v3-WHT.png';
  
    return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Expense Report Rejected</title>
    <link href="https://fonts.googleapis.com/css2?family=Antonio:wght@700&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">
    <style>
      body { margin: 0; padding: 0; background: #f3f6f9; font-family: 'Montserrat', Arial, sans-serif; }
      .wrapper { width: 100%; table-layout: fixed; background: #f3f6f9; padding: 24px 0; }
      .main { background: #ffffff; margin: 0 auto; width: 100%; max-width: 620px; border-radius: 10px;
              overflow: hidden; border: 1px solid #e5e7eb; }
      .header { padding: 28px 20px 18px; background: #05202E; border-bottom: 3px solid #e31c79; text-align: center; }
      .header-title { font-family: 'Antonio', Arial, sans-serif; font-size: 32px; margin: 0;
                      color: #ffffff; font-weight: 700; letter-spacing: 0.4px; }
      .logo { margin-top: 14px; }
      .content { padding: 32px 32px 40px; font-size: 15px; color: #374151; line-height: 1.7; }
      .content h2 { margin-top: 0; font-size: 26px; margin-bottom: 14px; color: #b91c1c;
                    font-family: 'Antonio', Arial, sans-serif; }
      .reason-box { border-left: 4px solid #f97316; background: #fff7ed; padding: 12px 14px;
                    margin: 18px 0 6px; font-size: 14px; color: #7c2d12; }
      .button-wrapper { text-align: center; margin-top: 28px; margin-bottom: 10px; }
      .button { background: #e31c79; color: #ffffff !important; padding: 14px 30px;
                border-radius: 6px; font-size: 15px; font-weight: 600;
                text-decoration: none; display: inline-block; }
      .link-fallback { margin-top: 16px; font-size: 12px; color: #6b7280; word-break: break-all; }
      .footer { text-align: center; padding: 18px 20px 22px; font-size: 12px; color: #6b7280;
                background: #ffffff; border-top: 1px solid #e31c79; line-height: 1.6; }
  
      @media only screen and (max-width: 600px) {
        .main { width: 100% !important; border-radius: 0 !important; }
        .content { padding: 24px 18px 28px !important; font-size: 14px !important; }
        .header-title { font-size: 26 !important; }
        .content h2 { font-size: 22 }    
        ;}
      @media (prefers-color-scheme: dark) {
        body { background: #020617; }
        .wrapper { background: #020617; }
        .main { background: #020617; border-color: #1f2937; }
        .content { color: #e5e7eb; }
        .reason-box { background: #451a03; border-color: #f97316; color: #fed7aa; }
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
              <img src="${logoUrl}" alt="West End Workforce Logo" width="72" class="logo" />
            </td>
          </tr>
  
          <!-- BODY -->
          <tr>
            <td class="content">
              <h2>Expense Report Rejected</h2>
  
              <p>Hello ${employeeName},</p>
  
              <p>Your expense report <strong>${reportTitle}</strong> for
                 <strong>${period}</strong> has been reviewed and
                 <strong>rejected</strong>.</p>
  
              <div class="reason-box">
                <strong>Reason provided:</strong><br />
                ${reason}
              </div>
  
              <p>
                Please review the details in the portal, make any required changes,
                and resubmit the report if appropriate.
              </p>
  
              <div class="button-wrapper">
                <a href="${reportUrl}" class="button">Review Expense Report</a>
              </div>
  
              <p class="link-fallback">
                If the button does not work, copy and paste this link into your browser:<br />
                <a href="${reportUrl}" style="color:#e31c79; text-decoration:none;">${reportUrl}</a>
              </p>
            </td>
          </tr>
  
          <!-- FOOTER (employee version) -->
          <tr>
            <td class="footer">
              <p>You are receiving this notification because you submitted an expense
                 report in the Workforce Portal.</p>
  
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
  