// src/lib/email-templates/manager.ts

const logoUrl = 'https://westendworkforce.com/wp-content/uploads/2025/11/WE-logo-SEPT2024v3-WHT.png';

export function buildManagerSubmissionEmailHtml(args: {
  managerUrl: string;
  employeeName: string;
  reportTitle: string;
  period: string;
  totalAmount: number;
  year: string;
}): string {
  const { managerUrl, employeeName, reportTitle, period, totalAmount } = args;

  const formattedTotal = totalAmount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  return `
    <div style="max-width:600px;margin:0 auto;font-family:'Montserrat',Arial,sans-serif;">
      <div style="background:#1a1a1a;padding:20px;text-align:center;">
        <img src="${logoUrl}" alt="West End Workforce" style="height:40px;" />
      </div>
      <div style="padding:30px 20px;background:#ffffff;">
        <h2 style="color:#e31c79;margin:0 0 16px;">Expense Report Submitted</h2>
        <p style="color:#555;line-height:1.6;">
          <strong>${employeeName}</strong> has submitted an expense report for your review.
        </p>
        <div style="background:#FAFAF8;border:0.5px solid #e8e4df;border-radius:10px;padding:16px;margin:20px 0;">
          <p style="margin:0 0 12px;color:#1a1a1a;font-weight:600;">Expense Details:</p>
          <p style="margin:0 0 6px;color:#555;">Report: <strong>${reportTitle}</strong></p>
          <p style="margin:0 0 6px;color:#555;">Period: <strong>${period}</strong></p>
          <p style="margin:0;color:#555;">Total Amount: <strong>${formattedTotal}</strong></p>
        </div>
        <div style="text-align:center;margin:24px 0;">
          <a href="${managerUrl}"
             style="background:#e31c79;color:#ffffff;padding:12px 32px;border-radius:7px;text-decoration:none;font-weight:600;display:inline-block;">
            Review Expense Report
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
