import { LucideIcon } from 'lucide-react';

interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function ActionButton({
  icon: Icon,
  label,
  onClick,
  variant = 'primary',
  disabled = false,
}: ActionButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        padding: '9px 20px',
        fontSize: 12,
        fontWeight: 600,
        borderRadius: 7,
        border: isPrimary ? 'none' : '0.5px solid #e0dcd7',
        background: isPrimary ? '#e31c79' : '#fff',
        color: isPrimary ? '#fff' : '#777',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = isPrimary ? '#cc1069' : '#FDFCFB';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = isPrimary ? '#e31c79' : '#fff';
        }
      }}
    >
      <Icon size={15} strokeWidth={1.5} />
      <span>{label}</span>
    </button>
  );
}
