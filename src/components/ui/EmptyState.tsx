import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div
        className="flex items-center justify-center mb-4"
        style={{ width: 44, height: 44, borderRadius: '50%', border: '0.5px solid #e8e4df' }}
      >
        <Icon size={18} strokeWidth={1.5} style={{ color: '#d0cbc4' }} />
      </div>
      <p style={{ fontSize: 13, fontWeight: 500, color: '#999', marginBottom: 2 }}>{title}</p>
      {description && <p style={{ fontSize: 11, fontWeight: 400, color: '#ccc' }}>{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 transition-colors duration-150"
          style={{
            fontSize: 10, fontWeight: 600, padding: '6px 16px', borderRadius: 6,
            background: '#e31c79', color: '#fff',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#cc1069')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#e31c79')}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
