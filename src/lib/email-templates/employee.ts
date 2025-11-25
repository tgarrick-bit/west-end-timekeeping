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

  <!-- Montserrat only -->
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">

  <style>
    body { margin: 0; padding: 0; background: #f3f6f9; font-family: 'Montserrat', Arial, sans-serif; }
    .wrapper { width: 100%; table-layout: fixed; background: #f3f6f9; padding: 24px 0; }
    .main { background: #ffffff; margin: 0 auto; width: 100%; max-width: 620px;
            border-radius: 10px; overflow: hidden; border: 1px solid #e5e7eb; }

    /* HEADER */
    .header {
      padding: 18px 24px 14px;
      background: #33393c;
      border-bottom: 3px solid #e31c79;
      text-align: center;
    }
    .header-title {
      font-family: 'Montserrat', Arial, sans-serif;
      font-size: 24px;
      margin: 0;
      color: #ffffff;
      font-weight: 700;
      letter-spacing: 0.3px;
      line-height: 1.25;
    }
    .logo { margin-top: 10px; }

    /* BODY */
    .content {
      padding: 14px 28px 24px;
      font-size: 14px;
      color: #374151;
      line-height: 1.7;
      font-family: 'Montserrat', Arial, sans-serif;
    }
    .content h2 {
      margin: 8px 0 10px;
      font-family: 'Montserrat', Arial, sans-serif;
      font-size: 20px;
      font-weight: 700;
      color: #33393c;
      line-height: 1.3;
    }

    /* BUTTON */
    .button-wrapper { text-align: center; margin-top: 24px; margin-bottom: 10px; }
    .button {
      background: #e31c79;
      color: #ffffff !important;
      padding: 14px 30px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      display: inline-block;
      font-family: 'Montserrat', Arial, sans-serif;
    }

    /* FALLBACK LINK */
    .link-fallback { margin-top: 14px; font-size: 12px; color: #6b7280; word-break: break-all; }

    /* FOOTER */
    .footer {
      text-align: center;
      padding: 18px 20px 22px;
      font-size: 12px;
      color: #6b7280;
      background: #ffffff;
      border-top: 1px solid #e31c79;
      line-height: 1.6;
    }

    /* MOBILE */
    @media only screen and (max-width: 600px) {
      .main { width: 100% !important; border-radius: 0 !important; }
      .content { padding: 18px 18px 24px !important; font-size: 14px !important; }
      .header-title { font-size: 20px !important; }
      .content h2 { font-size: 18px !important; }
      .button { width: 100% !important; box-sizing: border-box !important; }
    }

    /* DARK MODE */
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
            <img src="${logoUrl}" alt="West End Workforce Logo" width="48" class="logo" />
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td class="content">
            <h2>Expense Report Approved</h2>

            <p>Hello ${employeeName},</p>

            <p>Your expense report <strong>${reportTitle}</strong> for
               <strong>${period}</strong> has been approved.</p>

            <p>No further action is required.</p>

            <div class="button-wrapper">
              <a href="${reportUrl}" class="button">View Expense Report</a>
            </div>

            <p class="link-fallback">
              If the button does not work, copy and paste this link into your browser:<br />
              <a href="${reportUrl}" style="color:#e31c79;text-decoration:none;">${reportUrl}</a>
            </p>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td class="footer">
            <p>You are receiving this notification because you submitted an expense report in the Workforce Portal.</p>

            <p>This notification is intended for internal use by authorized personnel only
               and contains no sensitive information. Please sign into the portal
               to view full details.</p>

            <p>
              West End Workforce · 800 Town & Country Blvd, Suite 500 · Houston, TX 77024<br />
              <a href="mailto:payroll@westendworkforce.com" style="color:#4b5563;text-decoration:none;">
                payroll@westendworkforce.com
              </a> ·
              <a href="https://www.westendworkforce.com" style="color:#4b5563;text-decoration:none;">
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

/**
 * Employee – Expense Rejected
 */
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

  <!-- Montserrat only -->
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">

  <style>
    body { margin: 0; padding: 0; background: #f3f6f9; font-family: 'Montserrat', Arial, sans-serif; }
    .wrapper { width: 100%; table-layout: fixed; background: #f3f6f9; padding: 24px 0; }
    .main { background: #ffffff; margin: 0 auto; width: 100%; max-width: 620px;
            border-radius: 10px; overflow: hidden; border: 1px solid #e5e7eb; }

    /* HEADER */
    .header {
      padding: 18px 24px 14px;
      background: #33393c;
      border-bottom: 3px solid #e31c79;
      text-align: center;
    }
    .header-title {
      font-family: 'Montserrat', Arial, sans-serif;
      font-size: 24px;
      margin: 0;
      color: #ffffff;
      font-weight: 700;
      letter-spacing: 0.3px;
      line-height: 1.25;
    }
    .logo { margin-top: 10px; }

    /* BODY */
    .content {
      padding: 14px 28px 24px;
      font-size: 14px;
      color: #374151;
      line-height: 1.7;
      font-family: 'Montserrat', Arial, sans-serif;
    }
    .content h2 {
      margin: 8px 0 10px;
      font-family: 'Montserrat', Arial, sans-serif;
      font-size: 20px;
      font-weight: 700;
      color: #b91c1c;
      line-height: 1.3;
    }

    .reason-box {
      border-left: 4px solid #f97316;
      background: #fff7ed;
      padding: 12px 14px;
      margin: 18px 0 6px;
      font-size: 14px;
      color: #7c2d12;
    }

    /* BUTTON */
    .button-wrapper { text-align: center; margin-top: 24px; margin-bottom: 10px; }
    .button {
      background: #e31c79;
      color: #ffffff !important;
      padding: 14px 30px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      display: inline-block;
      font-family: 'Montserrat', Arial, sans-serif;
    }

    /* FALLBACK LINK */
    .link-fallback { margin-top: 14px; font-size: 12px; color:#6b7280; word-break: break-all; }

    /* FOOTER */
    .footer {
      text-align: center;
      padding: 18px 20px 22px;
      font-size: 12px;
      color: #6b7280;
      background: #ffffff;
      border-top: 1px solid #e31c79;
      line-height: 1.6;
    }

    /* MOBILE */
    @media only screen and (max-width: 600px) {
      .main { width: 100% !important; border-radius: 0 !important; }
      .content { padding: 18px 18px 24px !important; font-size: 14px !important; }
      .header-title { font-size: 20px !important; }
      .content h2 { font-size: 18px !important; }
      .button {
        width: 100% !important;
        box-sizing: border-box !important;
      }
    }

    /* DARK MODE */
    @media (prefers-color-scheme: dark) {
      body { background:#020617; }
      .wrapper { background:#020617; }
      .main { background:#020617; border-color:#1f2937; }
      .content { color:#e5e7eb; }
      .reason-box { background:#451a03; border-color:#f97316; color:#fed7aa; }
      .footer { background:#020617; color:#9fa6b2; }
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
            <img src="${logoUrl}" alt="West End Workforce Logo" width="48" class="logo"/>
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

            <div class="button-wrapper">
              <a href="${reportUrl}" class="button">Review Expense Report</a>
            </div>

            <p class="link-fallback">
              If the button does not work,<br />
              <a href="${reportUrl}" style="color:#e31c79;text-decoration:none;">
                ${reportUrl}
              </a>
            </p>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td class="footer">
            <p>You are receiving this notification because you submitted an expense report in the Workforce Portal.</p>

            <p>This notification is intended for internal use by authorized personnel only
               and contains no sensitive information. Please sign into the portal
               to view full details.</p>

            <p>
              West End Workforce · 800 Town & Country Blvd, Suite 500 · Houston, TX 77024<br />
              <a href="mailto:payroll@westendworkforce.com" style="color:#4b5563;text-decoration:none;">
                payroll@westendworkforce.com
              </a> ·
              <a href="https://www.westendworkforce.com" style="color:#4b5563;text-decoration:none;">
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
