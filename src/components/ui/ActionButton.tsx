// src/components/ui/ActionButton.tsx
import { LucideIcon } from 'lucide-react'

interface ActionButtonProps {
  icon: LucideIcon
  label: string
  onClick: () => void
  variant: 'timesheet' | 'expense'
  disabled?: boolean
}

export function ActionButton({ 
  icon: Icon, 
  label, 
  onClick, 
  variant,
  disabled = false 
}: ActionButtonProps) {
  const variantClasses = {
    timesheet: 'bg-pink hover:bg-pink/90 focus:ring-pink',
    expense: 'bg-dark-blue hover:bg-dark-blue/90 focus:ring-dark-blue'
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-2 px-6 py-3 rounded-lg 
        text-white font-body font-medium 
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-offset-2
        ${variantClasses[variant]}
      `}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </button>
  )
}