type Status = 'draft' | 'submitted' | 'approved' | 'rejected' | 'payroll_approved';

interface StatusBadgeProps {
  status: Status | string;
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  draft: {
    label: 'Draft',
    color: 'var(--we-status-draft)',
    bg: 'var(--we-status-draft-bg)',
    border: 'rgba(148, 163, 184, 0.15)',
  },
  submitted: {
    label: 'Submitted',
    color: 'var(--we-status-pending)',
    bg: 'var(--we-status-pending-bg)',
    border: 'rgba(245, 158, 11, 0.15)',
  },
  approved: {
    label: 'Approved',
    color: 'var(--we-status-approved)',
    bg: 'var(--we-status-approved-bg)',
    border: 'rgba(34, 197, 94, 0.15)',
  },
  payroll_approved: {
    label: 'Payroll Approved',
    color: 'var(--we-status-approved)',
    bg: 'var(--we-status-approved-bg)',
    border: 'rgba(34, 197, 94, 0.15)',
  },
  rejected: {
    label: 'Rejected',
    color: 'var(--we-status-rejected)',
    bg: 'var(--we-status-rejected-bg)',
    border: 'rgba(239, 68, 68, 0.15)',
  },
};

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 text-[11px] font-semibold rounded-lg ${className}`}
      style={{
        color: config.color,
        background: config.bg,
        border: `0.5px solid ${config.border}`,
      }}
    >
      {config.label}
    </span>
  );
}
