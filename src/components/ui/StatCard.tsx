// src/components/ui/StatCard.tsx
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  subtitle?: string
  variant: 'timesheet' | 'expense' | 'neutral'
  className?: string
}

export function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subtitle, 
  variant, 
  className = '' 
}: StatCardProps) {
  const borderColors = {
    timesheet: 'border-pink/30',
    expense: 'border-dark-blue/30',
    neutral: 'border-gray-300'
  }

  const bgColors = {
    timesheet: 'bg-pink/5',
    expense: 'bg-dark-blue/5',
    neutral: 'bg-white'
  }

  const iconColors = {
    timesheet: 'text-pink',
    expense: 'text-dark-blue',
    neutral: 'text-gray-600'
  }

  const valueColors = {
    timesheet: 'text-pink',
    expense: 'text-dark-blue',
    neutral: 'text-gray-900'
  }

  return (
    <div className={`rounded-lg border ${borderColors[variant]} ${bgColors[variant]} p-6 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <Icon className={`w-5 h-5 ${iconColors[variant]}`} />
        <span className="text-xs font-heading font-bold text-gray-500 uppercase tracking-wider">
          {label}
        </span>
      </div>
      
      <div className={`text-3xl font-bold ${valueColors[variant]} mb-1`}>
        {value}
      </div>
      
      {subtitle && (
        <div className="font-body text-sm text-gray-600">
          {subtitle}
        </div>
      )}
    </div>
  )
}