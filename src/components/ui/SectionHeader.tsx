// src/components/ui/SectionHeader.tsx
interface SectionHeaderProps {
    title: string
    className?: string
  }
  
  export function SectionHeader({ title, className = '' }: SectionHeaderProps) {
    return (
      <h2 className={`font-heading text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 ${className}`}>
        {title}
      </h2>
    )
  }