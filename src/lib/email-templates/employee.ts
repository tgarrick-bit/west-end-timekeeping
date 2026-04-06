// src/lib/email-templates/employee.ts

const logoUrl = 'https://westendworkforce.com/wp-content/uploads/2025/11/WE-logo-SEPT2024v3-WHT.png';

export function buildFinalApprovalEmailHtml(args: {
  employeeName: string;
  reportTitle: string;
  period: string;
  reportUrl: string;
  year: string;
}): string {
  const { employeeName, reportTitle, period, reportUrl } = args;

  return `
    <div style="max-width:600px;margin:0 auto;font-family:'Montserrat',Arial,sans-serif;">
      <div style="background:#1a1a1a;padding:20px;text-align:center;">
        <img src="${logoUrl}" alt="West End Workforce" style="height:40px;" />
      </div>
      <div style="padding:30px 20px;background:#ffffff;">
        <h2 style="color:#2d9b6e;margin:0 0 16px;">Expense Report Approved</h2>
        <p style="color:#555;line-height:1.6;">Hi ${employeeName},</p>
        <p style="color:#555;line-height:1.6;">
          Your expense report <strong>"${reportTitle}"</strong> for <strong>${period}</strong> has been approved.
          No further action is needed.
        </p>
        <div style="background:#FAFAF8;border:0.5px solid #e8e4df;border-radius:10px;padding:16px;margin:20px 0;">
          <p style="margin:0 0 6px;color:#555;">Report: <strong>${reportTitle}</strong></p>
          <p style="margin:0 0 6px;color:#555;">Period: <strong>${period}</strong></p>
          <p style="margin:0;color:#2d9b6e;font-weight:600;">Status: Approved</p>
        </div>
        <div style="text-align:center;margin:24px 0;">
          <a href="${reportUrl}"
             style="background:#e31c79;color:#ffffff;padding:12px 32px;border-radius:7px;text-decoration:none;font-weight:600;display:inline-block;">
            View Expense Report
          </a>
        </div>
        <p style="color:#999;font-size:13px;line-height:1.5;">
          If you have any questions, please email
          <a href="mailto:payroll@westendworkforce.com" style="color:#e31c79;">payroll@westendworkforce.com</a>.
        </p>
      </div>
      <div style="background:#FAFAF8;padding:16px;text-align:center;font-size:12px;color:#c0bab2;border-top:1px solid #e31c79;">
        West End Workforce &middot; 800 Town &amp; Country Blvd, Suite 500 &middot; Houston, TX 77024
      </div>
    </div>
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
  const { employeeName, reportTitle, period, reportUrl, reason } = args;

  return `
    <div style="max-width:600px;margin:0 auto;font-family:'Montserrat',Arial,sans-serif;">
      <div style="background:#1a1a1a;padding:20px;text-align:center;">
        <img src="${logoUrl}" alt="West End Workforce" style="height:40px;" />
      </div>
      <div style="padding:30px 20px;background:#ffffff;">
        <h2 style="color:#b91c1c;margin:0 0 16px;">Expense Report Rejected</h2>
        <p style="color:#555;line-height:1.6;">Hi ${employeeName},</p>
        <p style="color:#555;line-height:1.6;">
          Your expense report <strong>"${reportTitle}"</strong> for <strong>${period}</strong> has been rejected and needs your attention.
        </p>
        <div style="background:#FEF2F2;border:0.5px solid #FECACA;border-radius:10px;padding:16px;margin:20px 0;">
          <p style="margin:0 0 6px;color:#555;">Report: <strong>${reportTitle}</strong></p>
          <p style="margin:0 0 6px;color:#555;">Period: <strong>${period}</strong></p>
          <p style="margin:0 0 6px;color:#b91c1c;"><strong>Reason:</strong> ${reason}</p>
          <p style="margin:0;color:#b91c1c;font-weight:600;">Please update and resubmit.</p>
        </div>
        <div style="text-align:center;margin:24px 0;">
          <a href="${reportUrl}"
             style="background:#e31c79;color:#ffffff;padding:12px 32px;border-radius:7px;text-decoration:none;font-weight:600;display:inline-block;">
            Fix &amp; Resubmit
          </a>
        </div>
        <p style="color:#999;font-size:13px;line-height:1.5;">
          If you have any questions, please email
          <a href="mailto:payroll@westendworkforce.com" style="color:#e31c79;">payroll@westendworkforce.com</a>.
        </p>
      </div>
      <div style="background:#FAFAF8;padding:16px;text-align:center;font-size:12px;color:#c0bab2;border-top:1px solid #e31c79;">
        West End Workforce &middot; 800 Town &amp; Country Blvd, Suite 500 &middot; Houston, TX 77024
      </div>
    </div>
  `;
}
