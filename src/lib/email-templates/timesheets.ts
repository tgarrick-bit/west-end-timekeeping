// src/lib/email-templates/timesheets.ts

const logoUrl =
  'https://westendworkforce.com/wp-content/uploads/2025/11/WE-logo-SEPT2024v3-WHT.png';

/**
 * Employee – Timesheet Approved
 */
export function buildTimesheetApprovedEmailHtml(args: {
  employeeName: string;
  weekEndingLabel: string;
  portalUrl: string;
  year: string;
}): string {
  const { employeeName, weekEndingLabel, portalUrl, year } = args;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Timesheet Approved</title>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { margin: 0; padding: 0; background: #f3f6f9; font-family: 'Montserrat', Arial, sans-serif; }
    .wrapper { width: 100%; table-layout: fixed; background: #f3f6f9; padding: 24px 0; }
    .main { background: #ffffff; margin: 0 auto; width: 100%; max-width: 620px; border-radius: 10px;
            overflow: hidden; border: 1px solid #e5e7eb; }

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

    .content {
      padding: 14px 28px 24px;
      font-size: 14px;
      color: #374151;
      line-height: 1.7;
      font-family: 'Montserrat', Arial, sans-serif;
    }
    .content h2 {
      margin: 8px 0 10px;
      color: #33393c;
      font-family: 'Montserrat', Arial, sans-serif;
      font-size: 20px;
      font-weight: 700;
      line-height: 1.3;
    }

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

    .link-fallback { margin-top: 14px; font-size: 12px; color: #6b7280; word-break: break-all; }

    .footer {
      text-align: center;
      padding: 18px 20px 22px;
      font-size: 12px;
      color: #6b7280;
      background: #ffffff;
      border-top: 1px solid #e31c79;
      line-height: 1.6;
    }

    @media only screen and (max-width: 600px) {
      .main { width: 100% !important; border-radius: 0 !important; }
      .content { padding: 18px 18px 24px !important; font-size: 14px !important; }
      .header-title { font-size: 20px !important; }
      .content h2 { font-size: 18px !important; }
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
            <img src="${logoUrl}" alt="West End Workforce Logo" width="48" class="logo" />
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td class="content">
            <h2>Timesheet Approved</h2>

            <p>Hello ${employeeName},</p>

            <p>Your timesheet for the week ending <strong>${weekEndingLabel}</strong> has been
               <strong>approved</strong>.</p>

            <p>No further action is required.</p>

            <div class="button-wrapper">
              <a href="${portalUrl}" class="button">View Timesheet</a>
            </div>

            <p class="link-fallback">
              If the button does not work, copy and paste this link into your browser:<br />
              <a href="${portalUrl}" style="color:#e31c79; text-decoration:none;">${portalUrl}</a>
            </p>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td class="footer">
            <p>You are receiving this notification because you submitted a timesheet
               in the Workforce Portal.</p>

            <p>This notification is intended for internal use by authorized personnel only
               and contains no sensitive information. Please sign into the portal
               to view full timesheet details.</p>

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

/**
 * Employee – Timesheet Rejected
 */
export function buildTimesheetRejectedEmailHtml(args: {
  employeeName: string;
  weekEndingLabel: string;
  portalUrl: string;
  year: string;
  reason: string;
}): string {
  const { employeeName, weekEndingLabel, portalUrl, year, reason } = args;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Timesheet Rejected</title>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { margin: 0; padding: 0; background: #f3f6f9; font-family: 'Montserrat', Arial, sans-serif; }
    .wrapper { width: 100%; table-layout: fixed; background: #f3f6f9; padding: 24px 0; }
    .main { background: #ffffff; margin: 0 auto; width: 100%; max-width: 620px; border-radius: 10px;
            overflow: hidden; border: 1px solid #e5e7eb; }

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

    .content {
      padding: 14px 28px 24px;
      font-size: 14px;
      color: #374151;
      line-height: 1.7;
      font-family: 'Montserrat', Arial, sans-serif;
    }
    .content h2 {
      margin: 8px 0 10px;
      color: #b91c1c;
      font-family: 'Montserrat', Arial, sans-serif;
      font-size: 20px;
      font-weight: 700;
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

    .link-fallback { margin-top: 14px; font-size: 12px; color: #6b7280; word-break: break-all; }

    .footer {
      text-align: center;
      padding: 18px 20px 22px;
      font-size: 12px;
      color: #6b7280;
      background: #ffffff;
      border-top: 1px solid #e31c79;
      line-height: 1.6;
    }

    @media only screen and (max-width: 600px) {
      .main { width: 100% !important; border-radius: 0 !important; }
      .content { padding: 18px 18px 24px !important; font-size: 14px !important; }
      .header-title { font-size: 20px !important; }
      .content h2 { font-size: 18px !important; }
      .button { width: 100% !important; box-sizing: border-box !important; }
    }

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
            <img src="${logoUrl}" alt="West End Workforce Logo" width="48" class="logo" />
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td class="content">
            <h2>Timesheet Rejected</h2>

            <p>Hello ${employeeName},</p>

            <p>Your timesheet for the week ending <strong>${weekEndingLabel}</strong> has been
               <strong>rejected</strong>.</p>

            <div class="reason-box">
              <strong>Reason provided:</strong><br />
              ${reason}
            </div>

            <p>
              Please review the details in the portal, make any required changes,
              and resubmit the timesheet if appropriate.
            </p>

            <div class="button-wrapper">
              <a href="${portalUrl}" class="button">Review Timesheet</a>
            </div>

            <p class="link-fallback">
              If the button does not work, copy and paste this link into your browser:<br />
              <a href="${portalUrl}" style="color:#e31c79; text-decoration:none;">${portalUrl}</a>
            </p>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td class="footer">
            <p>You are receiving this notification because you submitted a timesheet
               in the Workforce Portal.</p>

            <p>This notification is intended for internal use by authorized personnel only
               and contains no sensitive information. Please sign into the portal
               to view full timesheet details.</p>

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

/**
 * Manager – Timesheet Submitted
 */
export function buildManagerTimesheetSubmittedEmailHtml(args: {
  managerUrl: string;
  employeeName: string;
  weekEndingLabel: string;
  year: string;
}): string {
  const { managerUrl, employeeName, weekEndingLabel, year } = args;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>New Timesheet Submitted</title>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { margin: 0; padding: 0; background: #f3f6f9; font-family: 'Montserrat', Arial, sans-serif; }
    .wrapper { width: 100%; table-layout: fixed; background: #f3f6f9; padding: 24px 0; }
    .main { background: #ffffff; margin: 0 auto; width: 100%; max-width: 620px; border-radius: 10px;
            overflow: hidden; border: 1px solid #e5e7eb; }

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

    .content {
      padding: 14px 28px 24px;
      font-size: 14px;
      color: #374151;
      line-height: 1.7;
      font-family: 'Montserrat', Arial, sans-serif;
    }
    .content h2 {
      margin: 8px 0 10px;
      color: #33393c;
      font-family: 'Montserrat', Arial, sans-serif;
      font-size: 20px;
      font-weight: 700;
      line-height: 1.3;
    }

    .meta {
      margin-top: 14px;
      padding: 14px 16px;
      background: #f9fafb;
      border-radius: 6px;
      font-size: 13px;
    }
    .meta div { margin-bottom: 4px; }

    .button-wrapper { text-align: center; margin-top: 24px; margin-bottom: 8px; }
    .button {
      background: #e31c79;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      display: inline-block;
      font-family: 'Montserrat', Arial, sans-serif;
    }

    .link-fallback {
      margin-top: 14px;
      font-size: 11px;
      color: #6b7280;
      word-break: break-all;
    }

    .footer {
      text-align: center;
      padding: 16px 20px 20px;
      font-size: 11px;
      color: #6b7280;
      background: #ffffff;
      border-top: 1px solid #e31c79;
      line-height: 1.6;
    }

    @media only screen and (max-width: 600px) {
      .main { width: 100% !important; border-radius: 0 !important; }
      .content { padding: 18px 18px 24px !important; font-size: 14px !important; }
      .header-title { font-size: 20px !important; }
      .content h2 { font-size: 18px !important; }
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
            <img src="${logoUrl}" alt="West End Workforce Logo" width="48" class="logo" />
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td class="content">
            <h2>New Timesheet Submitted</h2>

            <p>
              <strong>${employeeName}</strong> has submitted a new timesheet
              for the week ending <strong>${weekEndingLabel}</strong> for your review.
            </p>

            <div class="meta">
              <div><strong>Employee:</strong> ${employeeName}</div>
              <div><strong>Week Ending:</strong> ${weekEndingLabel}</div>
            </div>

            <div class="button-wrapper">
              <a href="${managerUrl}" class="button">Open Timesheet</a>
            </div>

            <p class="link-fallback">
              If the button does not work, copy and paste this link into your browser:<br />
              <a href="${managerUrl}" style="color:#e31c79; text-decoration:none;">${managerUrl}</a>
            </p>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td class="footer">
            <p>You are receiving this notification because you are a designated
               approver for timesheets in the Workforce Portal.</p>

            <p>This notification is intended for internal use by authorized personnel only
               and contains no sensitive information. Please sign into the portal
               to view full timesheet details.</p>

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
