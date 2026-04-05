import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
      <div
        className="flex items-center justify-center mb-5"
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '14px',
          background: 'var(--we-bg-subtle)',
          border: '0.5px solid var(--we-border-faint)',
        }}
      >
        <Icon size={24} style={{ color: 'var(--we-text-3)' }} />
      </div>

      <h3
        className="text-[15px] font-semibold mb-1"
        style={{ color: 'var(--we-text-1)' }}
      >
        {title}
      </h3>

      {description && (
        <p className="text-[13px] max-w-[280px]" style={{ color: 'var(--we-text-3)' }}>
          {description}
        </p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 px-5 py-2.5 text-[13px] font-semibold rounded-[var(--we-radius-sm)] transition-all duration-200"
          style={{
            background: 'var(--we-pink)',
            color: '#ffffff',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--we-pink-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--we-pink)')}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
