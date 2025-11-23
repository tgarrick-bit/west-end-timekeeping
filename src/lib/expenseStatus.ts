// lib/expenseStatus.ts

export type ExpenseLineStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export type ExpenseReportStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

interface ExpenseLineLike {
  status: ExpenseLineStatus;
}

export function deriveReportStatus(lines: ExpenseLineLike[]): ExpenseReportStatus {
  if (!lines.length) return 'draft';

  const allDraft = lines.every(l => l.status === 'draft');
  const allApproved = lines.every(l => l.status === 'approved');
  const hasSubmitted = lines.some(l => l.status === 'submitted');
  const hasRejected = lines.some(l => l.status === 'rejected');

  // 1) All lines draft → report is draft
  if (allDraft) return 'draft';

  // 2) All approved → final approval
  if (allApproved) return 'approved';

  // 3) Any submitted (waiting on manager decisions) → submitted/in review
  if (hasSubmitted) return 'submitted';

  // 4) No submitted lines, at least one rejected → overall rejected / needs changes
  if (hasRejected) return 'rejected';

  // Fallback (shouldn’t really be hit)
  return 'draft';
}
