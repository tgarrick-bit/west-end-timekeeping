import { type LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
  accent?: boolean;
  loading?: boolean;
  className?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  accent = false,
  loading = false,
  className = '',
}: StatCardProps) {
  if (loading) {
    return (
      <div className={`p-5 ${className}`} style={{ background: '#ffffff', borderLeft: '4px solid transparent' }}>
        <div className="anim-shimmer w-20 h-3 rounded mb-3" />
        <div className="anim-shimmer w-16 h-7 rounded mb-2" />
        <div className="anim-shimmer w-24 h-3 rounded" />
      </div>
    );
  }

  return (
    <div
      className={`p-5 ${className}`}
      style={{
        background: '#ffffff',
        ...(accent ? { borderLeft: '4px solid #e31c79' } : {}),
      }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-widest mb-3"
        style={{ color: '#a0978e' }}
      >
        {label}
      </p>
      <p
        className="text-2xl font-extrabold leading-none mb-1"
        style={{ color: accent ? '#e31c79' : '#000000' }}
      >
        {value}
      </p>
      {subtitle && (
        <p className="text-xs mt-2" style={{ color: '#a0978e' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
