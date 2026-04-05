import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.2 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13, fontWeight: 400, color: '#bbb', marginTop: 4 }}>{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
