import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, className = '' }: PageHeaderProps) {
  return (
    <div className={`px-6 md:px-8 py-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-[24px] font-bold"
            style={{ color: 'var(--we-text-1)', fontFamily: 'var(--font-heading)' }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-[13px]" style={{ color: 'var(--we-text-3)' }}>
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
