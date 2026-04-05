type Status = 'draft' | 'submitted' | 'approved' | 'rejected' | 'payroll_approved' | string;

const CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  draft:             { bg: '#f9fafb', color: '#999', label: 'Draft' },
  submitted:         { bg: '#FFF8E1', color: '#c4983a', label: 'Pending' },
  approved:          { bg: '#ecfdf5', color: '#2d9b6e', label: 'Approved' },
  payroll_approved:  { bg: '#ecfdf5', color: '#2d9b6e', label: 'Payroll Approved' },
  rejected:          { bg: '#fef2f2', color: '#b91c1c', label: 'Rejected' },
};

export function StatusBadge({ status, className = '' }: { status: Status; className?: string }) {
  const c = CONFIG[status] || CONFIG.draft;
  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        fontSize: 9,
        fontWeight: 500,
        padding: '2px 8px',
        borderRadius: 3,
        background: c.bg,
        color: c.color,
      }}
    >
      {c.label}
    </span>
  );
}
