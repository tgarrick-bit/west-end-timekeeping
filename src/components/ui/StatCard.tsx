import { type LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
  variant?: 'timesheet' | 'expense' | 'success' | 'warning' | 'danger' | 'neutral';
  loading?: boolean;
  className?: string;
}

const VARIANT_STYLES = {
  timesheet: {
    accent: 'var(--we-pink)',
    bg: 'rgba(227, 28, 121, 0.04)',
    border: 'rgba(227, 28, 121, 0.12)',
    iconBg: 'rgba(227, 28, 121, 0.08)',
  },
  expense: {
    accent: 'var(--we-navy)',
    bg: 'rgba(5, 32, 46, 0.03)',
    border: 'rgba(5, 32, 46, 0.1)',
    iconBg: 'rgba(5, 32, 46, 0.06)',
  },
  success: {
    accent: 'var(--we-status-approved)',
    bg: 'var(--we-status-approved-bg)',
    border: 'rgba(34, 197, 94, 0.12)',
    iconBg: 'rgba(34, 197, 94, 0.08)',
  },
  warning: {
    accent: 'var(--we-status-pending)',
    bg: 'var(--we-status-pending-bg)',
    border: 'rgba(245, 158, 11, 0.12)',
    iconBg: 'rgba(245, 158, 11, 0.08)',
  },
  danger: {
    accent: 'var(--we-status-rejected)',
    bg: 'var(--we-status-rejected-bg)',
    border: 'rgba(239, 68, 68, 0.12)',
    iconBg: 'rgba(239, 68, 68, 0.08)',
  },
  neutral: {
    accent: 'var(--we-text-2)',
    bg: 'var(--we-bg-white)',
    border: 'var(--we-border)',
    iconBg: 'var(--we-bg-subtle)',
  },
};

export function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  variant = 'neutral',
  loading = false,
  className = '',
}: StatCardProps) {
  const styles = VARIANT_STYLES[variant];

  if (loading) {
    return (
      <div
        className={`rounded-xl p-5 ${className}`}
        style={{
          background: 'var(--we-bg-white)',
          border: '0.5px solid var(--we-border)',
          boxShadow: 'var(--we-shadow-card)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="w-9 h-9 rounded-lg anim-shimmer" />
          <div className="w-16 h-3 rounded anim-shimmer" />
        </div>
        <div className="w-20 h-7 rounded anim-shimmer mb-2" />
        <div className="w-24 h-3 rounded anim-shimmer" />
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl p-5 transition-all duration-200 hover:-translate-y-[1px] ${className}`}
      style={{
        background: styles.bg,
        border: `0.5px solid ${styles.border}`,
        boxShadow: 'var(--we-shadow-card)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: styles.iconBg }}
        >
          <Icon size={18} style={{ color: styles.accent }} />
        </div>
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.1em]"
          style={{ color: 'var(--we-text-muted)' }}
        >
          {label}
        </span>
      </div>

      <div
        className="text-[24px] font-bold mb-1"
        style={{ color: styles.accent, fontFamily: 'var(--font-heading)' }}
      >
        {value}
      </div>

      {subtitle && (
        <div className="text-[12px]" style={{ color: 'var(--we-text-3)' }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}
